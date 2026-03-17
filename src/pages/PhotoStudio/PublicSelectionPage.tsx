import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaImages, FaDownload, FaExclamationTriangle, FaFolder, FaFolderOpen, FaChevronRight, FaCheckCircle, FaCheck, FaCopy, FaShare, FaTimes, FaExpandArrowsAlt } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { decryptImageIds, decryptCheckoutPayload } from '../../utils/encryption';
import { decompressFileList } from '../../utils/checkoutUrlEncoding';

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
  [key: string]: any;
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
  filename?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  fileType?: string;
  [key: string]: any;
}

const IMAGES_PAGE_SIZE = 20;
const ALBUMS_PAGE_SIZE = 20;
const ALBUM_IMAGES_PAGE_SIZE = 20; // images to show per album (then "Load more")

/** GET /api/flags response: controls visibility of email, phone, download, etc. */
interface FlagItem {
  name: string;
  id: number;
  value: boolean;
}
interface FlagsResponse {
  flags?: FlagItem[];
}

const PublicSelectionPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryClient = useQueryClient();
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [userSelectedImages, setUserSelectedImages] = useState<Map<number, Set<number>>>(new Map()); // albumId -> Set of imageIds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<AlbumImage | null>(null);
  /** When false, checkboxes are hidden; click "Select" to show them and enable selection */
  const [showSelectionMode, setShowSelectionMode] = useState(false);
  /** Per album: how many images to show (pagination). Key = albumId, value = count. */
  const [albumImagesShownCount, setAlbumImagesShownCount] = useState<Map<number, number>>(new Map());
  const loadMoreBulkSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreAlbumsRef = useRef<HTMLDivElement | null>(null);

  const sid = searchParams.get('sid') || '';
  // shareId is added by the backend when the link is sent via email/SMS (for verification/tracking). Not present when you copy the link in-app.
  const shareIdParam = searchParams.get('shareId') || '';
  const shareId = shareIdParam ? parseInt(shareIdParam, 10) : undefined;
  const validShareId = shareId != null && !isNaN(shareId) && shareId > 0 ? shareId : undefined;
  const qParam = searchParams.get('q') || ''; // encrypted token+albumId (minimal link)
  const token = searchParams.get('token') || '';
  const albumIdParam = searchParams.get('albumId') || ''; // optional: load single album by ID
  const filesParam = searchParams.get('files') || ''; // Legacy support
  const fParam = searchParams.get('f') || ''; // Compressed file list (short URL)
  const imageIdsParam = searchParams.get('imageIds') || '';
  const albumId = albumIdParam ? parseInt(albumIdParam, 10) : null;
  const hasValidAlbumId = albumId != null && !isNaN(albumId) && albumId > 0;

  // Protect: do not open this page without a complete share URL (sid, q, or token)
  const hasShareIdentifier = !!(sid.trim() || qParam.trim() || token.trim());

  const payloadFromQ = useMemo(() => (qParam.trim() ? decryptCheckoutPayload(qParam.trim()) : null), [qParam]);
  const qInvalid = qParam.trim() !== '' && payloadFromQ === null;

  type ResolvedFromSid = { token: string; albumId: number | null; fileNames: string[]; imageIds?: number[] };
  const [resolvedFromSid, setResolvedFromSid] = useState<ResolvedFromSid | null>(null);
  const [sidLoading, setSidLoading] = useState(false);
  const [sidError, setSidError] = useState(false);

  useEffect(() => {
    if (!sid.trim()) {
      setResolvedFromSid(null);
      setSidError(false);
      return;
    }
    let cancelled = false;
    setSidLoading(true);
    setSidError(false);
    api.get<{ token: string; albumId?: number | null; fileNames?: string[]; imageIds?: number[] }>(`/api/public/share-link/${encodeURIComponent(sid)}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        const tokenVal = data?.token ?? '';
        const raw = data?.albumId;
        const n = raw != null ? Number(raw) : NaN;
        const albumIdVal = Number.isFinite(n) ? n : null;
        const fileNamesVal = Array.isArray(data?.fileNames) ? data.fileNames : [];
        const imageIdsVal = Array.isArray(data?.imageIds) ? data.imageIds.filter((id): id is number => typeof id === 'number') : [];
        setResolvedFromSid({ token: tokenVal, albumId: albumIdVal, fileNames: fileNamesVal, imageIds: imageIdsVal.length > 0 ? imageIdsVal : undefined });
      })
      .catch(() => {
        if (!cancelled) {
          setSidError(true);
          setResolvedFromSid(null);
        }
      })
      .finally(() => {
        if (!cancelled) setSidLoading(false);
      });
    return () => { cancelled = true; };
  }, [sid]);

  const effectiveToken = resolvedFromSid?.token ?? payloadFromQ?.token ?? token;
  const effectiveAlbumId = resolvedFromSid != null ? resolvedFromSid.albumId : (payloadFromQ != null ? payloadFromQ.albumId : albumId);
  const effectiveHasValidAlbumId = effectiveAlbumId != null && !isNaN(effectiveAlbumId) && effectiveAlbumId > 0;

  // Verification gate (OTP / existing user) – same as PublicCheckoutPage
  const verifyStorageKey = useMemo(() => `public_selection_verified_${effectiveToken.slice(0, 24)}`, [effectiveToken]);
  type VerifyStatus = 'idle' | 'checking' | 'skip' | 'existing_user' | 'show_message' | 'needs_input' | 'otp_sent' | 'verified';
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyMobile, setVerifyMobile] = useState('');
  const [verifyCountryCode, setVerifyCountryCode] = useState('+91');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyInfoMessage, setVerifyInfoMessage] = useState('');
  const [verifyUserId, setVerifyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveToken) return;
    const stored = sessionStorage.getItem(verifyStorageKey);
    if (stored === '1') {
      setVerifyStatus('verified');
      return;
    }
    let cancelled = false;
    setVerifyStatus('checking');
    const publicUrl = typeof window !== 'undefined' ? window.location.href : '';
    api.post<{ isExistingUser?: boolean; existingUser?: boolean; sendNotification?: boolean; userId?: string; message?: string }>('/api/public-verify/check-user', validShareId != null ? { id: validShareId } : {})
      .then(async (res) => {
        if (cancelled) return;
        const isExisting = res.data?.isExistingUser === true || res.data?.existingUser === true;
        const sendNotification = res.data?.sendNotification === true;
        const userId = res.data?.userId;
        if (isExisting && !sendNotification) {
          setVerifyInfoMessage(res.data?.message || '');
          setVerifyStatus('show_message');
          return;
        }
        if (isExisting && sendNotification && userId) {
          setVerifyUserId(userId);
          try {
            await api.post('/api/public-verify/send-otp', {
              userId,
              linkId: effectiveToken,
              ...(validShareId != null ? { id: validShareId } : {}),
            });
            setVerifyStatus('otp_sent');
            setVerifyOtp('');
            toast.success('OTP sent. Check your email or phone.');
          } catch {
            setVerifyStatus('needs_input');
          }
          return;
        }
        setVerifyStatus('needs_input');
      })
      .catch(() => {
        if (cancelled) return;
        setVerifyStatus('needs_input'); // API failed or not implemented – still show verification page
      });
    return () => { cancelled = true; };
  }, [effectiveToken, verifyStorageKey, validShareId]);

  const handleVerifySubmit = async () => {
    const email = verifyEmail.trim();
    const mobile = verifyMobile.trim() ? `${verifyCountryCode.replace(/^\s+|\s+$/g, '')}${verifyMobile.trim().replace(/\s/g, '')}` : '';
    if (!email && !mobile) {
      setVerifyError('Enter email or mobile number.');
      return;
    }
    setVerifyError('');
    setVerifySending(true);
    try {
      const checkRes = await api.post<{ isExistingUser?: boolean; existingUser?: boolean; sendNotification?: boolean; message?: string }>('/api/public-verify/check-user', {
        email: email || undefined,
        mobile: mobile || undefined,
        ...(validShareId != null ? { id: validShareId } : {}),
      });
      const isExisting = checkRes.data?.isExistingUser === true || checkRes.data?.existingUser === true;
      const sendNotification = checkRes.data?.sendNotification === true;
      if (isExisting && !sendNotification) {
        setVerifyInfoMessage(checkRes.data?.message || '');
        setVerifyStatus('show_message');
        return;
      }
      if (isExisting && sendNotification) {
        await api.post('/api/public-verify/send-otp', {
          email: email || undefined,
          mobile: mobile || undefined,
          channel: mobile ? 'sms' : 'email',
          linkId: effectiveToken,
          ...(validShareId != null ? { id: validShareId } : {}),
        });
        setVerifyStatus('otp_sent');
        setVerifyOtp('');
        toast.success('OTP sent. Check your email or phone.');
        return;
      }
      // Not existing → call send-otp and show OTP page
      const sendOtpBody: { email?: string; mobile?: string; channel: string; linkId?: string; id?: number } = {
        email: email || undefined,
        mobile: mobile || undefined,
        channel: mobile ? 'sms' : 'email',
        linkId: effectiveToken,
      };
      if (validShareId != null) sendOtpBody.id = validShareId;
      await api.post('/api/public-verify/send-otp', sendOtpBody);
      setVerifyStatus('otp_sent');
      setVerifyOtp('');
      toast.success('OTP sent. Check your email or phone.');
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success('Verification skipped.');
      } else {
        setVerifyError(err.response?.data?.message || 'Something went wrong. Try again.');
      }
    } finally {
      setVerifySending(false);
    }
  };

  const handleResendOtp = async () => {
    if (verifyUserId) {
      setVerifySending(true);
      setVerifyError('');
      try {
        await api.post('/api/public-verify/send-otp', {
          userId: verifyUserId,
          linkId: effectiveToken,
          ...(validShareId != null ? { id: validShareId } : {}),
        });
        setVerifyOtp('');
        toast.success('OTP sent again.');
      } catch (err: any) {
        setVerifyError(err.response?.data?.message || 'Failed to resend OTP.');
      } finally {
        setVerifySending(false);
      }
    } else {
      handleVerifySubmit();
    }
  };

  const handleVerifyOtpSubmit = async () => {
    if (!verifyOtp.trim()) {
      setVerifyError('Enter the OTP.');
      return;
    }
    setVerifyError('');
    setVerifySending(true);
    try {
      const email = verifyEmail.trim();
      const mobile = verifyMobile.trim() ? `${verifyCountryCode.replace(/^\s+|\s+$/g, '')}${verifyMobile.trim().replace(/\s/g, '')}` : '';
      const res = await api.post<{ success?: boolean }>('/api/public-verify/verify-otp', {
        ...(verifyUserId ? { userId: verifyUserId } : { email: email || undefined, mobile: mobile || undefined }),
        otp: verifyOtp.trim(),
        linkId: effectiveToken,
        ...(validShareId != null ? { id: validShareId } : {}),
      });
      if (res.data?.success) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success('Verified. Loading...');
      } else {
        setVerifyError('Invalid OTP. Try again.');
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || 'Invalid OTP. Try again.');
    } finally {
      setVerifySending(false);
    }
  };

  const [decodedFilesFromF, setDecodedFilesFromF] = useState<string[]>([]);
  useEffect(() => {
    if (!fParam.trim()) {
      setDecodedFilesFromF([]);
      return;
    }
    let cancelled = false;
    decompressFileList(fParam).then((list) => {
      if (!cancelled) setDecodedFilesFromF(list);
    });
    return () => { cancelled = true; };
  }, [fParam]);

  // Auto-enable "show only selected" when imageIds or files are provided in URL
  useEffect(() => {
    if ((imageIdsParam && imageIdsParam.trim().length > 0) || (filesParam && filesParam.trim().length > 0) || fParam.trim().length > 0) {
      setShowOnlySelected(true);
    }
  }, [imageIdsParam, filesParam, fParam]);

  // Parse image IDs from URL parameter (preferred method)
  const targetImageIds = useMemo(() => {
    if (imageIdsParam) {
      try {
        const decrypted = decryptImageIds(imageIdsParam);
        if (decrypted.length > 0) return decrypted;
      } catch {
        // fallback to plain
      }
      return imageIdsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    }
    return [];
  }, [imageIdsParam]);

  // Parse filenames: from sid payload, or decoded f= (short URL), or files= (legacy)
  const targetFilenames = useMemo(() => {
    if (resolvedFromSid?.fileNames?.length) return resolvedFromSid.fileNames;
    if (fParam) return decodedFilesFromF;
    if (!filesParam) return [];
    return filesParam.split(',').map(f => decodeURIComponent(f.trim())).filter(f => f);
  }, [resolvedFromSid, fParam, filesParam, decodedFilesFromF]);

  // Image IDs for bulk fetch: from sid response (when share was created with imageIds) or from URL imageIds=
  const bulkImageIds = useMemo(() => {
    if (resolvedFromSid?.imageIds?.length) return resolvedFromSid.imageIds;
    if (targetImageIds.length > 0) return targetImageIds;
    return [];
  }, [resolvedFromSid?.imageIds, targetImageIds]);

  const isBulkMode = bulkImageIds.length > 0 && !!effectiveToken;

  // Fetch selected images by IDs via GET /api/images/bulk with pagination (chunked ids)
  const {
    data: bulkImagesData,
    isLoading: bulkImagesLoading,
    isError: bulkImagesError,
    isFetchingNextPage: bulkFetchingNextPage,
    hasNextPage: bulkHasNextPage,
    fetchNextPage: bulkFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['publicSelectionBulkImages', effectiveToken, bulkImageIds.join(',')],
    queryFn: async ({ pageParam }) => {
      const start = pageParam * IMAGES_PAGE_SIZE;
      const chunk = bulkImageIds.slice(start, start + IMAGES_PAGE_SIZE);
      if (chunk.length === 0) return [];
      const ids = chunk.join(',');
      const res = await api.get<AlbumImage[] | { images?: AlbumImage[] }>(`/api/images/bulk`, {
        params: { ids, token: effectiveToken },
      });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object' && Array.isArray((raw as { images?: AlbumImage[] }).images)) return (raw as { images: AlbumImage[] }).images;
      return [];
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, p) => acc + (Array.isArray(p) ? p.length : 0), 0);
      return loadedCount < bulkImageIds.length ? allPages.length : undefined;
    },
    enabled: isBulkMode,
    retry: 1,
  });

  const bulkImages: AlbumImage[] = useMemo(() => {
    if (!bulkImagesData?.pages) return [];
    return bulkImagesData.pages.flatMap((p) => (Array.isArray(p) ? p : []));
  }, [bulkImagesData]);

  // Infinite scroll: bulk images grid
  useEffect(() => {
    const sentinel = loadMoreBulkSentinelRef.current;
    if (!sentinel || !bulkHasNextPage || bulkFetchingNextPage || !isBulkMode) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) bulkFetchNextPage(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [bulkHasNextPage, bulkFetchingNextPage, bulkFetchNextPage, isBulkMode]);

  // Fetch albums: single album by ID when albumId in URL, otherwise paginated albums
  const {
    data: albumsData,
    isLoading,
    isError,
    isFetchingNextPage: albumsFetchingNextPage,
    hasNextPage: albumsHasNextPage,
    fetchNextPage: albumsFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['publicSelectionAlbums', effectiveToken, effectiveHasValidAlbumId ? effectiveAlbumId : null],
    enabled: !!effectiveToken && (!sid || !!resolvedFromSid || sidError) && !isBulkMode,
    queryFn: async ({ pageParam }) => {
      const headers = effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {};
      const params: Record<string, string | number> = effectiveToken ? { token: effectiveToken } : {};
      if (effectiveHasValidAlbumId && effectiveAlbumId != null) {
        const response = await api.get(`/api/albums/${effectiveAlbumId}`, { headers, params });
        const album = response.data as Album;
        return { albums: album ? [album] : [], page: 0, totalPages: 1 };
      }
      const response = await api.get('/api/albums', {
        headers,
        params: { ...params, page: pageParam, size: ALBUMS_PAGE_SIZE },
      });
      const data = response.data;
      if (data == null) return { albums: [], page: Number(pageParam), totalPages: 1 };
      if (Array.isArray(data)) return { albums: data, page: Number(pageParam), totalPages: 1 };
      const typed = data as { albums?: Album[]; page?: number; totalPages?: number };
      return {
        albums: typed.albums ?? [],
        page: typed.page ?? Number(pageParam),
        totalPages: typed.totalPages ?? 1,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = Number((lastPage as { page?: number }).page ?? 0);
      const totalPages = Number((lastPage as { totalPages?: number }).totalPages ?? 1);
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 1,
  });

  const albums = useMemo(() => {
    if (!albumsData?.pages?.length) return [];
    return albumsData.pages.flatMap((p) => (p && (p as { albums?: Album[] }).albums) ?? []);
  }, [albumsData]);

  // Infinite scroll: albums list
  useEffect(() => {
    const el = loadMoreAlbumsRef.current;
    if (!el || !albumsHasNextPage || albumsFetchingNextPage || isBulkMode) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) albumsFetchNextPage(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [albumsHasNextPage, albumsFetchingNextPage, albumsFetchNextPage, isBulkMode]);

  // Feature flags: show/hide download (GET /api/flags)
  const { data: flagsData } = useQuery({
    queryKey: ['flags', effectiveToken],
    queryFn: async () => {
      const res = await api.get<FlagsResponse>('/api/flags', {
        headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {},
      });
      return res.data;
    },
    retry: 1,
    staleTime: 60_000,
  });
  const showDownload = useMemo(() => {
    const flags = flagsData?.flags;
    if (!Array.isArray(flags)) return true;
    const isDownload = flags.find((f) => f.name === 'isDownload');
    return isDownload?.value ?? true;
  }, [flagsData]);

  const getImageFilename = (image: AlbumImage): string => {
    return image.originalFilename || image.filename || 'Unknown';
  };

  // Auto-select albums and images based on image IDs or filenames from URL
  useEffect(() => {
    if (albums.length === 0) return;

    const matchedAlbums = new Set<number>();
    const matchedImages = new Map<number, Set<number>>();

    // Method 1: Use image IDs if provided (preferred - shorter URLs)
    if (targetImageIds.length > 0) {
      albums.forEach(album => {
        if (!album.images || album.images.length === 0) return;

        const albumImageIds = new Set<number>();
        let hasMatch = false;

        album.images.forEach(image => {
          if (targetImageIds.includes(image.id)) {
            albumImageIds.add(image.id);
            hasMatch = true;
          }
        });

        if (hasMatch) {
          matchedAlbums.add(album.id);
          matchedImages.set(album.id, albumImageIds);
          // Auto-expand albums with matches
          setExpandedAlbums(prev => new Set(prev).add(album.id));
        }
      });
    }
    // Method 2: Fallback to filename matching (legacy support)
    else if (targetFilenames.length > 0) {
      albums.forEach(album => {
        if (!album.images || album.images.length === 0) return;

        const albumImageIds = new Set<number>();
        let hasMatch = false;

        album.images.forEach(image => {
          const imageFilename = image.originalFilename || image.filename || 'Unknown';
          // Check if this image's filename matches any target filename
          const isMatch = targetFilenames.some(targetFilename => {
            // Exact match or filename contains target (for partial matches)
            return imageFilename === targetFilename || 
                   imageFilename.includes(targetFilename) ||
                   targetFilename.includes(imageFilename);
          });

          if (isMatch) {
            albumImageIds.add(image.id);
            hasMatch = true;
          }
        });

        if (hasMatch) {
          matchedAlbums.add(album.id);
          matchedImages.set(album.id, albumImageIds);
          // Auto-expand albums with matches
          setExpandedAlbums(prev => new Set(prev).add(album.id));
        }
      });
    } else {
      return; // No parameters provided
    }

    if (matchedAlbums.size > 0) {
      setSelectedAlbums(matchedAlbums);
      setUserSelectedImages(matchedImages);
      // Automatically show only selected albums when imageIds or files are provided
      setShowOnlySelected(true);
      toast.success(`Found ${matchedAlbums.size} album(s) with matching images`);
    }
  }, [albums, targetImageIds, targetFilenames]);

  // Get all selected images (only those with checkboxes checked – for Submit Selection)
  const allSelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
      const album = albums.find(a => a.id === albumId);
      if (album && album.images) {
        const imageIds = userSelectedImages.get(albumId);
        if (imageIds && imageIds.size > 0) {
          album.images.forEach(img => {
            if (imageIds.has(img.id)) {
              images.push(img);
            }
          });
        }
      }
    });
    return images;
  }, [selectedAlbums, userSelectedImages, albums]);

  // Full album display: all images from every selected album (one grid when album is selected)
  const fullAlbumImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
      const album = albums.find(a => a.id === albumId);
      if (album && album.images) {
        album.images.forEach(img => images.push(img));
      }
    });
    return images;
  }, [selectedAlbums, albums]);

  const toggleAlbum = (albumId: number) => {
    setSelectedAlbums(prev => {
      const next = new Set(prev);
      
      if (next.has(albumId)) {
        // Deselect album
        next.delete(albumId);
        setUserSelectedImages(prevImgs => {
          const nextImgs = new Map(prevImgs);
          nextImgs.delete(albumId);
          return nextImgs;
        });
      } else {
        // Select album - but don't auto-select images, user must explicitly select them
        next.add(albumId);
      }
      return next;
    });
  };

  const toggleAlbumExpand = (albumId: number) => {
    setExpandedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });
  };

  const toggleImageSelection = (albumId: number, imageId: number) => {
    setUserSelectedImages(prev => {
      const next = new Map(prev);
      // Get current image set for this album, or create empty set if doesn't exist
      const imageSet = next.get(albumId) || new Set<number>();
      const newImageSet = new Set(imageSet);
      
      // Toggle the image selection
      if (newImageSet.has(imageId)) {
        // Remove image from selection
        newImageSet.delete(imageId);
      } else {
        // Add image to selection
        newImageSet.add(imageId);
      }
      
      // If no images are selected, remove the album entry (empty set means no images selected)
      if (newImageSet.size === 0) {
        next.delete(albumId);
      } else {
        // Update with the new set
        next.set(albumId, newImageSet);
      }
      
      return next;
    });
  };

  const selectAllImagesInAlbum = (albumId: number) => {
    const album = albums.find(a => a.id === albumId);
    if (!album || !album.images) return;
    
    setUserSelectedImages(prev => {
      const next = new Map(prev);
      const allImageIds = new Set(album.images!.map(img => img.id));
      next.set(albumId, allImageIds);
      return next;
    });
  };

  const getThumbnailUrl = (image: AlbumImage): string | null => {
    if (image.thumbnailUrl) return image.thumbnailUrl;
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  const getImageUrl = (image: AlbumImage): string | null => {
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  const getFileType = (image: AlbumImage): string => {
    const filename = getImageFilename(image);
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return extension || image.fileType || 'unknown';
  };

  const handleDownload = (image: AlbumImage) => {
    const imageUrl = getImageUrl(image);
    if (!imageUrl) {
      toast.error('Download URL not available');
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = getImageFilename(image);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentUrl = useMemo(() => {
    return window.location.href;
  }, [location]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      toast.success('URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const handleViewSelectedImagesOnly = () => {
    if (allSelectedImages.length === 0) return;
    const ids = allSelectedImages.map((img) => img.id).join(',');
    const params = new URLSearchParams();
    params.set('token', effectiveToken);
    params.set('imageIds', ids);
    if (validShareId != null) params.set('shareId', String(validShareId));
    navigate(`/public/images-display?${params.toString()}`);
  };

  const handleSubmitSelection = async () => {
    if (allSelectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setIsSubmitting(true);
    try {
      // Extract only selected image IDs
      const selectedImageIds = allSelectedImages.map(img => img.id);
      
      // Prepare the request payload
      const payload = {
        imageIds: selectedImageIds,
      };

      console.log('Submitting selected images:', payload);

      // Call PUT API to submit selected images
      const response = await api.put(`/api/albums/${selectedAlbumId}/images`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Submission response:', response.data);

      // Invalidate and refetch albums data after successful update
      await queryClient.invalidateQueries({ queryKey: ['publicSelectionAlbums', effectiveToken] });

      toast.success(
        `Successfully submitted ${allSelectedImages.length} photo${allSelectedImages.length !== 1 ? 's' : ''} for selection!`,
        { duration: 5000 }
      );
      
    } catch (error: any) {
      console.error('Submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit selection. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Incomplete URL – no sid, q, or token: do not show selection page, show error only
  if (!hasShareIdentifier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Incomplete link</h1>
          <p className="text-gray-600 text-sm mb-4">
            This page only works with a complete share link. Do not open the public selection URL without the full link (with <code className="bg-gray-100 px-1 rounded">sid</code>, <code className="bg-gray-100 px-1 rounded">q</code>, or <code className="bg-gray-100 px-1 rounded">token</code>) provided by your photographer.
          </p>
          <a href="/" className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900">
            Go to home
          </a>
        </div>
      </div>
    );
  }

  if (sid && sidLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (sid && sidError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid or expired link</h1>
          <p className="text-gray-600 text-sm">
            This short link could not be loaded. It may have expired or been removed.
          </p>
        </div>
      </div>
    );
  }

  if (qInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid link</h1>
          <p className="text-gray-600 text-sm">
            This link could not be read. Please use the link provided by your photographer.
          </p>
        </div>
      </div>
    );
  }

  if (!effectiveToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid or expired link</h1>
          <p className="text-gray-600 text-sm mb-4">
            This selection link could not be loaded. Use the full link shared by your photographer.
          </p>
          <a href="/" className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900">
            Go to home
          </a>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'idle' || verifyStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" text="Verifying access..." />
      </div>
    );
  }

  if (verifyStatus === 'show_message') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Notice</h2>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{verifyInfoMessage || 'No message.'}</p>
          <p className="text-xs text-gray-500">You are not being moved to another page.</p>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'needs_input' || verifyStatus === 'otp_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify to continue</h2>
          {verifyStatus === 'needs_input' && verifyInfoMessage ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{verifyInfoMessage}</p>
          ) : verifyStatus === 'needs_input' ? (
            <p className="text-sm text-gray-600 mb-4">Enter your email or mobile to view this link.</p>
          ) : null}
          {verifyStatus === 'needs_input' ? (
            <>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)} placeholder="you@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile (with country code)</label>
                  <div className="flex gap-2">
                    <select value={verifyCountryCode} onChange={(e) => setVerifyCountryCode(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-sm w-24">
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+971">+971</option>
                      <option value="+61">+61</option>
                    </select>
                    <input type="tel" value={verifyMobile} onChange={(e) => setVerifyMobile(e.target.value)} placeholder="9876543210" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button onClick={handleVerifySubmit} disabled={verifySending} className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50">{verifySending ? 'Sending…' : 'Continue'}</button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                <input type="text" inputMode="numeric" maxLength={6} value={verifyOtp} onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button onClick={handleVerifyOtpSubmit} disabled={verifySending} className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50 mb-2">{verifySending ? 'Verifying…' : 'Verify'}</button>
              <button type="button" onClick={handleResendOtp} disabled={verifySending} className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">Resend OTP</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const contentLoading = isBulkMode ? bulkImagesLoading : isLoading;
  const contentError = isBulkMode ? bulkImagesError : isError;

  if (contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text={isBulkMode ? 'Loading images...' : 'Loading albums...'} />
      </div>
    );
  }

  if (contentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {isBulkMode ? 'Unable to load images' : 'Unable to load albums'}
          </h1>
          <p className="text-gray-600 text-sm">Please check the link or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaImages className="mr-3 text-[#2731db]" />
              {isBulkMode ? 'Shared Photos' : 'Select Your Photos'}
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              {isBulkMode
                ? `Viewing ${bulkImages.length} shared photo${bulkImages.length !== 1 ? 's' : ''}.`
                : 'Browse albums and select the photos you want. Click on an album to view images inside.'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Secure Public Link</p>
            <p className="text-sm font-medium text-gray-800">
              {isBulkMode
                ? `${bulkImages.length} photo${bulkImages.length !== 1 ? 's' : ''}`
                : `${albums.length} album${albums.length !== 1 ? 's' : ''} • ${allSelectedImages.length} photo${allSelectedImages.length !== 1 ? 's' : ''} selected`}
            </p>
          </div>
        </header>

        {/* Public URL Display */}
        {/* <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FaShare className="text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Public Share URL</h4>
            </div>
            <button
              onClick={handleCopyUrl}
              className="flex items-center px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              title="Copy URL"
            >
              <FaCopy className="mr-1" /> Copy URL
            </button>
          </div>
          <p className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-blue-200 font-mono">
            {currentUrl}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Share this URL with others to view and select from these albums
          </p>
        </div> */}

        {/* Selection Summary Bar (albums mode only) */}
        {!isBulkMode && allSelectedImages.length > 0 ? (
          <div className="mb-6 bg-gradient-to-r from-[#2731db] to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaCheckCircle className="text-2xl" />
                <div>
                  <p className="font-semibold text-lg">
                    {allSelectedImages.length} photo{allSelectedImages.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-sm text-blue-100">
                    From {selectedAlbums.size} album{selectedAlbums.size !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleViewSelectedImagesOnly}
                  className="px-5 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors flex items-center gap-2 border border-white/40"
                >
                  <FaImages className="mr-1" />
                  View selected images only
                </button>
                <button
                  onClick={handleSubmitSelection}
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-lg bg-white text-[#2731db] hover:bg-gray-100 font-semibold transition-colors flex items-center space-x-2 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2731db] border-t-transparent"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-1" />
                      <span>Submit Selection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : !isBulkMode ? (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Select albums and images by clicking on them. Selected photos will appear here.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Full album display: when at least one album is selected, show all its images in one grid */}
        {/* {!isBulkMode && fullAlbumImages.length > 0 && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center">
                <FaImages className="mr-2 text-[#2731db]" />
                Full album display
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {fullAlbumImages.length} photo{fullAlbumImages.length !== 1 ? 's' : ''} from {selectedAlbums.size} selected album{selectedAlbums.size !== 1 ? 's' : ''}. Expand albums below to select which photos to submit.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {fullAlbumImages.map((image, index) => {
                  const imageUrl = getImageUrl(image);
                  const thumbUrl = getThumbnailUrl(image);
                  const filename = getImageFilename(image);
                  const fileType = getFileType(image);
                  const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                  const isImageSelected = Array.from(selectedAlbums).some(
                    (albumId) => userSelectedImages.get(albumId)?.has(image.id)
                  );
                  return (
                    <div
                      key={`full-${image.id}-${index}`}
                      className={`rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all relative ${
                        isImageSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="h-48 bg-gray-100 overflow-hidden relative">
                        <button
                          type="button"
                          onClick={() => setFullscreenImage(image)}
                          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                          title="View full screen"
                        >
                          <FaExpandArrowsAlt className="text-sm" />
                        </button>
                        {canView ? (
                          <img
                            src={(thumbUrl || imageUrl)!}
                            alt={filename}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => setFullscreenImage(image)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                            {fileType.toUpperCase()}
                          </div>
                        )}
                        {showSelectionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isImageSelected ? 'bg-[#2731db] text-white' : 'bg-white/90 text-gray-600'}`}>
                              {isImageSelected ? 'Selected' : '—'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
                          {filename}
                        </p>
                        {image.uploadTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(image.uploadTime).toLocaleString()}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
                          {showDownload && (
                            <button
                              type="button"
                              onClick={() => handleDownload(image)}
                              className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800"
                            >
                              <FaDownload className="mr-1" /> Download
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )} */}

        {/* Bulk mode: grid of selected images only (from GET /api/images/bulk) */}
        {isBulkMode && (
          <main className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            {bulkImages.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FaImages className="mx-auto mb-3 text-4xl" />
                <p className="text-lg font-medium mb-2">No images found</p>
                <p className="text-sm">The shared selection may be empty or the link may have expired.</p>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {bulkImages.map((image) => {
                const imageUrl = getImageUrl(image);
                const thumbUrl = getThumbnailUrl(image);
                const filename = getImageFilename(image);
                const fileType = getFileType(image);
                const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                return (
                  <div
                    key={image.id}
                    className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all relative"
                  >
                    <div className="h-48 bg-gray-100 overflow-hidden relative">
                      <button
                        type="button"
                        onClick={() => setFullscreenImage(image)}
                        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                        title="View full screen"
                      >
                        <FaExpandArrowsAlt className="text-sm" />
                      </button>
                      {canView ? (
                        <img
                          src={(thumbUrl || imageUrl)!}
                          alt={filename}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => setFullscreenImage(image)}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                          {fileType.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white">
                      <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
                        {filename}
                      </p>
                      {image.uploadTime && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(image.uploadTime).toLocaleString()}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
                        {showDownload && (
                          <button
                            type="button"
                            onClick={() => handleDownload(image)}
                            className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800"
                          >
                            <FaDownload className="mr-1" /> Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={loadMoreBulkSentinelRef} className="h-4" aria-hidden />
            {bulkFetchingNextPage && (
              <div className="mt-4 flex justify-center py-4">
                <LoadingSpinner size="md" text="Loading more..." />
              </div>
            )}
            </>
            )}
          </main>
        )}

        {/* Albums List (when not bulk mode) */}
        {!isBulkMode && (
        <main className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          {albums.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">
                {effectiveHasValidAlbumId && !isLoading ? 'Album not found' : 'No albums available'}
              </p>
              <p className="text-sm">
                {effectiveHasValidAlbumId && !isLoading
                  ? 'The album link may be invalid or the album was removed. Try the link without albumId or contact the photographer.'
                  : 'The albums list is empty. Please contact the photographer.'}
              </p>
            </div>
          ) : (
            <>
              {/* Select button: always visible, toggles checkboxes on/off */}
              <div className="mb-5 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  {showSelectionMode
                    ? 'Click albums and images to select. Use the expand icon on each photo to view full screen.'
                    : 'Click the button below to show checkboxes and select photos.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSelectionMode((prev) => !prev)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm ${
                    showSelectionMode
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-[#2731db] text-white hover:bg-blue-700'
                  }`}
                >
                  <FaCheck className="text-sm" />
                  {showSelectionMode ? 'Done selecting' : 'Select'}
                </button>
              </div>
              {/* Filter Toggle */}
              {selectedAlbums.size > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowOnlySelected(!showOnlySelected)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        showOnlySelected
                          ? 'bg-[#2731db] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {showOnlySelected ? 'Show All Albums' : 'Show Only Selected'}
                    </button>
                    {showOnlySelected && (
                      <span className="text-sm text-gray-600">
                        Showing {selectedAlbums.size} of {albums.length} albums
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {albums
                  .filter((album) => !showOnlySelected || selectedAlbums.has(album.id))
                  .map((album) => {
                const isSelected = selectedAlbums.has(album.id);
                const isExpanded = expandedAlbums.has(album.id);
                const albumImageIds = userSelectedImages.get(album.id) || new Set<number>();
                const albumImages = album.images || [];
                // Album is fully selected only if all images are in the selected set
                const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
                // If album is marked as selected but has no images selected, it means user deselected all images
                // In this case, we should keep the album selected but show no images as selected

                return (
                  <div
                    key={album.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      showSelectionMode && isSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Album Header - responsive for mobile and web */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white min-h-[4rem]">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {showSelectionMode ? (
                          <button
                            onClick={() => toggleAlbum(album.id)}
                            className={`w-7 h-7 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 touch-manipulation ${
                              isSelected ? 'bg-[#2731db] border-[#2731db]' : 'border-gray-300'
                            }`}
                            aria-label={isSelected ? 'Deselect album' : 'Select album'}
                          >
                            {isSelected && <FaCheck className="text-white text-xs" />}
                          </button>
                        ) : (
                          <div className="w-7 h-7 sm:w-6 sm:h-6 flex-shrink-0" aria-hidden />
                        )}

                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {album.previewUrl ? (
                            <img
                              src={album.previewUrl}
                              alt={album.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <FaFolder className="text-xl sm:text-2xl text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate" title={album.name}>
                            {album.name}
                          </h3>
                          {album.description && (
                            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5" title={album.description}>
                              {album.description}
                            </p>
                          )}
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs sm:text-sm text-gray-500 mt-1">
                            <span>{albumImages.length} images</span>
                            {showSelectionMode && albumImageIds.size > 0 && (
                              <span className="text-[#2731db] font-medium">
                                {albumImageIds.size} selected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAlbumExpand(album.id)}
                        className="flex-shrink-0 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 ml-1 sm:ml-4 px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 touch-manipulation flex items-center justify-center gap-1 sm:gap-2"
                        aria-label={isExpanded ? 'Collapse album' : 'Expand album'}
                      >
                        {isExpanded ? (
                          <FaFolderOpen className="text-[#2731db] text-lg sm:text-xl" />
                        ) : (
                          <FaFolder className="text-gray-400 text-lg sm:text-xl" />
                        )}
                        <FaChevronRight
                          className={`text-gray-400 transition-transform duration-200 text-sm sm:text-base ${
                            isExpanded ? 'transform rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Album Images (shown when expanded) - show 20 at a time, then "Load more" */}
                    {isExpanded && albumImages.length > 0 && (() => {
                      const showCount = albumImagesShownCount.get(album.id) ?? ALBUM_IMAGES_PAGE_SIZE;
                      const visibleImages = albumImages.slice(0, showCount);
                      const hasMore = albumImages.length > showCount;
                      return (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {showSelectionMode
                              ? (isSelected ? 'Selected Images' : 'Select Images')
                              : 'Images'}
                            {showSelectionMode && isSelected && albumImageIds.size > 0 && (
                              <span className="ml-2 text-[#2731db] font-medium">
                                ({albumImageIds.size} of {albumImages.length})
                              </span>
                            )}
                          </h4>
                          {showSelectionMode && isSelected && (
                            <button
                              onClick={() => selectAllImagesInAlbum(album.id)}
                              className="text-xs text-[#2731db] hover:underline"
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {visibleImages.map((image) => {
                              const isImageSelected = isSelected && albumImageIds.has(image.id);
                              const imageUrl = getImageUrl(image);
                              const thumbUrl = getThumbnailUrl(image);
                              const filename = getImageFilename(image);
                              const fileType = getFileType(image);
                              const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);

                              return (
                                <div
                                  key={image.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!showSelectionMode) return;
                                    if (!isSelected) toggleAlbum(album.id);
                                    toggleImageSelection(album.id, image.id);
                                  }}
                                  className={`group relative rounded-xl overflow-hidden border transition-all duration-200 ${
                                    showSelectionMode ? 'cursor-pointer' : ''
                                  } ${
                                    isImageSelected
                                      ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50 shadow-lg'
                                      : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                                  } ${showSelectionMode ? 'hover:shadow-md' : ''}`}
                                >
                                  {showSelectionMode && (
                                    <div className="absolute top-2 left-2 z-10">
                                      <div
                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                          isImageSelected
                                            ? 'bg-[#2731db] border-[#2731db] text-white'
                                            : isSelected
                                            ? 'bg-white/90 border-gray-400'
                                            : 'bg-white/60 border-gray-200'
                                        }`}
                                      >
                                        {isImageSelected && <FaCheck className="text-xs" />}
                                      </div>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFullscreenImage(image);
                                    }}
                                    className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                                    title="View full screen"
                                  >
                                    <FaExpandArrowsAlt className="text-sm" />
                                  </button>

                                  <div className="h-48 bg-gray-100 overflow-hidden">
                                    {canView ? (
                                      <img
                                        src={(thumbUrl || imageUrl)!}
                                        alt={filename}
                                        className={`w-full h-full object-cover transition-transform duration-300 ${
                                          isImageSelected ? 'opacity-90' : 'group-hover:scale-105'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFullscreenImage(image);
                                        }}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                        {fileType.toUpperCase()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-3 bg-white">
                                    <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
                                      {filename}
                                    </p>
                                    {image.uploadTime && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(image.uploadTime).toLocaleString()}
                                      </p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                      <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
                                      {showDownload && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(image);
                                          }}
                                          className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800"
                                        >
                                          <FaDownload className="mr-1" /> Download
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        {hasMore && (
                          <div className="mt-4 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setAlbumImagesShownCount((prev) => {
                                const next = new Map(prev);
                                next.set(album.id, (prev.get(album.id) ?? ALBUM_IMAGES_PAGE_SIZE) + ALBUM_IMAGES_PAGE_SIZE);
                                return next;
                              })}
                              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Load more ({albumImages.length - showCount} remaining)
                            </button>
                          </div>
                        )}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
              </div>
              <div ref={loadMoreAlbumsRef} className="h-4" aria-hidden />
              {albumsFetchingNextPage && (
                <div className="mt-4 flex justify-center py-4">
                  <LoadingSpinner size="md" text="Loading more..." />
                </div>
              )}
            </>
          )}
        </main>
        )}

        {/* Full-screen image view modal (used by both bulk grid and albums) */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="View image full screen"
          >
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <FaTimes className="text-xl" />
            </button>
            <div
              className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {getImageUrl(fullscreenImage) ? (
                <img
                  src={getImageUrl(fullscreenImage)!}
                  alt={getImageFilename(fullscreenImage)}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-white">Image not available</p>
              )}
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm truncate max-w-[90vw]">
              {getImageFilename(fullscreenImage)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicSelectionPage;
