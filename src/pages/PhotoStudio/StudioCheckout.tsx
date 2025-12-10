import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaCopy, FaShare, FaFolder, FaFolderOpen, FaChevronRight, FaCheck } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
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

const PRICE_PER_IMAGE = 1;

const StudioCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Map<number, Set<number>>>(new Map()); // albumId -> Set of imageIds
  const [showQr, setShowQr] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

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

  // Get all selected images from all selected albums
  const allSelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
      const album = albums.find(a => a.id === albumId);
      if (album && album.images) {
        const imageIds = selectedImages.get(albumId) || new Set<number>();
        album.images.forEach(img => {
          if (imageIds.has(img.id) || imageIds.size === 0) {
            images.push(img);
          }
        });
      }
    });
    return images;
  }, [selectedAlbums, selectedImages, albums]);

  const totalAmount = useMemo(
    () => allSelectedImages.length * PRICE_PER_IMAGE,
    [allSelectedImages.length]
  );

  const toggleAlbum = (albumId: number) => {
    setSelectedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
        setSelectedImages(prevImgs => {
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
      } else {
        next.set(albumId, newImageSet);
      }
      
      return next;
    });
  };

  const selectAllImagesInAlbum = (albumId: number) => {
    const album = albums.find(a => a.id === albumId);
    if (!album || !album.images) return;
    
    setSelectedImages(prev => {
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

  const qrData = useMemo(() => {
    if (!totalAmount || allSelectedImages.length === 0) return '';
    const params = new URLSearchParams({
      pa: 'rohitrawat9009@ybl',
      pn: 'PhotoStudio',
      am: String(totalAmount),
      cu: 'INR',
      tn: `PhotoStudio payment for ${allSelectedImages.length} photo(s)`,
    });
    const upiUrl = `upi://pay?${params.toString()}`;
    return encodeURIComponent(upiUrl);
  }, [allSelectedImages.length, totalAmount]);

  const publicCheckoutUrl = useMemo(() => {
    if (allSelectedImages.length === 0) return '';
    const token = localStorage.getItem('token') || '';
    const selectedFilenames = allSelectedImages.map(img => getImageFilename(img)).join(',');
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/checkout?token=${encodeURIComponent(token)}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [allSelectedImages]);

  const publicSelectionUrl = useMemo(() => {
    if (allSelectedImages.length === 0) return '';
    const token = localStorage.getItem('token') || '';
    const selectedFilenames = allSelectedImages.map(img => getImageFilename(img)).join(',');
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/selection?token=${encodeURIComponent(token)}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [allSelectedImages]);

  const handleCopyCheckoutUrl = () => {
    if (!publicCheckoutUrl) {
      toast.error('No URL to copy. Please select images first.');
      return;
    }
    navigator.clipboard.writeText(publicCheckoutUrl).then(() => {
      toast.success('Public checkout URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const handleCopySelectionUrl = () => {
    if (!publicSelectionUrl) {
      toast.error('No URL to copy. Please select images first.');
      return;
    }
    navigator.clipboard.writeText(publicSelectionUrl).then(() => {
      toast.success('Public selection URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const handleGenerateQr = () => {
    if (allSelectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }
    setShowQr(true);
    setIsPaid(false);
  };

  const handleMarkAsPaid = () => {
    if (!showQr) {
      toast.error('Generate QR first');
      return;
    }
    if (!totalAmount) {
      toast.error('No amount to pay');
      return;
    }
    setIsPaid(true);
    toast.success('Payment marked as completed. Starting downloads...');

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
      toast.error('Please complete payment before downloading');
      return;
    }

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading albums..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Unable to load albums</h1>
          <p className="text-gray-600 mb-4">Please try again.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Retry
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
            Album Selection & Payment
          </h1>
          <p className="text-gray-600 mt-2">
            Select albums and images, review the total amount, collect payment via QR, and then allow downloads.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Price per photo</p>
            <p className="text-2xl font-bold text-[#2731db]">₹{PRICE_PER_IMAGE}</p>
          </div>
        </div>
      </div>

      {/* Summary / Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Selected images</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allSelectedImages.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total amount</p>
              <p className="text-2xl font-semibold text-green-600">
                {totalAmount ? `₹${totalAmount}` : '₹0'}
              </p>
            </div>
          </div>
          
          {allSelectedImages.length > 0 && (
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
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={handleGenerateQr}
              disabled={allSelectedImages.length === 0}
              className="flex items-center px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaQrcode className="mr-2" />
              Generate QR
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
              Mark as Paid
            </button>
          </div>
        </div>

        {/* QR / Payment Panel */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex flex-col items-center justify-center">
          {!showQr || !qrData ? (
            <div className="text-center text-gray-500">
              <FaQrcode className="mx-auto mb-3 text-3xl" />
              <p className="text-sm">Generate a QR code after selecting images.</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <FaQrcode className="mr-2 text-[#2731db]" />
                Scan to Pay
              </h3>
              <div className="bg-white p-3 rounded-xl border border-gray-200 mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`}
                  alt="Payment QR"
                  className="w-44 h-44"
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Amount: <span className="font-semibold text-green-600">₹{totalAmount}</span> for{' '}
                <span className="font-semibold">{allSelectedImages.length}</span> photo
                {allSelectedImages.length !== 1 ? 's' : ''}.
              </p>
              {isPaid && (
                <p className="mt-2 text-xs text-green-600 flex items-center">
                  <FaCheckCircle className="mr-1" /> Payment marked as completed.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Albums List */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Select Albums & Images</h2>
          <p className="text-sm text-gray-500">
            Click albums to select, expand to see images inside.
          </p>
        </div>

        {albums.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No albums available. Create albums first.
          </div>
        ) : (
          <div className="space-y-3">
            {albums.map((album) => {
              const isSelected = selectedAlbums.has(album.id);
              const isExpanded = expandedAlbums.has(album.id);
              const albumImageIds = selectedImages.get(album.id) || new Set<number>();
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
                        {album.coverImageUrl ? (
                          <img
                            src={album.coverImageUrl}
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
                      <FaChevronRight
                        className={`text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'transform rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Album Images (shown when expanded) */}
                  {isExpanded && isSelected && albumImages.length > 0 && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Select Images</h4>
                        <button
                          onClick={() => selectAllImagesInAlbum(album.id)}
                          className="text-xs text-[#2731db] hover:underline"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {albumImages.map((image) => {
                          const isImageSelected = albumImageIds.has(image.id) || albumImageIds.size === 0;
                          const imageUrl = getImageUrl(image);
                          const filename = getImageFilename(image);
                          const fileType = getFileType(image);
                          const canView = imageUrl && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);

                          return (
                            <div
                              key={image.id}
                              className={`relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                isImageSelected
                                  ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50'
                                  : 'border-gray-200'
                              }`}
                              onClick={() => toggleImageSelection(album.id, image.id)}
                            >
                              <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                {canView ? (
                                  <>
                                    <img
                                      src={imageUrl!}
                                      alt={filename}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2">
                                      <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                          isImageSelected
                                            ? 'bg-[#2731db] text-white'
                                            : 'bg-white bg-opacity-80 border-2 border-gray-300'
                                        }`}
                                      >
                                        {isImageSelected && <FaCheck className="text-xs" />}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                                    {fileType.toUpperCase()}
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioCheckout;
