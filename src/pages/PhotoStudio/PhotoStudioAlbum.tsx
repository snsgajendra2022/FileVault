import React, { useState, useEffect, useMemo } from 'react';
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
  FaSearch
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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
  [key: string]: any;
}


interface UserImagesResponse {
  totalImages: number;
  images: UserImage[];
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

const PhotoStudioAlbum: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddImagesModal, setShowAddImagesModal] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number | string>>(new Set());
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [searchImageId, setSearchImageId] = useState('');
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [albumImages, setAlbumImages] = useState<Map<number, AlbumImage[]>>(new Map());
  const [coverImageErrors, setCoverImageErrors] = useState<Set<number>>(new Set());
  const [fullScreenImage, setFullScreenImage] = useState<{ image: AlbumImage; albumId: number; index: number } | null>(null);

  const userId = user?.id;

  // Debug logging
  useEffect(() => {
  }, [user, userId, authLoading]);

  // Fetch all albums
  const { data: albumsData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['albums'],
    enabled: !authLoading, // Only wait for auth to load, don't require userId
    queryFn: async () => {
      try {
        const response = await api.get('/api/albums');
        return response.data as Album[] | { albums: Album[] };
      } catch (error: any) {
        throw error;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Log query state
  useEffect(() => {
  }, [isLoading, isFetching, isError, albumsData, authLoading, userId]);

  // Fetch user images for adding to albums
  const { data: userImagesData, error } = useQuery({
    queryKey: ['userImages-gallery'],
    queryFn: async (): Promise<UserImagesResponse> => {
      let token = localStorage.getItem('token');
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 2,
    refetchInterval: 300000,
    enabled: true,
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
  }, [fullScreenImage, albumImages, albums]);

  const userImages = useMemo(() => {
    if (!userImagesData) return [];
    if (Array.isArray(userImagesData)) return userImagesData;
    if (userImagesData.images) return userImagesData.images;
    return [];
  }, [userImagesData]);

  // Create album mutation
  const createAlbumMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; imageIds?: (number | string)[] }) => {
      const response = await api.post('/api/albums', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success('Album created successfully!');
      setShowCreateModal(false);
      setNewAlbumName('');
      setNewAlbumDescription('');
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

  // Find albums for an image
  const findAlbumsForImage = async (imageId: number | string) => {
    try {
      const response = await api.get(`/api/albums/image/${imageId}/albums`);
      const albums = Array.isArray(response.data) ? response.data : (response.data?.albums || []);
      setSearchResults(albums);
      if (albums.length === 0) {
        toast('This image is not in any albums', { icon: 'ℹ️' });
      } else {
        toast.success(`Found ${albums.length} album(s) for this image`);
      }
    } catch (error: any) {
      console.error('Error finding albums:', error);
      toast.error(error.response?.data?.message || 'Failed to find albums for image');
      setSearchResults([]);
    }
  };

  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) {
      toast.error('Please enter an album name');
      return;
    }
    // Note: imageIds can be included when creating album, but we'll add images separately
    createAlbumMutation.mutate({
      name: newAlbumName.trim(),
      description: newAlbumDescription.trim() || undefined,
    });
  };

  const handleAddImagesToAlbum = (albumId: number) => {
    if (selectedImages.size === 0) {
      toast.error('Please select at least one image');
      return;
    }
    addImagesMutation.mutate({
      albumId,
      imageIds: Array.from(selectedImages),
    });
  };

  const toggleImageSelection = (imageId: number | string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });
  };

  // Extract images from album data
  // Note: API doesn't support GET /api/albums/{id}/images
  // Images should be included in the album response from GET /api/albums
  const extractAlbumImages = (album: Album): AlbumImage[] => {
    if (album.images && Array.isArray(album.images)) {
      return album.images;
    }
    return [];
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
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading user information..." />
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading albums..." />
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
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors flex items-center"
          >
            <FaPlus className="mr-2" />
            Create Album
          </button>
        </div>
      </div>

      {/* Find Albums for Image */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
        <div className="flex items-center space-x-3">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Enter image ID to find albums..."
            value={searchImageId}
            onChange={(e) => setSearchImageId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2731db]"
          />
          <button
            onClick={() => {
              if (searchImageId.trim()) {
                findAlbumsForImage(searchImageId.trim());
              } else {
                toast.error('Please enter an image ID');
              }
            }}
            className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Albums containing image {searchImageId}:
            </p>
            <div className="space-y-2">
              {searchResults.map((album) => (
                <div
                  key={album.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-900">{album.name}</p>
                  {album.description && (
                    <p className="text-sm text-gray-500 mt-1">{album.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Albums List */}
      <div className="text-left flex items-center space-x-2">
            <p className="text-sm text-gray-500">Total albums:</p>
            <p className="text-2xl font-bold text-gray-900">{albums.length}</p>
          </div>
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        {albums.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FaFolder className="mx-auto mb-4 text-5xl text-gray-300" />
            <p className="text-lg font-medium mb-2">No albums found</p>
            <p className="text-sm mb-4">Create your first album to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors"
            >
              Create Album
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {albums.map((album) => {
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
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
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
                              <FaFolderOpen className="text-2xl text-[#2731db]" />
                            ) : (
                              <FaFolder className="text-2xl text-gray-400" />
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {album.name}
                        </h3>
                        {album.description && (
                          <p className="text-sm text-gray-500 mb-2">{album.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {album.imageCount !== undefined && (
                            <span className="flex items-center">
                              <FaImages className="mr-1" />
                              {album.imageCount} {album.imageCount === 1 ? 'image' : 'images'}
                            </span>
                          )}
                          {album.createdAt && (
                            <span>
                              Created: {new Date(album.createdAt).toLocaleDateString()}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddImagesModal(album.id);
                      }}
                      className="flex ml-4 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                    >
                      <FaPlus className="mr-1" />
                      Add Images
                    </button>
                  </div>

                  {/* Album Details (shown when expanded) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {/* Album Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        {album.createdAt && (
                          <div>
                            <p className="text-gray-500 mb-1">Created</p>
                            <p className="text-gray-700">
                              {new Date(album.createdAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {album.updatedAt && (
                          <div>
                            <p className="text-gray-500 mb-1">Last Updated</p>
                            <p className="text-gray-700">
                              {new Date(album.updatedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Album Images */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                          <FaImages className="mr-2 text-[#2731db]" />
                          Images in Album
                        </h4>
                        
                        {(() => {
                          const images = albumImages.get(album.id) || extractAlbumImages(album);
                          if (images.length > 0) {
                            return (
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
                            );
                          } else {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <FaImages className="mx-auto mb-2 text-3xl text-gray-300" />
                                <p className="text-sm">No images in this album yet</p>
                                <p className="text-xs text-gray-400 mt-1">Click "Add Images" to add photos</p>
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
      </div>

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
                  {userImages.map((image) => {
                    const isSelected = selectedImages.has(image.id);
                    return (
                      <div
                        key={image.id}
                        onClick={() => toggleImageSelection(image.id)}
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
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                              {image.fileType.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2">
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
                        <div className="p-2 bg-white">
                          <p className="text-xs text-gray-900 truncate" title={image.filename}>
                            {image.filename}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (() => {
        const { image, albumId, index } = fullScreenImage;
        const images = albumImages.get(albumId) || extractAlbumImages(albums.find(a => a.id === albumId) || {} as Album);
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

export default PhotoStudioAlbum;
