import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import api from '../../api/client/axiosInstance';
import { FaUpload, FaEye, FaLock, FaTimes, FaCloud, FaUsers, FaUser, FaShare } from 'react-icons/fa';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import { CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ImageGridSkeleton } from '../../components/common/skeletons';
import { useNavigate } from 'react-router-dom';
import { FamilyRelationship } from '../../types/user';

// API Response Interfaces
interface UserImage {
  id?: number | string;
  previewUrl: string;
  filename: string;
  downloadUrl: string;
  enabledServices: {
    [key: string]: string;
  };
  uploadTime: string;
  fileType: string;
}

interface UserImagesResponse {
  totalImages: number;
  images: UserImage[];
  page?: number;
  size?: number;
  totalPages?: number;
}

interface Image {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  thumbnail?: string;
}

// Using FamilyRelationship from types/user.ts instead of separate interface

const IMAGES_PAGE_SIZE = 20;

const ImagesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FamilyRelationship | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'invited'>('my');
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const familyRelationships = user?.familyRelationships || [];

  // Share state
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContactIds, setShareContactIds] = useState<Set<string>>(new Set());
  const [shareNewEmails, setShareNewEmails] = useState('');
  const [shareNewMobileCountryCode, setShareNewMobileCountryCode] = useState('+91');
  const [shareNewMobiles, setShareNewMobiles] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareChannels, setShareChannels] = useState<{ email: boolean; sms: boolean }>({ email: true, sms: true });
  const [shareSending, setShareSending] = useState(false);
  const [shareContactSearch, setShareContactSearch] = useState('');
  const [shareAlreadySent, setShareAlreadySent] = useState<{ email?: string; mobile?: string; alreadySent: boolean } | null>(null);
  const [publicShareUrl, setPublicShareUrl] = useState('');

  const {
    data: userImagesData,
    isLoading,
    error,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['userImages', selectedUser?.inviterApiToken, viewMode],
    queryFn: async ({ pageParam }) => {
      let token = localStorage.getItem('token');
      if (selectedUser && viewMode === 'invited') {
        token = selectedUser.inviterApiToken;
      }
      const response = await api.get('/api/images/user/all', {
        params: { token, page: pageParam, size: IMAGES_PAGE_SIZE },
      });
      return response.data as UserImagesResponse;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = lastPage?.page ?? 0;
      const totalPages = lastPage?.totalPages ?? 1;
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 2,
    refetchInterval: 30000,
    enabled: !!user && (viewMode === 'my' || (viewMode === 'invited' && !!selectedUser))
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await api.delete(`/api/images/${imageId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success(t('imagesPageRoot.toastDeleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    },
    onError: () => {
      toast.error(t('imagesPageRoot.toastDeleteFailed'));
    }
  });

  const getImageKey = useCallback((image: UserImage) => {
    if (image.id != null && image.id !== '') return String(image.id);
    return image.previewUrl || image.filename || '';
  }, []);

  const handleToggleSelect = useCallback((image: UserImage) => {
    const key = getImageKey(image);
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [getImageKey]);

  // Share contacts query
  const { data: shareContactsData } = useQuery({
    queryKey: ['publicShareContacts', shareContactSearch],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (shareContactSearch.trim()) params.set('search', shareContactSearch.trim());
        params.set('limit', '50');
        params.set('offset', '0');
        const res = await api.get<{
          contacts?: { id: string; email?: string; mobile?: string; displayName?: string }[];
        }>(`/api/public-share/contacts?${params.toString()}`);
        return res.data ?? { contacts: [] };
      } catch {
        return { contacts: [] };
      }
    },
    enabled: showShareModal,
    retry: 0,
  });
  const shareContacts = shareContactsData?.contacts ?? [];

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tokenForUrl = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : '';

  // Build public share URL when modal opens
  useEffect(() => {
    if (!showShareModal) { setPublicShareUrl(''); return; }
    const allImages = userImagesData?.pages?.flatMap((p) => (p as UserImagesResponse).images ?? []) ?? [];
    const selected = allImages.filter((img) => selectedImageIds.has(getImageKey(img)));
    if (selected.length === 0) { setPublicShareUrl(''); return; }
    const imageIds = selected.map((img) => img.id).filter((id): id is number => typeof id === 'number');
    if (imageIds.length > 0) {
      setPublicShareUrl(`${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&imageIds=${imageIds.join(',')}`);
    } else {
      setPublicShareUrl(`${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}`);
    }
  }, [showShareModal, selectedImageIds, userImagesData, tokenForUrl, baseUrl, getImageKey]);

  const handleShareSend = useCallback(async () => {
    if (!publicShareUrl) { toast.error('No URL to share. Select images first.'); return; }
    const emails = shareNewEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    const mobileParts = shareNewMobiles.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map((p) => p.startsWith('+') ? p : `${shareNewMobileCountryCode}${p}`);
    if (shareContactIds.size === 0 && emails.length === 0 && mobiles.length === 0) {
      toast.error('Select at least one contact or enter email/mobile.'); return;
    }
    const channels: string[] = [];
    if (shareChannels.email) channels.push('email');
    if (shareChannels.sms) channels.push('sms');
    if (channels.length === 0) { toast.error('Select at least one channel.'); return; }
    setShareSending(true);
    try {
      const res = await api.post<{ success?: boolean; sent?: { email?: number; sms?: number } }>(
        '/api/public-share/send',
        {
          publicUrl: publicShareUrl,
          message: shareMessage.trim() || undefined,
          sendTo: { contactIds: Array.from(shareContactIds), emails, mobiles },
          albumName: 'My Images',
          channels,
        }
      );
      if (res.data?.success) {
        const e = res.data.sent?.email ?? 0;
        const s = res.data.sent?.sms ?? 0;
        toast.success(`Link sent (email: ${e}, SMS: ${s}).`);
        setShowShareModal(false);
        setShareContactIds(new Set());
        setShareNewEmails('');
        setShareNewMobiles('');
        setShareMessage('');
        setShareAlreadySent(null);
        setSelectedImageIds(new Set());
      } else {
        toast.error('Failed to send. Please try again.');
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        toast.error('Share by email/SMS is not available. Use Copy link instead.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to send share.');
      }
    } finally {
      setShareSending(false);
    }
  }, [publicShareUrl, shareNewEmails, shareNewMobiles, shareNewMobileCountryCode, shareContactIds, shareChannels, shareMessage]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return t('imagesPageRoot.sizeZero');
    const k = 1024;
    const sizes = [t('imagesPageRoot.sizeBytes'), t('imagesPageRoot.sizeKb'), t('imagesPageRoot.sizeMb'), t('imagesPageRoot.sizeGb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (image: UserImage) => {
    // Check if user has access to download
    if (user?.accountType === 'FREE') {
      setShowUpgradeModal(true);
      return;
    }

    // Download using the API URL
    toast.success(t('imagesPageRoot.downloading', { name: image.filename }));
    const link = document.createElement('a');
    link.href = image.downloadUrl;
    link.download = image.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (image: UserImage) => {
    if (user?.accountType === 'FREE') {
      setShowUpgradeModal(true);
      return;
    }

    // Extract image ID from the URL
    const imageId = image.downloadUrl.split('/').pop()?.split('?')[0];
    if (imageId) {
      deleteImageMutation.mutate(imageId);
    }
  };

  const handleView = (image: UserImage) => {
    setSelectedImage(image);
  };

  const closeLightbox = () => setSelectedImage(null);

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return '🖼️';
      case 'pdf':
        return '📄';
      case 'txt':
        return '📝';
      case 'doc':
      case 'docx':
        return '📄';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📈';
      default:
        return '📁';
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return 'bg-blue-500';
      case 'pdf':
        return 'bg-red-500';
      case 'txt':
        return 'bg-gray-500';
      case 'doc':
      case 'docx':
        return 'bg-blue-600';
      case 'xls':
      case 'xlsx':
        return 'bg-green-500';
      case 'ppt':
      case 'pptx':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEnabledServicesCount = (enabledServices: { [key: string]: string }) => {
    return Object.keys(enabledServices).length;
  };

  const handleUserSelect = (familyMember: FamilyRelationship) => {
    setSelectedUser(familyMember);
    setViewMode('invited');
  };

  const handleBackToMyFiles = () => {
    setSelectedUser(null);
    setViewMode('my');
  };

  // Infinite scroll: load more when sentinel is visible
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-6 animate-pulse" />
        <ImageGridSkeleton count={12} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">{t('imagesPageRoot.errorTitle')}</h2>
          <p className="text-red-600 mb-4">{t('imagesPageRoot.errorBody')}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('imagesPageRoot.retry')}
          </button>
        </div>
      </div>
    );
  }

  const images = userImagesData?.pages?.flatMap((p) => (p as UserImagesResponse).images ?? []) ?? [];

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedImage(null); return; }
      const currentIdx = images.findIndex((img) => getImageKey(img) === getImageKey(selectedImage));
      if (e.key === 'ArrowLeft') setSelectedImage(images[(currentIdx - 1 + images.length) % images.length]);
      if (e.key === 'ArrowRight') setSelectedImage(images[(currentIdx + 1) % images.length]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImage, images, getImageKey]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'my'
                ? t('imagesPageRoot.myFiles')
                : t('imagesPageRoot.theirFiles', {
                  first: selectedUser?.inviterFirstName ?? '',
                  last: selectedUser?.inviterLastName ?? ''
                })}
            </h1>
            <p className="text-gray-600">
              {viewMode === 'my' ? t('imagesPageRoot.subtitleMy') : t('imagesPageRoot.subtitleInvited')}
            </p>
          </div>
          {viewMode === 'invited' && (
            <button
              onClick={handleBackToMyFiles}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaUser className="h-4 w-4 mr-2" />
              {t('imagesPageRoot.backToMyFiles')}
            </button>
          )}
        </div>
      </div>

      {/* User Selection for Invited Users */}
      {viewMode === 'my' && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaUsers className="h-5 w-5 mr-2 text-blue-600" />
              {t('imagesPageRoot.familyMembers')}
            </h3>
            {familyRelationships.length === 0 ? (
              <div className="text-center py-6">
                <FaUsers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">{t('imagesPageRoot.noFamily')}</p>
                <p className="text-sm text-gray-400">{t('imagesPageRoot.noFamilyHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-red-500">
                {familyRelationships.map((familyMember, index) => (
                  <div
                    key={familyMember.inviterId}
                    onClick={() => handleUserSelect(familyMember)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">
                          {familyMember.inviterFirstName} {familyMember.inviterLastName}
                        </h4>
                        <p className="text-sm text-gray-500">{familyMember.relationshipType}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">{t('imagesPageRoot.usernameLabel')}</span> {familyMember.inviterUsername}
                      </p>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">{t('imagesPageRoot.relationshipLabel')}</span> {familyMember.relationshipNotes}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {familyMember.canViewImages && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('imagesPageRoot.badgeView')}
                          </span>
                        )}
                        {familyMember.canUploadImages && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {t('imagesPageRoot.badgeUpload')}
                          </span>
                        )}
                        {familyMember.canDeleteImages && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {t('imagesPageRoot.badgeDelete')}
                          </span>
                        )}
                        {familyMember.canManageAlbums && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {t('imagesPageRoot.badgeAlbums')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaUpload className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.totalFiles')}</p>
              <p className="text-lg font-semibold text-gray-900">{userImagesData?.pages?.[0]?.totalImages ?? images.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCloud className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.cloudServices')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {images.reduce((acc, img) => acc + getEnabledServicesCount(img.enabledServices), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FaEye className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.fileTypes')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Set(images.map(img => img.fileType)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiDownload className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.available')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {images.filter(img => Object.keys(img.enabledServices).length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <FaUpload className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {viewMode === 'my' ? t('imagesPageRoot.noFilesMy') : t('imagesPageRoot.noFilesShared')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {viewMode === 'my'
              ? t('imagesPageRoot.uploadHint')
              : t('imagesPageRoot.noFilesTheir', {
                name: `${selectedUser?.inviterFirstName ?? ''} ${selectedUser?.inviterLastName ?? ''}`.trim()
              })}
          </p>
          {viewMode === 'my' && (
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/upload'}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaUpload className="-ml-1 mr-2 h-4 w-4" />
                {t('imagesPageRoot.uploadFile')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* File Preview */}
              <div className="relative h-48 bg-gray-100 cursor-pointer" onClick={() => handleView(image)}>
                {image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
                  <img
                    src={image.previewUrl}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center ${image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? 'hidden' : ''}`}>
                  <div className={`${getFileTypeColor(image.fileType)} text-white rounded-lg p-4 text-4xl`}>
                    {getFileTypeIcon(image.fileType)}
                  </div>
                </div>

                {/* File Type Badge */}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-white">
                    {image.fileType.toUpperCase()}
                  </span>
                </div>

                {/* Cloud Services Badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaCloud className="h-3 w-3 mr-1" />
                    {getEnabledServicesCount(image.enabledServices)}
                  </span>
                  {viewMode === 'my' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleSelect(image); }}
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${selectedImageIds.has(getImageKey(image))
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-white/80 bg-black/20 text-transparent hover:border-white'
                        }`}
                      aria-label={selectedImageIds.has(getImageKey(image)) ? 'Deselect' : 'Select for share'}
                    >
                      {selectedImageIds.has(getImageKey(image)) && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />}
                    </button>
                  )}
                </div>

                {user?.accountType === 'FREE' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
                    <FaLock className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 truncate" title={image.filename}>
                  {image.filename}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(image.uploadTime)}
                </p>

                {/* Cloud Services Info */}
                {Object.keys(image.enabledServices).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(image.enabledServices).map(([service, status]) => (
                      <span
                        key={service}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => handleView(image)}
                    className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <FaEye className="h-3 w-3 mr-1" />
                    {t('imagesPageRoot.view')}
                  </button>
                  <button
                    onClick={() => handleDownload(image)}
                    className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <FiDownload className="h-3 w-3 mr-1" />
                    {t('imagesPageRoot.download')}
                  </button>
                  {/* Only show delete button for own files and if user has delete permission */}
                  {viewMode === 'my' && (
                    <button
                      onClick={() => handleDelete(image)}
                      disabled={deleteImageMutation.isPending}
                      className="inline-flex justify-center items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleteImageMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <FiTrash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && <div ref={loadMoreSentinelRef} className="h-4" aria-hidden />}
      {images.length > 0 && isFetchingNextPage && (
        <div className="mt-4 flex justify-center py-4">
          <LoadingSpinner size="md" text={t('imagesPageRoot.loadingMore')} />
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <FaLock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">{t('imagesPageRoot.upgradeTitle')}</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('imagesPageRoot.upgradeBody')}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/plans');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {t('imagesPageRoot.viewPlans')}
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="mt-2 px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  {t('imagesPageRoot.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal — fullscreen lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 z-[100000] flex items-center justify-between px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-white/90 truncate max-w-[60%]">
              {selectedImage.filename}
            </h3>
            <div className="flex items-center gap-1">
              {viewMode === 'my' && (
                <button
                  type="button"
                  onClick={() => {
                    const key = getImageKey(selectedImage);
                    setSelectedImageIds(new Set([key]));
                    closeLightbox();
                    setTimeout(() => setShowShareModal(true), 50);
                  }}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Share"
                >
                  <FaShare className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDownload(selectedImage)}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Download"
              >
                <FiDownload className="h-5 w-5" />
              </button>
              {viewMode === 'my' && (
                <button
                  type="button"
                  onClick={() => { handleDelete(selectedImage); closeLightbox(); }}
                  className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"
                  aria-label="Delete"
                >
                  <FiTrash2 className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Prev / Next */}
          {images.length > 1 && (() => {
            const currentIdx = images.findIndex((img) => getImageKey(img) === getImageKey(selectedImage));
            const prevImg = images[(currentIdx - 1 + images.length) % images.length];
            const nextImg = images[(currentIdx + 1) % images.length];
            return (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(prevImg); }}
                  className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-[100001] h-11 w-11 rounded-full bg-white/95 text-blue-600 shadow-md hover:scale-105 hover:text-blue-700 transition-all flex items-center justify-center"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(nextImg); }}
                  className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-[100001] h-11 w-11 rounded-full bg-white/95 text-blue-600 shadow-md hover:scale-105 hover:text-blue-700 transition-all flex items-center justify-center"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            );
          })()}

          {/* Image */}
          <div
            className="absolute inset-0 pt-14 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedImage.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
              <img
                src={selectedImage.previewUrl}
                alt={selectedImage.filename}
                className="max-h-full max-w-full object-contain select-none"
                draggable={false}
              />
            ) : (
              <div className="flex items-center justify-center">
                <div className={`${getFileTypeColor(selectedImage.fileType)} text-white rounded-xl p-10 text-7xl`}>
                  {getFileTypeIcon(selectedImage.fileType)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating share toolbar — appears when images are selected */}
      {selectedImageIds.size > 0 && viewMode === 'my' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-blue-200 bg-white px-5 py-3 shadow-2xl">
          <span className="text-sm font-medium text-gray-700">
            {selectedImageIds.size} selected
          </span>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-blue-900 transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)' }}
          >
            <FaShare className="h-4 w-4" />
            Share
          </button>
          <button
            type="button"
            onClick={() => setSelectedImageIds(new Set())}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Share Images</h3>
              <button
                type="button"
                onClick={() => { setShowShareModal(false); setShareContactSearch(''); setShareAlreadySent(null); }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm text-gray-500">
                Sharing link for <strong className="text-gray-900">{selectedImageIds.size}</strong> image{selectedImageIds.size !== 1 ? 's' : ''}.
              </p>

              {/* Existing contacts */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Existing contacts</label>
                <input
                  type="text"
                  value={shareContactSearch}
                  onChange={(e) => setShareContactSearch(e.target.value)}
                  placeholder="Search by name, email, mobile..."
                  className="mb-2 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
                  {shareContacts.length === 0 ? (
                    <p className="text-sm text-gray-400">No contacts yet. Add email or mobile below.</p>
                  ) : (
                    shareContacts.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={shareContactIds.has(c.id)}
                          onChange={(e) => {
                            const next = new Set(shareContactIds);
                            if (e.target.checked) next.add(c.id);
                            else next.delete(c.id);
                            setShareContactIds(next);
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">{c.displayName || c.email || c.mobile || c.id}</span>
                        {(c.email || c.mobile) && (
                          <span className="text-xs text-gray-400">({[c.email, c.mobile].filter(Boolean).join(', ')})</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* New email recipients */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">New recipients – email (comma separated)</label>
                <input
                  type="text"
                  value={shareNewEmails}
                  onChange={(e) => { setShareNewEmails(e.target.value); setShareAlreadySent(null); }}
                  placeholder="e.g. a@example.com, b@example.com"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* New mobile recipients */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">New recipients – mobile (comma separated)</label>
                <div className="flex gap-2">
                  <select
                    value={shareNewMobileCountryCode}
                    onChange={(e) => setShareNewMobileCountryCode(e.target.value)}
                    className="w-24 shrink-0 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {['+91', '+1', '+44', '+971', '+61', '+81', '+86', '+33', '+49', '+55'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={shareNewMobiles}
                    onChange={(e) => { setShareNewMobiles(e.target.value); setShareAlreadySent(null); }}
                    placeholder="e.g. 9876543210"
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {shareAlreadySent?.alreadySent && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Already sent to this {shareAlreadySent.email ? 'email' : 'mobile'}. You can resend if needed.
                </p>
              )}

              {/* Optional message */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Optional message</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a short message to include in the email/SMS"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Channels */}
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={shareChannels.email} onChange={(e) => setShareChannels(c => ({ ...c, email: e.target.checked }))} className="rounded border-gray-300" />
                  <span className="text-sm text-gray-900">Send via Email</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={shareChannels.sms} onChange={(e) => setShareChannels(c => ({ ...c, sms: e.target.checked }))} className="rounded border-gray-300" />
                  <span className="text-sm text-gray-900">Send via SMS</span>
                </label>
              </div>

              {/* Copy link */}
              {publicShareUrl && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Or copy link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 select-all">
                      {publicShareUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(publicShareUrl); toast.success('Link copied!'); }}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-900 transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3.5">
              <button
                type="button"
                onClick={() => { setShowShareModal(false); setShareContactSearch(''); setShareAlreadySent(null); }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShareSend}
                disabled={shareSending || !publicShareUrl}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-900 transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)' }}
              >
                {shareSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesPage;
