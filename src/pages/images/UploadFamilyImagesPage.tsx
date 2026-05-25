import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../state/context/AuthContext';
import { getStoredToken, getStoredUserData } from '../../utils/authUtils';
import { FamilyRelationship } from '../../types/user';
import api from '../../api/client/axiosInstance';
import imageService from '../../api/services/imageService';
import toast from 'react-hot-toast';
import {
  FaFileImage,
  FaTimes,
  FaExclamationTriangle,
  FaVideo,
} from 'react-icons/fa';
import {
  Upload,
  FolderArchive,
  Folder,
  Scissors,
  Archive,
  X,
  RotateCcw,
  ArrowUpFromLine,
  Search,
  Cloud,
  FileText,
  AlertCircle,
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { FamilyMemberSkeleton } from '../../components/common/skeletons';
import { getVideoDuration, trimVideoTo30Seconds, isVideoFile, VIDEO_TRIM_THRESHOLD_SECONDS } from '../../utils/videoTrim';
import JSZip from 'jszip';
import { addImagesToMemoriesEvent, listMemoriesEvents } from '../../api/services/memoriesService';

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
  /** When set, this upload will be added to this Our Memories event once it completes */
  targetMemoriesEventId?: string;
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

// ZIP extraction: images and videos only (for upload)
// Browser must load the whole ZIP into memory; very large files may cause crashes or out-of-memory
const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB
const MAX_ZIP_SIZE_GB = 1;
const ZIP_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic']);
const ZIP_VIDEO_EXT = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v']);
function getMimeForExt(ext: string): string {
  const m: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    bmp: 'image/bmp', webp: 'image/webp', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska', webm: 'video/webm', m4v: 'video/x-m4v',
  };
  return m[ext] ?? 'application/octet-stream';
}

function formatFileSizeForToast(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} ${i18n.t('uploadFamilyPage.sizeGB')}`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} ${i18n.t('uploadFamilyPage.sizeMB')}`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} ${i18n.t('uploadFamilyPage.sizeKB')}`;
  return `${bytes} ${i18n.t('uploadFamilyPage.sizeBytes')}`;
}

/** Read a File to ArrayBuffer via FileReader (sometimes more reliable than file.arrayBuffer() after drop). */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

/** Extract images and videos from zip content. Pass ArrayBuffer to avoid File handle permission errors after drop. */
async function extractImagesAndVideosFromZipBuffer(
  arrayBuffer: ArrayBuffer,
  _zipFileName: string
): Promise<File[]> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const results: File[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (path.includes('__MACOSX') || /(^|\/)\./.test(path) || path.endsWith('.DS_Store')) continue;
    const base = path.replace(/^.*\//, '');
    const ext = base.split('.').pop()?.toLowerCase() ?? '';
    if (!ZIP_IMAGE_EXT.has(ext) && !ZIP_VIDEO_EXT.has(ext)) continue;
    const blob = await entry.async('blob');
    results.push(new File([blob], base, { type: getMimeForExt(ext) }));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Upload Manager (singleton – runs outside React, survives unmount)
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 3;
const MAX_RETRIES = 3;
const UPLOAD_TIMEOUT_MS = 0; // no timeout for large files
const MAX_UPLOAD_QUEUE = 1000;

type Listener = () => void;

class UploadManager {
  private items: QueueItem[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners = new Set<Listener>();
  private activeUploads = new Map<string, AbortController>();
  private processing = false;
  /** When set, called per upload; can use item to e.g. use localStorage token for "my-account". */
  private uploadTokenResolver: ((item?: QueueItem) => string | null) | null = null;

  setUploadTokenResolver(fn: ((item?: QueueItem) => string | null) | null): void {
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
        targetMemoriesEventId: item.targetMemoriesEventId,
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
      targetMemoriesEventId?: string;
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
        targetMemoriesEventId: options?.targetMemoriesEventId,
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
        const msg = err instanceof Error ? err.message : i18n.t('uploadFamilyPage.videoProcessingFailed');
        update({ status: 'failed', error: msg });
        return;
      }
    }

    const resolvedToken = this.uploadTokenResolver?.(currentItem) ?? null;
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
          ? i18n.t('uploadFamilyPage.successMulti', {
              fileName: currentItem.fileName,
              count: familyTargets.length,
            })
          : isFamily && familyTargets.length === 1
            ? i18n.t('uploadFamilyPage.successOne', {
                fileName: currentItem.fileName,
                name: familyTargets[0].otherUserFirstName,
              })
            : i18n.t('uploadFamilyPage.successDefault', { fileName: currentItem.fileName }));

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
        i18n.t('uploadFamilyPage.uploadFailed');
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
  const { t } = useTranslation();
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
  const [selectedMemoriesEventId, setSelectedMemoriesEventId] = useState<string>('');
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
  const addedToMemoriesEventRef = useRef<Map<string, Set<string>>>(new Map());

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

  const { data: memoriesEventsData } = useQuery({
    queryKey: ['memoriesEvents'],
    queryFn: listMemoriesEvents,
    enabled: !!user,
    staleTime: 60_000,
  });
  const memoriesEvents = useMemo(
    () => (Array.isArray(memoriesEventsData) ? memoriesEventsData : []),
    [memoriesEventsData]
  );

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

  // Resolved token for upload API: "My account" always uses localStorage token; family/invited uses inviter token when applicable
  useEffect(() => {
    uploadManager.setUploadTokenResolver((item) => {
      const token = getStoredToken();
      if (item?.uploadDestination === 'my-account') {
        return token ?? null;
      }
      const invitedUserToken =
        (user?.familyRelationships?.[0]?.inviterApiToken as string | undefined) ||
        (familyRelationshipsFromApi?.[0]?.inviterApiToken as string | undefined) ||
        (familyMembers?.[0]?.inviterApiToken as string | undefined);
      const hasMobileApps = user?.hasMobileApps;
      const resolved = hasMobileApps !== false ? token : (invitedUserToken || token);
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

  const isZipFile = (file: File) =>
    file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

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
    // Allow ZIP: we extract images and videos from it and upload those
    accept['application/zip'] = ['.zip'];
    return accept;
  }, [userProfile, normalizeAllowedTypes]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!canUpload()) {
        toast.error(i18n.t('uploadFamilyPage.toastNoPermission'));
        return;
      }
      // Read all ZIPs into memory (skip ones over limit — browser cannot handle very large ZIPs)
      const zipFiles = acceptedFiles.filter(isZipFile);
      const zipTooBig = zipFiles.filter((f) => f.size > MAX_ZIP_SIZE_BYTES);
      const zipOk = zipFiles.filter((f) => f.size <= MAX_ZIP_SIZE_BYTES);
      if (zipTooBig.length) {
        zipTooBig.forEach((f) =>
          toast.error(
            i18n.t('uploadFamilyPage.zipTooLarge', {
              name: f.name,
              size: formatFileSizeForToast(f.size),
              maxGb: MAX_ZIP_SIZE_GB,
            })
          )
        );
      }
      const zipBuffers: { name: string; buffer: ArrayBuffer }[] = [];
      if (zipOk.length) {
        try {
          const buffers = await Promise.all(zipOk.map((f) => readFileAsArrayBuffer(f)));
          zipOk.forEach((f, i) => zipBuffers.push({ name: f.name, buffer: buffers[i] }));
        } catch (e) {
          console.error('ZIP read failed:', e);
          toast.error(
            i18n.t('uploadFamilyPage.zipReadFailed', {
              detail: e instanceof Error ? e.message : i18n.t('uploadFamilyPage.zipReadFallback'),
            })
          );
          return;
        }
      }
      const zipCount = zipBuffers.length;
      if (zipCount) toast.loading(i18n.t('uploadFamilyPage.extractingZip', { count: zipCount }), { id: 'zip-extract' });
      const expanded: File[] = [];
      const zipByName = new Map(zipBuffers.map((z) => [z.name, z]));
      for (const file of acceptedFiles) {
        if (isZipFile(file)) {
          const z = zipByName.get(file.name);
          if (!z) continue;
          try {
            const extracted = await extractImagesAndVideosFromZipBuffer(z.buffer, z.name);
            if (extracted.length) expanded.push(...extracted);
            else toast(i18n.t('uploadFamilyPage.zipNoMedia', { name: file.name }), { id: 'zip-empty' });
          } catch (e) {
            console.error('ZIP extract failed:', e);
            toast.error(
              i18n.t('uploadFamilyPage.zipExtractFailed', {
                name: file.name,
                detail: e instanceof Error ? e.message : i18n.t('uploadFamilyPage.zipInvalid'),
              })
            );
          }
        } else {
          expanded.push(file);
        }
      }
      if (zipCount) toast.dismiss('zip-extract');
      const invalid: string[] = [];
      const valid: File[] = [];
      expanded.forEach((file) => {
        if (!isFileTypeAllowed(file)) invalid.push(i18n.t('uploadFamilyPage.fileTypeNotAllowed', { name: file.name }));
        else valid.push(file);
      });
      if (invalid.length) toast.error(i18n.t('uploadFamilyPage.someFilesRejected', { list: invalid.join('\n') }));
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
            targetMemoriesEventId: selectedMemoriesEventId?.trim() ? selectedMemoriesEventId.trim() : undefined,
          });
          setQueueState(uploadManager.getState());
          if (added) toast.success(i18n.t('uploadFamilyPage.filesAddedQueue', { n: added }));
          if (skipped) toast(i18n.t('uploadFamilyPage.skippedDuplicates', { n: skipped }));
          if (skippedDueToLimit)
            toast.error(
              i18n.t('uploadFamilyPage.queueLimit', { max: MAX_UPLOAD_QUEUE, n: skippedDueToLimit })
            );
        } finally {
          setIsAddingFiles(false);
        }
      }
    },
    [canUpload, isFileTypeAllowed, selectedAlbumId, selectedMemoriesEventId, defaultUploadDestination, defaultSelectedAccountIds, uploadTargetAccounts]
  );

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    accept: getAcceptTypes(),
    multiple: true,
    disabled: !canUpload() || isAddingFiles,
    noClick: true,
    noKeyboard: true,
  });

  const zipInputRef = useRef<HTMLInputElement>(null);
  const onZipInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length || !canUpload()) return;
      const zips = Array.from(files).filter((f) => isZipFile(f));
      if (!zips.length) {
        toast.error(i18n.t('uploadFamilyPage.selectZipFile'));
        e.target.value = '';
        return;
      }
      const tooBig = zips.filter((f) => f.size > MAX_ZIP_SIZE_BYTES);
      if (tooBig.length) {
        tooBig.forEach((f) =>
          toast.error(
            i18n.t('uploadFamilyPage.zipTooLarge', {
              name: f.name,
              size: formatFileSizeForToast(f.size),
              maxGb: MAX_ZIP_SIZE_GB,
            })
          )
        );
      }
      const zipsOk = zips.filter((f) => f.size <= MAX_ZIP_SIZE_BYTES);
      if (!zipsOk.length) {
        e.target.value = '';
        return;
      }
      setIsAddingFiles(true);
      try {
        const expanded: File[] = [];
        for (const zipFile of zipsOk) {
          try {
            const buffer = await readFileAsArrayBuffer(zipFile);
            const extracted = await extractImagesAndVideosFromZipBuffer(buffer, zipFile.name);
            if (extracted.length) expanded.push(...extracted);
            else toast(i18n.t('uploadFamilyPage.zipNoMedia', { name: zipFile.name }));
          } catch (err) {
            console.error('ZIP extract failed:', err);
            toast.error(
              i18n.t('uploadFamilyPage.zipExtractFailed', {
                name: zipFile.name,
                detail: err instanceof Error ? err.message : i18n.t('uploadFamilyPage.zipInvalid'),
              })
            );
          }
        }
        if (expanded.length) {
          const valid = expanded.filter((f) => isFileTypeAllowed(f));
          const invalidCount = expanded.length - valid.length;
          if (invalidCount) toast.error(i18n.t('uploadFamilyPage.skippedType', { n: invalidCount }));
          if (valid.length) {
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
              targetMemoriesEventId: selectedMemoriesEventId?.trim() ? selectedMemoriesEventId.trim() : undefined,
            });
            setQueueState(uploadManager.getState());
            if (added) toast.success(i18n.t('uploadFamilyPage.filesFromZipAdded', { n: added }));
            if (skipped) toast(i18n.t('uploadFamilyPage.skippedDuplicates', { n: skipped }));
            if (skippedDueToLimit) toast.error(i18n.t('uploadFamilyPage.queueLimitShort', { n: skippedDueToLimit }));
          }
        }
      } finally {
        setIsAddingFiles(false);
        e.target.value = '';
      }
    },
    [canUpload, isFileTypeAllowed, selectedAlbumId, selectedMemoriesEventId, defaultUploadDestination, defaultSelectedAccountIds, uploadTargetAccounts]
  );

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
        return `👥 ${t('uploadFamilyPage.destOneAccount', { name: item.targetFamilyMembers[0].otherUserFirstName })}`;
      }
      return `👥 ${t('uploadFamilyPage.destNAccounts', { n: item.targetFamilyMembers.length })}`;
    }
    if (item.uploadDestination === 'family-account' && item.targetFamilyMember) {
      return `👥 ${t('uploadFamilyPage.destOneAccount', { name: item.targetFamilyMember.otherUserFirstName })}`;
    }
    if (item.uploadDestination === 'family-account') return `👥 ${t('uploadFamilyPage.destClientSelect')}`;
    return `🏠 ${t('uploadFamilyPage.destMyAccount')}`;
  };

  const openUploadOptions = (item: QueueItem) => {
    setSelectedFileForOptions(item);
    setShowUploadOptions(true);
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast.error(t('uploadFamilyPage.toastAlbumName'));
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
      toast.success(t('uploadFamilyPage.toastAlbumCreated'));
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
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('uploadFamilyPage.toastAlbumCreateFail');
      toast.error(message);
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t('uploadFamilyPage.sizeBytes')}`;
    const k = 1024;
    const sizes = [
      t('uploadFamilyPage.sizeBytes'),
      t('uploadFamilyPage.sizeKB'),
      t('uploadFamilyPage.sizeMB'),
      t('uploadFamilyPage.sizeGB'),
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRelativeTime = (timestamp: number) => {
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return t('uploadFamilyPage.timeJustNow');
    if (sec < 3600) return t('uploadFamilyPage.timeMinAgo', { n: Math.floor(sec / 60) });
    if (sec < 86400) return t('uploadFamilyPage.timeHrAgo', { n: Math.floor(sec / 3600) });
    return t('uploadFamilyPage.timeDayAgo', { n: Math.floor(sec / 86400) });
  };

  const getStatusLabel = (status: QueueItemStatus): string => {
    switch (status) {
      case 'completed': return t('uploadFamilyPage.statusCompleted');
      case 'failed': return t('uploadFamilyPage.statusFailed');
      case 'paused': return t('uploadFamilyPage.statusPaused');
      case 'uploading': return t('uploadFamilyPage.statusUploading');
      case 'processing': return t('uploadFamilyPage.statusProcessing');
      default: return t('uploadFamilyPage.statusWaiting');
    }
  };

  const glassCard =
    'uf-card rounded-xl border p-6 shadow-sm backdrop-blur-[10px] transition-shadow duration-200 hover:shadow-md';
  const stepBadge =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dbe1ff] text-sm font-bold text-[#00174b]';

  const pendingCount = queueState.items.filter((i) => i.status === 'waiting' || i.status === 'paused').length;
  const uploadingCount = queueState.items.filter(
    (i) => i.status === 'uploading' || i.status === 'processing'
  ).length;
  const completedCount = queueState.items.filter((i) => i.status === 'completed').length;
  const failedCount = queueState.items.filter((i) => i.status === 'failed').length;
  const overallProgressPct = queueState.items.length
    ? Math.round((completedCount / queueState.items.length) * 100)
    : 0;
  const finishedCount = queueState.items.filter(
    (i) => i.status === 'completed' || i.status === 'failed'
  ).length;
  const remainingCount = queueState.items.filter((i) => i.status !== 'completed').length;
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
          ? t('uploadFamilyPage.toastRemovedOne')
          : t('uploadFamilyPage.toastRemovedMany', { n: removedIds.length })
      );
    }
  }, [t]);

  const addCompletedToAlbum = useCallback(async () => {
    if (!selectedAlbumId || completedWithIds.length === 0) return;
    handleClearFinished();
    const ids = completedWithIds.map((i) => Number(i.imageId!));
    try {
      await api.post(`/api/albums/${selectedAlbumId}/images`, { imageIds: ids });
      const name = albums.find((a) => a.id === selectedAlbumId)?.name ?? t('uploadFamilyPage.unknown');
      toast.success(t('uploadFamilyPage.toastImagesAddedAlbum', { n: ids.length, name }));
      setUploadedImageIds((prev) => [...prev, ...ids]);
      if (!addedToAlbumRef.current.has(selectedAlbumId)) addedToAlbumRef.current.set(selectedAlbumId, new Set());
      ids.forEach((id) => addedToAlbumRef.current.get(selectedAlbumId)!.add(id));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('uploadFamilyPage.toastAddAlbumFail');
      toast.error(msg);
    }
  }, [selectedAlbumId, completedWithIds, albums, t]);

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
      const albumName = albums.find((a) => a.id === albumId)?.name ?? t('uploadFamilyPage.unknown');
      api
        .post(`/api/albums/${albumId}/images`, { imageIds: toAdd })
        .then(() => {
          toAdd.forEach((id) => alreadyAdded.add(id));
          setUploadedImageIds((prev) => [...prev, ...toAdd]);
          toast.success(t('uploadFamilyPage.toastImagesAddedAlbum', { n: toAdd.length, name: albumName }));
        })
        .catch((err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            t('uploadFamilyPage.toastAddAlbumFail');
          toast.error(msg);
        });
    });
  }, [completedImageIdsKey, completedWithTargetAlbum, albums, t]);

  // When runOneUpload completes an item that has targetMemoriesEventId, attach that image to the selected Our Memories event
  const completedWithTargetEvent = queueState.items.filter(
    (i) => i.status === 'completed' && i.imageId != null && i.targetMemoriesEventId
  );
  const completedEventImageIdsKey = completedWithTargetEvent
    .map((i) => `${i.targetMemoriesEventId}:${i.imageId}`)
    .join(',');

  useEffect(() => {
    if (completedWithTargetEvent.length === 0) return;
    const byEvent = new Map<string, Array<number | string>>();
    for (const item of completedWithTargetEvent) {
      const eventId = String(item.targetMemoriesEventId || '').trim();
      if (!eventId) continue;
      const id = item.imageId!;
      if (!byEvent.has(eventId)) byEvent.set(eventId, []);
      byEvent.get(eventId)!.push(id);
    }
    byEvent.forEach((imageIds, eventId) => {
      if (!addedToMemoriesEventRef.current.has(eventId)) addedToMemoriesEventRef.current.set(eventId, new Set());
      const alreadyAdded = addedToMemoriesEventRef.current.get(eventId)!;
      const toAdd = imageIds
        .map((x) => (typeof x === 'string' ? x.trim() : x))
        .filter((x) => x != null && x !== '' && !alreadyAdded.has(String(x)));
      if (toAdd.length === 0) return;
      addImagesToMemoriesEvent(eventId, toAdd)
        .then(() => {
          toAdd.forEach((id) => alreadyAdded.add(String(id)));
          const name = memoriesEvents.find((e) => e.id === eventId)?.name ?? 'Our Memories event';
          toast.success(`✓ Added ${toAdd.length} image(s) to ${name}`);
        })
        .catch((err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to add images to event';
          toast.error(msg);
        });
    });
  }, [completedEventImageIdsKey, completedWithTargetEvent, memoriesEvents]);

  if (userLoading) {
    return (
      <div className="upload-family-page min-h-full w-full min-w-0 overflow-x-hidden">
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 py-10 md:px-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#e7e7f3]" />
          <FamilyMemberSkeleton count={3} />
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="upload-family-page flex min-h-[60vh] w-full min-w-0 items-center justify-center px-4 py-12">
        <div className={`${glassCard} w-full max-w-md text-center`}>
          <FaExclamationTriangle className="mx-auto mb-4 h-10 w-10 text-[#ba1a1a]" />
          <h1 className="mb-2 text-xl font-semibold text-[#191b23]">{t('uploadFamilyPage.profileErrorTitle')}</h1>
          <p className="mb-6 text-sm text-[#505f76]">{t('uploadFamilyPage.profileErrorBody')}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary w-full sm:w-auto">
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!canUpload()) {
    return (
      <div className="upload-family-page flex min-h-[60vh] w-full min-w-0 items-center justify-center px-4 py-12">
        <div className={`${glassCard} w-full max-w-md text-center`}>
          <FaExclamationTriangle className="mx-auto mb-4 h-10 w-10 text-[#943700]" />
          <h1 className="mb-2 text-xl font-semibold text-[#191b23]">{t('uploadFamilyPage.uploadNotAvailable')}</h1>
          <p className="text-sm text-[#505f76]">{t('uploadFamilyPage.uploadNotAllowedBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-family-page min-h-full w-full min-w-0 overflow-x-hidden pb-28">
      <style>{`
        @keyframes upload-stripes {
          0% { background-position: 0 0; }
          100% { background-position: 60px 0; }
        }
        .upload-family-page .upload-progress-striped {
          background-size: 30px 30px;
          background-image: linear-gradient(135deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);
          animation: upload-stripes 2s linear infinite;
        }
      `}</style>

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#c3c6d7] pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#004ac6]">{t('uploadFamilyPage.title')}</h1>
            <p className="mt-1 text-sm text-[#505f76]">{t('uploadFamilyPage.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${queueState.isOnline ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`}
                  aria-hidden
                />
                <span className="text-xs font-medium uppercase tracking-wide text-[#505f76]">
                  {queueState.isOnline ? t('uploadFamilyPage.online') : t('uploadFamilyPage.offline')}
                </span>
              </div>
              <p className="text-xs font-bold text-[#004ac6]">
                {queueState.isOnline ? t('uploadFamilyPage.uploadsActive') : t('uploadFamilyPage.pausedOffline')}
              </p>
            </div>
            <Cloud className="h-6 w-6 text-[#004ac6]" aria-hidden />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Step 1: Destination */}
          <section className="flex flex-col gap-4 lg:col-span-4">
            <div className={glassCard}>
              <div className="mb-4 flex items-center gap-2">
                <span className={stepBadge}>1</span>
                <h2 className="text-xl font-semibold text-[#191b23]">{t('uploadFamilyPage.uploadToLabel')}</h2>
              </div>
              <div className="uf-tab-track mb-6 flex rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setDefaultUploadDestination('my-account')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                    defaultUploadDestination === 'my-account'
                      ? 'uf-tab-active shadow-sm'
                      : 'text-[#505f76] hover:text-[#191b23]'
                  }`}
                >
                  {t('uploadFamilyPage.myAccount')}
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultUploadDestination('family-account')}
                  disabled={uploadTargetAccounts.length === 0}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    defaultUploadDestination === 'family-account'
                      ? 'uf-tab-active shadow-sm'
                      : 'text-[#505f76] hover:text-[#191b23]'
                  }`}
                >
                  {t('uploadFamilyPage.clientAccounts')}
                </button>
              </div>

              {defaultUploadDestination === 'family-account' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#505f76]" aria-hidden />
                    <input
                      type="search"
                      value={defaultAccountSearch}
                      onChange={(e) => setDefaultAccountSearch(e.target.value)}
                      placeholder={t('uploadFamilyPage.searchAccounts')}
                      className="w-full rounded-lg border border-[#c3c6d7] bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    {uploadTargetAccounts.length === 0 ? (
                      <p className="p-2 text-sm text-[#505f76]">{t('uploadFamilyPage.noClientAccounts')}</p>
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
                        <p className="p-2 text-sm text-[#505f76]">{t('uploadFamilyPage.noAccountsMatch')}</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {filtered.map((acc) => {
                            const checked = defaultSelectedAccountIds.includes(acc.inviterId);
                            return (
                              <label
                                key={acc.inviterId}
                                className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2 transition hover:border-[#c3c6d7] hover:bg-[#f3f3fe]"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setDefaultSelectedAccountIds((prev) =>
                                      prev.includes(acc.inviterId)
                                        ? prev.filter((id) => id !== acc.inviterId)
                                        : [...prev, acc.inviterId]
                                    )
                                  }
                                  className="h-4 w-4 rounded border-[#737686] text-[#004ac6] focus:ring-[#004ac6]/30"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[#191b23]">
                                    {acc.inviterFirstName} {acc.inviterLastName}
                                  </p>
                                  {acc.relationshipType ? (
                                    <p className="truncate text-xs text-[#505f76]">{acc.relationshipType}</p>
                                  ) : null}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  {defaultSelectedAccountIds.length > 0 && (
                    <p className="text-xs font-medium text-[#004ac6]">
                      {t('uploadFamilyPage.accountsSelectedLine', { n: defaultSelectedAccountIds.length })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-[#dbe1ff] bg-[#dbe1ff]/30 p-6 text-center">
                  <Cloud className="mx-auto mb-2 h-10 w-10 text-[#004ac6]" aria-hidden />
                  <p className="text-sm font-medium text-[#004ac6]">{t('uploadFamilyPage.myAccountDesc')}</p>
                  {storageUsage ? (
                    <p className="mt-1 text-sm text-[#505f76]">
                      {t('uploadFamilyPage.mbAvailable', { n: Math.max(0, storageUsage.total - storageUsage.used) })}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Upload Zone */}
          <section className="relative flex flex-col gap-4 lg:col-span-8">
            <div className={`${glassCard} relative flex flex-col !p-5`}>
              {isAddingFiles && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <LoadingSpinner size="md" text="" />
                    <p className="text-sm font-semibold text-[#191b23]">{t('uploadFamilyPage.addingFiles')}</p>
                    <p className="text-xs text-[#505f76]">{t('uploadFamilyPage.addingFilesWait', { max: MAX_UPLOAD_QUEUE })}</p>
                  </div>
                </div>
              )}
              <div className="mb-3 flex items-center gap-2">
                <span className={stepBadge}>2</span>
                <h2 className="text-lg font-semibold text-[#191b23]">{t('uploadFamilyPage.uploadZoneTitle')}</h2>
              </div>
              <div
                {...getRootProps()}
                className={`group/drop relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c3c6d7] bg-white px-4 py-5 text-center transition-all duration-200 sm:px-5 sm:py-6 ${
                  isDragActive
                    ? 'border-[#004ac6] bg-[#d0e1fb]/30 shadow-[0_8px_24px_rgba(0,74,198,0.12)]'
                    : 'hover:border-[#004ac6]/50 hover:bg-[#d0e1fb]/20'
                } ${isAddingFiles ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#d0e1fb] transition-transform duration-200 group-hover/drop:scale-105">
                  <Upload className="h-7 w-7 text-[#004ac6]" aria-hidden />
                </div>
                <h3 className="mb-0.5 text-base font-semibold text-[#191b23] sm:text-lg">
                  {isDragActive ? t('uploadFamilyPage.dropFilesHere') : t('uploadFamilyPage.dragDropHere')}
                </h3>
                <p className="mb-4 text-sm text-[#505f76]">{t('uploadFamilyPage.browseLocalDrives')}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFilePicker();
                    }}
                    disabled={!canUpload() || isAddingFiles}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#004ac6] px-5 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    {t('uploadFamilyPage.selectFiles')}
                  </button>
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    multiple
                    onChange={onZipInputChange}
                    className="hidden"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      zipInputRef.current?.click();
                    }}
                    disabled={!canUpload() || isAddingFiles}
                    title={t('uploadFamilyPage.zipTitleHint', { n: MAX_ZIP_SIZE_GB })}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#c3c6d7] bg-white px-5 py-2 text-sm font-medium text-[#191b23] transition hover:bg-[#f3f3fe] active:scale-95 disabled:opacity-50"
                  >
                    <FolderArchive className="h-4 w-4 text-[#004ac6]" aria-hidden />
                    {t('uploadFamilyPage.selectZipBtn')}
                  </button>
                </div>
                <div className="mt-4 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-left">
                    <Archive className="h-5 w-5 shrink-0 text-[#004ac6]" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-[#191b23]">{t('uploadFamilyPage.zipExtractionTitle')}</p>
                      <p className="text-sm text-[#505f76]">{t('uploadFamilyPage.zipExtractionDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <Scissors className="h-5 w-5 shrink-0 text-[#004ac6]" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-[#191b23]">{t('uploadFamilyPage.autoTrimTitle')}</p>
                      <p className="text-sm text-[#505f76]">{t('uploadFamilyPage.autoTrimDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Step 3: Upload Queue */}
          {queueState.items.length > 0 && (
            <section ref={queueListRef} className="lg:col-span-12">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={stepBadge}>3</span>
                  <h2 className="text-xl font-semibold text-[#191b23]">{t('uploadFamilyPage.uploadQueue')}</h2>
                </div>
                <span className="text-sm font-medium text-[#505f76]">
                  {t('uploadFamilyPage.filesRemaining', { n: remainingCount })}
                </span>
              </div>
              {isAddingFiles && (
                <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-[#d0e1fb]/50 px-4 py-2 text-xs font-medium text-[#505f76]">
                  <LoadingSpinner size="sm" text="" />
                  <span>{t('uploadFamilyPage.addingMoreFiles', { max: MAX_UPLOAD_QUEUE })}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {queueState.items.map((item) => {
                  const isVideo = isVideoItem(item);
                  const thumbUrl = getThumbnailUrl(item);
                  const isUploading = item.status === 'uploading' || item.status === 'processing';
                  const isCompleted = item.status === 'completed';
                  const isFailed = item.status === 'failed';
                  const progressPct =
                    item.status === 'completed' ? 100 : item.status === 'processing' ? 33 : item.progress;
                  return (
                    <article
                      key={item.id}
                      className={`${glassCard} group/card p-4 ${
                        isUploading ? 'border-l-4 border-l-[#004ac6]' : ''
                      } ${isFailed ? 'border border-[#ba1a1a]/30' : ''}`}
                    >
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e7e7f3]">
                          {thumbUrl && isVideo ? (
                            <video src={thumbUrl} className="h-full w-full object-cover" muted playsInline />
                          ) : thumbUrl ? (
                            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                          ) : isVideo ? (
                            <FaVideo className="h-8 w-8 text-[#737686]" />
                          ) : isFailed ? (
                            <AlertCircle className="h-8 w-8 text-[#ba1a1a]" />
                          ) : (
                            <FileText className="h-8 w-8 text-[#737686]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="truncate text-sm font-medium text-[#191b23]" title={item.fileName}>
                              {item.fileName}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeFromQueue(item.id)}
                              className="shrink-0 rounded p-0.5 text-[#505f76] transition hover:text-[#ba1a1a]"
                              aria-label={t('uploadFamilyPage.removeFromQueue')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-sm text-[#505f76]">
                            {formatFileSize(item.fileSize)} • {formatRelativeTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between">
                          {isCompleted ? (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                              {getStatusLabel(item.status)}
                            </span>
                          ) : isFailed ? (
                            <span className="text-xs font-bold text-[#ba1a1a]">{getStatusLabel(item.status)}</span>
                          ) : isUploading ? (
                            <span className="text-xs font-bold text-[#004ac6]">{t('uploadFamilyPage.statusUploading')}...</span>
                          ) : (
                            <span className="text-xs font-medium text-[#505f76]">{getStatusLabel(item.status)}</span>
                          )}
                          {isFailed ? (
                            <button
                              type="button"
                              onClick={() => retryUpload(item.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#004ac6] hover:underline"
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                              {t('uploadFamilyPage.retry')}
                            </button>
                          ) : (
                            <span className="text-xs text-[#505f76]">{progressPct}%</span>
                          )}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e7e7f3]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : isFailed
                                  ? 'bg-[#ba1a1a]'
                                  : 'bg-[#004ac6] upload-progress-striped'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        {item.error && (
                          <p className="mt-2 break-words text-xs text-[#ba1a1a]">
                            {item.error}
                            {item.retries > 0 &&
                              ` ${t('uploadFamilyPage.retryProgress', { current: item.retries, max: MAX_RETRIES })}`}
                          </p>
                        )}
                        {item.successMessage && isCompleted && (
                          <p className="mt-1 truncate text-xs text-emerald-700">{item.successMessage}</p>
                        )}
                        {item.status === 'paused' && (
                          <p className="mt-1 text-xs text-amber-700">{t('uploadFamilyPage.pausedOfflineResume')}</p>
                        )}
                      </div>
                      {(item.status === 'waiting' || item.status === 'paused') && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => openUploadOptions(item)}
                            className="rounded p-1 text-[#505f76] transition hover:text-[#004ac6]"
                            title={t('uploadFamilyPage.chooseDestination')}
                          >
                            <ArrowUpFromLine className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {queueState.items.length > 0 && (
        <div className="uf-footer-bar fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-4 backdrop-blur-md lg:left-[240px]">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 md:flex-row">
            <p className="shrink-0 text-sm font-medium text-[#191b23]">
              <span className="font-bold text-[#004ac6]">
                {completedCount} {t('uploadFamilyPage.of')} {queueState.items.length}
              </span>{' '}
              {t('uploadFamilyPage.filesUploadedSummary')}
            </p>
            <div className="h-3 w-full flex-1 overflow-hidden rounded-full border border-[#c3c6d7] bg-[#e7e7f3]">
              <div
                className="upload-progress-striped h-full rounded-full bg-[#004ac6] transition-all duration-500"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
            {finishedCount > 0 && (
              <button
                type="button"
                onClick={handleClearFinished}
                className="shrink-0 whitespace-nowrap rounded-lg border border-[#c3c6d7] px-6 py-2 text-sm font-medium text-[#191b23] transition hover:bg-[#f3f3fe]"
              >
                {t('uploadFamilyPage.clearFinished', { n: finishedCount })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload options modal */}
      {showUploadOptions && selectedFileForOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[min(92dvh,100%)] w-full max-w-lg overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
              <h3 className="min-w-0 pr-2 text-lg font-bold text-slate-900">
                {t('uploadFamilyPage.modalDestinationTitle')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowUploadOptions(false);
                  setSelectedFileForOptions(null);
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[min(85dvh,100%)] space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-blue-50/40 to-white p-4 shadow-sm">
                  <h4 className="mb-2 text-sm font-semibold text-slate-900 sm:text-base">{t('uploadFamilyPage.selectedFile')}</h4>
                  <div className="flex min-w-0 items-center gap-3">
                    <FaFileImage className="h-7 w-7 shrink-0 text-[#513cd2] sm:h-8 sm:w-8" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{selectedFileForOptions.fileName}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFileForOptions.fileSize)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-4 has-[:checked]:border-[#513cd2] has-[:checked]:ring-1 has-[:checked]:ring-[#513cd2]/30">
                    <input
                      type="radio"
                      name="uploadDestination"
                      checked={selectedFileForOptions.uploadDestination === 'my-account'}
                      onChange={() => setUploadDestination(selectedFileForOptions.id, 'my-account')}
                      className="mt-0.5 text-[#513cd2]"
                    />
                    <div>
                      <span className="font-medium text-slate-900">{t('uploadFamilyPage.myAccountTitle')}</span>
                      <p className="mt-0.5 text-sm text-slate-500">{t('uploadFamilyPage.myAccountDesc')}</p>
                    </div>
                  </label>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <label className="flex cursor-pointer gap-3 has-[:checked]:text-[#513cd2]">
                      <input
                        type="radio"
                        name="uploadDestination"
                        id="upload-dest-family"
                        checked={selectedFileForOptions.uploadDestination === 'family-account'}
                        onChange={() => setUploadDestination(selectedFileForOptions.id, 'family-account')}
                        className="mt-0.5 text-[#513cd2]"
                        disabled={uploadTargetAccounts.length === 0}
                      />
                      <div>
                        <span className="font-medium text-slate-900">{t('uploadFamilyPage.clientAccountTitle')}</span>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {uploadTargetAccounts.length > 0
                            ? t('uploadFamilyPage.clientAccountDescMulti')
                            : t('uploadFamilyPage.clientAccountDescEmpty')}
                        </p>
                      </div>
                    </label>
                    {selectedFileForOptions.uploadDestination === 'family-account' && (
                      <div className="ml-0 space-y-2 sm:ml-6">
                        {uploadTargetAccounts.length === 0 ? (
                          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                            {t('uploadFamilyPage.noClientAccountsDetail')}
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <span className="shrink-0 text-sm text-slate-600">{t('uploadFamilyPage.searchLabel')}</span>
                              <input
                                type="search"
                                value={accountSearchQuery}
                                onChange={(e) => setAccountSearchQuery(e.target.value)}
                                placeholder={t('uploadFamilyPage.searchAccounts')}
                                className="input-modern min-w-0 flex-1 text-sm"
                              />
                            </div>
                            <div className="overflow-hidden rounded-lg border border-slate-200" style={{ maxHeight: '10.5rem' }}>
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
                                    <p className="text-sm text-gray-500 p-2">{t('uploadFamilyPage.noAccountsMatch')}</p>
                                  ) : (
                                    filtered.map((acc) => {
                                      const checked = selectedAccountIdsForModal.includes(acc.inviterId);
                                      return (
                                        <label
                                          key={acc.inviterId}
                                          className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50"
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
                                            className="rounded border-slate-300 text-[#513cd2]"
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
                              <p className="text-xs text-slate-500">
                                {t('uploadFamilyPage.modalAccountsSelected', { n: selectedAccountIdsForModal.length })}
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
                              className="w-full rounded-xl bg-gradient-to-r from-[#513cd2] to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {selectedAccountIdsForModal.length
                                ? t('uploadFamilyPage.doneUploadTo', { n: selectedAccountIdsForModal.length })
                                : t('uploadFamilyPage.doneUploadToEllipsis')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-stretch border-t border-slate-100 pt-4 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadOptions(false);
                      setSelectedFileForOptions(null);
                    }}
                    className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-[#513cd2] to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:brightness-105 sm:w-auto"
                  >
                    {t('uploadFamilyPage.done')}
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Create album modal */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[min(92dvh,100%)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[90vh] sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 px-4 pb-4 pt-4 sm:px-0 sm:pt-0">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Folder className="text-[#004ac6]" aria-hidden />
                {t('uploadFamilyPage.createNewAlbum')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateAlbumModal(false);
                  setNewAlbumName('');
                  setNewAlbumDescription('');
                  setNewAlbumPrice('');
                  setNewAlbumIsPublic(false);
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('uploadFamilyPage.albumName')}</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder={t('uploadFamilyPage.albumNamePlaceholder')}
                  className="input-modern w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('uploadFamilyPage.albumDesc')}</label>
                <textarea
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder={t('uploadFamilyPage.albumDescPlaceholder')}
                  rows={3}
                  className="input-modern w-full resize-y"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('uploadFamilyPage.albumPrice')}</label>
                <input
                  type="number"
                  value={newAlbumPrice}
                  onChange={(e) => setNewAlbumPrice(e.target.value)}
                  placeholder={t('uploadFamilyPage.albumPricePlaceholder')}
                  min="0"
                  step="0.01"
                  className="input-modern w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('uploadFamilyPage.perPhotoPrice')}</label>
                <input
                  type="number"
                  value={perPhotoPrice}
                  onChange={(e) => setPerPhotoPrice(e.target.value)}
                  placeholder={t('uploadFamilyPage.perPhotoPlaceholder')}
                  min="0"
                  step="0.01"
                  className="input-modern w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newAlbumIsPublic}
                  onChange={(e) => setNewAlbumIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#513cd2] focus:ring-[#513cd2]/40"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-slate-700">{t('uploadFamilyPage.makeAlbumPublic')}</label>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAlbumModal(false);
                    setNewAlbumName('');
                    setNewAlbumDescription('');
                  }}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:py-2.5"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateAlbum}
                  disabled={isCreatingAlbum || !newAlbumName.trim()}
                  className="btn-primary min-h-[44px] flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingAlbum ? t('uploadFamilyPage.creating') : t('uploadFamilyPage.createAlbumBtn')}
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
