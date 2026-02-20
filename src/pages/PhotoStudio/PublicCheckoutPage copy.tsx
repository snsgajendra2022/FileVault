import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaExclamationTriangle, FaFolder, FaFolderOpen, FaChevronRight, FaCheck, FaRedoAlt } from 'react-icons/fa';
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

const PublicCheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Map<number, Set<number>>>(new Map());
  const [showQr, setShowQr] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const autoSelectedRef = useRef(false);

  const token = searchParams.get('token') || '';
  const filesParam = searchParams.get('files') || '';

  // Parse filenames from URL parameter
  const targetFilenames = useMemo(() => {
    if (!filesParam) return [];
    return filesParam.split(',').map(f => decodeURIComponent(f.trim())).filter(f => f);
  }, [filesParam]);

  // Fetch albums
  const { data: albumsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['publicCheckoutAlbums', token],
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

  // Get all explicitly selected images from all selected albums
  const allSelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
      const album = albums.find(a => a.id === albumId);
      if (album && album.images) {
        const imageIds = selectedImages.get(albumId);
        // Only include explicitly selected images
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
  }, [selectedAlbums, selectedImages, albums]);

  const totalAmount = useMemo(
    () => allSelectedImages.length * PRICE_PER_IMAGE,
    [allSelectedImages.length]
  );

  const toggleAlbum = (albumId: number) => {
    setIsPaid(false);
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
    setIsPaid(false);
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

  // Auto-select albums and images based on filenames from URL (only once when albums load)
  useEffect(() => {
    if (albums.length === 0 || targetFilenames.length === 0) return;
    // Only auto-select once (prevents overriding user selections)
    if (autoSelectedRef.current) return;

    const matchedAlbums = new Set<number>();
    const matchedImages = new Map<number, Set<number>>();

    albums.forEach(album => {
      if (!album.images || album.images.length === 0) return;

      const albumImageIds = new Set<number>();
      let hasMatch = false;

      album.images.forEach(image => {
        const imageFilename = getImageFilename(image);
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

    if (matchedAlbums.size > 0) {
      setSelectedAlbums(matchedAlbums);
      setSelectedImages(matchedImages);
      autoSelectedRef.current = true;
      toast.success(`Found ${matchedAlbums.size} album(s) with matching images`);
    }
  }, [albums, targetFilenames]);

  const qrData = useMemo(() => {
    if (!totalAmount || allSelectedImages.length === 0) return '';
    const params = new URLSearchParams({
      pa: 'rohitrawat9009@ybl',
      pn: 'Photo Book',
      am: String(totalAmount),
      cu: 'INR',
      tn: `Photo Book payment for ${allSelectedImages.length} photo(s)`,
    }).toString();
    const upiUrl = `upi://pay?${params.toString()}`;
    return encodeURIComponent(upiUrl);
  }, [allSelectedImages.length, totalAmount]);

  // Register payment and generate transaction ID when QR is created/shown
  useEffect(() => {
    if (showQr && qrData && allSelectedImages.length > 0 && totalAmount > 0 && !transactionId) {
      const registerPayment = async () => {
        try {
          const txId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setTransactionId(txId);
          
          const transactionData = {
            transactionId: txId,
            amount: totalAmount,
            imageCount: allSelectedImages.length,
            token,
            timestamp: Date.now(),
            status: 'pending'
          };
          localStorage.setItem(`payment_${txId}`, JSON.stringify(transactionData));

          // Send API call to register/create payment transaction when QR is created
          try {
            console.log('Calling /api/payment/create with:', {
              transactionId: txId,
              amount: totalAmount,
              imageCount: allSelectedImages.length,
              imageIds: allSelectedImages.map(img => img.id),
              token,
              timestamp: Date.now()
            });

            const response = await api.post('/api/payment/create', {
              transactionId: txId,
              amount: totalAmount,
              imageCount: allSelectedImages.length,
              imageIds: allSelectedImages.map(img => img.id),
              token,
              timestamp: Date.now()
            });
            
            console.log('Payment registered successfully:', response.data);
            toast.success('Payment transaction created');
          } catch (error: any) {
            console.error('Error registering payment:', error);
            console.error('Error details:', error.response?.data || error.message);
            toast.error('Failed to register payment. Please try again.');
          }
        } catch (error) {
          console.error('Error creating transaction:', error);
        }
      };

      registerPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQr, qrData, allSelectedImages.length, totalAmount, transactionId]);

  // Auto-show QR when images are selected
  useEffect(() => {
    if (allSelectedImages.length > 0 && totalAmount > 0) {
      setShowQr(true);
      setIsPaid(false);
    } else {
      setShowQr(false);
      setIsPaid(false);
      setTransactionId('');
    }
  }, [allSelectedImages.length, totalAmount]);

  const checkPaymentStatus = async (amount: number, imageCount: number): Promise<boolean> => {
    try {
      if (!transactionId) return false;

      try {
        const verifyResponse = await api.post('/api/payment/verify', {
          amount,
          imageCount,
          token,
          transactionId
        });
        
        console.log('Payment verify response:', verifyResponse.data);
        
        if (verifyResponse.data && verifyResponse.data.paid === true) {
          const storedData = localStorage.getItem(`payment_${transactionId}`);
          if (storedData) {
            const transactionData = JSON.parse(storedData);
            transactionData.status = 'paid';
            transactionData.paidAt = Date.now();
            localStorage.setItem(`payment_${transactionId}`, JSON.stringify(transactionData));
          }
          return true;
        }
      } catch (apiError: any) {
        if (apiError.response?.status !== 404) {
          console.error('Payment verification API error:', apiError);
          console.error('Error details:', apiError.response?.data || apiError.message);
        }
      }

      const storedData = localStorage.getItem(`payment_${transactionId}`);
      if (storedData) {
        const transactionData = JSON.parse(storedData);
        if (transactionData.status === 'paid') {
          return true;
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const paymentConfirmed = urlParams.get('payment_confirmed');
      if (paymentConfirmed === 'true' && urlParams.get('txn_id') === transactionId) {
        const storedData = localStorage.getItem(`payment_${transactionId}`);
        if (storedData) {
          const transactionData = JSON.parse(storedData);
          transactionData.status = 'paid';
          transactionData.paidAt = Date.now();
          localStorage.setItem(`payment_${transactionId}`, JSON.stringify(transactionData));
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  };

  // Auto-detect payment success
  useEffect(() => {
    if (showQr && qrData && !isPaid && allSelectedImages.length > 0 && totalAmount > 0 && transactionId) {
      setPaymentChecking(true);
      
      const paymentCheckInterval = setInterval(async () => {
        try {
          const paymentConfirmed = await checkPaymentStatus(totalAmount, allSelectedImages.length);
          
          if (paymentConfirmed) {
            setIsPaid(true);
            setPaymentChecking(false);
            clearInterval(paymentCheckInterval);
            
            // Call confirmation API when payment is verified
            try {
              console.log('Payment confirmed! Calling /api/payment/confirm with:', {
                transactionId,
                amount: totalAmount,
                imageCount: allSelectedImages.length,
                imageIds: allSelectedImages.map(img => img.id),
                token,
                confirmedAt: Date.now()
              });

              const confirmResponse = await api.post('/api/payment/confirm', {
                transactionId,
                amount: totalAmount,
                imageCount: allSelectedImages.length,
                imageIds: allSelectedImages.map(img => img.id),
                token,
                confirmedAt: Date.now()
              });
              
              console.log('Payment confirmed via API:', confirmResponse.data);
              toast.success('Payment confirmed! Unlocking downloads...');
            } catch (confirmError: any) {
              console.error('Error confirming payment:', confirmError);
              console.error('Error details:', confirmError.response?.data || confirmError.message);
              // Still show success even if confirmation API fails
              toast.success('Payment detected! Unlocking downloads...');
            }
          }
        } catch (error) {
          console.error('Payment check error:', error);
        }
      }, 2000000);

      const timeout = setTimeout(() => {
        clearInterval(paymentCheckInterval);
        setPaymentChecking(false);
        if (!isPaid) {
          toast.error('Payment verification timeout. Please refresh and try again.');
        }
      }, 900000);

      return () => {
        clearInterval(paymentCheckInterval);
        clearTimeout(timeout);
        setPaymentChecking(false);
      };
    }
  }, [showQr, qrData, isPaid, allSelectedImages.length, totalAmount, transactionId]);

  // Auto-unlock downloads when payment is confirmed
  useEffect(() => {
    if (isPaid && allSelectedImages.length > 0) {
      toast.success('Payment confirmed! Downloads unlocked.');
      
      setTimeout(() => {
        allSelectedImages.forEach((image, index) => {
          setTimeout(() => {
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
          }, index * 500);
        });
      }, 1000);
    }
  }, [isPaid, allSelectedImages]);

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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Missing access token</h1>
          <p className="text-gray-600 text-sm">
            This checkout link is invalid or incomplete.
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
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center">
            <FaImages className="mr-3 text-[#2731db]" />
            Photo Checkout
          </h1>
          <p className="text-gray-600 mt-2">
            Select albums and images, make payment, and download your selected photos.
          </p>
        </header>

        {/* Summary / Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
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
              <div>
                <p className="text-sm text-gray-500">Price per photo</p>
                <p className="text-xl font-bold text-[#2731db]">₹{PRICE_PER_IMAGE}</p>
              </div>
            </div>

            {allSelectedImages.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Select albums and images to see payment QR code</p>
              </div>
            )}
          </div>

          {/* QR / Payment Panel */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center justify-center">
            {!showQr || !qrData ? (
              <div className="text-center text-gray-500">
                <FaQrcode className="mx-auto mb-3 text-4xl" />
                <p className="text-sm">Select albums and images to see payment QR code.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <FaQrcode className="mr-2 text-[#2731db]" />
                  Scan to Pay
                </h3>
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`}
                    alt="Payment QR"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center mb-3">
                  Amount: <span className="font-semibold text-green-600">₹{totalAmount}</span> for{' '}
                  <span className="font-semibold">{allSelectedImages.length}</span> photo
                  {allSelectedImages.length !== 1 ? 's' : ''}.
                </p>
                {paymentChecking && !isPaid && (
                  <div className="w-full mt-3 space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                        Waiting for payment confirmation...
                      </p>
                    </div>
                  </div>
                )}
                {isPaid && (
                  <div className="w-full mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center justify-center">
                      <FaCheckCircle className="mr-2" /> Payment confirmed! Downloads unlocked.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Albums List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select Albums & Images</h2>
              <p className="text-sm text-gray-500 mt-1">
                Click albums to select, expand to see images inside.
              </p>
            </div>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors"
              title="Reload page"
            >
              <FaRedoAlt className="text-sm" />
              <span className="text-sm font-medium">Reload</span>
            </button>
          </div>

          {albums.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">No albums available</p>
              <p className="text-sm">Please check the link or contact the photographer.</p>
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
                  isSelected && (albumImages.length > 0) && <div
                    key={album.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      isSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Album Header */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          disabled={true}
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

                    {/* Album Images (shown when expanded) - Only show selected images */}
                    {isExpanded && isSelected  && albumImages.length > 0 && albumImageIds.size > 0 && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">
                            Selected Images
                            <span className="ml-2 text-[#2731db] font-medium">
                              ({albumImageIds.size} of {albumImages.length})
                            </span>
                          </h4>
                          {/* <button
                            onClick={() => selectAllImagesInAlbum(album.id)}
                            className="text-xs text-[#2731db] hover:underline"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button> */}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {albumImages.filter(image => albumImageIds.has(image.id)).map((image) => {
                              const imageUrl = getImageUrl(image);
                              const filename = getImageFilename(image);
                              const fileType = getFileType(image);
                              const canView = imageUrl && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);

                            return (
                              <div
                                key={image.id}
                                className="relative rounded-lg overflow-hidden border border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50 cursor-pointer transition-all"
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
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#2731db] text-white">
                                          <FaCheck className="text-xs" />
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
                                  <p className="text-xs text-gray-500 mt-1">{fileType.toUpperCase()}</p>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">₹{PRICE_PER_IMAGE}</span>
                                    {isPaid && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleDownload(image);
                                        }}
                                        className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicCheckoutPage;
