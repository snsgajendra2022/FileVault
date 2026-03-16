import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaFolder, 
  FaFolderOpen, 
  FaImages, 
  FaExclamationTriangle, 
  FaChevronRight,
  FaChevronLeft,
  FaTimes,
  FaShare,
  FaUser,
  FaUserFriends
} from 'react-icons/fa';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DashboardLoading from '../../components/common/DashboardLoading';
import toast from 'react-hot-toast';

interface SharedAlbumResponse {
  albumId: number;
  albumName: string;
  sharedByUserId: number;
  sharedByUsername: string;
  sharedByEmail: string;
  sharedAt: string;
}

interface SharedAlbum {
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
  sharedBy?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  sharedAt?: string;
  permissions?: {
    canView: boolean;
    canDownload: boolean;
    canUpload: boolean;
    canDelete: boolean;
    canManage: boolean;
  };
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
  downloadUrl?: string;
  fileType?: string;
  [key: string]: any;
}

const PAGE_SIZE = 20;

type SharedAlbumsApiResponse = {
  success: boolean;
  message: string;
  sharedAlbums: SharedAlbumResponse[];
  total?: number;
  page?: number;
  size?: number;
  totalPages?: number;
};

const SharedAlbums: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const loadMoreAlbumsRef = useRef<HTMLDivElement | null>(null);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [albumImages, setAlbumImages] = useState<Map<number, AlbumImage[]>>(new Map());
  const [albumImagesMeta, setAlbumImagesMeta] = useState<Map<number, { page: number; totalImages: number; totalPages: number }>>(new Map());
  const [loadingMoreAlbumId, setLoadingMoreAlbumId] = useState<number | null>(null);
  const [coverImageErrors, setCoverImageErrors] = useState<Set<number>>(new Set());
  const [fullScreenImage, setFullScreenImage] = useState<{ image: AlbumImage; albumId: number; index: number } | null>(null);

  const {
    data: sharedAlbumsData,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['sharedAlbums'],
    enabled: !authLoading,
    queryFn: async ({ pageParam }) => {
      const response = await api.get('/api/simple-invitations/shared-albums', {
        params: { page: pageParam, size: PAGE_SIZE },
      });
      return response.data as SharedAlbumsApiResponse;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = lastPage?.page ?? 0;
      const totalPages = lastPage?.totalPages ?? 0;
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const sharedAlbums = useMemo(() => {
    if (!sharedAlbumsData?.pages?.length) return [];
    return sharedAlbumsData.pages.flatMap((p) =>
      (p.sharedAlbums ?? []).map((item: SharedAlbumResponse): SharedAlbum => ({
        id: item.albumId,
        name: item.albumName,
        sharedBy: {
          id: item.sharedByUserId,
          username: item.sharedByUsername,
          email: item.sharedByEmail,
        },
        sharedAt: item.sharedAt,
        images: [],
      }))
    );
  }, [sharedAlbumsData]);

  const sharedAlbumsTotal = useMemo(() => {
    const first = sharedAlbumsData?.pages?.[0];
    return first?.total ?? sharedAlbums.length;
  }, [sharedAlbumsData, sharedAlbums.length]);

  useEffect(() => {
    const el = loadMoreAlbumsRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) fetchNextPage(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const fetchAlbumImages = async (albumId: number, page: number = 0, append: boolean = false) => {
    if (append) setLoadingMoreAlbumId(albumId);
    try {
      const response = await api.get(`/api/simple-invitations/albums/${albumId}/images`, {
        params: { page, size: PAGE_SIZE },
      });
      const data = response.data as { images?: AlbumImage[]; totalImages?: number; page?: number; totalPages?: number } | AlbumImage[];
      const images = Array.isArray(data) ? data : (data?.images || []);
      const totalImages = Array.isArray(data) ? images.length : (data as { totalImages?: number }).totalImages ?? images.length;
      const totalPages = Array.isArray(data) ? 1 : (data as { totalPages?: number }).totalPages ?? 1;

      setAlbumImagesMeta((prev) => {
        const next = new Map(prev);
        next.set(albumId, { page, totalImages, totalPages });
        return next;
      });
      setAlbumImages((prev) => {
        const next = new Map(prev);
        const existing = append ? (prev.get(albumId) || []) : [];
        next.set(albumId, existing.concat(images));
        return next;
      });
    } catch (error: any) {
      console.error('Error fetching album images:', error);
      toast.error('Failed to load album images');
      if (!append) {
        setAlbumImages((prev) => {
          const next = new Map(prev);
          next.set(albumId, []);
          return next;
        });
      }
    } finally {
      if (append) setLoadingMoreAlbumId(null);
    }
  };

  const loadMoreAlbumImages = (albumId: number) => {
    const meta = albumImagesMeta.get(albumId);
    if (!meta || meta.page + 1 >= meta.totalPages) return;
    fetchAlbumImages(albumId, meta.page + 1, true);
  };

  useEffect(() => {
    expandedAlbums.forEach((albumId) => {
      const meta = albumImagesMeta.get(albumId);
      const loaded = albumImages.get(albumId)?.length ?? 0;
      if (meta === undefined && loaded === 0) {
        fetchAlbumImages(albumId, 0, false);
      }
    });
  }, [expandedAlbums]);

  // Handle keyboard navigation for full-screen image viewer
  useEffect(() => {
    if (!fullScreenImage) return;
    
    const { albumId, index } = fullScreenImage;
    const images = albumImages.get(albumId) || extractAlbumImages(sharedAlbums.find(a => a.id === albumId) || {} as SharedAlbum);
    const hasPrevious = index > 0;
    const hasNext = index < images.length - 1;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullScreenImage(null);
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        setFullScreenImage({ image: images[index - 1], albumId, index: index - 1 });
      } else if (e.key === 'ArrowRight' && hasNext) {
        setFullScreenImage({ image: images[index + 1], albumId, index: index + 1 });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullScreenImage, albumImages, sharedAlbums]);

  // Extract images from album data
  const extractAlbumImages = (album: SharedAlbum): AlbumImage[] => {
    if (album.images && Array.isArray(album.images)) {
      return album.images;
    }
    return [];
  };

  // Get image URL (prefer previewUrl, fallback to downloadUrl)
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

  const toggleAlbum = (albumId: number) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
        // Images will be fetched via useEffect when album is expanded
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading user information..." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading shared albums..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to load shared albums</h1>
          <p className="text-gray-600 text-sm mb-4">Failed to fetch shared albums. Please try again.</p>
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
            <FaShare className="mr-3 text-purple-600" />
            Shared Albums
          </h1>
          <p className="text-gray-600 mt-2">
            Albums shared with you by your clients and photographers.
          </p>
        </div>
      </div>

      {/* Albums List */}
      <div className="text-left flex flex-wrap items-center gap-2 mb-4">
        <p className="text-sm text-gray-500">Shared albums:</p>
        <p className="text-2xl font-bold text-gray-900">{sharedAlbumsTotal}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        {sharedAlbums.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FaShare className="mx-auto mb-4 text-5xl text-gray-300" />
            <p className="text-lg font-medium mb-2">No shared albums</p>
            <p className="text-sm">Albums shared with you will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sharedAlbums.map((album) => {
              const isExpanded = expandedAlbums.has(album.id);
              return (
                <div
                  key={album.id}
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow"
                >
                  {/* Album Header */}
                  <div className="flex items-center justify-between p-4">
                    <button
                      onClick={() => toggleAlbum(album.id)}
                      className="flex-1 flex items-center space-x-4 text-left"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                        {album.coverImageUrl && !coverImageErrors.has(album.id) ? (
                          <img
                            src={album.coverImageUrl}
                            alt={album.name}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setCoverImageErrors((prev) => new Set(prev).add(album.id));
                            }}
                          />
                        ) : (
                          <>
                            {isExpanded ? (
                              <FaFolderOpen className="text-2xl text-purple-600" />
                            ) : (
                              <FaFolder className="text-2xl text-gray-400" />
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 style={{ textTransform: 'capitalize' }} className="text-lg font-semibold text-gray-900">
                            {album.name}
                          </h3>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            Shared
                          </span>
                        </div>
                        {album.description && (
                          <p className="text-sm text-gray-500 mb-2">{album.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {(() => {
                            const images = albumImages.get(album.id) || [];
                            const imageCount = images.length;
                            return imageCount > 0 ? (
                              <span className="flex items-center">
                                <FaImages className="mr-1" />
                                {imageCount} {imageCount === 1 ? 'image' : 'images'}
                              </span>
                            ) : isExpanded ? (
                              <span className="flex items-center text-gray-400">
                                <FaImages className="mr-1" />
                                Loading images...
                              </span>
                            ) : null;
                          })()}
                          {album.sharedBy && (
                            <span className="flex items-center">
                              <FaUser className="mr-1" />
                              Shared by: {album.sharedBy.username || 'Unknown'}
                            </span>
                          )}
                          {album.sharedAt && (
                            <span>
                              Shared: {new Date(album.sharedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <FaChevronRight
                        className={`text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'transform rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Album Details (shown when expanded) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {/* Album Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        {album.sharedBy && (
                          <div>
                            <p className="text-gray-500 mb-1">Shared By</p>
                            <p className="text-gray-700 font-medium">
                              {album.sharedBy.username}
                            </p>
                            {album.sharedBy.email && (
                              <p className="text-xs text-gray-500 mt-1">{album.sharedBy.email}</p>
                            )}
                          </div>
                        )}
                        {album.sharedAt && (
                          <div>
                            <p className="text-gray-500 mb-1">Shared Date</p>
                            <p className="text-gray-700">
                              {new Date(album.sharedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {album.createdAt && (
                          <div>
                            <p className="text-gray-500 mb-1">Album Created</p>
                            <p className="text-gray-700">
                              {new Date(album.createdAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {album.permissions && (
                          <div>
                            <p className="text-gray-500 mb-1">Permissions</p>
                            <div className="flex flex-wrap gap-2">
                              {album.permissions.canView && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">View</span>
                              )}
                              {album.permissions.canDownload && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Download</span>
                              )}
                              {album.permissions.canUpload && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Upload</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Album Images */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                          <FaImages className="mr-2 text-purple-600" />
                          Images in Album
                        </h4>
                        
                        {(() => {
                          const images = albumImages.get(album.id) || extractAlbumImages(album);
                          const meta = albumImagesMeta.get(album.id);
                          const hasMore = meta && meta.totalPages > 1 && meta.page + 1 < meta.totalPages;
                          if (images.length > 0) {
                            return (
                              <>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {images.map((image, index) => {
                                  const imageUrl = getImageUrl(image);
                                  const fileType = getFileType(image);
                                  const filename = getImageFilename(image);
                                  const canViewFullScreen = imageUrl && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                                  
                                  return (
                                    <div
                                      key={image.id}
                                      className={`relative rounded-lg overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow group ${
                                        canViewFullScreen ? 'cursor-pointer' : ''
                                      }`}
                                      onClick={() => {
                                        if (canViewFullScreen) {
                                          setFullScreenImage({ image, albumId: album.id, index });
                                        }
                                      }}
                                    >
                                      <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                        {canViewFullScreen ? (
                                          <>
                                            <img
                                              src={imageUrl!}
                                              alt={filename}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                              }}
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                                              <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xl font-semibold">
                                                View
                                              </div>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                                            {fileType.toUpperCase() || 'FILE'}
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-2 bg-white">
                                        <p className="text-xs text-gray-900 truncate" title={filename}>
                                          {filename}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {hasMore && (
                                <div className="mt-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => loadMoreAlbumImages(album.id)}
                                    disabled={loadingMoreAlbumId === album.id}
                                    className="px-4 py-2 rounded-lg border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50 disabled:opacity-50"
                                  >
                                    {loadingMoreAlbumId === album.id ? 'Loading…' : `Load more`}
                                  </button>
                                </div>
                              )}
                              </>
                            );
                          } else {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <FaImages className="mx-auto mb-2 text-3xl text-gray-300" />
                                <p className="text-sm">No images in this album yet</p>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {sharedAlbums.length > 0 && <div ref={loadMoreAlbumsRef} className="h-4" aria-hidden />}
        {sharedAlbums.length > 0 && isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="md" text="Loading more..." />
          </div>
        )}
      </div>

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (() => {
        const { image, albumId, index } = fullScreenImage;
        const images = albumImages.get(albumId) || extractAlbumImages(sharedAlbums.find(a => a.id === albumId) || {} as SharedAlbum);
        const imageUrl = getImageUrl(image);
        const filename = getImageFilename(image);
        const hasPrevious = index > 0;
        const hasNext = index < images.length - 1;
        
        const handlePrevious = () => {
          if (hasPrevious) {
            setFullScreenImage({ image: images[index - 1], albumId, index: index - 1 });
          }
        };
        
        const handleNext = () => {
          if (hasNext) {
            setFullScreenImage({ image: images[index + 1], albumId, index: index + 1 });
          }
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
            {hasPrevious && (
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
            )}
            
            {/* Next Button */}
            {hasNext && (
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
            )}
            
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
                {index + 1} of {images.length}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SharedAlbums;

