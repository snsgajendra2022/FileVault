import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaImages, FaDownload, FaExclamationTriangle, FaFolder, FaFolderOpen, FaChevronRight, FaCheckCircle, FaCheck, FaCopy, FaShare } from 'react-icons/fa';
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

const PublicSelectionPage: React.FC = () => {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [userSelectedImages, setUserSelectedImages] = useState<Map<number, Set<number>>>(new Map()); // albumId -> Set of imageIds
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get('token') || '';

  // Fetch albums
  const { data: albumsData, isLoading, isError } = useQuery({
    queryKey: ['publicSelectionAlbums', token],
    enabled: !!token,
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

  // Get all selected images
  const allSelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
       setSelectedAlbumId(albumId);
      const album = albums.find(a => a.id === albumId);
      if (album && album.images) {
        const imageIds = userSelectedImages.get(albumId) || new Set<number>();
        album.images.forEach(img => {
          if (imageIds.has(img.id) || imageIds.size === 0) {
            images.push(img);
          }
        });
      }
    });
    return images;
  }, [selectedAlbums, userSelectedImages, albums]);

  const toggleAlbum = (albumId: number) => {
    setSelectedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
        setUserSelectedImages(prevImgs => {
          const nextImgs = new Map(prevImgs);
          nextImgs.delete(albumId);
          return nextImgs;
        });
      } else {
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
      const imageSet = next.get(albumId) || new Set<number>();
      const newImageSet = new Set(imageSet);
      
      if (newImageSet.has(imageId)) {
        newImageSet.delete(imageId);
      } else {
        newImageSet.add(imageId);
      }
      
      if (newImageSet.size === 0) {
        next.delete(albumId);
      } else {
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

  const getImageUrl = (image: AlbumImage): string | null => {
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  const getImageFilename = (image: AlbumImage): string => {
    return image.originalFilename || image.filename || 'Unknown';
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
      const response = await api.put(`/api/albums/${selectedAlbumId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Submission response:', response.data);

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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Missing access token</h1>
          <p className="text-gray-600 text-sm">
            This public link is invalid or incomplete. Please use the full link provided by your photographer.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
              Select Your Photos
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Browse albums and select the photos you want. Click on an album to view images inside.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Secure Public Link</p>
            <p className="text-sm font-medium text-gray-800">
              {albums.length} album{albums.length !== 1 ? 's' : ''} • {allSelectedImages.length} photo{allSelectedImages.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        </header>

        {/* Public URL Display */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
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
        </div>

        {/* Selection Summary Bar */}
        {allSelectedImages.length > 0 ? (
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
              <div className="flex items-center space-x-3">
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
        ) : (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Select albums and images by clicking on them. Selected photos will appear here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Albums List */}
        <main className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          {albums.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">No albums available</p>
              <p className="text-sm">
                The albums list is empty. Please contact the photographer.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {albums.map((album) => {
                const isSelected = selectedAlbums.has(album.id);
                const isExpanded = expandedAlbums.has(album.id);
                const albumImageIds = userSelectedImages.get(album.id) || new Set<number>();
                const albumImages = album.images || [];
                const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;

                return (
                  <div
                    key={album.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      isSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Album Header */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          onClick={() => toggleAlbum(album.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-[#2731db] border-[#2731db]' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <FaCheck className="text-white text-xs" />}
                        </button>

                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                            <FaFolder className="text-2xl text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{album.name}</h3>
                          {album.description && (
                            <p className="text-sm text-gray-500">{album.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>{albumImages.length} images</span>
                            {albumImageIds.size > 0 && (
                              <span className="text-[#2731db] font-medium">
                                {albumImageIds.size} selected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAlbumExpand(album.id)}
                        className="ml-4 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        {isExpanded ? (
                          <FaFolderOpen className="text-[#2731db] text-xl" />
                        ) : (
                          <FaFolder className="text-gray-400 text-xl" />
                        )}
                        <FaChevronRight
                          className={`text-gray-400 transition-transform duration-200 ml-2 ${
                            isExpanded ? 'transform rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Album Images (shown when expanded) */}
                    {isExpanded && albumImages.length > 0 && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Select Images</h4>
                          {isSelected && (
                            <button
                              onClick={() => selectAllImagesInAlbum(album.id)}
                              className="text-xs text-[#2731db] hover:underline"
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {albumImages.map((image) => {
                            const isImageSelected = isSelected && (albumImageIds.has(image.id) || albumImageIds.size === 0);
                            const imageUrl = getImageUrl(image);
                            const filename = getImageFilename(image);
                            const fileType = getFileType(image);
                            const canView = imageUrl && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);

                            return (
                              <div
                                key={image.id}
                                onClick={() => isSelected && toggleImageSelection(album.id, image.id)}
                                className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                                  isImageSelected
                                    ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50 shadow-lg'
                                    : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                                } ${!isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {/* Selection Checkbox */}
                                {isSelected && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                        isImageSelected
                                          ? 'bg-[#2731db] text-white'
                                          : 'bg-white bg-opacity-80 border-2 border-gray-300'
                                      }`}
                                    >
                                      {isImageSelected && <FaCheck className="text-xs" />}
                                    </div>
                                  </div>
                                )}

                                <div className="h-48 bg-gray-100 overflow-hidden">
                                  {canView ? (
                                    <img
                                      src={imageUrl!}
                                      alt={filename}
                                      className={`w-full h-full object-cover transition-transform duration-300 ${
                                        isImageSelected ? 'opacity-90' : 'group-hover:scale-105'
                                      }`}
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
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PublicSelectionPage;
