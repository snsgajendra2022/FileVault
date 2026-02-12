import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  FaUpload,
  FaEye,
  FaLock,
  FaTimes,
  FaCloud,
  FaUsers,
  FaUser,
} from 'react-icons/fa';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { FamilyRelationship } from '../../types/user';

const SCROLL_RESTORE_KEY = 'photo-studio-images-scroll';
const ASPECT_RATIO = 4 / 3;
const IMAGE_ROOT_MARGIN = '100px';

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface UserImage {
  previewUrl: string;
  filename: string;
  downloadUrl: string;
  enabledServices: { [key: string]: string };
  uploadTime: string;
  fileType: string;
}

interface UserImagesResponse {
  totalImages: number;
  images: UserImage[];
}

// ---------------------------------------------------------------------------
// Helpers (pure, stable)
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileTypeIcon(fileType: string): string {
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
}

function getFileTypeColor(fileType: string): string {
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
}

function isImageType(fileType: string): boolean {
  return /^(png|jpg|jpeg|gif|webp)$/i.test(fileType);
}

function getEnabledServicesCount(enabledServices: { [key: string]: string }): number {
  return Object.keys(enabledServices).length;
}

// ---------------------------------------------------------------------------
// Skeleton placeholder (fixed aspect ratio, shimmer)
// ---------------------------------------------------------------------------

const SkeletonPlaceholder = memo(function SkeletonPlaceholder() {
  return (
    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
  );
});

// ---------------------------------------------------------------------------
// Image card (memoized, lazy load, per-image state)
// ---------------------------------------------------------------------------

type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface ImageCardProps {
  image: UserImage;
  index: number;
  isVisible: boolean;
  onView: (image: UserImage) => void;
  onDownload: (image: UserImage) => void;
  onDelete: (image: UserImage) => void;
  viewMode: 'my' | 'invited';
  deletePending: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}

const ImageCard = memo(function ImageCard({
  image,
  index,
  isVisible,
  onView,
  onDownload,
  onDelete,
  viewMode,
  deletePending,
  cardRef,
}: ImageCardProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>('idle');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const showImage = isImageType(image.fileType);

  // When visible and image type, start loading
  useEffect(() => {
    if (!showImage || !isVisible) return;
    if (loadState === 'idle') setLoadState('loading');
  }, [showImage, isVisible, loadState]);

  const handleLoad = useCallback(() => setLoadState('loaded'), []);
  const handleError = useCallback(() => setLoadState('error'), []);

  const handleRetry = useCallback(() => {
    setLoadState('loading');
    if (imgRef.current) {
      const src = image.previewUrl;
      imgRef.current.src = '';
      imgRef.current.src = src;
    }
  }, [image.previewUrl]);

  const showSkeleton = showImage && (loadState === 'idle' || loadState === 'loading');
  const showImg = showImage && (loadState === 'loading' || loadState === 'loaded');
  const showError = showImage && loadState === 'error';
  const showIcon = !showImage || loadState === 'error';

  return (
    <div
      ref={cardRef}
      data-index={index}
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300"
    >
      {/* Preview area - fixed aspect ratio to prevent layout shift */}
      <div
        className="relative w-full bg-gray-100"
        style={{ paddingBottom: `${(1 / ASPECT_RATIO) * 100}%` }}
      >
        <div className="absolute inset-0">
          {showSkeleton && <SkeletonPlaceholder />}
          {showImg && (
            <img
              ref={imgRef}
              src={isVisible ? image.previewUrl : undefined}
              alt={image.filename}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{
                opacity: loadState === 'loaded' ? 1 : 0,
              }}
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
              decoding="async"
            />
          )}
          {showError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-4">
              <p className="text-xs text-gray-500 text-center mb-2">Failed to load preview</p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {showIcon && !showError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div
                className={`${getFileTypeColor(image.fileType)} text-white rounded-xl p-4 text-3xl shadow-inner`}
              >
                {getFileTypeIcon(image.fileType)}
              </div>
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-800/90 text-white backdrop-blur-sm">
              {image.fileType.toUpperCase()}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
              <FaCloud className="h-3 w-3 mr-1" />
              {getEnabledServicesCount(image.enabledServices)}
            </span>
          </div>
        </div>
      </div>

      {/* Info & actions */}
      <div className="p-4">
        <h3
          className="text-sm font-medium text-gray-900 truncate"
          title={image.filename}
        >
          {image.filename}
        </h3>
        <p className="text-xs text-gray-500 mt-1">{formatDate(image.uploadTime)}</p>
        {Object.keys(image.enabledServices).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.keys(image.enabledServices).map((service) => (
              <span
                key={service}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {service}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onView(image)}
            className="flex-1 inline-flex justify-center items-center px-2 py-1.5 border border-gray-200 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FaEye className="h-3 w-3 mr-1" />
            View
          </button>
          <button
            type="button"
            onClick={() => onDownload(image)}
            className="flex-1 inline-flex justify-center items-center px-2 py-1.5 border border-gray-200 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FiDownload className="h-3 w-3 mr-1" />
            Download
          </button>
          {/* {viewMode === 'my' && (
            <button
              type="button"
              onClick={() => onDelete(image)}
              disabled={deletePending}
              className="inline-flex justify-center items-center px-2 py-1.5 border border-red-200 text-xs font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 min-w-[2rem]"
            >
              {deletePending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <FiTrash2 className="h-3 w-3" />
              )}
            </button>
          )} */}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const ClientImagesPage = () => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FamilyRelationship | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'invited'>('my');
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const cardRefsMapRef = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollRestoredRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const familyRelationships = user?.familyRelationships || [];

  const { data: userImagesData, isLoading, error, refetch } = useQuery({
    queryKey: ['userImages', selectedUser?.inviterApiToken],
    queryFn: async () => {
      let token = localStorage.getItem('token');
      if (selectedUser && viewMode === 'invited') {
        token = selectedUser.inviterApiToken;
      }
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 2,
    refetchInterval: 30000,
    enabled: !!user && (viewMode === 'my' || (viewMode === 'invited' && !!selectedUser)),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await api.delete(`/api/images/${imageId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Image deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    },
    onError: () => {
      toast.error('Failed to delete image');
    },
  });

  const images = useMemo(
    () => (userImagesData as UserImagesResponse)?.images ?? [],
    [userImagesData]
  );

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollRestoredRef.current) return;
    try {
      const saved = sessionStorage.getItem(SCROLL_RESTORE_KEY);
      if (saved !== null) {
        const y = parseInt(saved, 10);
        if (!isNaN(y)) {
          scrollRestoredRef.current = true;
          requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }));
        }
        sessionStorage.removeItem(SCROLL_RESTORE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save scroll when opening lightbox
  const handleView = useCallback((image: UserImage) => {
    try {
      sessionStorage.setItem(SCROLL_RESTORE_KEY, String(window.scrollY));
    } catch {
      // ignore
    }
    setSelectedImage(image);
  }, []);

  const handleDownload = useCallback((image: UserImage) => {
    toast.success(`Downloading ${image.filename}...`);
    const link = document.createElement('a');
    link.href = image.downloadUrl;
    link.download = image.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDelete = useCallback(
    (image: UserImage) => {
      if (user?.accountType === 'FREE') {
        setShowUpgradeModal(true);
        return;
      }
      const imageId = image.downloadUrl.split('/').pop()?.split('?')[0];
      if (imageId) deleteImageMutation.mutate(imageId);
    },
    [user?.accountType, deleteImageMutation]
  );

  const handleUserSelect = useCallback((familyMember: FamilyRelationship) => {
    setSelectedUser(familyMember);
    setViewMode('invited');
  }, []);

  const handleBackToMyFiles = useCallback(() => {
    setSelectedUser(null);
    setViewMode('my');
  }, []);

  // Intersection Observer: track visible card indices (run after refs are attached)
  useEffect(() => {
    if (images.length === 0) return;
    const observer =
      observerRef.current ||
      new IntersectionObserver(
        (entries) => {
          setVisibleIndices((prev) => {
            const next = new Set(prev);
            let changed = false;
            entries.forEach((entry) => {
              const idx = Number((entry.target as HTMLElement).dataset.index);
              if (Number.isNaN(idx)) return;
              if (entry.isIntersecting && !next.has(idx)) {
                next.add(idx);
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        },
        { rootMargin: IMAGE_ROOT_MARGIN, threshold: 0.01 }
      );
    observerRef.current = observer;
    const map = cardRefsMapRef.current;
    const scheduleObserve = () => {
      map.forEach((el) => {
        if (el) observer.observe(el);
      });
    };
    const id = requestAnimationFrame(scheduleObserve);
    return () => {
      cancelAnimationFrame(id);
      map.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [images.length]);

  const setCardRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    if (el) el.dataset.index = String(index);
    cardRefsMapRef.current.set(index, el);
  }, []);

  const closeLightbox = useCallback(() => setSelectedImage(null), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeLightbox]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border border-gray-100"
                style={{ paddingBottom: `${(1 / ASPECT_RATIO) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gray-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Images</h2>
          <p className="text-gray-600 mb-4">Failed to load your images. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {viewMode === 'my'
              ? 'My Images'
              : `${selectedUser?.inviterFirstName ?? ''} ${selectedUser?.inviterLastName ?? ''}'s Files`}
          </h1>
          {viewMode === 'invited' && (
            <button
              type="button"
              onClick={handleBackToMyFiles}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaUser className="h-4 w-4 mr-2" />
              Back to My Files
            </button>
          )}
        </div>
      </div>

      {/* Family members (my view) */}
      {viewMode === 'my' && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaUsers className="h-5 w-5 mr-2 text-blue-600" />
              Family Members
            </h3>
            {familyRelationships.length === 0 ? (
              <div className="text-center py-6">
                <FaUsers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No family relationships found</p>
                <p className="text-sm text-gray-400">You haven't been invited to any family accounts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyRelationships.map((member) => (
                  <div
                    key={member.inviterId}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleUserSelect(member)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserSelect(member)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">
                          {member.inviterFirstName} {member.inviterLastName}
                        </h4>
                        <p className="text-sm text-gray-500">{member.relationshipType}</p>
                      </div>
                    </div>
                    {member.relationshipNotes && (
                      <p className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">Notes:</span> {member.relationshipNotes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {member.canViewImages && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          View
                        </span>
                      )}
                      {member.canUploadImages && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Upload
                        </span>
                      )}
                      {member.canDeleteImages && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Delete
                        </span>
                      )}
                      {member.canManageAlbums && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Albums
                        </span>
                      )}
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
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaUpload className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Files</p>
              <p className="text-lg font-semibold text-gray-900">
                {(userImagesData as UserImagesResponse)?.totalImages ?? 0}
              </p>
            </div>
          </div>
        </div>
        {/* <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCloud className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Cloud Services</p>
              <p className="text-lg font-semibold text-gray-900">
                {images.reduce((acc, img) => acc + getEnabledServicesCount(img.enabledServices), 0)}
              </p>
            </div>
          </div>
        </div> */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FaEye className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">File Types</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Set(images.map((img) => img.fileType)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiDownload className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="text-lg font-semibold text-gray-900">
                {images.filter((img) => Object.keys(img.enabledServices).length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Images grid or empty state */}
      {images.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <FaUpload className="h-14 w-14 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {viewMode === 'my' ? 'No files uploaded' : 'No files shared'}
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            {viewMode === 'my'
              ? 'Get started by uploading your first file.'
              : `${selectedUser?.inviterFirstName ?? ''} hasn't shared any files yet.`}
          </p>
          {viewMode === 'my' && (
            <button
              type="button"
              onClick={() => (window.location.href = '/upload')}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <FaUpload className="mr-2 h-4 w-4" />
              Upload File
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <div key={`${image.previewUrl}-${index}`}>
              <ImageCard
                image={image}
                index={index}
                isVisible={visibleIndices.has(index)}
                onView={handleView}
                onDownload={handleDownload}
                onDelete={handleDelete}
                viewMode={viewMode}
                deletePending={deleteImageMutation.isPending}
                cardRef={setCardRef(index)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <FaLock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 id="upgrade-modal-title" className="text-lg font-medium text-gray-900 mt-4">
                Upgrade Required
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                This feature is only available for premium plans.
              </p>
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/plans');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Plans
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={(e) => e.target === e.currentTarget && closeLightbox()}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex justify-between items-center p-4 bg-white border-b border-gray-100 z-10">
              <h3 className="text-lg font-medium text-gray-900 truncate pr-8">
                {selectedImage.filename}
              </h3>
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {isImageType(selectedImage.fileType) ? (
                <img
                  src={selectedImage.previewUrl}
                  alt={selectedImage.filename}
                  className="max-w-full max-h-[70vh] w-auto mx-auto rounded-lg object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
                  <div
                    className={`${getFileTypeColor(selectedImage.fileType)} text-white rounded-xl p-8 text-6xl`}
                  >
                    {getFileTypeIcon(selectedImage.fileType)}
                  </div>
                </div>
              )}
              <p className="mt-4 text-sm text-gray-500 text-center">
                {selectedImage.fileType.toUpperCase()} · {formatDate(selectedImage.uploadTime)}
              </p>
              {Object.keys(selectedImage.enabledServices).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {Object.entries(selectedImage.enabledServices).map(([service]) => (
                    <span
                      key={service}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      <FaCloud className="h-3 w-3 mr-1" />
                      {service}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedImage)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiDownload className="mr-2 h-4 w-4" />
                  Download
                </button>
                {viewMode === 'my' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedImage)}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientImagesPage;
