import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../state/context/AuthContext';
import { 
  FaFolder, 
  FaFolderOpen, 
  FaImages, 
  FaExclamationTriangle, 
  FaChevronRight,
  FaChevronLeft,
  FaPlus,
  FaCheck,
  FaTimes,
  FaSearch,
  FaEdit,
  FaShare,
  FaUserFriends,
  FaCopy,
  FaTrash,
  FaDownload,
  FaSpinner
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client/axiosInstance';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DashboardLoading from '../../components/common/DashboardLoading';
import toast from 'react-hot-toast';
import ShareAlbumModal from './ShareAlbumModal';
import PublicShareModal from '../../components/modals/PublicShareModal';
import { downloadSingleImage, downloadImagesAsZip as downloadZip } from '../../utils/downloadUtils';

interface Album {
  id: number;
  name: string;
  description?: string;
  imageCount?: number;
  coverImageId?: number | null;
  coverImageUrl?: string | null;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: AlbumImage[];
  imageIds?: number[];
  perAlbumPrice?: number | null;
  isPublic?: boolean;
  [key: string]: any;
}


interface UserImagesResponse {
  totalImages: number;
  images: UserImage[];
  page?: number;
  size?: number;
  totalPages?: number;
}
interface AlbumImage {
  id: number;
  originalFilename: string;
  storedFilename?: string;
  s3PublicUrl?: string | null;
  b2PublicUrl?: string | null;
  googleDriveViewUrl?: string | null;
  uploadTime?: string;
  isPublic?: boolean;
  // Legacy fields for compatibility
  filename?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  fileType?: string;
  [key: string]: any;
}

interface UserImage {
  id: number | string;
  filename: string;
  previewUrl: string;
  downloadUrl: string;
  fileType: string;
  [key: string]: any;
}

// Normalize infinite-query cache so pages/pageParams are always arrays (prevents getNextPageParam .length crash)
function normalizeInfiniteCache(old: unknown): { pages: unknown[]; pageParams: number[] } {
  if (old == null || typeof old !== 'object') return { pages: [], pageParams: [0] };
  const o = old as Record<string, unknown> & { pages?: unknown; pageParams?: unknown };
  const pages = Array.isArray(o.pages) ? o.pages : [];
  const pageParams = Array.isArray(o.pageParams) ? o.pageParams : [0];
  return { ...o, pages, pageParams };
}

/** Full-page skeleton while albums are loading (matches header + toolbar + grid layout). */
function AlbumsPageSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div className="p-6 space-y-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{loadingLabel}</span>
      {/* Header — mirrors real toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-100 animate-pulse" />
            <div className="h-8 w-52 max-w-full rounded-lg bg-gray-200 animate-pulse" />
          </div>
          <div className="h-4 w-[min(100%,20rem)] rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <div className="h-10 w-40 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-10 w-36 rounded-lg bg-indigo-200/90 animate-pulse" />
        </div>
      </div>
      {/* Toolbar row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
          <div className="h-9 w-14 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-10 w-40 rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div className="h-10 w-full max-w-sm rounded-xl bg-gray-100 animate-pulse sm:ml-auto" />
      </div>
      {/* Card shell + grid */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex justify-center border-b border-gray-100 pb-6">
          <LoadingSpinner size="md" text="" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-4/5 max-w-[90%] animate-pulse rounded-md bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PhotoStudioAlbum: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddImagesModal, setShowAddImagesModal] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set());
  const [clients, setClients] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isTransferringToPhotoBook, setIsTransferringToPhotoBook] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [pendingAlbumIds, setPendingAlbumIds] = useState<number[]>([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [newAlbumPrice, setNewAlbumPrice] = useState('');
  const [newPerPhotoPrice, setNewPerPhotoPrice] = useState('');
  const [newAlbumIsPublic, setNewAlbumIsPublic] = useState(false);
  const [editAlbumName, setEditAlbumName] = useState('');
  const [editAlbumDescription, setEditAlbumDescription] = useState('');
  const [editAlbumPrice, setEditAlbumPrice] = useState('');
  const [editPerPhotoPrice, setEditPerPhotoPrice] = useState('');
  const [editAlbumIsPublic, setEditAlbumIsPublic] = useState(false);
  const [albumSearch, setAlbumSearch] = useState('');
  const [viewingAlbumId, setViewingAlbumId] = useState<number | null>(null);
  const [menuOpenAlbumId, setMenuOpenAlbumId] = useState<number | null>(null);
  const [albumSort, setAlbumSort] = useState<'name' | 'date'>('date');
  const ALBUMS_PAGE_SIZE = 20;
  const USER_IMAGES_PAGE_SIZE = 20;
  const loadMoreAlbumsRef = useRef<HTMLDivElement | null>(null);
  const addImagesModalSentinelRef = useRef<HTMLDivElement | null>(null);
  const [albumImages, setAlbumImages] = useState<Map<number, AlbumImage[]>>(new Map());
  const [coverImageErrors, setCoverImageErrors] = useState<Set<number>>(new Set());
  const [fullScreenImage, setFullScreenImage] = useState<{ image: AlbumImage; albumId: number; index: number } | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Per-photo selection inside album detail view
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [showPhotoShareModal, setShowPhotoShareModal] = useState(false);
  const [photoShareContactIds, setPhotoShareContactIds] = useState<Set<string>>(new Set());
  const [photoShareNewEmails, setPhotoShareNewEmails] = useState('');
  const [photoShareNewMobileCountryCode, setPhotoShareNewMobileCountryCode] = useState('+91');
  const [photoShareNewMobiles, setPhotoShareNewMobiles] = useState('');
  const [photoShareMessage, setPhotoShareMessage] = useState('');
  const [photoShareChannels, setPhotoShareChannels] = useState<{ email: boolean; sms: boolean }>({ email: false, sms: false });
  const [photoShareSending, setPhotoShareSending] = useState(false);
  const [photoShareContactSearch, setPhotoShareContactSearch] = useState('');
  const [photoShareAlreadySent, setPhotoShareAlreadySent] = useState<{ email?: string; mobile?: string; alreadySent: boolean } | null>(null);

  // Share-album management (same link updates)
  const [shareAlbums, setShareAlbums] = useState<
    { shareAlbumId: number; token: string; status?: string | null; createdAt?: string | null }[]
  >([]);
  const [selectedShareAlbumId, setSelectedShareAlbumId] = useState<number | null>(null);
  const selectedShareAlbum = useMemo(() => {
    if (!selectedShareAlbumId) return null;
    return shareAlbums.find((a) => a.shareAlbumId === selectedShareAlbumId) ?? null;
  }, [shareAlbums, selectedShareAlbumId]);
  const [shareRecipients, setShareRecipients] = useState<{ recipientEmail?: string | null; recipientMobile?: string | null }[]>([]);
  const [shareManageLoading, setShareManageLoading] = useState(false);
  const [shareManageError, setShareManageError] = useState<string | null>(null);
  const [sharedImageIds, setSharedImageIds] = useState<Set<number>>(new Set());
  const [isEditingSharedImages, setIsEditingSharedImages] = useState(false);
  const [savingSharedImages, setSavingSharedImages] = useState(false);
  const [sharedImagesOnly, setSharedImagesOnly] = useState(false);
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');
  const [addingRecipient, setAddingRecipient] = useState(false);

  // Share link modal (public URL – send to contacts / email / SMS, same as StudioCheckout)
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [shareLinkContactIds, setShareLinkContactIds] = useState<Set<string>>(new Set());
  const [shareLinkNewEmails, setShareLinkNewEmails] = useState('');
  const [shareLinkNewMobileCountryCode, setShareLinkNewMobileCountryCode] = useState('+91');
  const [shareLinkNewMobiles, setShareLinkNewMobiles] = useState('');
  const [shareLinkMessage, setShareLinkMessage] = useState('');
  const [shareLinkChannels, setShareLinkChannels] = useState<{ email: boolean; sms: boolean }>({ email: false, sms: false });
  const [shareLinkUrlType, setShareLinkUrlType] = useState<'checkout' | 'selection' | 'images_display'>('selection');
  const [shareLinkSending, setShareLinkSending] = useState(false);
  const [shareLinkContactSearch, setShareLinkContactSearch] = useState('');
  const [shareLinkAlreadySent, setShareLinkAlreadySent] = useState<{ email?: string; mobile?: string; alreadySent: boolean } | null>(null);
  const [shareLinkId, setShareLinkId] = useState<string | null>(null);

  const userId = user?.id;

  const albumsInfiniteDefaults = useMemo(
    () => ({ pages: [] as { albums: Album[]; page?: number; totalPages?: number }[], pageParams: [0] as number[] }),
    []
  );

  const {
    data: albumsData,
    isLoading,
    isFetching,
    isError,
    refetch,
    isFetchingNextPage: isFetchingMoreAlbums,
    hasNextPage: hasMoreAlbums,
    fetchNextPage: fetchMoreAlbums,
  } = useInfiniteQuery({
    queryKey: ['albums'],
    enabled: !authLoading,
    queryFn: async ({ pageParam }): Promise<{ albums: Album[]; page: number; totalPages: number }> => {
      try {
        const response = await api.get('/api/albums', {
          params: { page: pageParam, size: ALBUMS_PAGE_SIZE },
        });
        const data = response?.data;
        const fallback = { albums: [] as Album[], page: 0, totalPages: 1 };
        if (data == null) return fallback;
        let albums: Album[];
        let page: number;
        let totalPages: number;
        if (Array.isArray(data)) {
          albums = data.map((a: Album) => ({ ...a, images: Array.isArray(a?.images) ? a.images : [] }));
          page = Number(pageParam) || 0;
          totalPages = 1;
        } else {
          const raw = data as { albums?: Album[]; page?: number; totalPages?: number };
          albums = Array.isArray(raw.albums) ? raw.albums.map((a: Album) => ({ ...a, images: Array.isArray(a?.images) ? a.images : [] })) : [];
          page = Number(raw.page ?? pageParam);
          totalPages = Number(raw.totalPages ?? 1);
          if (!Number.isFinite(totalPages) || totalPages < 1) totalPages = 1;
          if (!Number.isFinite(page)) page = Number(pageParam) || 0;
        }
        return { albums, page, totalPages };
      } catch {
        return { albums: [], page: Number(pageParam) || 0, totalPages: 1 };
      }
    },
    initialPageParam: 0,
    initialData: () => albumsInfiniteDefaults,
    placeholderData: (prev) => {
      if (prev && Array.isArray(prev?.pages) && Array.isArray(prev?.pageParams)) return prev;
      return albumsInfiniteDefaults;
    },
    getNextPageParam: (lastPage: unknown): number | undefined => {
      if (lastPage == null || typeof lastPage !== 'object') return undefined;
      const p = lastPage as { page?: number; totalPages?: number };
      const totalPages = Number(p?.totalPages ?? 1);
      if (!Number.isFinite(totalPages) || totalPages < 1) return undefined;
      const page = Number(p?.page ?? 0);
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Log query state
  useEffect(() => {
  }, [isLoading, isError, albumsData, authLoading, userId]);

  const userImagesInfiniteDefaults = useMemo(
    () => ({ pages: [] as UserImagesResponse[], pageParams: [0] as number[] }),
    []
  );

  const {
    data: userImagesData,
    error,
    isFetchingNextPage: isFetchingMoreUserImages,
    hasNextPage: hasMoreUserImages,
    fetchNextPage: fetchMoreUserImages,
  } = useInfiniteQuery({
    queryKey: ['userImages-gallery'],
    queryFn: async ({ pageParam }): Promise<UserImagesResponse> => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/api/images/user/all', {
          params: { token, page: pageParam, size: USER_IMAGES_PAGE_SIZE },
        });
        const data = response?.data;
        const fallback: UserImagesResponse = { totalImages: 0, images: [], page: 0, totalPages: 1 };
        if (data == null) return fallback;
        const out = data as UserImagesResponse;
        const images = Array.isArray(out?.images) ? out.images : [];
        const page = Number(out?.page ?? pageParam);
        const totalPages = Number(out?.totalPages ?? 1);
        return {
          totalImages: Number(out?.totalImages) >= 0 ? Number(out.totalImages) : images.length,
          images,
          page: Number.isFinite(page) ? page : Number(pageParam) || 0,
          totalPages: Number.isFinite(totalPages) && totalPages >= 1 ? totalPages : 1,
        };
      } catch {
        return { totalImages: 0, images: [], page: Number(pageParam) || 0, totalPages: 1 };
      }
    },
    initialPageParam: 0,
    initialData: () => userImagesInfiniteDefaults,
    placeholderData: (prev) => {
      if (prev && Array.isArray(prev?.pages) && Array.isArray(prev?.pageParams)) return prev;
      return userImagesInfiniteDefaults;
    },
    getNextPageParam: (lastPage: unknown): number | undefined => {
      if (lastPage == null || typeof lastPage !== 'object') return undefined;
      const p = lastPage as { page?: number; totalPages?: number };
      const totalPages = Number(p?.totalPages ?? 1);
      if (!Number.isFinite(totalPages) || totalPages < 1) return undefined;
      const page = Number(p?.page ?? 0);
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 2,
    refetchInterval: 300000,
    enabled: true,
  });

  const albums = useMemo(() => {
    const pages = albumsData?.pages;
    if (!pages || !Array.isArray(pages) || pages?.length === 0) return [];
    return pages.flatMap((p) => (p && (p as { albums?: Album[] }).albums) ?? []);
  }, [albumsData]);

  /** initialData makes isLoading often false; show skeleton until first page has loaded when list is still empty */
  const showAlbumsSkeleton = useMemo(() => {
    if (isError) return false;
    return isLoading || (isFetching && albums.length === 0 && !isFetchingMoreAlbums);
  }, [isError, isLoading, isFetching, albums.length, isFetchingMoreAlbums]);

  const albumsTotal = useMemo(() => {
    const pages = albumsData?.pages;
    if (!pages || !Array.isArray(pages) || pages?.length === 0) return albums?.length;
    const first = pages[0] as { total?: number } | undefined;
    if (!first) return albums?.length;
    return first.total ?? albums?.length;
  }, [albumsData, albums?.length]);

  const userImages = useMemo(() => {
    const pages = userImagesData?.pages;
    if (!pages || !Array.isArray(pages) || pages?.length === 0) return [];
    return pages.flatMap((p) => (p as UserImagesResponse).images ?? []);
  }, [userImagesData]);

  const filteredAlbums = useMemo(() => {
    if (!albumSearch.trim()) return albums;
    const q = albumSearch.toLowerCase();
    return albums.filter((album) => album.name.toLowerCase().includes(q));
  }, [albums, albumSearch]);

  const filteredAndSortedAlbums = useMemo(() => {
    const list = [...filteredAlbums];
    if (albumSort === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    } else {
      list.sort((a, b) => {
        const da = a.updatedAt || a.createdAt ? new Date(a.updatedAt || a.createdAt!).getTime() : 0;
        const db = b.updatedAt || b.createdAt ? new Date(b.updatedAt || b.createdAt!).getTime() : 0;
        return db - da;
      });
    }
    return list;
  }, [filteredAlbums, albumSort]);

  const selectedAlbumsName = useMemo(() => {
    const selected = albums.filter((a) => selectedAlbums.has(a.id));
    if (selected.length === 0) return 'My Album';
    if (selected.length === 1) return selected[0]?.name || 'My Album';
    return `${selected.length} Albums`;
  }, [albums, selectedAlbums]);

  // Populate album images from album data when albums are loaded
  useEffect(() => {
    if (albums?.length > 0) {
      albums.forEach((album: Album) => {
        if (album?.images && Array.isArray(album?.images) && album.images?.length > 0) {
          setAlbumImages((prev) => {
            if (!prev.has(album.id)) {
              const next = new Map(prev);
              next.set(album.id, album.images || []);
              return next;
            }
            return prev;
          });
        }
      });
    }
  }, [albums]);

  // Handle keyboard navigation for full-screen image viewer
  useEffect(() => {
    if (!fullScreenImage) return;
    
    const { albumId, index } = fullScreenImage;
    const images = albumImages.get(albumId) || extractAlbumImages(albums.find(a => a.id === albumId) || {} as Album);
    const total = images?.length || 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (total === 0) return;
      if (e.key === 'Escape') {
        setFullScreenImage(null);
      } else if (e.key === 'ArrowLeft') {
        const previousIndex = (index - 1 + total) % total;
        setFullScreenImage({ image: images[previousIndex], albumId, index: previousIndex });
      } else if (e.key === 'ArrowRight') {
        const nextIndex = (index + 1) % total;
        setFullScreenImage({ image: images[nextIndex], albumId, index: nextIndex });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullScreenImage, albumImages, albums]);

  // Infinite scroll: albums list
  useEffect(() => {
    const el = loadMoreAlbumsRef.current;
    if (!el || !hasMoreAlbums || isFetchingMoreAlbums) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) fetchMoreAlbums(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreAlbums, isFetchingMoreAlbums, fetchMoreAlbums]);

  // Infinite scroll: Add Images modal (when modal is open)
  useEffect(() => {
    if (showAddImagesModal === null) return;
    const el = addImagesModalSentinelRef.current;
    if (!el || !hasMoreUserImages || isFetchingMoreUserImages) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) fetchMoreUserImages(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showAddImagesModal, hasMoreUserImages, isFetchingMoreUserImages, fetchMoreUserImages]);

  // Create album mutation
  const createAlbumMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; perAlbumPrice?: number; perPhotoPrice?: number; isPublic?: boolean; imageIds?: (number | string)[] }) => {
      const response = await api.post('/api/albums', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('photoStudioAlbumPage.toastAlbumCreated'));
      setShowCreateModal(false);
      setNewAlbumName('');
      setNewAlbumDescription('');
      setNewAlbumPrice('');
      setNewPerPhotoPrice('');
      setNewAlbumIsPublic(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('photoStudioAlbumPage.toastFailedCreate'));
    },
  });

  // Add images to album mutation
  const addImagesMutation = useMutation({
    mutationFn: async ({ albumId, imageIds }: { albumId: number; imageIds: (number | string)[] }) => {
      const response = await api.post(`/api/albums/${albumId}/images`, { imageIds });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      // Clear cached images for this album so they refresh after albums refetch
      setAlbumImages((prev) => {
        const next = new Map(prev);
        next.delete(variables.albumId);
        return next;
      });
      toast.success(t('photoStudioAlbumPage.toastImagesAdded'));
      setShowAddImagesModal(null);
      setSelectedImages(new Set());
      // Albums will be refetched, and images will be extracted when album is expanded
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('photoStudioAlbumPage.toastFailedAddImages'));
    },
  });

  // Update album mutation
  const updateAlbumMutation = useMutation({
    mutationFn: async ({ albumId, name, description, perAlbumPrice, perPhotoPrice, isPublic }: { albumId: number; name: string; description?: string; perAlbumPrice?: number; perPhotoPrice?: number; isPublic?: boolean }) => {
      const response = await api.put(`/api/albums/${albumId}`, { name, description, perAlbumPrice, perPhotoPrice, isPublic });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('photoStudioAlbumPage.toastAlbumUpdated'));
      setShowEditModal(null);
      setEditAlbumName('');
      setEditAlbumDescription('');
      setEditAlbumPrice('');
      setEditPerPhotoPrice('');
      setEditAlbumIsPublic(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('photoStudioAlbumPage.toastFailedUpdate'));
    },
  });

  // Delete album mutation
  const deleteAlbumMutation = useMutation({
    mutationFn: async (albumId: number) => {
      const response = await api.delete(`/api/albums/${albumId}`);
      return response.data;
    },
    onSuccess: (_, albumId) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      setAlbumImages((prev) => {
        const next = new Map(prev);
        next.delete(albumId);
        return next;
      });
      setMenuOpenAlbumId(null);
      setViewingAlbumId((id) => (id === albumId ? null : id));
      toast.success(t('photoStudioAlbumPage.toastAlbumDeleted'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('photoStudioAlbumPage.toastFailedDelete'));
    },
  });

  // Share album mutation
  const shareAlbumMutation = useMutation({
    mutationFn: async ({ albumId, clientIds }: { albumId: number; clientIds: number[] }) => {
      const response = await api.post(`/api/simple-invitations/share-album`, {
        albumId,
        clientIds
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('photoStudioAlbumPage.toastSharedWith', { count: variables.clientIds?.length ?? 0 }));
      setShowShareModal(null);
      setSelectedClients(new Set());
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || t('photoStudioAlbumPage.toastFailedShare');
      
      // Handle invalid client IDs specifically
      if (errorData?.invalidClientIds && Array.isArray(errorData.invalidClientIds) && errorData.invalidClientIds?.length > 0) {
        const invalidIds = errorData.invalidClientIds.join(', ');
        toast.error(t('photoStudioAlbumPage.toastInvalidClientIds', { message: errorMessage, ids: invalidIds }), {
          duration: 6000,
        });
        
        // Remove invalid client IDs from selection
        setSelectedClients((prev) => {
          const next = new Set(prev);
          errorData.invalidClientIds.forEach((id: number) => {
            next.delete(id);
          });
          return next;
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  // Fetch all family members for sharing (you, parents, siblings, spouse, children, grandparents, unclesAunts, cousins, clients)
  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const response = await api.get('/api/simple-invitations/family-relationships');
      const allMembers: any[] = [];

      const toMember = (m: any) => {
        if (!m || (m.userId == null && !m.name && !m.email)) return null;
        return {
          id: m.userId ?? m.id,
          userId: m.userId,
          firstName: m.name?.split(' ')[0] || m.name || '',
          lastName: m.name?.split(' ').slice(1).join(' ') || '',
          fullName: m.name || '',
          email: m.email,
          username: m.username,
          relation: m.relation || 'Member',
        };
      };

      const addMember = (m: any) => {
        const member = toMember(m);
        if (member) allMembers.push(member);
      };

      const addList = (list: any[]) => {
        if (!Array.isArray(list)) return;
        list.forEach((m: any) => {
          addMember(m);
          if (m?.clients?.length) addList(m.clients);
        });
      };

      const data = response?.data;
      const fd = data?.familyData;
      if (fd && typeof fd === 'object') {
        if (fd.you) addMember(fd.you);
        addList(fd.parents ?? []);
        addList(fd.siblings ?? []);
        if (fd.spouse) addMember(fd.spouse);
        addList(fd.children ?? []);
        addList(fd.grandparents ?? []);
        addList(fd.unclesAunts ?? []);
        addList(fd.cousins ?? []);
        addList(fd.clients ?? []);
      }
      if (Array.isArray(data?.clients) && allMembers?.length === 0) addList(data.clients);

      const unique = allMembers.filter(
        (c, i, self) => i === self.findIndex((x) => (x.id ?? x.userId) === (c.id ?? c.userId))
      );
      setClients(unique);
    } catch (error: any) {
      console.error('Error fetching family members:', error);
      toast.error(t('photoStudioAlbumPage.toastFailedLoadMembers'));
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [t]);

  // Load clients when share modal opens
  useEffect(() => {
    if (showShareModal !== null && clients?.length === 0) {
      fetchClients();
    }
  }, [showShareModal, clients?.length, fetchClients]);

  const handleShareAlbum = (album: Album) => {
    setShowShareModal(album.id);
    setSelectedClients(new Set());
  };

  const toggleClientSelection = (clientId: number) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleConfirmShare = () => {
    if (showShareModal === null) return;
    if (selectedClients.size === 0) {
      toast.error(t('photoStudioAlbumPage.toastSelectClient'));
      return;
    }
    
    shareAlbumMutation.mutate({
      albumId: showShareModal,
      clientIds: Array.from(selectedClients)
    });
  };

  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) {
      toast.error(t('photoStudioAlbumPage.toastEnterAlbumName'));
      return;
    }
    // Note: imageIds can be included when creating album, but we'll add images separately
    const perAlbumPrice = newAlbumPrice.trim() ? parseFloat(newAlbumPrice.trim()) : undefined;
    const perPhotoPrice = newPerPhotoPrice.trim() ? parseFloat(newPerPhotoPrice.trim()) : undefined;
    createAlbumMutation.mutate({
      name: newAlbumName.trim(),
      description: newAlbumDescription.trim() || undefined,
      perAlbumPrice: perAlbumPrice && !isNaN(perAlbumPrice) && perAlbumPrice > 0 ? perAlbumPrice : undefined,
      perPhotoPrice: perPhotoPrice && !isNaN(perPhotoPrice) && perPhotoPrice > 0 ? perPhotoPrice : undefined,
      isPublic: newAlbumIsPublic,
    });
  };

  const handleEditAlbum = (album: Album) => {
    setEditAlbumName(album.name);
    setEditAlbumDescription(album.description || '');
    setEditAlbumPrice(album.perAlbumPrice ? String(album.perAlbumPrice) : '');
    setEditPerPhotoPrice(album.perPhotoPrice ? String(album.perPhotoPrice) : '');
    setEditAlbumIsPublic(album.isPublic || false);
    setShowEditModal(album.id);
  };

  const handleUpdateAlbum = () => {
    if (!showEditModal) return;
    if (!editAlbumName.trim()) {
      toast.error(t('photoStudioAlbumPage.toastEnterAlbumName'));
      return;
    }
    const perAlbumPrice = editAlbumPrice.trim() ? parseFloat(editAlbumPrice.trim()) : undefined;
    const perPhotoPrice = editPerPhotoPrice.trim() ? parseFloat(editPerPhotoPrice.trim()) : undefined;
    updateAlbumMutation.mutate({
      albumId: showEditModal,
      name: editAlbumName.trim(),
      description: editAlbumDescription.trim() || undefined,
      perAlbumPrice: perAlbumPrice && !isNaN(perAlbumPrice) && perAlbumPrice > 0 ? perAlbumPrice : undefined,
      perPhotoPrice: perPhotoPrice && !isNaN(perPhotoPrice) && perPhotoPrice > 0 ? perPhotoPrice : undefined,
      isPublic: editAlbumIsPublic,
    });
  };

  const handleAddImagesToAlbum = (albumId: number) => {
    if (selectedImages.size === 0) {
      toast.error(t('photoStudioAlbumPage.toastSelectImage'));
      return;
    }
    // Convert string IDs back to numbers if needed for API
    const imageIds = Array.from(selectedImages).map(id => {
      const numId = Number(id);
      return isNaN(numId) ? id : numId;
    });
    addImagesMutation.mutate({
      albumId,
      imageIds,
    });
  };

  const toggleImageSelection = useCallback((imageId: number | string) => {
    const normalizedId = String(imageId);
    
    setSelectedImages((prev) => {
      const next = new Set<string>(prev);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
  }, []);

  // Extract images from album data
  // Note: API doesn't support GET /api/albums/{id}/images
  // Images should be included in the album response from GET /api/albums
  const extractAlbumImages = (album: Album): AlbumImage[] => {
    if (album.images && Array.isArray(album.images)) {
      return album.images;
    }
    return [];
  };

  const getThumbnailUrl = (image: AlbumImage): string | null => {
    if (image.thumbnailUrl) return image.thumbnailUrl;
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  // Get image URL (prefer s3PublicUrl, fallback to b2PublicUrl, then googleDriveViewUrl)
  const getImageUrl = (image: AlbumImage): string | null => {
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  // Get image filename
  const getImageFilename = (image: AlbumImage): string => {
    return image.originalFilename || image.filename || t('photoStudioAlbumPage.unknown');
  };

  const downloadImagesAsZip = useCallback(
    async (images: AlbumImage[], zipNameBase: string) => {
      if (isDownloadingZip) return;
      if (!images?.length) {
        toast.error(t('photoStudioAlbumPage.noImagesAvailable'));
        return;
      }
      setIsDownloadingZip(true);
      try {
        await downloadZip(images, zipNameBase);
        toast.success(t('photoStudioAlbumPage.toastDownloadStarted'));
      } catch {
        toast.error(t('photoStudioAlbumPage.toastFailedDownloadZip'));
      } finally {
        setIsDownloadingZip(false);
      }
    },
    [isDownloadingZip, t]
  );

  // Get file type from filename
  const getFileType = (image: AlbumImage): string => {
    const filename = getImageFilename(image);
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return extension || image.fileType || 'unknown';
  };

  // Cover image: album.coverImageUrl or first image in album
  const getCoverImageUrl = useCallback((album: Album): string | null => {
    if (album.coverImageUrl && !coverImageErrors.has(album.id)) return album.coverImageUrl;
    const images = albumImages.get(album.id) || extractAlbumImages(album);
    const first = images[0];
    if (!first) return null;
    return getThumbnailUrl(first) || getImageUrl(first);
  }, [albumImages, coverImageErrors, extractAlbumImages, getThumbnailUrl, getImageUrl]);

  // Share link: images from selected albums (for building public URLs)
  const shareLinkSelectedImages = useMemo((): AlbumImage[] => {
    const out: AlbumImage[] = [];
    const seenIds = new Set<number>();
    selectedAlbums.forEach((albumId) => {
      const album = albums.find((a) => a.id === albumId);
      const images = album ? (albumImages.get(albumId) || extractAlbumImages(album)) : [];
      images.forEach((img) => {
        if (img.id && !seenIds.has(img.id)) {
          seenIds.add(img.id);
          out.push(img);
        }
      });
    });
    return out;
  }, [selectedAlbums, albums, albumImages]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tokenForUrl = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : '';
  const shareLinkSingleAlbumId = selectedAlbums.size === 1 ? Array.from(selectedAlbums)[0] : null;
  const shareLinkAlbumIdQuery = shareLinkSingleAlbumId != null ? `&albumId=${shareLinkSingleAlbumId}` : '';

  // DB-backed share album token for images-display links (lets us modify images later by creating a new link)
  const [shareLinkAlbumToken, setShareLinkAlbumToken] = useState<string | null>(null);
  const [shareLinkAlbumTokenLoading, setShareLinkAlbumTokenLoading] = useState(false);

  const longPublicSelectionUrl = useMemo(() => {
    if (shareLinkSelectedImages.length === 0) return '';
    const fileNames = shareLinkSelectedImages.map((img) => getImageFilename(img)).join(',');
    return `${baseUrl}/public/selection?token=${encodeURIComponent(tokenForUrl)}${shareLinkAlbumIdQuery}&files=${encodeURIComponent(fileNames)}`;
  }, [shareLinkSelectedImages, tokenForUrl, baseUrl, shareLinkAlbumIdQuery]);

  const longPublicCheckoutUrl = useMemo(() => {
    if (shareLinkSelectedImages.length === 0) return '';
    const fileNames = shareLinkSelectedImages.map((img) => getImageFilename(img)).join(',');
    return `${baseUrl}/public/checkout?token=${encodeURIComponent(tokenForUrl)}${shareLinkAlbumIdQuery}&files=${encodeURIComponent(fileNames)}`;
  }, [shareLinkSelectedImages, tokenForUrl, baseUrl, shareLinkAlbumIdQuery]);

  // Generate short share link (sid) via API – same as StudioCheckout
  useEffect(() => {
    if (shareLinkSelectedImages.length === 0) {
      setShareLinkId(null);
      return;
    }
    let cancelled = false;
    const fileNames = shareLinkSelectedImages.map((img) => getImageFilename(img));
    api
      .post<{ id?: string }>('/api/public/share-link', {
        token: tokenForUrl,
        albumId: shareLinkSingleAlbumId ?? undefined,
        fileNames,
      })
      .then((res) => {
        const id = res.data?.id;
        if (!cancelled && id) setShareLinkId(id);
      })
      .catch(() => {
        if (!cancelled) setShareLinkId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareLinkSelectedImages, tokenForUrl, shareLinkSingleAlbumId]);

  const publicCheckoutUrl = shareLinkId
    ? `${baseUrl}/public/checkout?sid=${encodeURIComponent(shareLinkId)}`
    : longPublicCheckoutUrl;
  const publicSelectionUrl = shareLinkId
    ? `${baseUrl}/public/selection?sid=${encodeURIComponent(shareLinkId)}`
    : longPublicSelectionUrl;

  // Create a DB-backed share album for the selected images (only needed for images-display links).
  useEffect(() => {
    if (shareLinkSelectedImages.length === 0) {
      setShareLinkAlbumToken(null);
      setShareLinkAlbumTokenLoading(false);
      return;
    }
    // Important UX rule:
    // - Only create/maintain a stable albumToken when the selection belongs to EXACTLY one studio album.
    // - For multi-album selections, fall back to the old imageIds link to avoid generating extra tokens.
    if (!shareLinkSingleAlbumId) {
      setShareLinkAlbumToken(null);
      setShareLinkAlbumTokenLoading(false);
      return;
    }
    let cancelled = false;
    setShareLinkAlbumTokenLoading(true);
    const imageIds = shareLinkSelectedImages.map((img) => img.id);
    api
      .post<{ token?: string; shareAlbumId?: number }>('/api/public-share/albums', {
        imageIds,
        sourceAlbumId: shareLinkSingleAlbumId,
        title: albums.find((a) => a.id === shareLinkSingleAlbumId)?.name ?? undefined,
      })
      .then((res) => {
        const tok = res.data?.token ?? null;
        if (!cancelled) setShareLinkAlbumToken(tok);
      })
      .catch(() => {
        if (!cancelled) setShareLinkAlbumToken(null);
      })
      .finally(() => {
        if (!cancelled) setShareLinkAlbumTokenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareLinkSelectedImages, shareLinkSingleAlbumId, albums]);

  // When we create a DB-backed share album for selected albums, tag it with sourceAlbumId if exactly one album selected.
  // (this enables “manage share from inside album” UX)

  // When viewing a single studio album, load its latest share album (if any) and recipients.
  useEffect(() => {
    if (viewingAlbumId == null) {
      setShareAlbums([]);
      setSelectedShareAlbumId(null);
      setShareRecipients([]);
      setSharedImageIds(new Set());
      setIsEditingSharedImages(false);
      setShareManageError(null);
      return;
    }
    let cancelled = false;
    setShareManageLoading(true);
    setShareManageError(null);
    api
      .get<{ albums?: any[] }>(`/api/public-share/albums/source/list`, { params: { albumId: viewingAlbumId } })
      .then(async (res) => {
        if (cancelled) return;
        const items = Array.isArray(res.data?.albums) ? res.data.albums : [];
        const mapped = items
          .map((a) => ({
            shareAlbumId: Number(a.shareAlbumId ?? 0),
            token: String(a.token ?? ''),
            status: a.status ?? null,
            createdAt: a.createdAt ?? null,
          }))
          .filter((a) => a.shareAlbumId > 0 && a.token);
        setShareAlbums(mapped);
        const defaultSelected = mapped.find((a) => String(a.status ?? '').toUpperCase() === 'ACTIVE') ?? mapped[0] ?? null;
        setSelectedShareAlbumId(defaultSelected ? defaultSelected.shareAlbumId : null);
      })
      .catch(() => {
        if (!cancelled) {
          setShareAlbums([]);
          setSelectedShareAlbumId(null);
          setShareRecipients([]);
          setSharedImageIds(new Set());
          setShareManageError('Could not load share info');
        }
      })
      .finally(() => {
        if (!cancelled) setShareManageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingAlbumId]);

  // When selected share link changes, load its recipients and current shared images.
  useEffect(() => {
    if (!selectedShareAlbum || !selectedShareAlbumId) {
      setShareRecipients([]);
      setSharedImageIds(new Set());
      setIsEditingSharedImages(false);
      return;
    }
    let cancelled = false;
    const shareAlbumId = selectedShareAlbumId;
    const token = selectedShareAlbum.token;

    (async () => {
      // Resolve current image ids for marking selections.
      try {
        const resolved = await api.get<{ imageIds?: number[] }>(`/api/public-share/albums/${shareAlbumId}/resolve`);
        const ids = Array.isArray(resolved.data?.imageIds)
          ? resolved.data.imageIds.map((x) => Number(x)).filter((n) => !isNaN(n))
          : [];
        if (!cancelled) setSharedImageIds(new Set(ids));
      } catch {
        if (!cancelled) setSharedImageIds(new Set());
      }

      // Load recipients list
      try {
        const rec = await api.get<{ recipients?: { recipientEmail?: string | null; recipientMobile?: string | null }[] }>(
          `/api/public-share/albums/${shareAlbumId}/recipients`
        );
        if (!cancelled) setShareRecipients(Array.isArray(rec.data?.recipients) ? rec.data.recipients : []);
      } catch {
        if (!cancelled) setShareRecipients([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedShareAlbum, selectedShareAlbumId]);

  const publicImagesDisplayUrl = useMemo(() => {
    if (shareLinkSelectedImages.length === 0) return '';
    if (shareLinkAlbumTokenLoading) return '';
    if (shareLinkAlbumToken) {
      return `${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&albumToken=${encodeURIComponent(shareLinkAlbumToken)}`;
    }
    // Fallback: old link style (keeps the page working if album-token creation fails)
    const ids = shareLinkSelectedImages.map((img) => img.id).join(',');
    return `${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&imageIds=${ids}`;
  }, [shareLinkSelectedImages, tokenForUrl, baseUrl, shareLinkAlbumToken, shareLinkAlbumTokenLoading]);

  const copyToClipboard = useCallback((text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }, []);

  // Fetch invited contacts for Share link modal
  const { data: shareLinkContactsData } = useQuery({
    queryKey: ['invitedContacts', shareLinkContactSearch],
    queryFn: async () => {
      try {
        const res = await api.get('/api/simple-invitations/family-relationships');
        console.log('[ShareLink] family-relationships response:', res?.data);

        const payload = res?.data;
        const maybeList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload?.data
            : Array.isArray(payload?.relationships)
              ? payload?.relationships
              : [];

        const allNodes: any[] = [];
        const addNode = (node: any) => {
          if (node && typeof node === 'object') allNodes.push(node);
        };
        const addList = (list: any[]) => {
          if (!Array.isArray(list)) return;
          list.forEach((item) => {
            addNode(item);
            if (Array.isArray(item?.clients)) addList(item.clients);
          });
        };

        addList(maybeList);
        const familyData = payload?.familyData;
        if (familyData && typeof familyData === 'object') {
          addNode(familyData?.you);
          addList(familyData?.parents ?? []);
          addList(familyData?.siblings ?? []);
          addNode(familyData?.spouse);
          addList(familyData?.children ?? []);
          addList(familyData?.grandparents ?? []);
          addList(familyData?.unclesAunts ?? []);
          addList(familyData?.cousins ?? []);
          addList(familyData?.clients ?? []);
        }

        const currentUserId = userId != null ? String(userId) : '';
        const invitedOnly = allNodes.filter((item) => {
          const inviterCandidates = [
            item?.invitedBy,
            item?.invitedById,
            item?.createdBy,
            item?.createdById,
            item?.ownerId,
            item?.ownerUserId,
          ].filter((v) => v != null);

          // Preferred: explicit inviter/owner mapping from API
          if (inviterCandidates.some((v) => String(v) === currentUserId)) return true;

          // Fallback for family-relationships payloads that expose invited users as relation=Client
          // with fields like { userId, name, username } but no invitedBy/owner keys.
          return String(item?.relation ?? '').toLowerCase() === 'client' && !!item?.userId && !item?.isYou;
        });

        const mapped = invitedOnly.map((item) => ({
          id: String(item?.id ?? item?.userId ?? item?.inviteeId ?? ''),
          email: item?.email ?? item?.username ?? item?.inviteeEmail ?? '',
          mobile: item?.mobile ?? item?.phone ?? item?.phoneNumber ?? '',
          displayName:
            item?.name ??
            item?.displayName ??
            [item?.firstName, item?.lastName].filter(Boolean).join(' ').trim() ??
            '',
        })).filter((c) => c.id);

        const uniqueContacts = mapped.filter(
          (c, i, arr) => i === arr.findIndex((x) => x.id === c.id)
        );

        return { contacts: uniqueContacts };
      } catch (error) {
        console.log('[ShareLink] family-relationships error:', error);
        return { contacts: [] };
      }
    },
    enabled: showShareLinkModal,
    retry: 0,
  });
  const shareLinkContacts = useMemo(() => {
    const contacts = shareLinkContactsData?.contacts ?? [];
    const q = shareLinkContactSearch?.trim()?.toLowerCase?.() ?? '';
    if (!q) return contacts;
    return contacts.filter((c) => {
      const haystack = `${c?.displayName ?? ''} ${c?.email ?? ''} ${c?.mobile ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [shareLinkContactsData?.contacts, shareLinkContactSearch]);

  const checkShareLinkRecipient = useCallback(async (emailInput: string, mobileInput: string) => {
    const firstEmail = emailInput.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean)[0] ?? '';
    const firstPart = mobileInput.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean)[0] ?? '';
    const m = firstPart ? (firstPart.startsWith('+') ? firstPart : `${shareLinkNewMobileCountryCode.replace(/\s/g, '')}${firstPart}`) : '';
    if (!firstEmail && !m) {
      setShareLinkAlreadySent(null);
      return;
    }
    const urlToShare = shareLinkUrlType === 'checkout' ? publicCheckoutUrl : shareLinkUrlType === 'images_display' ? publicImagesDisplayUrl : publicSelectionUrl;
    try {
      const params = new URLSearchParams();
      if (firstEmail) params.set('email', firstEmail);
      if (m) params.set('mobile', m);
      if (urlToShare) params.set('publicUrl', urlToShare);
      const res = await api.get<{ alreadySent?: boolean; email?: string | null; mobile?: string | null }>(`/api/public-share/check-recipient?${params.toString()}`);
      setShareLinkAlreadySent({
        email: res.data?.email ?? undefined,
        mobile: res.data?.mobile ?? undefined,
        alreadySent: !!res.data?.alreadySent,
      });
    } catch {
      setShareLinkAlreadySent(null);
    }
  }, [shareLinkUrlType, publicCheckoutUrl, publicSelectionUrl, publicImagesDisplayUrl, shareLinkNewMobileCountryCode]);

  const handleShareLinkSend = useCallback(async () => {
    const urlToShare = shareLinkUrlType === 'checkout' ? publicCheckoutUrl : shareLinkUrlType === 'images_display' ? publicImagesDisplayUrl : publicSelectionUrl;
    if (!urlToShare) {
      toast.error(t('photoStudioAlbumPage.toastNoUrl'));
      return;
    }
    const emails = shareLinkNewEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    const mobileParts = shareLinkNewMobiles.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map((part) => (part.startsWith('+') ? part : `${shareLinkNewMobileCountryCode.replace(/\s/g, '')}${part}`));
    if (shareLinkContactIds.size === 0 && emails?.length === 0 && mobiles.length === 0) {
      toast.error(t('photoStudioAlbumPage.toastSelectContact'));
      return;
    }
    const channels: string[] = [];
    if (shareLinkChannels.email) channels.push('email');
    if (shareLinkChannels.sms) channels.push('sms');
    if (channels?.length === 0) {
      toast.error(t('photoStudioAlbumPage.toastSelectChannel'));
      return;
    }
    setShareLinkSending(true);

    try {
      const res = await api.post<{ success?: boolean; sent?: { email?: number; sms?: number }; shareIds?: { email?: number[]; sms?: number[] } }>('/api/public-share/send', {
        publicUrl: urlToShare,
        message: shareLinkMessage.trim() || undefined,
        sendTo: {
          contactIds: Array.from(shareLinkContactIds),
          emails,
          mobiles,
        },
        albumName: selectedAlbumsName,
        channels,
      });
      if (res.data?.success) {
        const emailCount = res.data.sent?.email ?? 0;
        const smsCount = res.data.sent?.sms ?? 0;
        const shareIds = res.data.shareIds;
        const suffix =
          shareIds?.email?.length || shareIds?.sms?.length
            ? t('photoStudioAlbumPage.toastLinkSentSuffixIds', { ids: [...(shareIds?.email ?? []), ...(shareIds?.sms ?? [])].join(', ') })
            : t('photoStudioAlbumPage.toastLinkSentSuffixGeneric');
        toast.success(t('photoStudioAlbumPage.toastLinkSent', { email: emailCount, sms: smsCount, suffix }));
        setShowShareLinkModal(false);
        setShareLinkContactIds(new Set());
        setShareLinkNewEmails('');
        setShareLinkNewMobiles('');
        setShareLinkMessage('');
        setShareLinkAlreadySent(null);
      } else {
        toast.error(t('photoStudioAlbumPage.toastFailedSend'));
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        toast.error(t('photoStudioAlbumPage.toastShareUnavailable'));
      } else {
        toast.error(err.response?.data?.message || t('photoStudioAlbumPage.toastFailedSendShare'));
      }
    } finally {
      setShareLinkSending(false);
    }
  }, [shareLinkUrlType, publicCheckoutUrl, publicSelectionUrl, publicImagesDisplayUrl, shareLinkNewEmails, shareLinkNewMobiles, shareLinkNewMobileCountryCode, shareLinkContactIds, shareLinkChannels, shareLinkMessage, t, selectedAlbumsName]);

  // ── Per-photo share (album detail view) ──────────────────────────────────

  const togglePhotoSelection = useCallback((imageId: number) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  }, []);

  const selectAllPhotos = useCallback((images: AlbumImage[]) => {
    setSelectedPhotoIds(new Set(images.map((img) => img.id)));
  }, []);

  const clearPhotoSelection = useCallback(() => {
    setSelectedPhotoIds(new Set());
  }, []);

  // Build public URL for selected photos (images-display for view-only, no payment)
  const selectedPhotoImages = useMemo((): AlbumImage[] => {
    if (!viewingAlbumId) return [];
    const album = albums.find((a) => a.id === viewingAlbumId);
    const images = album ? (albumImages.get(viewingAlbumId) || extractAlbumImages(album)) : [];
    return images.filter((img) => selectedPhotoIds.has(img.id));
  }, [viewingAlbumId, albums, albumImages, selectedPhotoIds]);

  // Generate public images-display URL for selected photos (view-only, no payment)
  const photoSharePublicUrl = useMemo(() => {
    if (selectedPhotoImages.length === 0) return '';
    const ids = selectedPhotoImages.map((img) => img.id);
    // For per-photo share we can also use a DB-backed album; create on-demand when sending (below).
    // Here we keep the old URL shape as a fallback/preview.
    return `${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&imageIds=${ids.join(',')}`;
  }, [selectedPhotoImages, baseUrl, tokenForUrl]);

  // Fetch contacts for photo share modal (reuse same endpoint)
  const { data: photoShareContactsData } = useQuery({
    queryKey: ['photoShareContacts', photoShareContactSearch],
    queryFn: async () => {
      try {
        const res = await api.get('/api/simple-invitations/family-relationships');
        const payload = res?.data;
        const allNodes: any[] = [];
        const addNode = (node: any) => { if (node && typeof node === 'object') allNodes.push(node); };
        const addList = (list: any[]) => { if (!Array.isArray(list)) return; list.forEach((item) => { addNode(item); if (Array.isArray(item?.clients)) addList(item.clients); }); };
        const fd = payload?.familyData;
        if (fd) { addNode(fd?.you); addList(fd?.parents ?? []); addList(fd?.siblings ?? []); addNode(fd?.spouse); addList(fd?.children ?? []); addList(fd?.grandparents ?? []); addList(fd?.unclesAunts ?? []); addList(fd?.cousins ?? []); addList(fd?.clients ?? []); }
        const currentUserId = userId != null ? String(userId) : '';
        const mapped = allNodes.filter((item) => {
          const inviterCandidates = [item?.invitedBy, item?.invitedById, item?.createdBy, item?.ownerId].filter((v) => v != null);
          if (inviterCandidates.some((v) => String(v) === currentUserId)) return true;
          return String(item?.relation ?? '').toLowerCase() === 'client' && !!item?.userId && !item?.isYou;
        }).map((item) => ({
          id: String(item?.id ?? item?.userId ?? ''),
          email: item?.email ?? item?.username ?? '',
          mobile: item?.mobile ?? item?.phone ?? '',
          displayName: item?.name ?? [item?.firstName, item?.lastName].filter(Boolean).join(' ').trim() ?? '',
        })).filter((c) => c.id);
        return { contacts: mapped.filter((c, i, arr) => i === arr.findIndex((x) => x.id === c.id)) };
      } catch { return { contacts: [] }; }
    },
    enabled: showPhotoShareModal,
    retry: 0,
  });

  const photoShareContacts = useMemo(() => {
    const contacts = photoShareContactsData?.contacts ?? [];
    const q = photoShareContactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => `${c.displayName} ${c.email} ${c.mobile}`.toLowerCase().includes(q));
  }, [photoShareContactsData?.contacts, photoShareContactSearch]);

  const checkPhotoShareRecipient = useCallback(async (emailInput: string, mobileInput: string) => {
    const firstEmail = emailInput.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean)[0] ?? '';
    const firstPart = mobileInput.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean)[0] ?? '';
    const m = firstPart ? (firstPart.startsWith('+') ? firstPart : `${photoShareNewMobileCountryCode.replace(/\s/g, '')}${firstPart}`) : '';
    if (!firstEmail && !m) { setPhotoShareAlreadySent(null); return; }
    try {
      const params = new URLSearchParams();
      if (firstEmail) params.set('email', firstEmail);
      if (m) params.set('mobile', m);
      if (photoSharePublicUrl) params.set('publicUrl', photoSharePublicUrl);
      const res = await api.get<{ alreadySent?: boolean; email?: string | null; mobile?: string | null }>(`/api/public-share/check-recipient?${params.toString()}`);
      setPhotoShareAlreadySent({ email: res.data?.email ?? undefined, mobile: res.data?.mobile ?? undefined, alreadySent: !!res.data?.alreadySent });
    } catch { setPhotoShareAlreadySent(null); }
  }, [photoSharePublicUrl, photoShareNewMobileCountryCode]);

  const handlePhotoShareSend = useCallback(async () => {
    if (!photoSharePublicUrl) { toast.error(t('photoStudioAlbumPage.toastNoUrl')); return; }
    // Prefer DB-backed albumToken link so the host can update image list later.
    let urlToShare = photoSharePublicUrl;
    let shareAlbumIdForSend: number | undefined;
    try {
      const imageIds = selectedPhotoImages.map((img) => img.id).filter((id) => typeof id === 'number' && id > 0);
      if (imageIds.length > 0) {
        const resAlbum = await api.post<{ token?: string; shareAlbumId?: number }>('/api/public-share/albums', {
          imageIds,
          sourceAlbumId: viewingAlbumId ?? undefined,
          title: albums.find((a) => a.id === viewingAlbumId)?.name ?? undefined,
        });
        const tok = resAlbum.data?.token;
        const shareAlbumId = Number(resAlbum.data?.shareAlbumId ?? 0);
        if (tok && shareAlbumId) {
          shareAlbumIdForSend = shareAlbumId;
          urlToShare = `${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&albumToken=${encodeURIComponent(tok)}`;
        }
      }
    } catch {
      // Keep fallback urlToShare (imageIds=...) if creation fails.
    }
    const emails = photoShareNewEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    const mobileParts = photoShareNewMobiles.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map((part) => (part.startsWith('+') ? part : `${photoShareNewMobileCountryCode.replace(/\s/g, '')}${part}`));
    if (photoShareContactIds.size === 0 && emails.length === 0 && mobiles.length === 0) { toast.error(t('photoStudioAlbumPage.toastSelectContact')); return; }
    const channels: string[] = [];
    if (photoShareChannels.email) channels.push('email');
    if (photoShareChannels.sms) channels.push('sms');
    if (channels.length === 0) { toast.error(t('photoStudioAlbumPage.toastSelectChannel')); return; }
    setPhotoShareSending(true);
    try {
      const res = await api.post<{ success?: boolean; sent?: { email?: number; sms?: number } }>('/api/public-share/send', {
        publicUrl: urlToShare,
        message: photoShareMessage.trim() || undefined,
        shareAlbumId: shareAlbumIdForSend,
        sendTo: { contactIds: Array.from(photoShareContactIds), emails, mobiles },
        albumName: albums.find((a) => a.id === viewingAlbumId)?.name ?? 'Album',
        channels,
      });
      if (res.data?.success) {
        toast.success(t('photoStudioAlbumPage.toastLinkSent', { email: res.data.sent?.email ?? 0, sms: res.data.sent?.sms ?? 0, suffix: '' }));
        setShowPhotoShareModal(false);
        setPhotoShareContactIds(new Set());
        setPhotoShareNewEmails('');
        setPhotoShareNewMobiles('');
        setPhotoShareMessage('');
        setPhotoShareAlreadySent(null);
      } else { toast.error(t('photoStudioAlbumPage.toastFailedSend')); }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('photoStudioAlbumPage.toastFailedSendShare'));
    } finally { setPhotoShareSending(false); }
  }, [photoSharePublicUrl, photoShareNewEmails, photoShareNewMobiles, photoShareNewMobileCountryCode, photoShareContactIds, photoShareChannels, photoShareMessage, t, albums, viewingAlbumId, selectedPhotoImages, baseUrl, tokenForUrl]);

  // ─────────────────────────────────────────────────────────────────────────

  const transferAlbumsToPhotoBook = useCallback(async (albumIds: number[], categorySlug: string) => {
    if (!albumIds?.length) {
      toast.error(t('photoStudioAlbumPage.toastSelectAlbumTransfer'));
      return;
    }
    if (isTransferringToPhotoBook) return;

    setIsTransferringToPhotoBook(true);

    try {
      const selected = albums.filter((a) => albumIds.includes(a.id));
      if (!selected?.length) {
        toast.error(t('photoStudioAlbumPage.toastAlbumsNotFound'));
        return;
      }

      // Collect all image IDs from the selected albums
      const imageIds: number[] = [];
      const seenIds = new Set<number>();

      for (const album of selected) {
        const images = albumImages.get(album.id) || extractAlbumImages(album);
        for (const img of images) {
          const filename = getImageFilename(img);
          const ext = (filename.split('.').pop() || '').toLowerCase();
          if (!ext.match(/^(png|jpg|jpeg|gif|webp)$/)) continue;
          if (img.id && !seenIds.has(img.id)) {
            seenIds.add(img.id);
            imageIds.push(img.id);
          }
        }
      }

      if (imageIds.length === 0) {
        toast.error(t('photoStudioAlbumPage.toastNoImagesInAlbums'));
        return;
      }

      const albumName = selected.length === 1 ? (selected[0]?.name || t('photoStudioAlbumPage.myAlbum')) : t('photoStudioAlbumPage.nAlbums', { count: selected.length });

      // Navigate to the covers page first (design cover & last page), then user can go to album
      navigate(`/photo-themes/${categorySlug}`, {
        state: {
          fromStudioAlbum: true,
          albumImageIds: imageIds,
          albumName,
          studioAlbumIds: albumIds,
        },
      });

      toast.success(t('photoStudioAlbumPage.toastOpeningCovers', { count: imageIds.length }));
    } catch (e: any) {
      console.error('PhotoBook transfer failed:', e);
      toast.error(e?.message || t('photoStudioAlbumPage.toastFailedPhotoBook'));
    } finally {
      setIsTransferringToPhotoBook(false);
    }
  }, [albums, albumImages, extractAlbumImages, getImageFilename, isTransferringToPhotoBook, navigate, t]);

  /** Single selection only: selecting an album replaces any previous selection. */
  const toggleAlbumSelection = useCallback((albumId: number) => {
    setSelectedAlbums((prev) => {
      if (prev.has(albumId)) return new Set<number>();
      return new Set([albumId]);
    });
    // Clear per-photo selection when switching albums
    setSelectedPhotoIds(new Set());
  }, []);

  const toggleAlbum = (albumId: number) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
        // Extract images from album data when expanding
        const album = albums.find(a => a.id === albumId);
        if (album) {
          const images = extractAlbumImages(album);
          setAlbumImages((prev) => {
            const next = new Map(prev);
            next.set(albumId, images);
            return next;
          });
        }
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <DashboardLoading 
        title={t('photoStudioAlbumPage.loadingUserInfo')}
        subtitle={t('photoStudioAlbumPage.authenticatingSession')}
        icon={FaUserFriends}
        showFeatures={false}
      />
    );
  }
  if (showAlbumsSkeleton) {
    return <AlbumsPageSkeleton loadingLabel={t('photoStudioAlbumPage.loading')} />;
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('photoStudioAlbumPage.unableLoadAlbums')}</h1>
          <p className="text-gray-600 text-sm mb-4">{t('photoStudioAlbumPage.failedFetchAlbums')}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors"
          >
            {t('photoStudioAlbumPage.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header – hidden when viewing a single album */}
      {viewingAlbumId === null && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaFolder className="mr-3 text-[#2731db]" />
            {t('photoStudioAlbumPage.photoAlbums')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('photoStudioAlbumPage.subtitle')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => downloadImagesAsZip(shareLinkSelectedImages, selectedAlbumsName || 'albums')}
            disabled={selectedAlbums.size === 0 || isDownloadingZip}
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 transition-colors flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
            title={t('photoStudioAlbumPage.downloadZipTitle')}
          >
            {isDownloadingZip ? (
              <FaSpinner className="mr-2 animate-spin" />
            ) : (
              <FaDownload className="mr-2" />
            )}
            {t('photoStudioAlbumPage.downloadZip')}
          </button>
          <button
            onClick={() => {
              const ids = Array.from(selectedAlbums);
              if (ids.length === 0) {
                toast.error(t('photoStudioAlbumPage.toastSelectAlbum'));
                return;
              }
              setPendingAlbumIds(ids);
              setShowTemplateModal(true);
            }}
            disabled={selectedAlbums.size === 0 || isTransferringToPhotoBook}
            className="px-4 py-2 rounded-lg bg-[#111827] text-white hover:bg-slate-800 transition-colors flex items-center disabled:opacity-60"
            title={t('photoStudioAlbumPage.transferTitle')}
          >
            <FaFolderOpen className="mr-2" />
            {t('photoStudioAlbumPage.transferToPhotoBook')} {selectedAlbums.size > 0 ? `(${selectedAlbums.size})` : ''}
          </button>
          <button
            onClick={() => setShowShareLinkModal(true)}
            disabled={selectedAlbums.size === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
            title={t('photoStudioAlbumPage.shareLinkTitle')}
          >
            <FaShare className="mr-2" />
            {t('photoStudioAlbumPage.shareLink')} {selectedAlbums.size > 0 ? `(${selectedAlbums.size})` : ''}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors flex items-center"
          >
            <FaPlus className="mr-2" />
            {t('photoStudioAlbumPage.createAlbum')}
          </button>
        </div>
      </div>
      )}

      {/* Share link modal – send public URL to contacts / email / SMS (same as StudioCheckout) */}
      <PublicShareModal
        isOpen={showShareLinkModal}
        onClose={() => setShowShareLinkModal(false)}
        contacts={shareLinkContacts}
        contactSearch={shareLinkContactSearch}
        onContactSearchChange={setShareLinkContactSearch}
        selectedContactIds={shareLinkContactIds}
        onSelectedContactIdsChange={setShareLinkContactIds}
        showEmail={true}
        showPhone={true}
        newEmails={shareLinkNewEmails}
        onNewEmailsChange={setShareLinkNewEmails}
        mobileCountryCode={shareLinkNewMobileCountryCode}
        onMobileCountryCodeChange={setShareLinkNewMobileCountryCode}
        newMobiles={shareLinkNewMobiles}
        onNewMobilesChange={setShareLinkNewMobiles}
        alreadySent={shareLinkAlreadySent}
        onAlreadySentChange={setShareLinkAlreadySent}
        message={shareLinkMessage}
        onMessageChange={setShareLinkMessage}
        channels={shareLinkChannels}
        onChannelsChange={setShareLinkChannels}
        onCheckRecipient={checkShareLinkRecipient}
        onSend={handleShareLinkSend}
        sending={shareLinkSending}
        labels={{
          title: t('photoStudioAlbumPage.shareLinkHeading'),
          existingContactsLabel: t('photoStudioAlbumPage.shareLinkExistingContacts'),
          searchContactsPlaceholder: t('photoStudioAlbumPage.shareLinkContactSearchPlaceholder'),
          noContactsYet: t('photoStudioAlbumPage.shareLinkNoContacts'),
          newRecipientsEmailLabel: t('photoStudioAlbumPage.shareLinkNewEmailsLabel'),
          emailPlaceholder: t('photoStudioAlbumPage.emailPlaceholderList'),
          newRecipientsMobileLabel: t('photoStudioAlbumPage.shareLinkNewMobilesLabel'),
          mobilePlaceholder: t('photoStudioAlbumPage.mobilePlaceholderList'),
          optionalMessageLabel: t('photoStudioAlbumPage.shareLinkOptionalMessage'),
          messagePlaceholder: t('photoStudioAlbumPage.shareLinkMessagePlaceholder'),
          sendViaEmailLabel: t('photoStudioAlbumPage.sendViaEmail'),
          sendViaSmsLabel: t('photoStudioAlbumPage.sendViaSms'),
          cancelLabel: t('photoStudioAlbumPage.cancel'),
          sendingLabel: t('photoStudioAlbumPage.shareLinkSendingBtn'),
          sendLabel: t('photoStudioAlbumPage.shareLinkSend'),
          alreadySentWarning: () =>
            shareLinkAlreadySent?.email
              ? t('photoStudioAlbumPage.shareLinkAlreadySentEmail')
              : t('photoStudioAlbumPage.shareLinkAlreadySentMobile'),
          emailTypeLabel: '',
          mobileTypeLabel: '',
        }}
        disabledContent={
          shareLinkSelectedImages.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {t('photoStudioAlbumPage.selectAlbumForShareLink')}
            </p>
          ) : null
        }
      />

      {/* Album Grid (main) or Album Detail (single album) */}
      {viewingAlbumId !== null ? (
        /* Album Detail View – single album with back button and image grid */
        (() => {
          const album = albums.find((a) => a.id === viewingAlbumId);
          if (!album) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <p className="mb-4">{t('photoStudioAlbumPage.albumNotFound')}</p>
                <button type="button" onClick={() => setViewingAlbumId(null)} className="px-4 py-2 rounded-xl bg-[#2731db] text-white">
                  {t('photoStudioAlbumPage.backToAlbums')}
                </button>
              </div>
            );
          }
          const images = albumImages.get(album.id) || extractAlbumImages(album);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => { setViewingAlbumId(null); setSelectedPhotoIds(new Set()); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <FaChevronLeft className="h-4 w-4" />
                  {t('photoStudioAlbumPage.backToAlbums')}
                </button>
                <h2 className="text-xl font-semibold text-gray-900 truncate flex-1">{album.name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedImages(new Set()); setShowAddImagesModal(album.id); }}
                    className="px-4 py-2 rounded-xl bg-[#2731db] text-white hover:bg-blue-700 text-sm font-medium"
                  >
                    <FaPlus className="mr-1 inline" />
                    {t('photoStudioAlbumPage.uploadImages')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingAlbumIds([album.id]); setShowTemplateModal(true); }}
                    disabled={isTransferringToPhotoBook}
                    className="px-4 py-2 rounded-xl bg-[#111827] text-white hover:bg-slate-800 text-sm font-medium disabled:opacity-60"
                  >
                    <FaFolderOpen className="mr-1 inline" />
                    {t('photoStudioAlbumPage.photoBook')}
                  </button>
                </div>
              </div>

              {/* Share management panel (one link shared to many recipients) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Shared link</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedShareAlbum
                        ? 'This album is shared. You can add/remove images and the same link will show updates.'
                        : 'This album is not shared yet.'}
                    </p>
                    {shareAlbums.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-700">Select share link</div>
                        <select
                          className="mt-1 w-full max-w-[520px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                          value={selectedShareAlbumId ?? ''}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setSelectedShareAlbumId(!isNaN(v) && v > 0 ? v : null);
                            setIsEditingSharedImages(false);
                          }}
                        >
                          {shareAlbums.map((a) => (
                            <option key={a.shareAlbumId} value={a.shareAlbumId}>
                              {a.status ? `${String(a.status).toUpperCase()} • ` : ''}
                              {a.token}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {shareManageError && (
                      <p className="mt-2 text-sm text-red-600">{shareManageError}</p>
                    )}
                  </div>
                  {selectedShareAlbum && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSharedImages((v) => {
                            const next = !v;
                            if (next) {
                              // When entering edit mode, preselect previously shared images
                              // so the user never accidentally loses existing shared selection.
                              setSelectedPhotoIds(new Set(Array.from(sharedImageIds)));
                              setSharedImagesOnly(false);
                            }
                            return next;
                          });
                        }}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50 text-sm font-medium"
                      >
                        {isEditingSharedImages ? 'Stop editing shared images' : 'Edit shared images'}
                      </button>
                      {/* <button
                        type="button"
                        disabled={shareManageLoading || images.length === 0}
                        onClick={async () => {
                          setShareManageError(null);
                          setShareManageLoading(true);
                          try {
                            const imageIds = images
                              .map((img) => img.id)
                              .filter((id) => typeof id === 'number' && id > 0);
                            if (imageIds.length === 0) {
                              toast.error('No images in album');
                              return;
                            }
                            const res = await api.post<{ shareAlbumId?: number; token?: string }>(
                              '/api/public-share/albums',
                              { imageIds, sourceAlbumId: album.id, title: album.name }
                            );
                            const shareAlbumId = Number(res.data?.shareAlbumId ?? 0);
                            const token = String(res.data?.token ?? '');
                            if (shareAlbumId && token) {
                              setShareAlbums((prev) => [{ shareAlbumId, token, status: 'ACTIVE', createdAt: null }, ...prev]);
                              setSelectedShareAlbumId(shareAlbumId);
                              toast.success('New share link created');
                            } else {
                              toast.error('Could not create new share link');
                            }
                          } catch {
                            toast.error('Could not create new share link');
                          } finally {
                            setShareManageLoading(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
                      >
                        {shareManageLoading ? 'Creating…' : 'Create new link'}
                      </button> */}
                      {isEditingSharedImages && (
                        <button
                          type="button"
                          disabled={savingSharedImages}
                          onClick={async () => {
                            if (!selectedShareAlbum) return;
                            setSavingSharedImages(true);
                            try {
                              const ids = Array.from(selectedPhotoIds);
                              if (ids.length === 0) {
                                toast.error('Select at least 1 image to share');
                                return;
                              }
                              await api.put(`/api/public-share/albums/${selectedShareAlbum.shareAlbumId}/images`, { imageIds: ids });
                              setSharedImageIds(new Set(ids));
                              toast.success('Shared images updated');
                            } catch {
                              toast.error('Failed to update shared images');
                            } finally {
                              setSavingSharedImages(false);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-[#2731db] text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                        >
                          {savingSharedImages ? 'Saving…' : 'Save shared images'}
                        </button>
                      )}
                    </div>
                  )}
                  {!selectedShareAlbum && (
                    <div className="flex items-center gap-2">
                      {/* <button
                        type="button"
                        disabled={shareManageLoading || images.length === 0}
                        onClick={async () => {
                          setShareManageError(null);
                          setShareManageLoading(true);
                          try {
                            const imageIds = images
                              .map((img) => img.id)
                              .filter((id) => typeof id === 'number' && id > 0);
                            if (imageIds.length === 0) {
                              toast.error('No images in album');
                              return;
                            }
                            const res = await api.post<{ shareAlbumId?: number; token?: string }>(
                              '/api/public-share/albums',
                              { imageIds, sourceAlbumId: album.id, title: album.name }
                            );
                            const shareAlbumId = Number(res.data?.shareAlbumId ?? 0);
                            const token = String(res.data?.token ?? '');
                            if (shareAlbumId && token) {
                              setShareAlbums([{ shareAlbumId, token, status: 'ACTIVE', createdAt: null }]);
                              setSelectedShareAlbumId(shareAlbumId);
                              setSharedImageIds(new Set(imageIds));
                              toast.success('Shared link created');
                            } else {
                              toast.error('Could not create shared link');
                            }
                          } catch {
                            toast.error('Could not create shared link');
                          } finally {
                            setShareManageLoading(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[#2731db] text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                      >
                        {shareManageLoading ? 'Creating…' : 'Create shared link'}
                      </button> */}
                    </div>
                  )}
                </div>

                {selectedShareAlbum && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs font-semibold text-gray-700">Shared with</div>
                      {shareManageLoading ? (
                        <div className="mt-2 text-sm text-gray-500">Loading…</div>
                      ) : shareRecipients.length === 0 ? (
                        <div className="mt-2 text-sm text-gray-500">No recipients found for this link yet.</div>
                      ) : (
                        <ul className="mt-2 space-y-1 text-sm text-gray-800">
                          {shareRecipients.slice(0, 8).map((r, idx) => (
                            <li key={idx} className="truncate">
                              {r.recipientEmail || r.recipientMobile || '—'}
                            </li>
                          ))}
                          {shareRecipients.length > 8 ? (
                            <li className="text-xs text-gray-500">+{shareRecipients.length - 8} more</li>
                          ) : null}
                        </ul>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="email"
                          value={shareRecipientEmail}
                          onChange={(e) => setShareRecipientEmail(e.target.value)}
                          placeholder="Add recipient email"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                        />
                        <button
                          type="button"
                          disabled={addingRecipient || !shareRecipientEmail.trim()}
                          onClick={async () => {
                            if (!selectedShareAlbum) return;
                            const email = shareRecipientEmail.trim();
                            if (!email) return;
                            setAddingRecipient(true);
                            try {
                              const urlToShare = `${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&albumToken=${encodeURIComponent(selectedShareAlbum.token)}`;
                              const res = await api.post<{ success?: boolean; sent?: { email?: number; sms?: number } }>(
                                '/api/public-share/send',
                                {
                                  publicUrl: urlToShare,
                                  message: undefined,
                                  shareAlbumId: selectedShareAlbum.shareAlbumId,
                                  sendTo: { contactIds: [], emails: [email], mobiles: [] },
                                  albumName: album?.name ?? 'Album',
                                  channels: ['email'],
                                }
                              );
                              if (res.data?.success) {
                                toast.success('Recipient added');
                                setShareRecipientEmail('');
                                // Refresh recipients list
                                try {
                                  const rec = await api.get<{ recipients?: { recipientEmail?: string | null; recipientMobile?: string | null }[] }>(
                                    `/api/public-share/albums/${selectedShareAlbum.shareAlbumId}/recipients`
                                  );
                                  setShareRecipients(Array.isArray(rec.data?.recipients) ? rec.data.recipients : []);
                                } catch {}
                              } else {
                                toast.error('Failed to add recipient');
                              }
                            } catch {
                              toast.error('Failed to add recipient');
                            } finally {
                              setAddingRecipient(false);
                            }
                          }}
                          className="shrink-0 px-3 py-2 rounded-xl bg-[#111827] text-white hover:bg-slate-800 text-sm font-medium disabled:opacity-60"
                        >
                          {addingRecipient ? 'Adding…' : 'Add'}
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs font-semibold text-gray-700">Current shared images</div>
                      <div className="mt-2 text-sm text-gray-800">
                        {sharedImageIds.size} images in the shared link
                      </div>
                      {isEditingSharedImages && (
                        <div className="mt-2 text-xs text-gray-600">
                          Tip: select/unselect photos below, then click “Save shared images”.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {images.length > 0 ? (
                  <>
                    {/* Select-all / clear row */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">
                        {selectedPhotoIds.size > 0
                          ? `${selectedPhotoIds.size} of ${images.length} selected`
                          : `${images.length} ${images.length === 1 ? t('photoStudioAlbumPage.photo') : t('photoStudioAlbumPage.photos')}`}
                      </p>
                      <div className="flex items-center gap-3">
                        {selectedShareAlbum && isEditingSharedImages && (
                          <button
                            type="button"
                            onClick={() => setSharedImagesOnly((v) => !v)}
                            className={`text-sm font-medium px-3 py-1.5 rounded-lg border ${
                              sharedImagesOnly
                                ? 'border-[#2731db] text-[#2731db] bg-indigo-50'
                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title="Filter to previously shared images"
                          >
                            {sharedImagesOnly ? 'Showing shared only' : 'Filter: shared only'}
                          </button>
                        )}
                        {selectedPhotoIds.size > 0 && (
                          <button
                            type="button"
                            onClick={clearPhotoSelection}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            selectedPhotoIds.size === images.length
                              ? clearPhotoSelection()
                              : selectAllPhotos(images)
                          }
                          className="text-sm font-medium text-[#2731db] hover:underline"
                        >
                          {selectedPhotoIds.size === images.length ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                    </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(sharedImagesOnly ? images.filter((img) => sharedImageIds.has(img.id)) : images).map((image, index) => {
                      const imageUrl = getImageUrl(image);
                      const thumbUrl = getThumbnailUrl(image);
                      const fileType = getFileType(image);
                      const filename = getImageFilename(image);
                      const canViewFullScreen = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                      const isPhotoSelected = selectedPhotoIds.has(image.id);
                      const isShared = sharedImageIds.has(image.id);
                      const downloadUrl = image.downloadUrl || image.previewUrl || imageUrl;
                      return (
                        <div
                          key={image.id}
                          className={`relative rounded-xl overflow-hidden border-2 bg-white shadow-sm hover:shadow-md transition-all duration-200 group ${
                            isPhotoSelected ? 'border-[#2731db] shadow-md' : 'border-transparent hover:border-gray-200'
                          }`}
                        >
                          {/* Shared marker */}
                          {selectedShareAlbum && isShared && !isEditingSharedImages && (
                            <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold">
                              Shared
                            </div>
                          )}
                          {/* Checkbox overlay */}
                          <button
                            type="button"
                            onClick={() => togglePhotoSelection(image.id)}
                            className="absolute top-2 left-2 z-10 p-1 rounded-md bg-white/90 hover:bg-white shadow-sm"
                            title={isPhotoSelected ? 'Deselect' : 'Select'}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isPhotoSelected ? 'border-[#2731db] bg-[#2731db]' : 'border-gray-400 bg-white'}`}>
                              {isPhotoSelected && <FaCheck className="h-2.5 w-2.5 text-white" />}
                            </div>
                          </button>
                          {/* Download button – visible on hover */}
                          {downloadUrl && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await downloadSingleImage(downloadUrl, filename);
                                } catch {
                                  toast.error('Download failed');
                                }
                              }}
                              className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/90 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`Download ${filename}`}
                            >
                              <FaDownload className="h-3 w-3 text-gray-700" />
                            </button>
                          )}
                          <div
                            className={`aspect-square bg-gray-100 overflow-hidden relative ${canViewFullScreen ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (canViewFullScreen) setFullScreenImage({ image, albumId: album.id, index });
                            }}
                          >
                            {canViewFullScreen ? (
                              <>
                                <img
                                  src={(thumbUrl || imageUrl)!}
                                  alt={filename}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">{t('photoStudioAlbumPage.view')}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500 text-xs">{fileType.toUpperCase() || t('photoStudioAlbumPage.file')}</div>
                            )}
                          </div>
                          <div className="p-2 bg-white">
                            <p className="text-xs text-gray-700 truncate" title={filename}>{filename}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <FaImages className="mx-auto mb-3 text-5xl text-gray-300" />
                    <p className="text-lg font-medium mb-2">{t('photoStudioAlbumPage.noImagesInAlbum')}</p>
                    <p className="text-sm mb-4">{t('photoStudioAlbumPage.uploadToGetStarted')}</p>
                    <button
                      type="button"
                      onClick={() => { setSelectedImages(new Set()); setShowAddImagesModal(album.id); }}
                      className="px-4 py-2 rounded-xl bg-[#2731db] text-white hover:bg-blue-700"
                    >
                      <FaPlus className="mr-1 inline" />
                      {t('photoStudioAlbumPage.uploadImages')}
                    </button>
                  </div>
                )}
              </div>

              {/* Sticky action bar – appears when photos are selected */}
              {selectedPhotoIds.size > 0 && (
                <div className="sticky bottom-4 z-40 mx-auto max-w-xl">
                  <div className="bg-white border border-[#2731db] rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedPhotoIds.size} photo{selectedPhotoIds.size !== 1 ? 's' : ''} selected
                      </p>
                      <p className="text-xs text-gray-500">Share or download selected photos</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={clearPhotoSelection}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        disabled={isDownloadingZip}
                        onClick={() => downloadImagesAsZip(selectedPhotoImages, album.name || 'photos')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isDownloadingZip ? <FaSpinner className="h-3.5 w-3.5 animate-spin" /> : <FaDownload className="h-3.5 w-3.5" />}
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPhotoShareModal(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2731db] text-white text-sm font-semibold hover:bg-blue-700"
                      >
                        <FaShare className="h-3.5 w-3.5" />
                        Share Photos
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Share Modal */}
              <PublicShareModal
                isOpen={showPhotoShareModal}
                onClose={() => setShowPhotoShareModal(false)}
                contacts={photoShareContacts}
                contactSearch={photoShareContactSearch}
                onContactSearchChange={setPhotoShareContactSearch}
                selectedContactIds={photoShareContactIds}
                onSelectedContactIdsChange={setPhotoShareContactIds}
                showEmail={true}
                showPhone={true}
                newEmails={photoShareNewEmails}
                onNewEmailsChange={setPhotoShareNewEmails}
                mobileCountryCode={photoShareNewMobileCountryCode}
                onMobileCountryCodeChange={setPhotoShareNewMobileCountryCode}
                newMobiles={photoShareNewMobiles}
                onNewMobilesChange={setPhotoShareNewMobiles}
                alreadySent={photoShareAlreadySent}
                onAlreadySentChange={setPhotoShareAlreadySent}
                message={photoShareMessage}
                onMessageChange={setPhotoShareMessage}
                channels={photoShareChannels}
                onChannelsChange={setPhotoShareChannels}
                onCheckRecipient={checkPhotoShareRecipient}
                onSend={handlePhotoShareSend}
                sending={photoShareSending}
                labels={{
                  title: `Share ${selectedPhotoIds.size} Photo${selectedPhotoIds.size !== 1 ? 's' : ''}`,
                  existingContactsLabel: t('photoStudioAlbumPage.shareLinkExistingContacts'),
                  searchContactsPlaceholder: t('photoStudioAlbumPage.shareLinkContactSearchPlaceholder'),
                  noContactsYet: t('photoStudioAlbumPage.shareLinkNoContacts'),
                  newRecipientsEmailLabel: t('photoStudioAlbumPage.shareLinkNewEmailsLabel'),
                  emailPlaceholder: t('photoStudioAlbumPage.emailPlaceholderList'),
                  newRecipientsMobileLabel: t('photoStudioAlbumPage.shareLinkNewMobilesLabel'),
                  mobilePlaceholder: t('photoStudioAlbumPage.mobilePlaceholderList'),
                  optionalMessageLabel: t('photoStudioAlbumPage.shareLinkOptionalMessage'),
                  messagePlaceholder: t('photoStudioAlbumPage.shareLinkMessagePlaceholder'),
                  sendViaEmailLabel: t('photoStudioAlbumPage.sendViaEmail'),
                  sendViaSmsLabel: t('photoStudioAlbumPage.sendViaSms'),
                  cancelLabel: t('photoStudioAlbumPage.cancel'),
                  sendingLabel: t('photoStudioAlbumPage.shareLinkSendingBtn'),
                  sendLabel: t('photoStudioAlbumPage.shareLinkSend'),
                  alreadySentWarning: () =>
                    photoShareAlreadySent?.email
                      ? t('photoStudioAlbumPage.shareLinkAlreadySentEmail')
                      : t('photoStudioAlbumPage.shareLinkAlreadySentMobile'),
                  emailTypeLabel: '',
                  mobileTypeLabel: '',
                }}
              />
            </div>
          );
        })()
      ) : (
        /* Album Grid – card-based main view */
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-500">{t('photoStudioAlbumPage.totalAlbums')}</p>
              <p className="text-2xl font-bold text-gray-900">{albumsTotal}</p>
              <div className="flex items-center gap-2 ml-2">
                <select
                  value={albumSort}
                  onChange={(e) => setAlbumSort(e.target.value as 'name' | 'date')}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[#2731db] focus:border-[#2731db]"
                >
                  <option value="date">{t('photoStudioAlbumPage.sortByDate')}</option>
                  <option value="name">{t('photoStudioAlbumPage.sortByName')}</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 max-w-xs w-full sm:max-w-sm">
              <FaSearch className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder={t('photoStudioAlbumPage.searchAlbumsPlaceholder')}
                value={albumSearch}
                onChange={(e) => setAlbumSearch(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2731db] text-sm"
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {filteredAndSortedAlbums.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <FaFolder className="mx-auto mb-4 text-6xl text-gray-300" />
                <p className="text-xl font-medium mb-2">{t('photoStudioAlbumPage.noAlbumsFound')}</p>
                <p className="text-sm mb-6">{t('photoStudioAlbumPage.createFirstAlbum')}</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#2731db] text-white hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  {t('photoStudioAlbumPage.createAlbum')}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {filteredAndSortedAlbums.map((album) => {
                    const coverUrl = getCoverImageUrl(album);
                    const isMenuOpen = menuOpenAlbumId === album.id;
                    const count = album.imageCount ?? (albumImages.get(album.id) || extractAlbumImages(album)).length;
                    return (
                      <div
                        key={album.id}
                        className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {/* Card click → open album detail */}
                        <button
                          type="button"
                          className="w-full text-left block"
                          onClick={() => {
                            setAlbumImages((prev) => {
                              const next = new Map(prev);
                              next.set(album.id, extractAlbumImages(album));
                              return next;
                            });
                            setViewingAlbumId(album.id);
                            setMenuOpenAlbumId(null);
                          }}
                        >
                          {/* Cover with gradient overlay */}
                          <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden rounded-t-2xl">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={album.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={() => setCoverImageErrors((prev) => new Set(prev).add(album.id))}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FaFolder className="text-5xl text-gray-300" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            {/* 3-dot menu (stops propagation) */}
                            <div className="absolute top-2 right-2 flex flex-col items-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setMenuOpenAlbumId((id) => (id === album.id ? null : album.id));
                                }}
                                className="p-2 rounded-full bg-white/90 hover:bg-white shadow-sm text-gray-700"
                                aria-label={t('photoStudioAlbumPage.menu')}
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="2" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="14" r="1.5" /></svg>
                              </button>
                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1 bg-white rounded-xl shadow-lg border border-gray-200">
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setAlbumImages((prev) => { const n = new Map(prev); n.set(album.id, extractAlbumImages(album)); return n; }); setViewingAlbumId(album.id); setMenuOpenAlbumId(null); }}><FaFolderOpen className="h-4 w-4" /> {t('photoStudioAlbumPage.viewAlbum')}</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setSelectedImages(new Set()); setShowAddImagesModal(album.id); setMenuOpenAlbumId(null); }}><FaPlus className="h-4 w-4" /> {t('photoStudioAlbumPage.uploadImagesMenu')}</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); handleEditAlbum(album); setMenuOpenAlbumId(null); }}><FaEdit className="h-4 w-4" /> {t('photoStudioAlbumPage.renameAlbum')}</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); if (window.confirm(t('photoStudioAlbumPage.deleteAlbumConfirm', { name: album.name }))) deleteAlbumMutation.mutate(album.id); setMenuOpenAlbumId(null); }}><FaTrash className="h-4 w-4" /> {t('photoStudioAlbumPage.deleteAlbum')}</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); handleShareAlbum(album); setMenuOpenAlbumId(null); }}><FaShare className="h-4 w-4" /> {t('photoStudioAlbumPage.shareAlbum')}</button>
                                </div>
                              )}
                            </div>
                            {/* Selection checkbox (for Transfer/Share) */}
                            <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAlbumSelection(album.id);
                                }}
                                className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm"
                                title={selectedAlbums.has(album.id) ? t('photoStudioAlbumPage.unselect') : t('photoStudioAlbumPage.select')}
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedAlbums.has(album.id) ? 'border-[#2731db] bg-[#2731db]' : 'border-gray-400 bg-white'}`}>
                                  {selectedAlbums.has(album.id) && <FaCheck className="h-2.5 w-2.5 text-white" />}
                                </div>
                              </button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 truncate capitalize">{album.name}</h3>
                            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                              <FaImages className="h-3.5 w-3 shrink-0" />
                              {count} {count === 1 ? t('photoStudioAlbumPage.photo') : t('photoStudioAlbumPage.photos')}
                            </p>
                          </div>
                        </button>
                        {/* Backdrop to close menu when open (for mobile tap-outside) */}
                        {isMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpenAlbumId(null)} aria-hidden />}
                      </div>
                    );
                  })}
                </div>
                <div ref={loadMoreAlbumsRef} className="h-4" aria-hidden />
                {isFetchingMoreAlbums && (
                  <div className="flex justify-center py-6">
                    <LoadingSpinner size="md" text={t('photoStudioAlbumPage.loadingMore')} />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Edit Album Modal */}
      {showEditModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaEdit className="mr-2 text-[#2731db]" />
                {t('photoStudioAlbumPage.editAlbum')}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(null);
                  setEditAlbumName('');
                  setEditAlbumDescription('');
                  setEditAlbumPrice('');
                  setEditAlbumIsPublic(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.albumName')}
                </label>
                <input
                  type="text"
                  value={editAlbumName}
                  onChange={(e) => setEditAlbumName(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.enterAlbumNamePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editAlbumName.trim()) {
                      handleUpdateAlbum();
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.descriptionOptional')}
                </label>
                <textarea
                  value={editAlbumDescription}
                  onChange={(e) => setEditAlbumDescription(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.enterDescriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.albumPrice')}
                </label>
                <input
                  type="number"
                  value={editAlbumPrice}
                  onChange={(e) => setEditAlbumPrice(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.albumPricePlaceholder')}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('photoStudioAlbumPage.albumPriceHint')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.perPhotoPrice')}
                </label>
                <input
                  type="number"
                  value={editPerPhotoPrice}
                  onChange={(e) => setEditPerPhotoPrice(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.perPhotoPlaceholder')}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('photoStudioAlbumPage.perPhotoHint')}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="editAlbumIsPublic"
                  checked={editAlbumIsPublic}
                  onChange={(e) => setEditAlbumIsPublic(e.target.checked)}
                  className="w-4 h-4 text-[#2731db] border-gray-300 rounded focus:ring-[#2731db]"
                />
                <label htmlFor="editAlbumIsPublic" className="text-sm font-medium text-gray-700">
                  {t('photoStudioAlbumPage.makePublic')}
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {t('photoStudioAlbumPage.publicAlbumsHint')}
              </p>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleUpdateAlbum}
                  disabled={updateAlbumMutation.isPending || !editAlbumName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateAlbumMutation.isPending ? t('photoStudioAlbumPage.updating') : t('photoStudioAlbumPage.updateAlbum')}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(null);
                    setEditAlbumName('');
                    setEditAlbumDescription('');
                    setEditAlbumPrice('');
                    setEditPerPhotoPrice('');
                    setEditAlbumIsPublic(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('photoStudioAlbumPage.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Album Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('photoStudioAlbumPage.createNewAlbum')}</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAlbumName('');
                  setNewAlbumDescription('');
                  setNewAlbumPrice('');
                  setNewPerPhotoPrice('');
                  setNewAlbumIsPublic(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.albumName')}
                </label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.enterAlbumNamePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.descriptionOptional')}
                </label>
                <textarea
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.enterDescriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.albumPrice')}
                </label>
                <input
                  type="number"
                  value={newAlbumPrice}
                  onChange={(e) => setNewAlbumPrice(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.albumPricePlaceholder')}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('photoStudioAlbumPage.albumPriceHint')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('photoStudioAlbumPage.perPhotoPrice')}
                </label>
                <input
                  type="number"
                  value={newPerPhotoPrice}
                  onChange={(e) => setNewPerPhotoPrice(e.target.value)}
                  placeholder={t('photoStudioAlbumPage.perPhotoPlaceholder')}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('photoStudioAlbumPage.perPhotoHint')}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="newAlbumIsPublic"
                  checked={newAlbumIsPublic}
                  onChange={(e) => setNewAlbumIsPublic(e.target.checked)}
                  className="w-4 h-4 text-[#2731db] border-gray-300 rounded focus:ring-[#2731db]"
                />
                <label htmlFor="newAlbumIsPublic" className="text-sm font-medium text-gray-700">
                  {t('photoStudioAlbumPage.makePublic')}
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {t('photoStudioAlbumPage.publicAlbumsHint')}
              </p>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleCreateAlbum}
                  disabled={createAlbumMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createAlbumMutation.isPending ? t('photoStudioAlbumPage.creating') : t('photoStudioAlbumPage.createAlbum')}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAlbumName('');
                    setNewAlbumDescription('');
                    setNewAlbumPrice('');
                    setNewPerPhotoPrice('');
                    setNewAlbumIsPublic(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('photoStudioAlbumPage.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Images to Album Modal */}
      {showAddImagesModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('photoStudioAlbumPage.addImagesToAlbum')}
              </h2>
              <button
                onClick={() => {
                  setShowAddImagesModal(null);
                  setSelectedImages(new Set());
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {userImages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaImages className="mx-auto mb-3 text-4xl" />
                  <p>{t('photoStudioAlbumPage.noImagesAvailable')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userImages.map((image, index) => {
                    // Normalize ID to string for consistent comparison
                    const imageId = String(image.id);
                    const isSelected = selectedImages.has(imageId);
                    
                    return (
                      <div
                        key={image.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleImageSelection(image.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="h-32 bg-gray-100 overflow-hidden">
                          {image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
                            <img
                              src={image.previewUrl}
                              alt={image.filename}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                              {image.fileType.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 pointer-events-none">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#2731db] text-white'
                                : 'bg-white bg-opacity-80 border-2 border-gray-300'
                            }`}
                          >
                            {isSelected && <FaCheck className="text-xs" />}
                          </div>
                        </div>
                        <div className="p-2 bg-white pointer-events-none">
                          <p className="text-xs text-gray-900 truncate" title={image.filename}>
                            {image.filename}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {userImages.length > 0 && <div ref={addImagesModalSentinelRef} className="h-4" aria-hidden />}
              {userImages?.length > 0 && isFetchingMoreUserImages && (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="md" text={t('photoStudioAlbumPage.loadingMore')} />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {t('photoStudioAlbumPage.imagesSelected', { count: selectedImages.size })}
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowAddImagesModal(null);
                    setSelectedImages(new Set());
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('photoStudioAlbumPage.cancel')}
                </button>
                <button
                  onClick={() => handleAddImagesToAlbum(showAddImagesModal)}
                  disabled={selectedImages.size === 0 || addImagesMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {addImagesMutation.isPending ? t('photoStudioAlbumPage.adding') : t('photoStudioAlbumPage.addImagesCount', { count: selectedImages.size })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Album Modal */}
      <ShareAlbumModal
        isOpen={showShareModal !== null}
        albumName={albums.find((a) => a.id === showShareModal)?.name}
        clients={clients}
        isLoadingClients={isLoadingClients}
        selectedClientIds={selectedClients}
        isSubmitting={shareAlbumMutation.isPending}
        onToggleClient={toggleClientSelection}
        onClose={() => {
          setShowShareModal(null);
          setSelectedClients(new Set());
        }}
        onConfirm={handleConfirmShare}
      />

      {/* Album theme chooser modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">{t('photoStudioAlbumPage.chooseTheme')}</div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {t('photoStudioAlbumPage.chooseThemeSubtitle')}
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                onClick={() => {
                  setShowTemplateModal(false);
                  setPendingAlbumIds([]);
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { id: 'birthday', nameKey: 'themeBirthday', descKey: 'themeBirthdayDesc', icon: '🎂', color: 'from-pink-500 to-rose-500' },
                  { id: 'wedding', nameKey: 'themeWedding', descKey: 'themeWeddingDesc', icon: '💍', color: 'from-amber-500 to-orange-500' },
                  { id: 'anniversary', nameKey: 'themeAnniversary', descKey: 'themeAnniversaryDesc', icon: '❤️', color: 'from-red-500 to-pink-500' },
                  { id: 'family', nameKey: 'themeFamily', descKey: 'themeFamilyDesc', icon: '👨‍👩‍👧‍👦', color: 'from-emerald-500 to-teal-500' },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-indigo-200"
                    onClick={() => {
                      const ids = pendingAlbumIds.slice();
                      setShowTemplateModal(false);
                      setPendingAlbumIds([]);
                      void transferAlbumsToPhotoBook(ids, theme.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.color} flex items-center justify-center text-lg shadow-sm`}>
                        {theme.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{t(`photoStudioAlbumPage.${theme.nameKey}`)}</div>
                        <div className="text-xs text-slate-500">{t(`photoStudioAlbumPage.${theme.descKey}`)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (() => {
        const { image, albumId, index } = fullScreenImage;
        const images = albumImages.get(albumId) || extractAlbumImages(albums.find(a => a.id === albumId) || {} as Album);
        const imageUrl = getImageUrl(image);
        const filename = getImageFilename(image);
        const total = images?.length || 0;
        
        const handlePrevious = () => {
          if (total === 0) return;
          const previousIndex = (index - 1 + total) % total;
          setFullScreenImage({ image: images[previousIndex], albumId, index: previousIndex });
        };
        
        const handleNext = () => {
          if (total === 0) return;
          const nextIndex = (index + 1) % total;
          setFullScreenImage({ image: images[nextIndex], albumId, index: nextIndex });
        };
        
        const handleClose = () => {
          setFullScreenImage(null);
        };
        
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-3"
              aria-label={t('photoStudioAlbumPage.close')}
            >
              <FaTimes className="text-2xl" />
            </button>
            
            {/* Previous Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-4"
              aria-label={t('photoStudioAlbumPage.previousImage')}
            >
              <FaChevronLeft className="text-2xl" />
            </button>
            
            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-4"
              aria-label={t('photoStudioAlbumPage.nextImage')}
            >
              <FaChevronRight className="text-2xl" />
            </button>
            
            {/* Image Container */}
            <div 
              className="max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={filename}
                  className="max-w-full max-h-[90vh] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-white text-center">
                  <p className="text-lg mb-2">{t('photoStudioAlbumPage.imageNotAvailable')}</p>
                  <p className="text-sm text-gray-400">{filename}</p>
                </div>
              )}
            </div>
            
            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center z-10 bg-black bg-opacity-50 rounded-lg px-4 py-2">
              <p className="text-sm font-medium">{filename}</p>
              <p className="text-xs text-gray-300 mt-1">
                {t('photoStudioAlbumPage.counterOf', { n: index + 1, total })}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Wrapper: normalize infinite-query cache BEFORE mounting PhotoStudioAlbum so the library never sees undefined .pages
function PhotoStudioAlbumWrapper() {
  const { t } = useTranslation();
  const [cacheReady, setCacheReady] = useState(false);
  const queryClient = useQueryClient();
  useLayoutEffect(() => {
    queryClient.setQueryData(['albums'], normalizeInfiniteCache);
    queryClient.setQueryData(['userImages-gallery'], normalizeInfiniteCache);
    setCacheReady(true);
  }, [queryClient]);
  if (!cacheReady) {
    return (
      <DashboardLoading
        title={t('photoStudioAlbumPage.loading')}
        subtitle={t('photoStudioAlbumPage.preparingAlbums')}
        icon={FaFolder}
        showFeatures={false}
      />
    );
  }
  return <PhotoStudioAlbum />;
}

export default PhotoStudioAlbumWrapper;
