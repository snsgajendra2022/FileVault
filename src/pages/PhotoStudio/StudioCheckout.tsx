import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaCopy, FaShare, FaFolder, FaFolderOpen, FaChevronRight, FaCheck, FaCog, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { compressFileList, shouldUseCompressedFileList } from '../../utils/checkoutUrlEncoding';
import { encryptCheckoutPayload } from '../../utils/encryption';

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
  perPhotoPrice?: number | null;
  isPublic?: boolean;
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

interface UpiSettings {
  upiId: string;
  perPhotoPrice: number;
}

/** GET /api/flags – control visibility of email, phone, download, etc. */
interface FlagItem {
  name: string;
  id: number;
  value: boolean;
}
interface FlagsResponse {
  flags?: FlagItem[];
}

const PRICE_PER_IMAGE = 0; // Fallback price

const StudioCheckout: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Map<number, Set<number>>>(new Map()); // albumId -> Set of imageIds
  const [albumImagesMap, setAlbumImagesMap] = useState<Map<number, AlbumImage[]>>(new Map()); // albumId -> AlbumImage[]
  const [coverImageErrors, setCoverImageErrors] = useState<Set<number>>(new Set());
  const [showQr, setShowQr] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showUpiSettings, setShowUpiSettings] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [perPhotoPrice, setPerPhotoPrice] = useState(0);

  // Fetch UPI settings
  const { data: upiSettings, isLoading: isLoadingUpi } = useQuery({
    queryKey: ['upiSettings'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/upi');
        return response.data as UpiSettings;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null; // No UPI settings found
        }
        throw error;
      }
    },
    retry: 1,
  });

  // Feature flags: show/hide email and phone (GET /api/flags)
  const { data: flagsData } = useQuery({
    queryKey: ['flags'],
    queryFn: async () => {
      const res = await api.get<FlagsResponse>('/api/flags');
      return res.data;
    },
    retry: 1,
    staleTime: 60_000,
  });
  const showEmail = useMemo(() => {
    const flags = flagsData?.flags;
    if (!Array.isArray(flags)) return true;
    const f = flags.find((x) => x.name === 'isEmail');
    return f?.value ?? true;
  }, [flagsData]);
  const showPhone = useMemo(() => {
    const flags = flagsData?.flags;
    if (!Array.isArray(flags)) return true;
    const f = flags.find((x) => x.name === 'isPhone');
    return f?.value ?? true;
  }, [flagsData]);

  // When flags hide email/phone, disable those channels
  useEffect(() => {
    setShareChannels((c) => {
      const next = { ...c };
      if (!showEmail && c.email) next.email = false;
      if (!showPhone && c.sms) next.sms = false;
      return next.email === c.email && next.sms === c.sms ? c : next;
    });
  }, [showEmail, showPhone]);

  // Update local state when UPI settings are loaded
  useEffect(() => {
    if (upiSettings) {
      setUpiId(upiSettings.upiId || '');
      setPerPhotoPrice(upiSettings.perPhotoPrice || 0);
    }
  }, [upiSettings]);

  // Fetch albums
  const { data: albumsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const response = await api.get('/api/albums');
      return response.data as Album[] | { albums: Album[] };
    },
    retry: 1,
  });

  const albums = useMemo(() => {
    if (!albumsData) return [];
    if (Array.isArray(albumsData)) return albumsData;
    if (albumsData.albums) return albumsData.albums;
    return [];
  }, [albumsData]);

  // Populate album images from album data when albums are loaded
  useEffect(() => {
    if (albums.length > 0) {
      albums.forEach((album: Album) => {
        if (album.images && Array.isArray(album.images) && album.images.length > 0) {
          setAlbumImagesMap((prev) => {
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

  // Fetch album images when expanded (use album.images from list first; GET /api/albums/:id/images may return 405)
  const fetchAlbumImages = async (albumId: number) => {
    if (albumImagesMap.has(albumId)) return;

    const album = albums.find((a) => a.id === albumId);
    if (album?.images && Array.isArray(album.images) && album.images.length > 0) {
      setAlbumImagesMap((prev) => { const next = new Map(prev); next.set(albumId, album.images!); return next; });
      return;
    }

    try {
      let images: AlbumImage[] = [];
      try {
        const response = await api.get(`/api/albums/${albumId}/images`);
        images = Array.isArray(response.data) ? response.data : (response.data?.images || []);
      } catch (err: any) {
        if (err?.response?.status === 405) {
          setAlbumImagesMap((prev) => { const next = new Map(prev); next.set(albumId, []); return next; });
          return;
        }
        try {
          const response = await api.get(`/api/simple-invitations/albums/${albumId}/images`);
          images = Array.isArray(response.data) ? response.data : (response.data?.images || []);
        } catch (err2: any) {
          if (err2?.response?.status !== 405) toast.error(t('studioCheckoutPage.failedLoadAlbumImages'));
          setAlbumImagesMap((prev) => { const next = new Map(prev); next.set(albumId, []); return next; });
          return;
        }
      }
      setAlbumImagesMap((prev) => { const next = new Map(prev); next.set(albumId, images); return next; });
    } catch {
      setAlbumImagesMap((prev) => { const next = new Map(prev); next.set(albumId, []); return next; });
    }
  };

  useEffect(() => {
    expandedAlbums.forEach((albumId) => {
      if (!albumImagesMap.has(albumId)) fetchAlbumImages(albumId);
    });
  }, [expandedAlbums, albums]);

  // Get all explicitly selected images from all selected albums (for display and total calculation)
  const allSelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
      // Use images from map if available, otherwise from album data
      const albumImages = albumImagesMap.get(albumId);
      const album = albums.find(a => a.id === albumId);
      const imagesToUse = albumImages || album?.images || [];
      
      if (imagesToUse.length > 0) {
        const imageIds = selectedImages.get(albumId);
        // Only include explicitly selected images
        if (imageIds && imageIds.size > 0) {
          imagesToUse.forEach(img => {
            if (imageIds.has(img.id)) {
              images.push(img);
            }
          });
        }
      }
    });
    return images;
  }, [selectedAlbums, selectedImages, albums, albumImagesMap]);

  // Get only explicitly selected images for URLs
  const explicitlySelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
      // Use images from map if available, otherwise from album data
      const albumImages = albumImagesMap.get(albumId);
      const album = albums.find(a => a.id === albumId);
      const imagesToUse = albumImages || album?.images || [];
      
      if (imagesToUse.length > 0) {
        const imageIds = selectedImages.get(albumId);
        // Only include explicitly selected images
        if (imageIds && imageIds.size > 0) {
          imagesToUse.forEach(img => {
            if (imageIds.has(img.id)) {
              images.push(img);
            }
          });
        }
      }
    });
    return images;
  }, [selectedAlbums, selectedImages, albums, albumImagesMap]);

  // Calculate total amount considering perAlbumPrice and perPhotoPrice
  const totalAmount = useMemo(() => {
    let total = 0;
    
    selectedAlbums.forEach(albumId => {
      const album = albums.find(a => a.id === albumId);
      if (!album) return;
      
      const albumImageIds = selectedImages.get(albumId) || new Set<number>();
      const albumImages = album.images || [];
      
      if (albumImageIds.size === 0) return;
      
      // Check if all images in album are selected
      const allImagesSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
      
      // Priority 1: If all images selected and album has perAlbumPrice, use it
      if (allImagesSelected && album.perAlbumPrice && album.perAlbumPrice > 0) {
        total += album.perAlbumPrice;
      } else if (albumImageIds.size > 0) {
        // Individual images selected - use perPhotoPrice from album, or fallback to UPI settings, or default
        const imagePrice = album.perPhotoPrice && album.perPhotoPrice > 0 
          ? album.perPhotoPrice 
          : (perPhotoPrice > 0 ? perPhotoPrice : PRICE_PER_IMAGE);
        total += albumImageIds.size * imagePrice;
      }
    });
    
    return total;
  }, [selectedAlbums, selectedImages, albums, perPhotoPrice]);

  const selectedAlbumsName = useMemo(() => {
    const selected = albums.filter((a) => selectedAlbums.has(a.id));
    if (selected.length === 0) return t('studioCheckoutPage.myAlbum');
    if (selected.length === 1) return selected[0]?.name || t('studioCheckoutPage.myAlbum');
    return t('studioCheckoutPage.nAlbums', { count: selected.length });
  }, [albums, selectedAlbums, t]);

  const toggleAlbum = (albumId: number) => {
    setSelectedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        // Unselect album - remove album and all its images
        next.delete(albumId);
        setSelectedImages(prevImgs => {
          const nextImgs = new Map(prevImgs);
          nextImgs.delete(albumId);
          return nextImgs;
        });
      } else {
        // Select album - clear previous selection and select only this album
        // Clear all previous selections
        const previousAlbumId = Array.from(next)[0];
        if (previousAlbumId) {
          setSelectedImages(prevImgs => {
            const nextImgs = new Map(prevImgs);
            nextImgs.delete(previousAlbumId);
            return nextImgs;
          });
        }
        // Select only this album
        next.clear();
        next.add(albumId);
        const album = albums.find(a => a.id === albumId);
        if (album) {
          // Use images from map if available, otherwise from album data
          const albumImages = albumImagesMap.get(albumId) || album.images || [];
          if (albumImages.length > 0) {
            setSelectedImages(prevImgs => {
              const nextImgs = new Map(prevImgs);
              const allImageIds = new Set(albumImages.map(img => img.id));
              nextImgs.set(albumId, allImageIds);
              return nextImgs;
            });
          }
        }
      }
      return next;
    });
  };

  // Only one album's "Choose images" section open at a time; opening one closes others
  const toggleAlbumExpand = (albumId: number) => {
    setExpandedAlbums(prev => {
      if (prev.has(albumId)) {
        const next = new Set(prev);
        next.delete(albumId);
        return next;
      }
      return new Set([albumId]);
    });
  };

  const toggleImageSelection = (albumId: number, imageId: number) => {
    setSelectedImages(prev => {
      const next = new Map(prev);
      const imageSet = next.get(albumId) || new Set<number>();
      const newImageSet = new Set(imageSet);
      
      if (newImageSet.has(imageId)) {
        newImageSet.delete(imageId);
      } else {
        newImageSet.add(imageId);
      }
      
      if (newImageSet.size === 0) {
        next.delete(albumId);
        // If no images selected, also unselect the album
        setSelectedAlbums(prevAlbums => {
          const nextAlbums = new Set(prevAlbums);
          nextAlbums.delete(albumId);
          return nextAlbums;
        });
      } else {
        next.set(albumId, newImageSet);
        // Ensure album is selected if images are selected
        setSelectedAlbums(prevAlbums => {
          const nextAlbums = new Set(prevAlbums);
          nextAlbums.add(albumId);
          return nextAlbums;
        });
      }
      
      return next;
    });
  };

  const selectAllImagesInAlbum = (albumId: number) => {
    // Use images from map if available, otherwise from album data
    const albumImages = albumImagesMap.get(albumId);
    const album = albums.find(a => a.id === albumId);
    const imagesToUse = albumImages || album?.images || [];
    
    if (imagesToUse.length === 0) return;
    
    setSelectedImages(prev => {
      const next = new Map(prev);
      const allImageIds = new Set(imagesToUse.map(img => img.id));
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

  const getImageFilename = (image: AlbumImage): string => {
    return image.originalFilename || image.filename || t('studioCheckoutPage.unknownFile');
  };

  const getFileType = (image: AlbumImage): string => {
    const filename = getImageFilename(image);
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return extension || image.fileType || 'unknown';
  };

  const getCoverImageUrl = (album: Album): string | null => {
    if (album.coverImageUrl && !coverImageErrors.has(album.id)) return album.coverImageUrl;
    const images = albumImagesMap.get(album.id) || album.images || [];
    const first = images[0];
    if (!first) return null;
    return getThumbnailUrl(first) || getImageUrl(first);
  };

  const qrData = useMemo(() => {
    if (!totalAmount || allSelectedImages.length === 0) return '';
    const upiIdToUse = upiId || 'rohitrawat9009@ybl'; // Fallback to default if not set
    if (!upiIdToUse) return '';
    
    const params = new URLSearchParams({
      pa: upiIdToUse,
      pn: t('studioCheckoutPage.photoBook'),
      am: String(totalAmount),
      cu: 'INR',
      tn: t('studioCheckoutPage.upiPaymentNote', { count: allSelectedImages.length }),
    });
    const upiUrl = `upi://pay?${params.toString()}`;
    return encodeURIComponent(upiUrl);
  }, [allSelectedImages.length, totalAmount, upiId, t]);

  const baseUrl = window.location.origin;
  const tokenForUrl = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : '';
  const singleAlbumId = selectedAlbums.size === 1 ? Array.from(selectedAlbums)[0] : null;
  const albumIdQuery = singleAlbumId != null ? `&albumId=${singleAlbumId}` : '';

  const longPublicCheckoutUrl = useMemo(() => {
    if (explicitlySelectedImages.length === 0) return '';
    const selectedFilenames = explicitlySelectedImages.map(img => getImageFilename(img)).join(',');
    return `${baseUrl}/public/checkout?token=${encodeURIComponent(tokenForUrl)}${albumIdQuery}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [explicitlySelectedImages, tokenForUrl, baseUrl, albumIdQuery]);

  const longPublicSelectionUrl = useMemo(() => {
    if (explicitlySelectedImages.length === 0) return '';
    const selectedFilenames = explicitlySelectedImages.map(img => getImageFilename(img)).join(',');
    return `${baseUrl}/public/selection?token=${encodeURIComponent(tokenForUrl)}${albumIdQuery}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [explicitlySelectedImages, tokenForUrl, baseUrl, albumIdQuery]);

  const [shortCheckoutUrl, setShortCheckoutUrl] = useState('');
  const [shortSelectionUrl, setShortSelectionUrl] = useState('');
  const [shareLinkId, setShareLinkId] = useState<string | null>(null);

  // Share modal (public URL verification – send link to contacts/email/SMS)
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContactIds, setShareContactIds] = useState<Set<string>>(new Set());
  const [shareNewEmails, setShareNewEmails] = useState('');
  const [shareNewMobileCountryCode, setShareNewMobileCountryCode] = useState('+91');
  const [shareNewMobiles, setShareNewMobiles] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareChannels, setShareChannels] = useState<{ email: boolean; sms: boolean }>({ email: true, sms: true });
  const [shareUrlType, setShareUrlType] = useState<'checkout' | 'selection' | 'images_display'>('checkout');
  const [shareSending, setShareSending] = useState(false);
  const [shareContactSearch, setShareContactSearch] = useState('');
  const [shareAlreadySent, setShareAlreadySent] = useState<{ email?: string; mobile?: string; alreadySent: boolean } | null>(null);

  useEffect(() => {
    if (explicitlySelectedImages.length === 0) {
      setShortCheckoutUrl('');
      setShortSelectionUrl('');
      setShareLinkId(null);
      setShareUrlType('selection')
      return;
    }
    const fileNames = explicitlySelectedImages.map(img => getImageFilename(img));
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{ id?: string }>('/api/public/share-link', {
          token: tokenForUrl,
          albumId: singleAlbumId ?? undefined,
          fileNames,
        });
        const id = res.data?.id;
        if (!cancelled && id) {
          setShareLinkId(id);
          setShortCheckoutUrl(`${baseUrl}/public/checkout?sid=${encodeURIComponent(id)}`);
          setShortSelectionUrl(`${baseUrl}/public/selection?sid=${encodeURIComponent(id)}`);
          return;
        }
      } catch {
        // Backend may not have share-link endpoint; fall back to long/compressed URL
      }
      setShareLinkId(null);
      if (!shouldUseCompressedFileList(fileNames)) {
        setShortCheckoutUrl('');
        setShortSelectionUrl('');
        return;
      }
      const encoded = await compressFileList(fileNames);
      if (cancelled || encoded === null) return;
      const albumPart = singleAlbumId != null ? `albumId=${singleAlbumId}&` : '';
      const q = `token=${encodeURIComponent(tokenForUrl)}&${albumPart}f=${encoded}`;
      setShortCheckoutUrl(`${baseUrl}/public/checkout?${q}`);
      setShortSelectionUrl(`${baseUrl}/public/selection?${q}`);
    })();
    return () => { cancelled = true; };
  }, [explicitlySelectedImages, tokenForUrl, baseUrl, singleAlbumId]);

  // When single album: use minimal URL with encrypted payload ?q= (token + albumId encrypted)
  const minimalCheckoutUrl = useMemo(() => {
    if (singleAlbumId == null || explicitlySelectedImages.length === 0) return '';
    const q = encryptCheckoutPayload({ token: tokenForUrl, albumId: singleAlbumId });
    return `${baseUrl}/public/checkout?q=${encodeURIComponent(q)}`;
  }, [baseUrl, tokenForUrl, singleAlbumId, explicitlySelectedImages.length]);
  const minimalSelectionUrl = useMemo(() => {
    if (singleAlbumId == null || explicitlySelectedImages.length === 0) return '';
    const q = encryptCheckoutPayload({ token: tokenForUrl, albumId: singleAlbumId });
    return `${baseUrl}/public/selection?q=${encodeURIComponent(q)}`;
  }, [baseUrl, tokenForUrl, singleAlbumId, explicitlySelectedImages.length]);

  const publicCheckoutUrl = shareLinkId
    ? `${baseUrl}/public/checkout?sid=${encodeURIComponent(shareLinkId)}`
    : (minimalCheckoutUrl || shortCheckoutUrl || longPublicCheckoutUrl);
  const publicSelectionUrl = shareLinkId
    ? `${baseUrl}/public/selection?sid=${encodeURIComponent(shareLinkId)}`
    : (minimalSelectionUrl || shortSelectionUrl || longPublicSelectionUrl);
  const publicImagesDisplayUrl = useMemo(() => {
    if (explicitlySelectedImages.length === 0) return '';
    const ids = explicitlySelectedImages.map((img) => img.id).join(',');
    return `${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&imageIds=${ids}`;
  }, [explicitlySelectedImages, baseUrl, tokenForUrl]);
  async function copyToClipboard(text) {
    // Modern API (works on HTTPS + supported browsers)
    if (navigator?.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
  
    // Fallback for HTTP / older browsers / WebView
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
  
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
  
  const handleCopyCheckoutUrl = async () => {
    if (!publicCheckoutUrl) {
      toast.error(t('studioCheckoutPage.noUrlCopySelectFirst'));
      return;
    }
    await copyToClipboard(publicCheckoutUrl);
    toast.success(t('studioCheckoutPage.publicCheckoutUrlCopied'));
    // navigator.clipboard.writeText(publicCheckoutUrl).then(() => {
    // }).catch(() => {
    //   toast.error('Failed to copy URL');
    // });
  };

  const handleCopySelectionUrl = () => {
    if (!publicSelectionUrl) {
      toast.error(t('studioCheckoutPage.noUrlCopySelectFirst'));
      return;
    }
    navigator.clipboard.writeText(publicSelectionUrl).then(() => {
      toast.success(t('studioCheckoutPage.publicSelectionUrlCopied'));
    }).catch(() => {
      toast.error(t('studioCheckoutPage.failedCopyUrl'));
    });
  };

  // Fetch contacts for Share modal – doc: GET /api/public-share/contacts?search=...&limit=50&offset=0
  const { data: shareContactsData } = useQuery({
    queryKey: ['publicShareContacts', shareContactSearch],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (shareContactSearch.trim()) params.set('search', shareContactSearch.trim());
        params.set('limit', '50');
        params.set('offset', '0');
        const res = await api.get<{ contacts?: { id: string; email?: string; mobile?: string; countryCode?: string; displayName?: string }[]; total?: number }>(`/api/public-share/contacts?${params.toString()}`);
        return res.data ?? { contacts: [] };
      } catch {
        return { contacts: [] };
      }
    },
    enabled: showShareModal,
    retry: 0,
  });
  const shareContacts = shareContactsData?.contacts ?? [];

  // Check recipient (already sent?) – doc: GET /api/public-share/check-recipient?email=...&mobile=...&publicUrl=...
  const checkRecipient = async (emailInput: string, mobileInput: string) => {
    const firstEmail = emailInput.split(/[\s,]+/).map(e => e.trim()).filter(Boolean)[0] ?? '';
    const firstPart = mobileInput.split(/[\s,]+/).map(m => m.trim()).filter(Boolean)[0] ?? '';
    const m = firstPart ? (firstPart.startsWith('+') ? firstPart : `${shareNewMobileCountryCode.replace(/\s/g, '')}${firstPart}`) : '';
    if (!firstEmail && !m) {
      setShareAlreadySent(null);
      return;
    }
    const urlToShare = shareUrlType === 'checkout' ? publicCheckoutUrl : shareUrlType === 'images_display' ? publicImagesDisplayUrl : publicSelectionUrl;
    try {
      const params = new URLSearchParams();
      if (firstEmail) params.set('email', firstEmail);
      if (m) params.set('mobile', m);
      if (urlToShare) params.set('publicUrl', urlToShare);
      const res = await api.get<{ alreadySent?: boolean; email?: string | null; mobile?: string | null }>(`/api/public-share/check-recipient?${params.toString()}`);
      setShareAlreadySent({
        email: res.data?.email ?? undefined,
        mobile: res.data?.mobile ?? undefined,
        alreadySent: !!res.data?.alreadySent,
      });
    } catch {
      setShareAlreadySent(null);
    }
  };

  const handleShareSend = async () => {
    const urlToShare = shareUrlType === 'checkout' ? publicCheckoutUrl : shareUrlType === 'images_display' ? publicImagesDisplayUrl : publicSelectionUrl;
    if (!urlToShare) {
      toast.error(t('studioCheckoutPage.noUrlShare'));
      return;
    }
    const emails = shareNewEmails.split(/[\s,]+/).map(e => e.trim()).filter(Boolean);
    const mobileParts = shareNewMobiles.split(/[\s,]+/).map(m => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map(part => (part.startsWith('+') ? part : `${shareNewMobileCountryCode.replace(/\s/g, '')}${part}`));
    if (shareContactIds.size === 0 && emails.length === 0 && mobiles.length === 0) {
      toast.error(t('studioCheckoutPage.selectContactOrEmailMobile'));
      return;
    }
    const channels: string[] = [];
    if (shareChannels.email) channels.push('email');
    if (shareChannels.sms) channels.push('sms');
    if (channels.length === 0) {
      toast.error(t('studioCheckoutPage.selectChannelEmailOrSms'));
      return;
    }
    setShareSending(true);
    try {
      // Backend creates public_share_sent row per recipient and includes Share ID in email/SMS body (see PUBLIC_SHARE_SENT_RECORDS.md)
      const res = await api.post<{
        success?: boolean;
        sent?: { email?: number; sms?: number };
        failed?: unknown[];
        shareIds?: { email?: number[]; sms?: number[] };
      }>('/api/public-share/send', {
        publicUrl: urlToShare,
        message: shareMessage.trim() || undefined,
        sendTo: {
          contactIds: Array.from(shareContactIds),
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
        const mergedIds = [...(shareIds?.email ?? []), ...(shareIds?.sms ?? [])].join(', ');
        const suffix =
          shareIds?.email?.length || shareIds?.sms?.length
            ? t('studioCheckoutPage.shareIdSuffix', { ids: mergedIds })
            : t('studioCheckoutPage.shareIdFooter');
        toast.success(t('studioCheckoutPage.linkSent', { email: emailCount, sms: smsCount }) + suffix);
        setShowShareModal(false);
        setShareContactIds(new Set());
        setShareNewEmails('');
        setShareNewMobiles('');
        setShareMessage('');
        setShareAlreadySent(null);
      } else {
        toast.error(t('studioCheckoutPage.failedSendTryAgain'));
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        toast.error(t('studioCheckoutPage.shareNotAvailableUseCopy'));
      } else {
        toast.error(err.response?.data?.message || t('studioCheckoutPage.failedSendShare'));
      }
    } finally {
      setShareSending(false);
    }
  };

  const handleGenerateQr = () => {
    if (allSelectedImages.length === 0) {
      toast.error(t('studioCheckoutPage.pleaseSelectOneImage'));
      return;
    }
    setShowQr(true);
    setIsPaid(false);
  };

  const handleMarkAsPaid = () => {
    if (!showQr) {
      toast.error(t('studioCheckoutPage.generateQrFirst'));
      return;
    }
    if (!totalAmount) {
      toast.error(t('studioCheckoutPage.noAmountToPay'));
      return;
    }
    setIsPaid(true);
    toast.success(t('studioCheckoutPage.paymentMarkedCompleted'));

    allSelectedImages.forEach((image) => {
      const imageUrl = getImageUrl(image);
      if (imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = getImageFilename(image);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleDownload = (image: AlbumImage) => {
    if (!isPaid) {
      toast.error(t('studioCheckoutPage.pleaseCompletePaymentBeforeDownload'));
      return;
    }

    const imageUrl = getImageUrl(image);
    if (!imageUrl) {
      toast.error(t('studioCheckoutPage.downloadUrlNotAvailable'));
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

  // UPI Settings Mutations
  const createUpiMutation = useMutation({
    mutationFn: async (data: UpiSettings) => {
      const response = await api.post('/api/upi', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upiSettings'] });
      toast.success(t('studioCheckoutPage.upiCreatedSuccess'));
      setShowUpiSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('studioCheckoutPage.failedCreateUpi'));
    },
  });

  const updateUpiMutation = useMutation({
    mutationFn: async (data: UpiSettings) => {
      const response = await api.put('/api/upi', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upiSettings'] });
      toast.success(t('studioCheckoutPage.upiUpdatedSuccess'));
      setShowUpiSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('studioCheckoutPage.failedUpdateUpi'));
    },
  });

  const deleteUpiMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/api/upi');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upiSettings'] });
      toast.success(t('studioCheckoutPage.upiDeletedSuccess'));
      setUpiId('');
      setPerPhotoPrice(0);
      setShowUpiSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('studioCheckoutPage.failedDeleteUpi'));
    },
  });

  const handleSaveUpiSettings = () => {
    if (!upiId.trim()) {
      toast.error(t('studioCheckoutPage.pleaseEnterUpiId'));
      return;
    }
    if (perPhotoPrice < 0) {
      toast.error(t('studioCheckoutPage.pricePerPhotoNonNegative'));
      return;
    }

    const data: UpiSettings = {
      upiId: upiId.trim(),
      perPhotoPrice: perPhotoPrice,
    };

    if (upiSettings) {
      updateUpiMutation.mutate(data);
    } else {
      createUpiMutation.mutate(data);
    }
  };

  const handleDeleteUpiSettings = () => {
    if (!upiSettings) {
      toast.error(t('studioCheckoutPage.noUpiToDelete'));
      return;
    }
    if (window.confirm(t('studioCheckoutPage.confirmDeleteUpi'))) {
      deleteUpiMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text={t('studioCheckoutPage.loadingAlbums')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">{t('studioCheckoutPage.unableLoadAlbums')}</h1>
          <p className="text-gray-600 mb-4">{t('studioCheckoutPage.pleaseTryAgain')}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {t('studioCheckoutPage.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaImages className="mr-3 text-[#2731db]" />
            {t('studioCheckoutPage.title')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('studioCheckoutPage.subtitle')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">{t('studioCheckoutPage.pricePerPhoto')}</p>
            <p className="text-2xl font-bold text-[#2731db]">
              ₹{perPhotoPrice > 0 ? perPhotoPrice : PRICE_PER_IMAGE}
            </p>
          </div>
          <button
            onClick={() => setShowUpiSettings(!showUpiSettings)}
            className="flex items-center px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            title={t('studioCheckoutPage.manageUpiSettings')}
          >
            <FaCog className="mr-2" />
            {t('studioCheckoutPage.upiSettings')}
          </button>
        </div>
      </div>

      {/* UPI Settings Panel */}
      {showUpiSettings && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FaCog className="mr-2 text-[#2731db]" />
              {t('studioCheckoutPage.upiPaymentSettings')}
            </h2>
            <button
              onClick={() => setShowUpiSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('studioCheckoutPage.upiIdLabel')}
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder={t('studioCheckoutPage.upiIdPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('studioCheckoutPage.upiIdHint')}
              </p>
            </div>
            
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Per Photo (₹)
              </label>
              <input
                type="number"
                value={perPhotoPrice}
                onChange={(e) => setPerPhotoPrice(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default price per photo. Albums with perAlbumPrice will use their own pricing.
              </p>
            </div> */}

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleSaveUpiSettings}
                disabled={createUpiMutation.isPending || updateUpiMutation.isPending}
                className="flex items-center px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSave className="mr-2" />
                {upiSettings ? t('studioCheckoutPage.updateSettings') : t('studioCheckoutPage.saveSettings')}
              </button>
              
              {upiSettings && (
                <button
                  onClick={handleDeleteUpiSettings}
                  disabled={deleteUpiMutation.isPending}
                  className="flex items-center px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaTrash className="mr-2" />
                  {t('studioCheckoutPage.deleteSettings')}
                </button>
              )}
            </div>

            {/* {upiSettings && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Current Settings:</strong> UPI ID: {upiSettings.upiId}, Price: ₹{upiSettings.perPhotoPrice}
                </p>
              </div>
            )} */}
          </div>
        </div>
      )}

      {/* Summary / Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('studioCheckoutPage.selectedImages')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allSelectedImages.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studioCheckoutPage.totalAmount')}</p>
              <p className="text-2xl font-semibold text-green-600">
                {totalAmount ? `₹${totalAmount}` : '₹0'}
              </p>
            </div>
          </div>
          
          {/* {allSelectedImages.length > 0 && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FaQrcode className="text-green-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Public Checkout URL</h4>
                  </div>
                  <button
                    onClick={handleCopyCheckoutUrl}
                    className="flex items-center px-3 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
                  >
                    <FaCopy className="mr-1" /> Copy
                  </button>
                </div>
                <p className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-green-200 font-mono">
                  {publicCheckoutUrl}
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FaShare className="text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Public Selection URL</h4>
                  </div>
                  <button
                    onClick={handleCopySelectionUrl}
                    className="flex items-center px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <FaCopy className="mr-1" /> Copy
                  </button>
                </div>
                <p className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-blue-200 font-mono">
                  {publicSelectionUrl}
                </p>
              </div>
            </div>
          )} */}

          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              disabled={allSelectedImages.length === 0}
              className="flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaShare className="mr-2" />
              {t('studioCheckoutPage.shareLink')}
            </button>
            <button
              onClick={handleGenerateQr}
              disabled={allSelectedImages.length === 0}
              className="flex items-center px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaQrcode className="mr-2" />
              {t('studioCheckoutPage.generateQr')}
            </button>
            <button
              onClick={handleMarkAsPaid}
              disabled={!showQr || !totalAmount}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${
                showQr && totalAmount
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaCheckCircle className="mr-2" />
              {t('studioCheckoutPage.markAsPaid')}
            </button>
          </div>
        </div>

        {/* QR / Payment Panel */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col items-center justify-center">
          {!showQr || !qrData ? (
            <div className="text-center text-gray-500">
              <FaQrcode className="mx-auto mb-3 text-3xl" />
              <p className="text-sm">{t('studioCheckoutPage.generateQrAfterSelect')}</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <FaQrcode className="mr-2 text-[#2731db]" />
                {t('studioCheckoutPage.scanToPay')}
              </h3>
              <div className="bg-white p-3 rounded-xl border border-gray-200 mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`}
                  alt={t('studioCheckoutPage.paymentQrAlt')}
                  className="w-44 h-44"
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                {t('studioCheckoutPage.amountForPhotos', { amount: totalAmount, count: allSelectedImages.length })}
              </p>
              {upiId && (
                <p className="text-xs text-gray-500 text-center mt-1">
                  {t('studioCheckoutPage.upiLabel', { id: upiId })}
                </p>
              )}
              {isPaid && (
                <p className="mt-2 text-xs text-green-600 flex items-center">
                  <FaCheckCircle className="mr-1" /> {t('studioCheckoutPage.paymentMarkedCompletedShort')}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Share modal – send public URL to contacts / email / SMS */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('studioCheckoutPage.shareModalTitle')}</h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareContactSearch('');
                  setShareAlreadySent(null);
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Which link to share</label>
                <select
                  value={shareUrlType}
                  onChange={(e) => setShareUrlType(e.target.value as 'checkout' | 'selection' | 'images_display')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="checkout">Checkout URL</option>
                  <option value="selection">Selection URL</option>
                  <option value="images_display" disabled={!publicImagesDisplayUrl}>Images display (selected only)</option>
                </select>
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('studioCheckoutPage.existingContacts')}</label>
                <input
                  type="text"
                  value={shareContactSearch}
                  onChange={(e) => setShareContactSearch(e.target.value)}
                  placeholder={t('studioCheckoutPage.searchContactsPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
                />
                <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                  {shareContacts.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('studioCheckoutPage.noContactsYet')}</p>
                  ) : (
                    shareContacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareContactIds.has(c.id)}
                          onChange={(e) => {
                            const next = new Set(shareContactIds);
                            if (e.target.checked) next.add(c.id); else next.delete(c.id);
                            setShareContactIds(next);
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{c.displayName || c.email || c.mobile || c.id}</span>
                        {(c.email || c.mobile) && <span className="text-xs text-gray-500">({[c.email, c.mobile].filter(Boolean).join(', ')})</span>}
                      </label>
                    ))
                  )}
                </div>
              </div>
              {showEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('studioCheckoutPage.newRecipientsEmail')}</label>
                  <input
                    type="text"
                    value={shareNewEmails}
                    onChange={(e) => { setShareNewEmails(e.target.value); setShareAlreadySent(null); }}
                    onBlur={() => checkRecipient(shareNewEmails, shareNewMobiles)}
                    placeholder={t('studioCheckoutPage.emailPlaceholderShare')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              {showPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('studioCheckoutPage.newRecipientsMobile')}</label>
                  <div className="flex gap-2">
                    <select
                      value={shareNewMobileCountryCode}
                      onChange={(e) => setShareNewMobileCountryCode(e.target.value)}
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
                      value={shareNewMobiles}
                      onChange={(e) => { setShareNewMobiles(e.target.value); setShareAlreadySent(null); }}
                      onBlur={() => checkRecipient(shareNewEmails, shareNewMobiles)}
                      placeholder={t('studioCheckoutPage.mobilePlaceholderShare')}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
              {shareAlreadySent?.alreadySent && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {t('studioCheckoutPage.alreadySentWarning', { type: shareAlreadySent.email ? t('studioCheckoutPage.emailType') : t('studioCheckoutPage.mobileType') })}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('studioCheckoutPage.optionalMessage')}</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder={t('studioCheckoutPage.messagePlaceholderShare')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-4">
                {showEmail && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareChannels.email}
                      onChange={(e) => setShareChannels((c) => ({ ...c, email: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{t('studioCheckoutPage.sendViaEmail')}</span>
                  </label>
                )}
                {showPhone && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareChannels.sms}
                      onChange={(e) => setShareChannels((c) => ({ ...c, sms: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{t('studioCheckoutPage.sendViaSms')}</span>
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareContactSearch('');
                  setShareAlreadySent(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                {t('studioCheckoutPage.cancel')}
              </button>
              <button onClick={handleShareSend} disabled={shareSending} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold">
                {shareSending ? t('studioCheckoutPage.sending') : t('studioCheckoutPage.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Albums Grid – same layout as PhotoStudioAlbum */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('studioCheckoutPage.selectAlbumsImages')}</h2>
          <p className="text-sm text-gray-500">
            {t('studioCheckoutPage.selectAlbumThenChoose')}
          </p>
        </div>

        {albums.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FaFolder className="mx-auto mb-4 text-5xl text-gray-300" />
            <p className="text-lg font-medium mb-2">{t('studioCheckoutPage.noAlbumsAvailable')}</p>
            <p className="text-sm">{t('studioCheckoutPage.createAlbumsFirst')}</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 items-start">
            {albums.map((album) => {
              const isSelected = selectedAlbums.has(album.id);
              const isExpanded = expandedAlbums.has(album.id);
              const albumImageIds = selectedImages.get(album.id) || new Set<number>();
              const albumImages = albumImagesMap.get(album.id) || album.images || [];
              const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
              const hasOtherSelection = selectedAlbums.size > 0 && !isSelected;
              const isDisabled = hasOtherSelection;
              const coverUrl = getCoverImageUrl(album);

              return (
                <div
                  key={album.id}
                  className={`rounded-2xl border overflow-visible transition-all ${
                    isSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md'
                  } ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {/* Card: cover + name + count + expand */}
                  <div className="overflow-hidden rounded-t-2xl">
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={album.name}
                          className="w-full h-full object-cover"
                          onError={() => setCoverImageErrors((prev) => new Set(prev).add(album.id))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaFolder className="text-5xl text-gray-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-2 left-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); if (!isDisabled) toggleAlbum(album.id); }}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm"
                          title={isSelected ? t('studioCheckoutPage.unselectAlbum') : t('studioCheckoutPage.selectAlbum')}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'border-[#2731db] bg-[#2731db]' : 'border-gray-400 bg-white'}`}>
                            {isSelected && <FaCheck className="h-2.5 w-2.5 text-white" />}
                          </div>
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <h3 className="font-semibold text-gray-900 truncate capitalize">{album.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                        <FaImages className="h-3.5 w-3 shrink-0" />
                        {albumImages.length} {albumImages.length === 1 ? t('studioCheckoutPage.image') : t('studioCheckoutPage.images')}
                        {albumImageIds.size > 0 && (
                          <span className="text-[#2731db] font-medium ml-1">
                            · {albumImageIds.size} {t('studioCheckoutPage.selected')}
                          </span>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (!isDisabled) toggleAlbumExpand(album.id); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:border-[#2731db]/30 transition-colors"
                      >
                        {isExpanded ? t('studioCheckoutPage.hideImages') : t('studioCheckoutPage.chooseImages')}
                        <FaChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full-width Select images panel at bottom (when one album expanded) */}
          {expandedAlbums.size === 1 && (() => {
            const albumId = Array.from(expandedAlbums)[0];
            const album = albums.find((a) => a.id === albumId);
            if (!album) return null;
            const albumImageIds = selectedImages.get(album.id) || new Set<number>();
            const albumImages = albumImagesMap.get(album.id) || album.images || [];
            const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
            const isSelected = selectedAlbums.has(album.id);
            return (
              <div className="border-t border-gray-200 bg-gray-50 flex flex-col flex-shrink-0 w-full mt-4 h-full rounded-b-2xl overflow-hidden max-h-[min(55vh,420px)]">
                <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 bg-white border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {t('studioCheckoutPage.selectImagesHeading', { name: album.name })}
                    {isSelected && albumImageIds.size > 0 && (
                      <span className="ml-2 text-[#2731db] font-medium">{t('studioCheckoutPage.countSelectedOf', { selected: albumImageIds.size, total: albumImages.length })}</span>
                    )}
                  </h4>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleAlbumExpand(album.id)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      {t('studioCheckoutPage.hide')}
                    </button>
                    {isSelected && (
                      <button type="button" onClick={() => selectAllImagesInAlbum(album.id)} className="text-sm text-[#2731db] hover:underline font-medium">
                        {allSelected ? t('studioCheckoutPage.deselectAll') : t('studioCheckoutPage.selectAll')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                  {albumImages.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {albumImages.map((image) => {
                        const isImageSelected = albumImageIds.has(image.id);
                        const imageUrl = getImageUrl(image);
                        const thumbUrl = getThumbnailUrl(image);
                        const filename = getImageFilename(image);
                        const fileType = getFileType(image);
                        const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                        const imagePrice = album.perPhotoPrice && album.perPhotoPrice > 0
                          ? album.perPhotoPrice
                          : (perPhotoPrice > 0 ? perPhotoPrice : PRICE_PER_IMAGE);
                        return (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => {
                              if (!isSelected) {
                                setSelectedAlbums((prev) => { const next = new Set(prev); next.add(album.id); return next; });
                                setSelectedImages((prev) => { const next = new Map(prev); next.set(album.id, new Set([image.id])); return next; });
                              } else {
                                toggleImageSelection(album.id, image.id);
                              }
                            }}
                            className={`w-full text-left rounded-xl overflow-hidden bg-white p-2 border-2 transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2731db] ${
                              isImageSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-40 shadow-md' : 'border-transparent hover:border-gray-200 shadow-sm'
                            }`}
                          >
                            <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden relative mb-2">
                              {canView ? (
                                <>
                                  <img src={(thumbUrl || imageUrl)!} alt={filename} className="w-full h-full object-cover" />
                                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${isImageSelected ? 'bg-[#2731db] text-white' : 'bg-white/90 border-2 border-gray-300'}`}>
                                    {isImageSelected && <FaCheck className="text-sm" />}
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 text-xs">{fileType.toUpperCase()}</div>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={filename}>{filename}</p>
                            <p className="text-sm font-bold text-gray-700 mt-0.5">
                              {allSelected && album.perAlbumPrice && album.perAlbumPrice > 0 ? t('studioCheckoutPage.albumPriceLabel', { price: album.perAlbumPrice }) : imagePrice > 0 ? t('studioCheckoutPage.perImageRupee', { price: imagePrice }) : t('studioCheckoutPage.free')}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">{t('studioCheckoutPage.loadingImages')}</div>
                  )}
                </div>
              </div>
            );
          })()}
          </>
        )}
      </div>
    </div>
  );
};

export default StudioCheckout;
