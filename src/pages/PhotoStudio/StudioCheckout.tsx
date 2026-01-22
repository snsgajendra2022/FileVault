import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaCopy, FaShare, FaFolder, FaFolderOpen, FaChevronRight, FaCheck, FaCog, FaTrash, FaSave } from 'react-icons/fa';
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
  downloadUrl?: string;
  fileType?: string;
  [key: string]: any;
}

interface UpiSettings {
  upiId: string;
  perPhotoPrice: number;
}

const PRICE_PER_IMAGE = 0; // Fallback price

const StudioCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Map<number, Set<number>>>(new Map()); // albumId -> Set of imageIds
  const [albumImagesMap, setAlbumImagesMap] = useState<Map<number, AlbumImage[]>>(new Map()); // albumId -> AlbumImage[]
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

  // Fetch album images when album is expanded
  const fetchAlbumImages = async (albumId: number) => {
    // Check if images are already loaded
    if (albumImagesMap.has(albumId)) {
      return;
    }

    try {
      // Try different endpoints
      let images: AlbumImage[] = [];
      
      try {
        const response = await api.get(`/api/albums/${albumId}/images`);
        images = Array.isArray(response.data) ? response.data : (response.data?.images || []);
      } catch (error1) {
        try {
          const response = await api.get(`/api/simple-invitations/albums/${albumId}/images`);
          images = Array.isArray(response.data) ? response.data : (response.data?.images || []);
        } catch (error2) {
          console.error('Error fetching album images:', error2);
          toast.error('Failed to load album images');
        }
      }
      
      if (images.length > 0) {
        setAlbumImagesMap((prev) => {
          const next = new Map(prev);
          next.set(albumId, images);
          return next;
        });
      } else {
        // Set empty array to prevent retrying
        setAlbumImagesMap((prev) => {
          const next = new Map(prev);
          next.set(albumId, []);
          return next;
        });
      }
    } catch (error: any) {
      console.error('Error fetching album images:', error);
      toast.error('Failed to load album images');
      // Set empty array to prevent retrying
      setAlbumImagesMap((prev) => {
        const next = new Map(prev);
        next.set(albumId, []);
        return next;
      });
    }
  };

  // Fetch album images when album is expanded
  useEffect(() => {
    expandedAlbums.forEach((albumId) => {
      if (!albumImagesMap.has(albumId)) {
        fetchAlbumImages(albumId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedAlbums]);

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
        // Select album - automatically select ALL images in the album
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
    const upiIdToUse = upiId || 'rohitrawat9009@ybl'; // Fallback to default if not set
    if (!upiIdToUse) return '';
    
    const params = new URLSearchParams({
      pa: upiIdToUse,
      pn: 'PhotoStudio',
      am: String(totalAmount),
      cu: 'INR',
      tn: `PhotoStudio payment for ${allSelectedImages.length} photo(s)`,
    });
    const upiUrl = `upi://pay?${params.toString()}`;
    return encodeURIComponent(upiUrl);
  }, [allSelectedImages.length, totalAmount, upiId]);

  const publicCheckoutUrl = useMemo(() => {
    if (explicitlySelectedImages.length === 0) return '';
    const token = localStorage.getItem('token') || '';
    const selectedFilenames = explicitlySelectedImages.map(img => getImageFilename(img)).join(',');
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/checkout?token=${encodeURIComponent(token)}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [explicitlySelectedImages]);

  const publicSelectionUrl = useMemo(() => {
    if (explicitlySelectedImages.length === 0) return '';
    const token = localStorage.getItem('token') || '';
    const selectedFilenames = explicitlySelectedImages.map(img => getImageFilename(img)).join(',');
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/selection?token=${encodeURIComponent(token)}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [explicitlySelectedImages]);

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

  // UPI Settings Mutations
  const createUpiMutation = useMutation({
    mutationFn: async (data: UpiSettings) => {
      const response = await api.post('/api/upi', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upiSettings'] });
      toast.success('UPI settings created successfully');
      setShowUpiSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create UPI settings');
    },
  });

  const updateUpiMutation = useMutation({
    mutationFn: async (data: UpiSettings) => {
      const response = await api.put('/api/upi', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upiSettings'] });
      toast.success('UPI settings updated successfully');
      setShowUpiSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update UPI settings');
    },
  });

  const deleteUpiMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/api/upi');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upiSettings'] });
      toast.success('UPI settings deleted successfully');
      setUpiId('');
      setPerPhotoPrice(0);
      setShowUpiSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete UPI settings');
    },
  });

  const handleSaveUpiSettings = () => {
    if (!upiId.trim()) {
      toast.error('Please enter UPI ID');
      return;
    }
    if (perPhotoPrice < 0) {
      toast.error('Price per photo must be 0 or greater');
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
      toast.error('No UPI settings to delete');
      return;
    }
    if (window.confirm('Are you sure you want to delete UPI settings?')) {
      deleteUpiMutation.mutate();
    }
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
            <p className="text-2xl font-bold text-[#2731db]">
              ₹{perPhotoPrice > 0 ? perPhotoPrice : PRICE_PER_IMAGE}
            </p>
          </div>
          <button
            onClick={() => setShowUpiSettings(!showUpiSettings)}
            className="flex items-center px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="Manage UPI Settings"
          >
            <FaCog className="mr-2" />
            UPI Settings
          </button>
        </div>
      </div>

      {/* UPI Settings Panel */}
      {showUpiSettings && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FaCog className="mr-2 text-[#2731db]" />
              UPI Payment Settings
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
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g., yourname@ybl, yourname@paytm"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your UPI ID for receiving payments (e.g., rohitrawat9009@ybl)
              </p>
            </div>
            
            <div>
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
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleSaveUpiSettings}
                disabled={createUpiMutation.isPending || updateUpiMutation.isPending}
                className="flex items-center px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSave className="mr-2" />
                {upiSettings ? 'Update Settings' : 'Save Settings'}
              </button>
              
              {upiSettings && (
                <button
                  onClick={handleDeleteUpiSettings}
                  disabled={deleteUpiMutation.isPending}
                  className="flex items-center px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaTrash className="mr-2" />
                  Delete Settings
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
              {upiId && (
                <p className="text-xs text-gray-500 text-center mt-1">
                  UPI: {upiId}
                </p>
              )}
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
              // Use images from map if available, otherwise from album data
              const albumImages = albumImagesMap.get(album.id) || album.images || [];
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

                  {/* Album Images (shown when expanded) - Show all images for selection */}
                  {isExpanded && albumImages.length > 0 && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {isSelected ? 'Select Images' : 'Album Images'}
                          {isSelected && albumImageIds.size > 0 && (
                            <span className="ml-2 text-[#2731db] font-medium">
                              ({albumImageIds.size} of {albumImages.length} selected)
                            </span>
                          )}
                        </h4>
                        {isSelected && (
                          <button
                            onClick={() => selectAllImagesInAlbum(album.id)}
                            className="text-xs text-[#2731db] hover:underline"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {albumImages.map((image) => {
                            const isImageSelected = albumImageIds.has(image.id);
                            const imageUrl = getImageUrl(image);
                            const filename = getImageFilename(image);
                            const fileType = getFileType(image);
                            const canView = imageUrl && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                            
                            // Calculate price for this image
                            const imagePrice = album.perPhotoPrice && album.perPhotoPrice > 0
                              ? album.perPhotoPrice
                              : (perPhotoPrice > 0 ? perPhotoPrice : PRICE_PER_IMAGE);
                            
                            // Check if all images in album are selected
                            const allImagesSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;

                            return (
                              <div
                                key={image.id}
                                className={`relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                  isImageSelected
                                    ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50'
                                    : 'border-gray-200'
                                }`}
                                onClick={() => {
                                  if (!isSelected) {
                                    // Select album first if not selected, then select the image
                                    toggleAlbum(album.id);
                                    // Use setTimeout to ensure state updates before toggling image
                                    setTimeout(() => {
                                      toggleImageSelection(album.id, image.id);
                                    }, 0);
                                  } else {
                                    toggleImageSelection(album.id, image.id);
                                  }
                                }}
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
                                  <p className="text-xs text-gray-500 mt-1">
                                    {(() => {
                                      const allImagesSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
                                      if (allImagesSelected && album.perAlbumPrice && album.perAlbumPrice > 0) {
                                        return `₹${album.perAlbumPrice} (album)`;
                                      }
                                      return imagePrice > 0 ? `₹${imagePrice}` : 'Free';
                                    })()}
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
