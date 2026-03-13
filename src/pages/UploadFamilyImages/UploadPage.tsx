import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../context/AuthContext';
import { getStoredToken, getStoredUserData } from '../../utils/authUtils';
import { FamilyRelationship } from '../../types/user';
import api from '../../services/api';
import imageService from '../../services/imageService';
import toast from 'react-hot-toast';
import {
  FaCloudUploadAlt,
  FaFileImage,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaPlus,
  FaFolder,
  FaClock,
  FaRedoAlt,
  FaVideo,
} from 'react-icons/fa';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { getVideoDuration, trimVideoTo30Seconds, isVideoFile, VIDEO_TRIM_THRESHOLD_SECONDS } from '../../utils/videoTrim';

// ---------------------------------------------------------------------------
// Persistent queue types and IndexedDB (survives refresh/navigation)
// ---------------------------------------------------------------------------

const UPLOAD_DB_NAME = 'FileVaultUploadQueue';
const UPLOAD_DB_VERSION = 1;
const UPLOAD_STORE_NAME = 'queue';

export type QueueItemStatus = 'waiting' | 'processing' | 'uploading' | 'paused' | 'completed' | 'failed';

export interface QueueItemMeta {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileKey: string; // name+size+lastModified for duplicate detection
  status: QueueItemStatus;
  progress: number;
  retries: number;
  response?: unknown;
  error?: string;
  successMessage?: string;
  uploadDestination?: 'my-account' | 'family-account';
  targetFamilyMember?: {
    otherUserId: number;
    otherUserFirstName: string;
    otherUserLastName?: string;
    relationshipType?: string;
  };
  /** When set, file is uploaded to each of these accounts (one by one). Each must have inviterApiToken. */
  targetFamilyMembers?: Array<{
    otherUserId: number;
    otherUserFirstName: string;
    otherUserLastName?: string;
    relationshipType?: string;
    inviterApiToken: string;
  }>;
  imageId?: number | string;
  /** When set, this upload will be added to this album once it completes */
  targetAlbumId?: number;
  createdAt: number;
}

export interface QueueItemStored extends QueueItemMeta {
  blob: Blob;
}

export interface QueueItem extends QueueItemMeta {
  file: File; // in-memory only; when restored from IDB we build from blob
}

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(UPLOAD_DB_NAME, UPLOAD_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE_NAME)) {
        db.createObjectStore(UPLOAD_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function getAllStored(): Promise<QueueItemStored[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readonly');
    const store = tx.objectStore(UPLOAD_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function putStored(item: QueueItemStored): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).put(item);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteStored(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

function fileToKey(file: File): string {
  return `${file.name}-${file.size}-${(file as File & { lastModified?: number }).lastModified ?? Date.now()}`;
}

// ---------------------------------------------------------------------------
// Upload Manager (singleton – runs outside React, survives unmount)
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 3;
const MAX_RETRIES = 3;
const UPLOAD_TIMEOUT_MS = 0; // no timeout for large files
const MAX_UPLOAD_QUEUE = 100;

type Listener = () => void;

class UploadManager {
  private items: QueueItem[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners = new Set<Listener>();
  private activeUploads = new Map<string, AbortController>();
  private processing = false;
  /** When set, upload requests use this token instead of the default auth (for invited users). */
  private uploadTokenResolver: (() => string | null) | null = null;

  setUploadTokenResolver(fn: (() => string | null) | null): void {
    this.uploadTokenResolver = fn;
  }

  getState(): { items: QueueItem[]; isOnline: boolean } {
    return { items: [...this.items], isOnline: this.isOnline };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  setOnline(online: boolean): void {
    if (this.isOnline === online) return;
    this.isOnline = online;
    if (!online) {
      this.activeUploads.forEach((ac) => ac.abort());
      this.activeUploads.clear();
      this.items = this.items.map((it) =>
        it.status === 'uploading' ? { ...it, status: 'paused' as const } : it
      );
      this.persistAll();
    }
    this.notify();
    if (online) this.processQueue();
  }

  async loadFromPersisted(): Promise<void> {
    try {
      const stored = await getAllStored();
      const items: QueueItem[] = stored.map((s) => ({
        ...s,
        file: new File([s.blob], s.fileName, { type: s.fileType }),
      }));
      this.items = items;
      this.notify();
      if (this.isOnline) this.processQueue();
    } catch (e) {
      console.error('[UploadManager] loadFromPersisted failed', e);
    }
  }

  private async persistItem(item: QueueItem): Promise<void> {
    try {
      const blob: Blob = item.file;
      await putStored({
        id: item.id,
        fileName: item.fileName,
        fileSize: item.fileSize,
        fileType: item.fileType,
        fileKey: item.fileKey,
        status: item.status,
        progress: item.progress,
        retries: item.retries,
        response: item.response,
        error: item.error,
        successMessage: item.successMessage,
        uploadDestination: item.uploadDestination,
        targetFamilyMember: item.targetFamilyMember,
        imageId: item.imageId,
        targetAlbumId: item.targetAlbumId,
        createdAt: item.createdAt,
        blob,
      });
    } catch (e) {
      console.error('[UploadManager] persistItem failed', e);
    }
  }

  private async persistAll(): Promise<void> {
    for (const item of this.items) {
      await this.persistItem(item);
    }
  }

  async addFiles(
    files: File[],
    options?: {
      uploadDestination?: 'my-account' | 'family-account';
      targetFamilyMember?: QueueItem['targetFamilyMember'];
      targetFamilyMembers?: QueueItemMeta['targetFamilyMembers'];
      targetAlbumId?: number;
    }
  ): Promise<{ added: number; skipped: number; skippedDueToLimit: number }> {
    const existingKeys = new Set(this.items.map((i) => i.fileKey));
    let added = 0;
    let skipped = 0;
    let skippedDueToLimit = 0;
    for (const file of files) {
      if (this.items.length >= MAX_UPLOAD_QUEUE) {
        skippedDueToLimit++;
        continue;
      }
      const fileKey = fileToKey(file);
      if (existingKeys.has(fileKey)) {
        skipped++;
        continue;
      }
      existingKeys.add(fileKey);
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const item: QueueItem = {
        id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileKey,
        status: 'waiting',
        progress: 0,
        retries: 0,
        uploadDestination: options?.uploadDestination ?? 'my-account',
        targetFamilyMember: options?.targetFamilyMember,
        targetFamilyMembers: options?.targetFamilyMembers,
        targetAlbumId: options?.targetAlbumId,
        createdAt: Date.now(),
        file,
      };
      this.items.push(item);
      await this.persistItem(item);
      added++;
    }
    this.notify();
    if (this.isOnline) this.processQueue();
    return { added, skipped, skippedDueToLimit };
  }

  async remove(id: string): Promise<void> {
    const ac = this.activeUploads.get(id);
    if (ac) {
      ac.abort();
      this.activeUploads.delete(id);
    }
    this.items = this.items.filter((i) => i.id !== id);
    await deleteStored(id);
    this.notify();
    this.processQueue();
  }

  async retry(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (!item || (item.status !== 'failed' && item.status !== 'paused')) return;
    const updated: QueueItem = {
      ...item,
      status: 'waiting',
      retries: 0,
      error: undefined,
      progress: 0,
    };
    this.items = this.items.map((i) => (i.id === id ? updated : i));
    await this.persistItem(updated);
    this.notify();
    if (this.isOnline) this.processQueue();
  }

  async updateItemMeta(id: string, patch: Partial<QueueItemMeta>): Promise<void> {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const next = { ...this.items[idx], ...patch };
    this.items[idx] = next;
    this.notify();
    try {
      await this.persistItem(next);
    } catch (e) {
      console.error('[UploadManager] updateItemMeta persist failed', e);
    }
  }

  /** Remove all items that are completed or failed. Returns removed ids for cleanup (e.g. thumbnails). */
  async clearFinished(): Promise<string[]> {
    const toRemove = this.items.filter(
      (i) => i.status === 'completed' || i.status === 'failed'
    );
    const ids = toRemove.map((i) => i.id);
    for (const id of ids) {
      await deleteStored(id);
    }
    this.items = this.items.filter(
      (i) => i.status !== 'completed' && i.status !== 'failed'
    );
    this.notify();
    return ids;
  }

  private isVideo(item: QueueItem): boolean {
    return isVideoFile(item.file);
  }

  private getNextToUpload(): QueueItem | undefined {
    const candidate = this.items.find(
      (i) =>
        (i.status === 'waiting' || i.status === 'paused') &&
        !this.activeUploads.has(i.id)
    );
    if (!candidate) return undefined;
    // Process at most one video at a time (trim + upload)
    if (this.isVideo(candidate)) {
      const anotherVideoActive = this.items.some(
        (i) =>
          i.id !== candidate.id &&
          this.isVideo(i) &&
          (i.status === 'processing' || i.status === 'uploading')
      );
      if (anotherVideoActive) return undefined;
    }
    return candidate;
  }

  private async processQueue(): Promise<void> {
    if (!this.isOnline || this.processing) return;
    const running = this.activeUploads.size;
    if (running >= MAX_CONCURRENT) return;

    const next = this.getNextToUpload();
    if (!next) return;

    this.processing = true;
    const item = next;
    const initialStatus = isVideoFile(item.file) ? 'processing' : 'uploading';
    const updated: QueueItem = { ...item, status: initialStatus, progress: 0 };
    this.items = this.items.map((i) => (i.id === item.id ? updated : i));
    this.notify();
    await this.persistItem(updated);

    const controller = new AbortController();
    this.activeUploads.set(item.id, controller);

    try {
      await this.runOneUpload(updated, controller.signal);
    } finally {
      this.activeUploads.delete(item.id);
      this.processing = false;
      this.notify();
      if (this.isOnline) this.processQueue();
    }
  }

  private async runOneUpload(item: QueueItem, signal: AbortSignal): Promise<void> {
    let currentItem = item;

    const update = (patch: Partial<QueueItem>) => {
      const idx = this.items.findIndex((i) => i.id === currentItem.id);
      if (idx === -1) return;
      const next = { ...this.items[idx], ...patch };
      this.items[idx] = next;
      currentItem = next;
      this.notify();
      this.persistItem(next).catch(() => {});
    };

    // Video auto-trim: if duration > 30s, trim to first 30s (no user confirmation)
    if (isVideoFile(currentItem.file)) {
      try {
        const duration = await getVideoDuration(currentItem.file);
        if (duration > VIDEO_TRIM_THRESHOLD_SECONDS) {
          if (currentItem.status !== 'processing') update({ status: 'processing', progress: 0 });
          if (signal.aborted) return;
          const trimmedFile = await trimVideoTo30Seconds(currentItem.file);
          if (signal.aborted) return;
          update({
            file: trimmedFile,
            fileSize: trimmedFile.size,
            fileKey: fileToKey(trimmedFile),
            fileName: trimmedFile.name,
            status: 'uploading',
            progress: 0,
          });
        } else {
          update({ status: 'uploading', progress: 0 });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Video processing failed';
        update({ status: 'failed', error: msg });
        return;
      }
    }

    const resolvedToken = this.uploadTokenResolver?.() ?? null;
    const familyTargets = currentItem.targetFamilyMembers?.length
      ? currentItem.targetFamilyMembers
      : currentItem.uploadDestination === 'family-account' && currentItem.targetFamilyMember
        ? [{
            otherUserId: currentItem.targetFamilyMember.otherUserId,
            otherUserFirstName: currentItem.targetFamilyMember.otherUserFirstName,
            otherUserLastName: currentItem.targetFamilyMember.otherUserLastName,
            relationshipType: currentItem.targetFamilyMember.relationshipType,
            inviterApiToken: resolvedToken ?? '',
          }]
        : [];

    const isFamily = familyTargets.length > 0;
    const url = isFamily ? '/api/images/upload-family' : '/api/images/upload';

    try {
      let lastData: unknown = null;
      let lastImageId: number | string | undefined;
      const totalTargets = Math.max(1, familyTargets.length);
      const progressPerTarget = totalTargets > 1 ? Math.floor(100 / totalTargets) : 100;

      if (familyTargets.length === 0) {
        const formData = new FormData();
        formData.append('file', currentItem.file);
        const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
        if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;
        const response = await api.post(url, formData, {
          headers,
          timeout: UPLOAD_TIMEOUT_MS,
          signal,
          onUploadProgress: (ev) => {
            if (ev.total && ev.total > 0) {
              const pct = Math.round((ev.loaded / ev.total) * 100);
              update({ progress: pct });
            }
          },
        });
        lastData = response?.data ?? response;
        const d = lastData as { id?: number; image?: { id?: number }; imageId?: number };
        lastImageId = d?.id ?? d?.image?.id ?? d?.imageId;
      } else {
        for (let i = 0; i < familyTargets.length; i++) {
          if (signal.aborted) {
            update({ status: 'paused', progress: this.items.find((x) => x.id === item.id)?.progress ?? 0 });
            return;
          }
          const member = familyTargets[i];
          const formData = new FormData();
          formData.append('file', currentItem.file);
          formData.append('familyMemberId', String(member.otherUserId));
          const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
          if (member.inviterApiToken) headers.Authorization = `Bearer ${member.inviterApiToken}`;
          else if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;

          const response = await api.post(url, formData, {
            headers,
            timeout: UPLOAD_TIMEOUT_MS,
            signal,
            onUploadProgress: (ev) => {
              if (ev.total && ev.total > 0) {
                const pct = Math.round((ev.loaded / ev.total) * 100);
                const base = i * progressPerTarget;
                update({ progress: Math.min(99, base + Math.round((pct / 100) * progressPerTarget)) });
              }
            },
          });
          lastData = response?.data ?? response;
          const d = lastData as { id?: number; image?: { id?: number }; imageId?: number };
          lastImageId = d?.id ?? d?.image?.id ?? d?.imageId;
        }
        update({ progress: 100 });
      }

      const message =
        (lastData as { message?: string })?.message ??
        (isFamily && familyTargets.length > 1
          ? `${currentItem.fileName} uploaded to ${familyTargets.length} accounts.`
          : isFamily && familyTargets.length === 1
            ? `${currentItem.fileName} uploaded to ${familyTargets[0].otherUserFirstName}'s account.`
            : `${currentItem.fileName} uploaded successfully.`);

      update({
        status: 'completed',
        progress: 100,
        response: lastData,
        successMessage: message,
        imageId: lastImageId,
        error: undefined,
      });
      setTimeout(() => this.notify(), 0);
    } catch (err: unknown) {
      const isAborted =
        err instanceof Error && err.name === 'AbortError';
      if (isAborted) {
        update({ status: 'paused', progress: this.items.find((i) => i.id === item.id)?.progress ?? 0 });
        return;
      }

      const errorMessage =
        (err as { response?: { data?: { message?: string }; status?: number }; message?: string }).response?.data?.message ??
        (err as Error).message ??
        'Upload failed';
      const newRetries = currentItem.retries + 1;

      if (newRetries >= MAX_RETRIES) {
        update({
          status: 'failed',
          error: errorMessage,
          retries: newRetries,
        });
        return;
      }

      update({
        status: 'waiting',
        error: errorMessage,
        retries: newRetries,
        progress: 0,
      });
      const delay = Math.min(1000 * Math.pow(2, newRetries), 30000);
      await new Promise((r) => setTimeout(r, delay));
      if (this.isOnline && !signal.aborted) this.processQueue();
    }
  }
}

const uploadManager = new UploadManager();

// ---------------------------------------------------------------------------
// Album type (unchanged)
// ---------------------------------------------------------------------------

interface Album {
  id: number;
  name: string;
  description?: string;
  imageCount?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// UploadPage component
// ---------------------------------------------------------------------------

const UploadFamilyImagesPage = () => {
  const { user } = useAuth();
  const [queueState, setQueueState] = useState(uploadManager.getState());
  const [familyMembers, setFamilyMembers] = useState<
    Array<{
      id: number;
      otherUserId: number;
      otherUserFirstName: string;
      otherUserLastName?: string;
      relationshipType?: string;
      inviterApiToken?: string;
    }>
  >([]);
  /** Relationships from API (for invited-user token when hasMobileApps === false). */
  const [familyRelationshipsFromApi, setFamilyRelationshipsFromApi] = useState<
    Array<{ inviterApiToken?: string; [key: string]: unknown }>
  >([]);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [selectedFileForOptions, setSelectedFileForOptions] = useState<QueueItem | null>(null);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [selectedAccountIdsForModal, setSelectedAccountIdsForModal] = useState<number[]>([]);
  const [defaultUploadDestination, setDefaultUploadDestination] = useState<'my-account' | 'family-account'>('my-account');
  const [defaultSelectedAccountIds, setDefaultSelectedAccountIds] = useState<number[]>([]);
  const [defaultAccountSearch, setDefaultAccountSearch] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [uploadedImageIds, setUploadedImageIds] = useState<(number | string)[]>([]);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [newAlbumPrice, setNewAlbumPrice] = useState('');
  const [perPhotoPrice, setPerPhotoPrice] = useState('');
  const [newAlbumIsPublic, setNewAlbumIsPublic] = useState(false);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const thumbnailUrlsRef = useRef<Map<string, string>>(new Map());
  const queueListRef = useRef<HTMLDivElement>(null);
  /** Track imageIds we've already added to each album (so we don't double-call the API) */
  const addedToAlbumRef = useRef<Map<number, Set<number>>>(new Map());

  const { data: userProfile, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/api/auth/profile');
      return res.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: storageUsage } = useQuery({
    queryKey: ['storageUsage'],
    queryFn: () => imageService.getStorageUsage(),
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });

  const { data: albumsData, refetch: refetchAlbums } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const res = await api.get('/api/albums');
      return res.data as Album[] | { albums: Album[] };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const albums = useMemo(() => {
    if (!albumsData) return [];
    if (Array.isArray(albumsData)) return albumsData;
    if (albumsData && typeof albumsData === 'object' && 'albums' in albumsData) return (albumsData as { albums: Album[] }).albums;
    return [];
  }, [albumsData]);

  /** Unified list of accounts to upload to (from user, profile, API). Each has inviterApiToken. */
  const uploadTargetAccounts = useMemo(() => {
    type Acc = { inviterId: number; inviterApiToken: string; inviterFirstName: string; inviterLastName: string; inviterUsername?: string; relationshipType: string };
    const byId = new Map<number, Acc>();
    const add = (r: {
      inviterId?: number;
      inviterApiToken?: string;
      inviterFirstName?: string;
      inviterLastName?: string;
      inviterUsername?: string;
      relationshipType?: string;
      canUploadImages?: boolean;
    }) => {
      const id = r.inviterId ?? (r as { otherUserId?: number }).otherUserId;
      const token = r.inviterApiToken as string | undefined;
      if (id == null || !token) return;
      if (r.canUploadImages === false) return;
      byId.set(id, {
        inviterId: id,
        inviterApiToken: token,
        inviterFirstName: r.inviterFirstName ?? (r as { otherUserFirstName?: string }).otherUserFirstName ?? '',
        inviterLastName: r.inviterLastName ?? (r as { otherUserLastName?: string }).otherUserLastName ?? '',
        inviterUsername: r.inviterUsername ?? (r as { otherUserUsername?: string }).otherUserUsername,
        relationshipType: r.relationshipType ?? (r as { relationshipType?: string }).relationshipType ?? 'CLIENT',
      });
    };
    (user?.familyRelationships ?? []).forEach(add);
    const profileR = (userProfile as { familyRelationships?: unknown[] })?.familyRelationships ?? (userProfile as { user?: { familyRelationships?: unknown[] } })?.user?.familyRelationships;
    if (Array.isArray(profileR)) profileR.forEach((r: unknown) => add(r as Acc));
    (familyRelationshipsFromApi ?? []).forEach((r: { inviterApiToken?: string; [key: string]: unknown }) => add(r as Acc));
    const stored = getStoredUserData() as { familyRelationships?: unknown[] } | null;
    if (stored?.familyRelationships && Array.isArray(stored.familyRelationships)) {
      stored.familyRelationships.forEach((r: unknown) => add(r as Acc));
    }
    return Array.from(byId.values());
  }, [user?.familyRelationships, userProfile, familyRelationshipsFromApi]);

  useEffect(() => {
    uploadManager.loadFromPersisted();
  }, []);

  useEffect(() => {
    const unsub = uploadManager.subscribe(() => {
      setQueueState(() => uploadManager.getState());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onOnline = () => uploadManager.setOnline(true);
    const onOffline = () => uploadManager.setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      thumbnailUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      thumbnailUrlsRef.current.clear();
    };
  }, []);

  // Scroll queue into view when files are added so user sees selected items
  const prevQueueLengthRef = useRef(0);
  useEffect(() => {
    if (queueState.items.length > 0 && queueState.items.length > prevQueueLengthRef.current) {
      queueListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevQueueLengthRef.current = queueState.items.length;
  }, [queueState.items.length]);

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  // Resolved token for upload API: invited users (hasMobileApps === false) use inviter's token
  useEffect(() => {
    uploadManager.setUploadTokenResolver(() => {
      const token = getStoredToken();
      const invitedUserToken =
        (user?.familyRelationships?.[0]?.inviterApiToken as string | undefined) ||
        (familyRelationshipsFromApi?.[0]?.inviterApiToken as string | undefined) ||
        (familyMembers?.[0]?.inviterApiToken as string | undefined);
      const hasMobileApps = user?.hasMobileApps;
      const resolved =
        hasMobileApps !== false ? token : (invitedUserToken || token);
      return resolved ?? null;
    });
    return () => uploadManager.setUploadTokenResolver(null);
  }, [user, familyRelationshipsFromApi, familyMembers]);

  const fetchFamilyMembers = async () => {
    try {
      const response = await api.get('/api/simple-invitations/family-relationships');
      const allClients: Array<{
        id: number;
        otherUserId: number;
        otherUserFirstName: string;
        otherUserLastName?: string;
        relationshipType?: string;
      }> = [];
      const flattenClients = (clients: unknown[]) => {
        if (!Array.isArray(clients)) return;
        clients.forEach((client: unknown) => {
          const c = client as { relation?: string; userId?: number; name?: string; clients?: unknown[] };
          if (c?.relation === 'Client' && c.userId != null) {
            allClients.push({
              id: c.userId,
              otherUserId: c.userId,
              otherUserFirstName: c.name?.split(' ')[0] || (c.name as string) || '',
              otherUserLastName: (c.name as string)?.split(' ').slice(1).join(' ') || '',
              relationshipType: c.relation || 'Client',
            });
          }
          if (c?.clients && Array.isArray(c.clients)) flattenClients(c.clients);
        });
      };
      const data = response?.data;
      if (data?.familyData?.clients) flattenClients(data.familyData.clients);
      else if (Array.isArray(data?.clients)) flattenClients(data.clients);
      else if (Array.isArray(data)) flattenClients(data);
      else if (Array.isArray(data?.data)) flattenClients(data.data);
      const unique = allClients.filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
      setFamilyMembers(unique);

      // Relationships may include inviterApiToken for invited-user uploads
      const relationships = data?.relationships ?? data?.familyData?.relationships ?? [];
      setFamilyRelationshipsFromApi(Array.isArray(relationships) ? relationships : []);
    } catch (e) {
      console.error(e);
      setFamilyMembers([]);
      setFamilyRelationshipsFromApi([]);
    }
  };

  const canUpload = useCallback(() => {
    return !!(userProfile?.canUploadImages && userProfile?.allowedFileTypes);
  }, [userProfile]);

  const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];

  const normalizeAllowedTypes = useCallback((allowedFileTypes: string) => {
    return allowedFileTypes
      .split(',')
      .map((t: string) => t.trim().toLowerCase().replace(/^\./, ''));
  }, []);

  const isFileTypeAllowed = useCallback(
    (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isVideoByExt = VIDEO_EXTENSIONS.includes(ext);
      const isVideoByType = file.type.startsWith('video/');
      // Always allow MOV and all video formats when user has upload permission (no profile restriction for video)
      if (userProfile?.canUploadImages && (isVideoByExt || isVideoByType)) {
        return true;
      }
      if (!userProfile?.allowedFileTypes) return false;
      const allowed = normalizeAllowedTypes(userProfile.allowedFileTypes);
      if (allowed.includes(ext)) return true;
      if (isVideoByExt && allowed.some((t: string) => VIDEO_EXTENSIONS.includes(t))) {
        return true;
      }
      return false;
    },
    [userProfile, normalizeAllowedTypes]
  );

  const getAcceptTypes = useCallback(() => {
    if (!userProfile?.canUploadImages) return {};
    const accept: Record<string, string[]> = {};
    // Always allow video (including MOV) when user can upload
    accept['video/*'] = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    if (!userProfile?.allowedFileTypes) return accept;
    const allowed = normalizeAllowedTypes(userProfile.allowedFileTypes);
    if (allowed.some((t: string) => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'].includes(t))) {
      accept['image/*'] = ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp', '.heic'];
    }
    if (allowed.includes('pdf')) accept['application/pdf'] = ['.pdf'];
    if (allowed.some((t: string) => ['doc', 'docx'].includes(t))) {
      accept['application/msword'] = ['.doc'];
      accept['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx'];
    }
    return accept;
  }, [userProfile, normalizeAllowedTypes]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!canUpload()) {
        toast.error('You do not have permission to upload files');
        return;
      }
      const invalid: string[] = [];
      const valid: File[] = [];
      acceptedFiles.forEach((file) => {
        if (!isFileTypeAllowed(file)) invalid.push(`${file.name} - File type not allowed`);
        else valid.push(file);
      });
      if (invalid.length) toast.error(`Some files were rejected:\n${invalid.join('\n')}`);
      if (valid.length) {
        setIsAddingFiles(true);
        try {
          const isFamily = defaultUploadDestination === 'family-account' && defaultSelectedAccountIds.length > 0;
          const members = isFamily
            ? uploadTargetAccounts
                .filter((a) => defaultSelectedAccountIds.includes(a.inviterId))
                .map((a) => ({
                  otherUserId: a.inviterId,
                  otherUserFirstName: a.inviterFirstName,
                  otherUserLastName: a.inviterLastName,
                  relationshipType: a.relationshipType,
                  inviterApiToken: a.inviterApiToken,
                }))
            : undefined;
          const { added, skipped, skippedDueToLimit } = await uploadManager.addFiles(valid, {
            uploadDestination: isFamily ? 'family-account' : 'my-account',
            targetFamilyMembers: members?.length ? members : undefined,
            targetAlbumId: selectedAlbumId ?? undefined,
          });
          setQueueState(uploadManager.getState());
          if (added) toast.success(`${added} file(s) added to upload queue`);
          if (skipped) toast(`Skipped ${skipped} duplicate(s).`);
          if (skippedDueToLimit) toast.error(`Queue limit (${MAX_UPLOAD_QUEUE}) reached. ${skippedDueToLimit} file(s) not added.`);
        } finally {
          setIsAddingFiles(false);
        }
      }
    },
    [canUpload, isFileTypeAllowed, selectedAlbumId, defaultUploadDestination, defaultSelectedAccountIds, uploadTargetAccounts]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptTypes(),
    multiple: true,
    disabled: !canUpload() || isAddingFiles,
  });

  const removeFromQueue = useCallback(async (id: string) => {
    const url = thumbnailUrlsRef.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      thumbnailUrlsRef.current.delete(id);
    }
    await uploadManager.remove(id);
    setQueueState(uploadManager.getState());
  }, []);

  const retryUpload = useCallback(async (id: string) => {
    await uploadManager.retry(id);
    setQueueState(uploadManager.getState());
  }, []);

  const getThumbnailUrl = (item: QueueItem): string | null => {
    if (thumbnailUrlsRef.current.has(item.id)) return thumbnailUrlsRef.current.get(item.id)!;
    const isImage = item.file.type.startsWith('image/');
    const isVideo = item.file.type.startsWith('video/');
    if (!isImage && !isVideo) return null;
    const url = URL.createObjectURL(item.file);
    thumbnailUrlsRef.current.set(item.id, url);
    return url;
  };

  const isVideoItem = (item: QueueItem): boolean => item.file.type.startsWith('video/');

  const setUploadDestination = useCallback(
    (
      fileId: string,
      destination: 'my-account' | 'family-account',
      familyMemberOrArray?: (typeof familyMembers)[0] | Array<{ otherUserId: number; otherUserFirstName: string; otherUserLastName?: string; relationshipType?: string; inviterApiToken: string }>
    ) => {
      if (destination === 'my-account') {
        uploadManager.updateItemMeta(fileId, {
          uploadDestination: 'my-account',
          targetFamilyMember: undefined,
          targetFamilyMembers: undefined,
        }).then(() => {
          if (selectedFileForOptions?.id === fileId) {
            setSelectedFileForOptions(uploadManager.getState().items.find((i) => i.id === fileId) ?? null);
          }
          setShowUploadOptions(false);
          setSelectedFileForOptions(null);
        });
        return;
      }
      const isArray = Array.isArray(familyMemberOrArray);
      const members = isArray ? familyMemberOrArray : (familyMemberOrArray ? [familyMemberOrArray] : undefined);
      const withToken = members?.map((m) => {
        if ('inviterApiToken' in m && m.inviterApiToken) {
          return {
            otherUserId: m.otherUserId ?? (m as { inviterId?: number }).inviterId,
            otherUserFirstName: m.otherUserFirstName ?? (m as { inviterFirstName?: string }).inviterFirstName ?? '',
            otherUserLastName: m.otherUserLastName ?? (m as { inviterLastName?: string }).inviterLastName,
            relationshipType: m.relationshipType ?? (m as { relationshipType?: string }).relationshipType,
            inviterApiToken: m.inviterApiToken,
          };
        }
        const fromList = uploadTargetAccounts.find((a) => a.inviterId === (m as { otherUserId?: number }).otherUserId);
        return {
          otherUserId: (m as { otherUserId?: number }).otherUserId ?? (m as { inviterId?: number }).inviterId!,
          otherUserFirstName: (m as { otherUserFirstName?: string }).otherUserFirstName ?? (m as { inviterFirstName?: string }).inviterFirstName ?? '',
          otherUserLastName: (m as { otherUserLastName?: string }).otherUserLastName ?? (m as { inviterLastName?: string }).inviterLastName,
          relationshipType: (m as { relationshipType?: string }).relationshipType ?? '',
          inviterApiToken: fromList?.inviterApiToken ?? '',
        };
      }).filter((m) => m.inviterApiToken) ?? undefined;

      const single = withToken?.length === 1 ? withToken[0] : undefined;
      const meta: Partial<QueueItemMeta> = {
        uploadDestination: 'family-account',
        targetFamilyMember: single ? { otherUserId: single.otherUserId, otherUserFirstName: single.otherUserFirstName, otherUserLastName: single.otherUserLastName, relationshipType: single.relationshipType } : undefined,
        targetFamilyMembers: withToken?.length ? withToken : undefined,
      };
      uploadManager.updateItemMeta(fileId, meta).then(() => {
        if (selectedFileForOptions?.id === fileId) {
          setSelectedFileForOptions(uploadManager.getState().items.find((i) => i.id === fileId) ?? null);
        }
        if (withToken?.length) {
          setShowUploadOptions(false);
          setSelectedFileForOptions(null);
        }
      });
    },
    [familyMembers, selectedFileForOptions?.id, uploadTargetAccounts]
  );

  useEffect(() => {
    // Sync selected file when queue updates
    if (selectedFileForOptions) {
      const current = queueState.items.find((i) => i.id === selectedFileForOptions.id);
      if (current) setSelectedFileForOptions(current);
    }
  }, [queueState.items]);

  // When opening upload-options modal for family destination, init multi-select from item
  useEffect(() => {
    if (!showUploadOptions || !selectedFileForOptions) return;
    if (selectedFileForOptions.uploadDestination !== 'family-account') return;
    const ids = selectedFileForOptions.targetFamilyMembers?.map((m) => m.otherUserId)
      ?? (selectedFileForOptions.targetFamilyMember ? [selectedFileForOptions.targetFamilyMember.otherUserId] : []);
    setSelectedAccountIdsForModal(ids);
    setAccountSearchQuery('');
  }, [showUploadOptions, selectedFileForOptions?.id, selectedFileForOptions?.uploadDestination]);

  const getUploadDestinationText = (item: QueueItem) => {
    if (item.uploadDestination === 'family-account' && item.targetFamilyMembers?.length) {
      if (item.targetFamilyMembers.length === 1) {
        return `👥 ${item.targetFamilyMembers[0].otherUserFirstName}'s Account`;
      }
      return `👥 ${item.targetFamilyMembers.length} accounts`;
    }
    if (item.uploadDestination === 'family-account' && item.targetFamilyMember) {
      return `👥 ${item.targetFamilyMember.otherUserFirstName}'s Account`;
    }
    if (item.uploadDestination === 'family-account') return '👥 Client Account (Select below)';
    return '🏠 My Account';
  };

  const openUploadOptions = (item: QueueItem) => {
    setSelectedFileForOptions(item);
    setShowUploadOptions(true);
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast.error('Please enter an album name');
      return;
    }
    setIsCreatingAlbum(true);
    try {
      const albumData: Record<string, unknown> = {
        name: newAlbumName.trim(),
        isPublic: newAlbumIsPublic,
      };
      if (newAlbumDescription.trim()) albumData.description = newAlbumDescription.trim();
      const price = parseFloat(newAlbumPrice.trim());
      if (!isNaN(price) && price > 0) albumData.perAlbumPrice = price;
      const perPhoto = parseFloat(perPhotoPrice.trim());
      if (!isNaN(perPhoto) && perPhoto > 0) albumData.perPhotoPrice = perPhoto;
      const res = await api.post('/api/albums', albumData);
      toast.success('Album created successfully!');
      setShowCreateAlbumModal(false);
      setNewAlbumName('');
      setNewAlbumDescription('');
      setNewAlbumPrice('');
      setPerPhotoPrice('');
      setNewAlbumIsPublic(false);
      handleClearFinished();
      await refetchAlbums();
      if (res.data?.id) setSelectedAlbumId(res.data.id);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create album';
      toast.error(message);
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRelativeTime = (timestamp: number) => {
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
    return `${Math.floor(sec / 86400)} day(s) ago`;
  };

  const getStatusIcon = (status: QueueItemStatus) => {
    switch (status) {
      case 'completed':
        return <FaCheck className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <FaExclamationTriangle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <FaClock className="h-4 w-4 text-amber-500" />;
      case 'uploading':
        return <LoadingSpinner size="sm" text="" />;
      case 'processing':
        return <LoadingSpinner size="sm" text="" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: QueueItemStatus): string => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'paused': return 'Paused';
      case 'uploading': return 'Uploading';
      case 'processing': return 'Processing';
      default: return 'Waiting';
    }
  };

  const getStatusColor = (status: QueueItemStatus) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'paused':
        return 'border-amber-200 bg-amber-50';
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      case 'processing':
        return 'border-indigo-200 bg-indigo-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const pendingCount = queueState.items.filter((i) => i.status === 'waiting' || i.status === 'paused').length;
  const processingCount = queueState.items.filter((i) => i.status === 'processing').length;
  const finishedCount = queueState.items.filter(
    (i) => i.status === 'completed' || i.status === 'failed'
  ).length;
  const completedWithIds = queueState.items.filter((i) => i.status === 'completed' && i.imageId != null);

  const handleClearFinished = useCallback(async () => {
    const removedIds = await uploadManager.clearFinished();
    removedIds.forEach((id) => {
      const url = thumbnailUrlsRef.current.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        thumbnailUrlsRef.current.delete(id);
      }
    });
    setQueueState(uploadManager.getState());
    if (removedIds.length > 0) {
      toast.success(
        removedIds.length === 1
          ? '1 item removed from queue'
          : `${removedIds.length} items removed from queue`
      );
    }
  }, []);

  const addCompletedToAlbum = useCallback(async () => {
    if (!selectedAlbumId || completedWithIds.length === 0) return;
    handleClearFinished();
    const ids = completedWithIds.map((i) => Number(i.imageId!));
    try {
      await api.post(`/api/albums/${selectedAlbumId}/images`, { imageIds: ids });
      const name = albums.find((a) => a.id === selectedAlbumId)?.name ?? 'album';
      toast.success(`${ids.length} image(s) added to album "${name}"`);
      setUploadedImageIds((prev) => [...prev, ...ids]);
      if (!addedToAlbumRef.current.has(selectedAlbumId)) addedToAlbumRef.current.set(selectedAlbumId, new Set());
      ids.forEach((id) => addedToAlbumRef.current.get(selectedAlbumId)!.add(id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add to album';
      toast.error(msg);
    }
  }, [selectedAlbumId, completedWithIds, albums]);

  // When runOneUpload completes an item that has targetAlbumId, add that image to that album (e.g. folder-selected or album-selected when files were added)
  const completedWithTargetAlbum = queueState.items.filter(
    (i) => i.status === 'completed' && i.imageId != null && i.targetAlbumId != null
  );
  const completedImageIdsKey = completedWithTargetAlbum.map((i) => `${i.targetAlbumId}:${i.imageId}`).join(',');

  useEffect(() => {
    if (completedWithTargetAlbum.length === 0) return;
    const byAlbum = new Map<number, number[]>();
    for (const item of completedWithTargetAlbum) {
      const albumId = item.targetAlbumId!;
      const id = Number(item.imageId!);
      if (Number.isNaN(id)) continue;
      if (!byAlbum.has(albumId)) byAlbum.set(albumId, []);
      byAlbum.get(albumId)!.push(id);
    }
    byAlbum.forEach((imageIds, albumId) => {
      if (!addedToAlbumRef.current.has(albumId)) addedToAlbumRef.current.set(albumId, new Set());
      const alreadyAdded = addedToAlbumRef.current.get(albumId)!;
      const toAdd = imageIds.filter((id) => !alreadyAdded.has(id));
      if (toAdd.length === 0) return;
      const albumName = albums.find((a) => a.id === albumId)?.name ?? 'album';
      api
        .post(`/api/albums/${albumId}/images`, { imageIds: toAdd })
        .then(() => {
          toAdd.forEach((id) => alreadyAdded.add(id));
          setUploadedImageIds((prev) => [...prev, ...toAdd]);
          toast.success(`${toAdd.length} image(s) added to album "${albumName}"`);
        })
        .catch((err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add to album';
          toast.error(msg);
        });
    });
  }, [completedImageIdsKey, completedWithTargetAlbum, albums]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading your profile..." />
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Loading Failed</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile information</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!canUpload()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Not Available</h1>
          <p className="text-gray-600 mb-4">You don't have permission to upload files.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
          Upload Files
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Upload and secure your images and documents. Uploads continue in the background and survive refresh.
        </p>
        {userProfile && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 max-w-4xl mx-auto border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">{userProfile.accountType?.charAt(0) || 'U'}</span>
                </div>
                <h3 className="font-semibold text-gray-800">Account Type</h3>
                <p className="text-sm text-gray-600">{userProfile.accountType || 'Unknown'}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-xl">∞</span>
                </div>
                <h3 className="font-semibold text-gray-800">File Size</h3>
                <p className="text-sm text-gray-600">Unlimited</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">{userProfile.allowedFileTypes?.split(',').length || 0}</span>
                </div>
                <h3 className="font-semibold text-gray-800">Allowed Types</h3>
                <p className="text-sm text-gray-600">{userProfile.allowedFileTypes?.toUpperCase() || 'None'}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-sm">{queueState.isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <h3 className="font-semibold text-gray-800">Network</h3>
                <p className="text-sm text-gray-600">{queueState.isOnline ? 'Uploads active' : 'Paused (Offline)'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Album selection */}
      <div className={`max-w-full mx-auto rounded-2xl p-6 border border-blue-100 transition-opacity ${canUpload() ? 'bg-gradient-to-r from-blue-50 to-purple-50' : 'bg-gray-100 opacity-75 pointer-events-none'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FaFolder className="mr-3 font-medium text-[#2731db]" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Select Album (Optional)</h3>
              <p className="text-sm text-gray-600">Add uploaded images to the selected album</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateAlbumModal(true)}
              disabled={!canUpload()}
              className="flex items-center px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlus className="mr-2" />
              Create Album
            </button>
            {albums.length > 0 && (
              <select
                value={selectedAlbumId ?? ''}
                onChange={(e) => setSelectedAlbumId(e.target.value ? Number(e.target.value) : null)}
                disabled={!canUpload()}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2731db] min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">No Album</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name} {album.imageCount != null ? `(${album.imageCount} images)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {selectedAlbumId && (
          <div className="mt-3 p-3 bg-blue-100 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              ✓ Images can be added to: <strong>{albums.find((a) => a.id === selectedAlbumId)?.name}</strong>
            </p>
            {completedWithIds.length > 0 && (
              <button
                onClick={addCompletedToAlbum}
                className="mt-2 text-sm text-blue-700 underline hover:no-underline"
              >
                Add {completedWithIds.length} completed image(s) to this album
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dropzone */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-blue-100/50 relative">
        {isAddingFiles && (
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex items-center gap-4">
              <LoadingSpinner size="md" text="" />
              <div>
                <p className="font-semibold text-gray-800">Adding files...</p>
                <p className="text-sm text-gray-600">Max {MAX_UPLOAD_QUEUE} files · Please wait</p>
              </div>
            </div>
          </div>
        )}
        <div className="p-10">
          {/* Upload to: My Account / Client accounts — search + list (4 rows, scroll) */}
          <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50/80 p-4">
            <p className="text-sm font-semibold text-purple-900 mb-3">Upload to</p>
            <div className="flex flex-wrap gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="defaultUploadDestination"
                  checked={defaultUploadDestination === 'my-account'}
                  onChange={() => setDefaultUploadDestination('my-account')}
                  className="text-indigo-600"
                />
                <span className="text-sm font-medium text-gray-800">My account</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="defaultUploadDestination"
                  checked={defaultUploadDestination === 'family-account'}
                  onChange={() => setDefaultUploadDestination('family-account')}
                  className="text-purple-600"
                  disabled={uploadTargetAccounts.length === 0}
                />
                <span className="text-sm font-medium text-gray-800">Client account(s)</span>
              </label>
            </div>
            {defaultUploadDestination === 'family-account' && (
              <>
                <div className="mb-2">
                  <input
                    type="search"
                    value={defaultAccountSearch}
                    onChange={(e) => setDefaultAccountSearch(e.target.value)}
                    placeholder="Search accounts..."
                    className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div className="border border-purple-200 rounded-lg bg-white overflow-hidden" style={{ maxHeight: '10.5rem' }}>
                  <div className="overflow-y-auto p-1" style={{ maxHeight: '10rem' }}>
                    {uploadTargetAccounts.length === 0 ? (
                      <p className="text-sm text-gray-500 p-2">No client accounts. Accept an invitation to see them here.</p>
                    ) : (() => {
                      const q = defaultAccountSearch.trim().toLowerCase();
                      const filtered = q
                        ? uploadTargetAccounts.filter(
                            (a) =>
                              a.inviterFirstName?.toLowerCase().includes(q) ||
                              a.inviterLastName?.toLowerCase().includes(q) ||
                              a.inviterUsername?.toLowerCase().includes(q) ||
                              a.relationshipType?.toLowerCase().includes(q)
                          )
                        : uploadTargetAccounts;
                      return filtered.length === 0 ? (
                        <p className="text-sm text-gray-500 p-2">No accounts match.</p>
                      ) : (
                        filtered.map((acc) => {
                          const checked = defaultSelectedAccountIds.includes(acc.inviterId);
                          return (
                            <label
                              key={acc.inviterId}
                              className="flex items-center gap-3 p-2 rounded-md hover:bg-purple-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setDefaultSelectedAccountIds((prev) =>
                                    prev.includes(acc.inviterId) ? prev.filter((id) => id !== acc.inviterId) : [...prev, acc.inviterId]
                                  );
                                }}
                                className="rounded border-purple-300 text-purple-600"
                              />
                              <span className="text-sm text-gray-900 truncate">
                                {acc.inviterFirstName} {acc.inviterLastName}
                                {acc.relationshipType ? ` · ${acc.relationshipType}` : ''}
                              </span>
                            </label>
                          );
                        })
                      );
                    })()}
                  </div>
                </div>
                {defaultSelectedAccountIds.length > 0 && (
                  <p className="text-xs text-purple-700 mt-2">
                    {defaultSelectedAccountIds.length} account{defaultSelectedAccountIds.length !== 1 ? 's' : ''} selected — new files will upload to each.
                  </p>
                )}
              </>
            )}
          </div>

          <div
            {...getRootProps()}
            className={`border-3 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gradient-to-br from-blue-50/50 to-purple-50/50'
            } ${isAddingFiles ? 'pointer-events-none opacity-70' : ''}`}
          >
            <input {...getInputProps()} />
            <FaCloudUploadAlt className="mx-auto h-20 w-20 text-indigo-500 mb-6" />
            <p className="mt-6 text-2xl font-bold text-gray-800">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="mt-3 text-lg text-gray-600">or click to select files</p>
            <p className="mt-2 text-sm text-gray-500">Videos longer than 30s are auto-trimmed. Queue limit: {MAX_UPLOAD_QUEUE} files.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
              {userProfile?.allowedFileTypes && (
                <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                  <span className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse" />
                  <span className="font-medium text-gray-700">{userProfile.allowedFileTypes.toUpperCase()}</span>
                </span>
              )}
              <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                <span className="w-3 h-3 bg-blue-400 rounded-full mr-3 animate-pulse" />
                <span className="font-medium text-gray-700">Background upload · Survives refresh</span>
              </span>
              {storageUsage && (
                <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                  <span className="w-3 h-3 bg-purple-400 rounded-full mr-3 animate-pulse" />
                  <span className="font-medium text-gray-700">{storageUsage.total - storageUsage.used}MB Available</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Queue list - scroll into view when files added */}
      {queueState.items.length > 0 && (
        <div ref={queueListRef} className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50">
          <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-blue-200/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-t-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <FaFileImage className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Upload Queue</h2>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-semibold tabular-nums text-base shrink-0">
                      {queueState.items.length} / {MAX_UPLOAD_QUEUE} files
                    </span>
                    {queueState.items.length >= MAX_UPLOAD_QUEUE && (
                      <span className="text-amber-600 text-sm font-medium shrink-0">(max limit)</span>
                    )}
                    <span className="text-gray-500 text-sm">·</span>
                    <span className="text-gray-600 text-sm tabular-nums">{pendingCount} waiting</span>
                    {processingCount > 0 && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-indigo-600 text-sm tabular-nums">{processingCount} processing</span>
                      </>
                    )}
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600 text-sm">{queueState.isOnline ? 'Online' : 'Paused'}</span>
                  </div>
                </div>
              </div>
              {finishedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFinished}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors shrink-0"
                >
                  Clear finished ({finishedCount})
                </button>
              )}
            </div>
          </div>
          {isAddingFiles && (
            <div className="px-6 py-3 bg-indigo-100 border-b border-indigo-200 flex items-center justify-center gap-2 text-sm text-indigo-800 font-medium">
              <LoadingSpinner size="sm" text="" />
              <span>Adding more files... (max {MAX_UPLOAD_QUEUE})</span>
            </div>
          )}
          <div className="relative flex flex-col min-h-[320px] max-h-[70vh] h-[70vh]">
            <div className="sticky top-0 z-10 px-4 py-2 bg-indigo-50/95 border-b border-indigo-100/80 backdrop-blur-sm flex items-center justify-center gap-2 text-sm text-gray-700 shrink-0">
              <span className="tabular-nums font-semibold text-indigo-800">{queueState.items.length}</span>
              <span>files in queue</span>
              <span className="text-gray-400">(scroll to see all)</span>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto overflow-x-hidden scroll-smooth flex-1 min-h-0 basis-0">
            <div className="grid grid-cols-1 gap-4">
              {queueState.items.map((item) => {
                const isVideo = isVideoItem(item);
                const isUploading = item.status === 'uploading';
                const progressBarColor =
                  item.status === 'completed'
                    ? 'bg-green-500'
                    : item.status === 'uploading' || item.status === 'processing'
                      ? 'bg-blue-500'
                      : 'bg-gray-300';
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-[14px] border shadow-sm hover:shadow-md transition-shadow duration-200 ${getStatusColor(item.status)}`}
                  >
                    {/* Left: Icon only (no image preview) */}
                    <div className="w-full h-[90px] md:w-[120px] md:h-[90px] md:flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                      {isVideo ? (
                        <FaVideo className="h-10 w-10 text-indigo-500" />
                      ) : (
                        <FaFileImage className="h-10 w-10 text-gray-500" />
                      )}
                    </div>

                    {/* Center: Details + progress */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <p className="font-bold text-gray-900 truncate" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(item.createdAt)} · {formatFileSize(item.fileSize)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 h-10">
                        {item.status === 'processing' && (
                          <>
                            {getStatusIcon(item.status)}
                            <span className="text-sm font-medium text-indigo-600">Processing video...</span>
                          </>
                        )}
                        {item.status === 'uploading' && (
                          <>
                            {getStatusIcon(item.status)}
                            <span className="text-sm font-medium text-blue-600">Uploading</span>
                          </>
                        )}
                        {(item.status === 'waiting' || item.status === 'paused') && (
                          <span className="text-sm font-medium text-gray-600">{getStatusLabel(item.status)}</span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                            {getStatusIcon(item.status)}
                            Completed
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                            {getStatusIcon(item.status)}
                            Failed
                          </span>
                        )}
                      </div>
                      {/* Progress bar: 6px, rounded, blue when uploading, green when completed */}
                      <div className="mt-1.5 h-1.5 w-full max-w-xs bg-gray-200 rounded-full overflow-hidden">
                        {item.status === 'processing' ? (
                          <div className="h-full w-full rounded-full bg-blue-400 animate-pulse" />
                        ) : (
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${progressBarColor}`}
                            style={{ width: item.status === 'completed' ? '100%' : `${item.progress}%` }}
                          />
                        )}
                      </div>
                      {(item.status === 'waiting' || item.status === 'paused') && (
                        <button
                          type="button"
                          onClick={() => openUploadOptions(item)}
                          className="mt-1 text-sm font-medium text-purple-600 hover:text-purple-700"
                        >
                          Choose Destination
                        </button>
                      )}
                      {item.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => retryUpload(item.id)}
                          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700"
                        >
                          <FaRedoAlt className="h-4 w-4" /> Retry
                        </button>
                      )}
                      {item.status === 'paused' && (
                        <p className="text-xs text-amber-700 mt-0.5">Paused (Offline) – will resume when back online</p>
                      )}
                      {item.successMessage && item.status === 'completed' && (
                        <p className="text-xs text-green-700 mt-0.5 truncate">{item.successMessage}</p>
                      )}
                      {item.error && (
                        <p className="text-xs text-red-700 mt-0.5 break-words">
                          {item.error}
                          {item.retries > 0 && ` (retry ${item.retries}/${MAX_RETRIES})`}
                        </p>
                      )}
                    </div>

                    {/* Right: Delete button - circular, centered, disabled during upload */}
                    <div className="flex md:flex-shrink-0 justify-end md:justify-center items-center">
                      <button
                        type="button"
                        onClick={() =>removeFromQueue(item.id)}
                        // onClick={() => !isUploading && removeFromQueue(item.id)}
                        // disabled={isUploading}
                        className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Remove from queue"
                      >
                        <FaTimes className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {queueState.items.length > 0 && (
        <div className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50 p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FaCloudUploadAlt className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Upload Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50">
              <div className="text-center">
                <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg tabular-nums">{queueState.items.length}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">Total</p>
                <p className="text-xs text-gray-500 mt-0.5">max {MAX_UPLOAD_QUEUE} files</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50">
              <div className="text-center">
                <div className="w-14 h-14 bg-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">{processingCount}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">Processing</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50">
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {queueState.items.filter((i) => i.status === 'uploading').length}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800">Uploading</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50">
              <div className="text-center">
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {queueState.items.filter((i) => i.status === 'completed').length}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800">Completed</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50">
              <div className="text-center">
                <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {queueState.items.filter((i) => i.status === 'failed').length}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800">Failed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload options modal */}
      {showUploadOptions && selectedFileForOptions && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Choose Upload Destination</h3>
                <button
                  onClick={() => {
                    setShowUploadOptions(false);
                    setSelectedFileForOptions(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Selected File</h4>
                  <div className="flex items-center space-x-3">
                    <FaFileImage className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFileForOptions.fileName}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFileForOptions.fileSize)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="uploadDestination"
                        checked={selectedFileForOptions.uploadDestination === 'my-account'}
                        onChange={() => setUploadDestination(selectedFileForOptions.id, 'my-account')}
                        className="text-blue-600"
                      />
                      <div>
                        <label className="font-medium text-blue-900">🏠 My Account</label>
                        <p className="text-sm text-blue-700">Store in your account</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="radio"
                        name="uploadDestination"
                        id="upload-dest-family"
                        checked={selectedFileForOptions.uploadDestination === 'family-account'}
                        onChange={() => setUploadDestination(selectedFileForOptions.id, 'family-account')}
                        className="text-purple-600"
                        disabled={uploadTargetAccounts.length === 0}
                      />
                      <div>
                        <label htmlFor="upload-dest-family" className="font-medium text-purple-900 cursor-pointer">
                          👥 Client Account
                        </label>
                        <p className="text-sm text-purple-700">
                          {uploadTargetAccounts.length > 0
                            ? 'Upload to one or more client accounts'
                            : 'No client accounts available. Accept an invitation to see accounts here.'}
                        </p>
                      </div>
                    </div>
                    {selectedFileForOptions.uploadDestination === 'family-account' && (
                      <div className="ml-6 space-y-2">
                        {uploadTargetAccounts.length === 0 ? (
                          <p className="text-sm text-gray-500 p-3 bg-white border border-purple-200 rounded-lg">
                            No client accounts to show. Client accounts come from your profile and accepted invitations.
                          </p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-purple-700 shrink-0">Search</span>
                              <input
                                type="search"
                                value={accountSearchQuery}
                                onChange={(e) => setAccountSearchQuery(e.target.value)}
                                placeholder="Search accounts..."
                                className="flex-1 min-w-0 p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                              />
                            </div>
                            <div className="border border-purple-200 rounded-lg overflow-hidden bg-white" style={{ maxHeight: '10.5rem' }}>
                              <div className="overflow-y-auto p-1" style={{ maxHeight: '10rem' }}>
                                {(() => {
                                  const q = accountSearchQuery.trim().toLowerCase();
                                  const filtered = q
                                    ? uploadTargetAccounts.filter(
                                        (a) =>
                                          a.inviterFirstName?.toLowerCase().includes(q) ||
                                          a.inviterLastName?.toLowerCase().includes(q) ||
                                          a.inviterUsername?.toLowerCase().includes(q) ||
                                          a.relationshipType?.toLowerCase().includes(q)
                                      )
                                    : uploadTargetAccounts;
                                  return filtered.length === 0 ? (
                                    <p className="text-sm text-gray-500 p-2">No accounts match.</p>
                                  ) : (
                                    filtered.map((acc) => {
                                      const checked = selectedAccountIdsForModal.includes(acc.inviterId);
                                      return (
                                        <label
                                          key={acc.inviterId}
                                          className="flex items-center gap-3 p-2 rounded-md hover:bg-purple-50 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                              setSelectedAccountIdsForModal((prev) =>
                                                prev.includes(acc.inviterId)
                                                  ? prev.filter((id) => id !== acc.inviterId)
                                                  : [...prev, acc.inviterId]
                                              );
                                            }}
                                            className="rounded border-purple-300 text-purple-600"
                                          />
                                          <span className="text-sm text-gray-900 truncate">
                                            {acc.inviterFirstName} {acc.inviterLastName}
                                            {acc.relationshipType ? ` · ${acc.relationshipType}` : ''}
                                          </span>
                                        </label>
                                      );
                                    })
                                  );
                                })()}
                              </div>
                            </div>
                            {selectedAccountIdsForModal.length > 0 && (
                              <p className="text-xs text-purple-700">
                                {selectedAccountIdsForModal.length} account{selectedAccountIdsForModal.length !== 1 ? 's' : ''} selected. File will be uploaded to each.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const members = uploadTargetAccounts.filter((a) => selectedAccountIdsForModal.includes(a.inviterId));
                                if (members.length) {
                                  setUploadDestination(selectedFileForOptions.id, 'family-account', members.map((a) => ({
                                    otherUserId: a.inviterId,
                                    otherUserFirstName: a.inviterFirstName,
                                    otherUserLastName: a.inviterLastName,
                                    relationshipType: a.relationshipType,
                                    inviterApiToken: a.inviterApiToken,
                                  })));
                                }
                              }}
                              disabled={selectedAccountIdsForModal.length === 0}
                              className="w-full py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Done — Upload to {selectedAccountIdsForModal.length || '…'} account(s)
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowUploadOptions(false);
                      setSelectedFileForOptions(null);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create album modal */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaFolder className="mr-2 text-[#2731db]" />
                Create New Album
              </h2>
              <button
                onClick={() => {
                  setShowCreateAlbumModal(false);
                  setNewAlbumName('');
                  setNewAlbumDescription('');
                  setNewAlbumPrice('');
                  setNewAlbumIsPublic(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Album Name *</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Enter album name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Album Price (₹) (optional)</label>
                <input
                  type="number"
                  value={newAlbumPrice}
                  onChange={(e) => setNewAlbumPrice(e.target.value)}
                  placeholder="Price per album"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Photo (₹) (optional)</label>
                <input
                  type="number"
                  value={perPhotoPrice}
                  onChange={(e) => setPerPhotoPrice(e.target.value)}
                  placeholder="Price per photo"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newAlbumIsPublic}
                  onChange={(e) => setNewAlbumIsPublic(e.target.checked)}
                  className="w-4 h-4 text-[#2731db] border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">Make album public</label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateAlbum}
                  disabled={isCreatingAlbum || !newAlbumName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingAlbum ? 'Creating...' : 'Create Album'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateAlbumModal(false);
                    setNewAlbumName('');
                    setNewAlbumDescription('');
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadFamilyImagesPage;
