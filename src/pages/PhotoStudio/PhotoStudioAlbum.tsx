import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  FaTrash
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DashboardLoading from '../../components/common/DashboardLoading';
import toast from 'react-hot-toast';

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

const PhotoStudioAlbum: React.FC = () => {
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

  // Share link modal (public URL – send to contacts / email / SMS, same as StudioCheckout)
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [shareLinkContactIds, setShareLinkContactIds] = useState<Set<string>>(new Set());
  const [shareLinkNewEmails, setShareLinkNewEmails] = useState('');
  const [shareLinkNewMobileCountryCode, setShareLinkNewMobileCountryCode] = useState('+91');
  const [shareLinkNewMobiles, setShareLinkNewMobiles] = useState('');
  const [shareLinkMessage, setShareLinkMessage] = useState('');
  const [shareLinkChannels, setShareLinkChannels] = useState<{ email: boolean; sms: boolean }>({ email: true, sms: true });
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
      toast.success('Album created successfully!');
      setShowCreateModal(false);
      setNewAlbumName('');
      setNewAlbumDescription('');
      setNewAlbumPrice('');
      setNewPerPhotoPrice('');
      setNewAlbumIsPublic(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create album');
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
      toast.success('Images added to album successfully!');
      setShowAddImagesModal(null);
      setSelectedImages(new Set());
      // Albums will be refetched, and images will be extracted when album is expanded
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add images to album');
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
      toast.success('Album updated successfully!');
      setShowEditModal(null);
      setEditAlbumName('');
      setEditAlbumDescription('');
      setEditAlbumPrice('');
      setEditPerPhotoPrice('');
      setEditAlbumIsPublic(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update album');
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
      toast.success('Album deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete album');
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
      toast.success(`Album shared successfully with ${variables.clientIds?.length} client${variables.clientIds?.length !== 1 ? 's' : ''}!`);
      setShowShareModal(null);
      setSelectedClients(new Set());
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || 'Failed to share album';
      
      // Handle invalid client IDs specifically
      if (errorData?.invalidClientIds && Array.isArray(errorData.invalidClientIds) && errorData.invalidClientIds?.length > 0) {
        const invalidIds = errorData.invalidClientIds.join(', ');
        toast.error(`${errorMessage} (Invalid client IDs: ${invalidIds})`, {
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
      toast.error('Failed to load members');
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

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
      toast.error('Please select at least one client');
      return;
    }
    
    shareAlbumMutation.mutate({
      albumId: showShareModal,
      clientIds: Array.from(selectedClients)
    });
  };

  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) {
      toast.error('Please enter an album name');
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
      toast.error('Please enter an album name');
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
      toast.error('Please select at least one image');
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
    return image.originalFilename || image.filename || 'Unknown';
  };

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

  const publicImagesDisplayUrl = useMemo(() => {
    if (shareLinkSelectedImages.length === 0) return '';
    const ids = shareLinkSelectedImages.map((img) => img.id).join(',');
    return `${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&imageIds=${ids}`;
  }, [shareLinkSelectedImages, tokenForUrl, baseUrl]);

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

  // Fetch contacts for Share link modal
  const { data: shareLinkContactsData } = useQuery({
    queryKey: ['publicShareContacts', shareLinkContactSearch],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (shareLinkContactSearch.trim()) params.set('search', shareLinkContactSearch.trim());
        params.set('limit', '50');
        params.set('offset', '0');
        const res = await api.get<{ contacts?: { id: string; email?: string; mobile?: string; countryCode?: string; displayName?: string }[]; total?: number }>(`/api/public-share/contacts?${params.toString()}`);
        return res.data ?? { contacts: [] };
      } catch {
        return { contacts: [] };
      }
    },
    enabled: showShareLinkModal,
    retry: 0,
  });
  const shareLinkContacts = shareLinkContactsData?.contacts ?? [];

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
      toast.error('No URL to share. Select at least one album first.');
      return;
    }
    const emails = shareLinkNewEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    const mobileParts = shareLinkNewMobiles.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map((part) => (part.startsWith('+') ? part : `${shareLinkNewMobileCountryCode.replace(/\s/g, '')}${part}`));
    if (shareLinkContactIds.size === 0 && emails?.length === 0 && mobiles.length === 0) {
      toast.error('Select at least one contact or enter email/mobile.');
      return;
    }
    const channels: string[] = [];
    if (shareLinkChannels.email) channels.push('email');
    if (shareLinkChannels.sms) channels.push('sms');
    if (channels?.length === 0) {
      toast.error('Select at least one channel (Email or SMS).');
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
        const idList =
          shareIds?.email?.length || shareIds?.sms?.length
            ? ` Share ID(s): ${[...(shareIds?.email ?? []), ...(shareIds?.sms ?? [])].join(', ')}.`
            : ' Each recipient gets a Share ID in the email/SMS for reference.';
        toast.success(`Link sent (email: ${emailCount}, SMS: ${smsCount}).${idList}`);
        setShowShareLinkModal(false);
        setShareLinkContactIds(new Set());
        setShareLinkNewEmails('');
        setShareLinkNewMobiles('');
        setShareLinkMessage('');
        setShareLinkAlreadySent(null);
      } else {
        toast.error('Failed to send. Please try again.');
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        toast.error('Share by email/SMS is not available yet. Use Copy link instead.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to send share.');
      }
    } finally {
      setShareLinkSending(false);
    }
  }, [shareLinkUrlType, publicCheckoutUrl, publicSelectionUrl, publicImagesDisplayUrl, shareLinkNewEmails, shareLinkNewMobiles, shareLinkNewMobileCountryCode, shareLinkContactIds, shareLinkChannels, shareLinkMessage]);

  const blobToDataUrl = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  const fetchAsDataUrl = async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    const blob = await res.blob();
    return blobToDataUrl(blob);
  };

  const transferAlbumsToPhotoBook = useCallback(async (albumIds: number[], categorySlug: string) => {
    if (!albumIds?.length) {
      toast.error('Please select at least one album');
      return;
    }
    if (isTransferringToPhotoBook) return;

    setIsTransferringToPhotoBook(true);

    try {
      const selected = albums.filter((a) => albumIds.includes(a.id));
      if (!selected?.length) {
        toast.error('Selected albums not found');
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
        toast.error('No images found in the selected album(s)');
        return;
      }

      const albumName = selected.length === 1 ? (selected[0]?.name || 'My Album') : `${selected.length} Albums`;

      // Navigate to the covers page first (design cover & last page), then user can go to album
      navigate(`/photo-themes/${categorySlug}`, {
        state: {
          fromStudioAlbum: true,
          albumImageIds: imageIds,
          albumName,
          studioAlbumIds: albumIds,
        },
      });

      toast.success(`Opening covers page with ${imageIds.length} image(s) — design cover, then continue to album`);
    } catch (e: any) {
      console.error('PhotoBook transfer failed:', e);
      toast.error(e?.message || 'Failed to open album builder');
    } finally {
      setIsTransferringToPhotoBook(false);
    }
  }, [albums, albumImages, extractAlbumImages, getImageFilename, isTransferringToPhotoBook, navigate]);

  /** Single selection only: selecting an album replaces any previous selection. */
  const toggleAlbumSelection = useCallback((albumId: number) => {
    setSelectedAlbums((prev) => {
      if (prev.has(albumId)) return new Set<number>();
      return new Set([albumId]);
    });
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
        title="Loading User Information"
        subtitle="Authenticating your session..."
        icon={FaUserFriends}
        showFeatures={false}
      />
    );
  }
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaFolder className="mr-3 text-[#2731db]" />
              Photo Albums
            </h1>
            <p className="text-gray-600 mt-2">Create albums and organize your photos.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to load albums</h1>
          <p className="text-gray-600 text-sm mb-4">Failed to fetch albums. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaFolder className="mr-3 text-[#2731db]" />
            Photo Albums
          </h1>
          <p className="text-gray-600 mt-2">
            Create albums and organize your photos.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const ids = Array.from(selectedAlbums);
              if (ids.length === 0) {
                toast.error('Please select at least one album');
                return;
              }
              setPendingAlbumIds(ids);
              setShowTemplateModal(true);
            }}
            disabled={selectedAlbums.size === 0 || isTransferringToPhotoBook}
            className="px-4 py-2 rounded-lg bg-[#111827] text-white hover:bg-slate-800 transition-colors flex items-center disabled:opacity-60"
            title="Transfer selected albums to PhotoBook"
          >
            <FaFolderOpen className="mr-2" />
            Transfer to PhotoBook {selectedAlbums.size > 0 ? `(${selectedAlbums.size})` : ''}
          </button>
          <button
            onClick={() => setShowShareLinkModal(true)}
            disabled={selectedAlbums.size === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
            title="Share public link (selection/checkout) for selected albums"
          >
            <FaShare className="mr-2" />
            Share link {selectedAlbums.size > 0 ? `(${selectedAlbums.size})` : ''}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors flex items-center"
          >
            <FaPlus className="mr-2" />
            Create Album
          </button>
        </div>
      </div>

      {/* Share link modal – send public URL to contacts / email / SMS (same as StudioCheckout) */}
      {showShareLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Share link</h3>
              <button
                onClick={() => {
                  setShowShareLinkModal(false);
                  setShareLinkContactSearch('');
                  setShareLinkAlreadySent(null);
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {shareLinkSelectedImages.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Select at least one album above to generate a shareable link.
                </p>
              ) : (
                <>
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Which link to share</label>
                    <select
                      value={shareLinkUrlType}
                      onChange={(e) => setShareLinkUrlType(e.target.value as 'checkout' | 'selection' | 'images_display')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="selection">Selection URL</option>
                      <option value="checkout" disabled>Checkout URL</option>
                      <option value="images_display" disabled>Images display (selected only)</option>
                    </select>
                  </div> */}
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Copy link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareLinkUrlType === 'checkout' ? publicCheckoutUrl : shareLinkUrlType === 'images_display' ? publicImagesDisplayUrl : publicSelectionUrl}
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = shareLinkUrlType === 'checkout' ? publicCheckoutUrl : shareLinkUrlType === 'images_display' ? publicImagesDisplayUrl : publicSelectionUrl;
                          if (url) {
                            copyToClipboard(url);
                            toast.success('Link copied to clipboard');
                          }
                        }}
                        className="shrink-0 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <FaCopy className="w-4 h-4" />
                      </button>
                    </div>
                  </div> */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Existing contacts</label>
                    <input
                      type="text"
                      value={shareLinkContactSearch}
                      onChange={(e) => setShareLinkContactSearch(e.target.value)}
                      placeholder="Search by name, email, mobile..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
                    />
                    <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                      {shareLinkContacts.length === 0 ? (
                        <p className="text-sm text-gray-500">No contacts yet. Add email or mobile below.</p>
                      ) : (
                        shareLinkContacts.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={shareLinkContactIds.has(c.id)}
                              onChange={(e) => {
                                const next = new Set(shareLinkContactIds);
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                                setShareLinkContactIds(next);
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{c.displayName || c.email || c.mobile || c.id}</span>
                            {(c.email || c.mobile) && (
                              <span className="text-xs text-gray-500">
                                ({[c.email, c.mobile].filter(Boolean).join(', ')})
                              </span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New recipients – email (comma separated)</label>
                    <input
                      type="text"
                      value={shareLinkNewEmails}
                      onChange={(e) => { setShareLinkNewEmails(e.target.value); setShareLinkAlreadySent(null); }}
                      onBlur={() => checkShareLinkRecipient(shareLinkNewEmails, shareLinkNewMobiles)}
                      placeholder="e.g. a@example.com, b@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New recipients – mobile (comma separated)</label>
                    <div className="flex gap-2">
                      <select
                        value={shareLinkNewMobileCountryCode}
                        onChange={(e) => setShareLinkNewMobileCountryCode(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 shrink-0"
                      >
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+971">+971</option>
                        <option value="+61">+61</option>
                        <option value="+81">+81</option>
                        <option value="+86">+86</option>
                        <option value="+33">+33</option>
                        <option value="+49">+49</option>
                        <option value="+55">+55</option>
                      </select>
                      <input
                        type="text"
                        value={shareLinkNewMobiles}
                        onChange={(e) => { setShareLinkNewMobiles(e.target.value); setShareLinkAlreadySent(null); }}
                        onBlur={() => checkShareLinkRecipient(shareLinkNewEmails, shareLinkNewMobiles)}
                        placeholder="e.g. 9876543210, 9123456789"
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  {shareLinkAlreadySent?.alreadySent && (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Already sent to this {shareLinkAlreadySent.email ? 'email' : 'mobile'}. You can resend if needed.
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Optional message</label>
                    <textarea
                      value={shareLinkMessage}
                      onChange={(e) => setShareLinkMessage(e.target.value)}
                      placeholder="Add a short message to include in the email/SMS"
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareLinkChannels.email}
                        onChange={(e) => setShareLinkChannels((c) => ({ ...c, email: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Send via Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareLinkChannels.sms}
                        onChange={(e) => setShareLinkChannels((c) => ({ ...c, sms: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Send via SMS</span>
                    </label>
                  </div>
                </>
              )}
            </div>
            {shareLinkSelectedImages.length > 0 && (
              <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowShareLinkModal(false);
                    setShareLinkContactSearch('');
                    setShareLinkAlreadySent(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareLinkSend}
                  disabled={shareLinkSending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold"
                >
                  {shareLinkSending ? 'Sending…' : 'Send'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Album Grid (main) or Album Detail (single album) */}
      {viewingAlbumId !== null ? (
        /* Album Detail View – single album with back button and image grid */
        (() => {
          const album = albums.find((a) => a.id === viewingAlbumId);
          if (!album) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <p className="mb-4">Album not found.</p>
                <button type="button" onClick={() => setViewingAlbumId(null)} className="px-4 py-2 rounded-xl bg-[#2731db] text-white">
                  Back to albums
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
                  onClick={() => setViewingAlbumId(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <FaChevronLeft className="h-4 w-4" />
                  Back to albums
                </button>
                <h2 className="text-xl font-semibold text-gray-900 truncate flex-1">{album.name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedImages(new Set()); setShowAddImagesModal(album.id); }}
                    className="px-4 py-2 rounded-xl bg-[#2731db] text-white hover:bg-blue-700 text-sm font-medium"
                  >
                    <FaPlus className="mr-1 inline" />
                    Upload Images
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingAlbumIds([album.id]); setShowTemplateModal(true); }}
                    disabled={isTransferringToPhotoBook}
                    className="px-4 py-2 rounded-xl bg-[#111827] text-white hover:bg-slate-800 text-sm font-medium disabled:opacity-60"
                  >
                    <FaFolderOpen className="mr-1 inline" />
                    PhotoBook
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((image, index) => {
                      const imageUrl = getImageUrl(image);
                      const thumbUrl = getThumbnailUrl(image);
                      const fileType = getFileType(image);
                      const filename = getImageFilename(image);
                      const canViewFullScreen = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                      return (
                        <div
                          key={image.id}
                          className={`relative rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 group ${canViewFullScreen ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (canViewFullScreen) setFullScreenImage({ image, albumId: album.id, index });
                          }}
                        >
                          <div className="aspect-square bg-gray-100 overflow-hidden relative">
                            {canViewFullScreen ? (
                              <>
                                <img
                                  src={(thumbUrl || imageUrl)!}
                                  alt={filename}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">View</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500 text-xs">{fileType.toUpperCase() || 'FILE'}</div>
                            )}
                          </div>
                          <div className="p-2 bg-white">
                            <p className="text-xs text-gray-700 truncate" title={filename}>{filename}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <FaImages className="mx-auto mb-3 text-5xl text-gray-300" />
                    <p className="text-lg font-medium mb-2">No images in this album yet</p>
                    <p className="text-sm mb-4">Upload images to get started.</p>
                    <button
                      type="button"
                      onClick={() => { setSelectedImages(new Set()); setShowAddImagesModal(album.id); }}
                      className="px-4 py-2 rounded-xl bg-[#2731db] text-white hover:bg-blue-700"
                    >
                      <FaPlus className="mr-1 inline" />
                      Upload Images
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        /* Album Grid – card-based main view */
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-500">Total albums:</p>
              <p className="text-2xl font-bold text-gray-900">{albumsTotal}</p>
              <div className="flex items-center gap-2 ml-2">
                <select
                  value={albumSort}
                  onChange={(e) => setAlbumSort(e.target.value as 'name' | 'date')}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[#2731db] focus:border-[#2731db]"
                >
                  <option value="date">Sort by date</option>
                  <option value="name">Sort by name</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 max-w-xs w-full sm:max-w-sm">
              <FaSearch className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search albums..."
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
                <p className="text-xl font-medium mb-2">No Albums Found</p>
                <p className="text-sm mb-6">Create your first album to get started.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#2731db] text-white hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  Create Album
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
                                aria-label="Menu"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="2" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="14" r="1.5" /></svg>
                              </button>
                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1 bg-white rounded-xl shadow-lg border border-gray-200">
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setAlbumImages((prev) => { const n = new Map(prev); n.set(album.id, extractAlbumImages(album)); return n; }); setViewingAlbumId(album.id); setMenuOpenAlbumId(null); }}><FaFolderOpen className="h-4 w-4" /> View Album</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setSelectedImages(new Set()); setShowAddImagesModal(album.id); setMenuOpenAlbumId(null); }}><FaPlus className="h-4 w-4" /> Upload Images</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); handleEditAlbum(album); setMenuOpenAlbumId(null); }}><FaEdit className="h-4 w-4" /> Rename Album</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${album.name}"? This cannot be undone.`)) deleteAlbumMutation.mutate(album.id); setMenuOpenAlbumId(null); }}><FaTrash className="h-4 w-4" /> Delete Album</button>
                                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); handleShareAlbum(album); setMenuOpenAlbumId(null); }}><FaShare className="h-4 w-4" /> Share Album</button>
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
                                title={selectedAlbums.has(album.id) ? 'Unselect' : 'Select'}
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
                              {count} {count === 1 ? 'Photo' : 'Photos'}
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
                    <LoadingSpinner size="md" text="Loading more..." />
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
                Edit Album
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
                  Album Name *
                </label>
                <input
                  type="text"
                  value={editAlbumName}
                  onChange={(e) => setEditAlbumName(e.target.value)}
                  placeholder="Enter album name"
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
                  Description (optional)
                </label>
                <textarea
                  value={editAlbumDescription}
                  onChange={(e) => setEditAlbumDescription(e.target.value)}
                  placeholder="Enter album description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Album Price (₹) (optional)
                </label>
                <input
                  type="number"
                  value={editAlbumPrice}
                  onChange={(e) => setEditAlbumPrice(e.target.value)}
                  placeholder="Enter album price"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set a price for the entire album. If set, customers can purchase the full album at this price.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Per Photo (₹) (optional)
                </label>
                <input
                  type="number"
                  value={editPerPhotoPrice}
                  onChange={(e) => setEditPerPhotoPrice(e.target.value)}
                  placeholder="Enter price per photo"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set a price for purchasing each photo individually
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
                  Make album public
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Public albums can be accessed by anyone with the link.
              </p>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleUpdateAlbum}
                  disabled={updateAlbumMutation.isPending || !editAlbumName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateAlbumMutation.isPending ? 'Updating...' : 'Update Album'}
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
                  Cancel
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
              <h2 className="text-2xl font-bold text-gray-900">Create New Album</h2>
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
                  Album Name *
                </label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Enter album name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder="Enter album description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Album Price (₹) (optional)
                </label>
                <input
                  type="number"
                  value={newAlbumPrice}
                  onChange={(e) => setNewAlbumPrice(e.target.value)}
                  placeholder="Enter album price"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set a price for the entire album. If set, customers can purchase the full album at this price.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Per Photo (₹) (optional)
                </label>
                <input
                  type="number"
                  value={newPerPhotoPrice}
                  onChange={(e) => setNewPerPhotoPrice(e.target.value)}
                  placeholder="Enter price per photo"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set a price for purchasing each photo individually
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
                  Make album public
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Public albums can be accessed by anyone with the link.
              </p>
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleCreateAlbum}
                  disabled={createAlbumMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createAlbumMutation.isPending ? 'Creating...' : 'Create Album'}
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
                  Cancel
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
                Add Images to Album
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
                  <p>No images available</p>
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
                  <LoadingSpinner size="md" text="Loading more..." />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowAddImagesModal(null);
                    setSelectedImages(new Set());
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddImagesToAlbum(showAddImagesModal)}
                  disabled={selectedImages.size === 0 || addImagesMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {addImagesMutation.isPending ? 'Adding...' : `Add ${selectedImages.size} Image${selectedImages.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Album Modal */}
      {showShareModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <FaShare className="text-white text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Share Album
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {albums.find(a => a.id === showShareModal)?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(null);
                  setSelectedClients(new Set());
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                disabled={shareAlbumMutation.isPending}
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingClients ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading clients..." />
                </div>
              ) : clients?.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaUserFriends className="mx-auto mb-3 text-4xl text-gray-300" />
                  <p className="text-lg font-medium mb-2">No members available</p>
                  <p className="text-sm">You don't have any family members or clients to share with yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Select members to share this album with (family & clients):
                    </p>
                    <p className="text-xs text-gray-500">
                      Selected: {selectedClients.size} member{selectedClients.size !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {clients.map((client) => {
                      const isSelected = selectedClients.has(client.id);
                      return (
                        <div
                          key={client.id}
                          onClick={() => toggleClientSelection(client.id)}
                          className={`flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500'
                          }`}>
                            {client.firstName?.charAt(0)?.toUpperCase() || client.fullName?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 truncate">
                                {client.fullName || `${client.firstName} ${client.lastName}`.trim() || 'Unknown'}
                              </p>
                              {client.relation && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                                  {client.relation}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                              {client.email && (
                                <p className="text-xs text-gray-500 truncate">{client.email}</p>
                              )}
                              {client.username && (
                                <span className="text-xs text-gray-400">@{client.username}</span>
                              )}
                            </div>
                          </div>
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <FaCheck className="text-white text-xs" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedClients.size > 0 ? (
                    <span className="font-medium text-purple-600">
                      {selectedClients.size} member{selectedClients.size !== 1 ? 's' : ''} selected
                    </span>
                  ) : (
                    <span>No members selected</span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowShareModal(null);
                      setSelectedClients(new Set());
                    }}
                    disabled={shareAlbumMutation.isPending}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmShare}
                    disabled={selectedClients.size === 0 || shareAlbumMutation.isPending || isLoadingClients}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {shareAlbumMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sharing...</span>
                      </>
                    ) : (
                      <>
                        <FaShare />
                        <span>Share Album</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Album theme chooser modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">Choose Album Theme</div>
                <div className="mt-0.5 text-sm text-slate-500">
                  Select a theme for your photo album
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
                  { id: 'birthday', name: 'Birthday', desc: 'Celebrate special birthdays', icon: '🎂', color: 'from-pink-500 to-rose-500' },
                  { id: 'wedding', name: 'Wedding', desc: 'Elegant wedding memories', icon: '💍', color: 'from-amber-500 to-orange-500' },
                  { id: 'anniversary', name: 'Anniversary', desc: 'Romantic anniversary keepsake', icon: '❤️', color: 'from-red-500 to-pink-500' },
                  { id: 'family', name: 'Family', desc: 'Family moments together', icon: '👨‍👩‍👧‍👦', color: 'from-emerald-500 to-teal-500' },
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
                        <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{theme.name}</div>
                        <div className="text-xs text-slate-500">{theme.desc}</div>
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
              aria-label="Close"
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
              aria-label="Previous image"
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
              aria-label="Next image"
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
                  <p className="text-lg mb-2">Image not available</p>
                  <p className="text-sm text-gray-400">{filename}</p>
                </div>
              )}
            </div>
            
            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center z-10 bg-black bg-opacity-50 rounded-lg px-4 py-2">
              <p className="text-sm font-medium">{filename}</p>
              <p className="text-xs text-gray-300 mt-1">
                {index + 1} of {total}
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
        title="Loading"
        subtitle="Preparing albums..."
        icon={FaFolder}
        showFeatures={false}
      />
    );
  }
  return <PhotoStudioAlbum />;
}

export default PhotoStudioAlbumWrapper;
