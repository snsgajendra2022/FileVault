import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaExclamationTriangle, FaFolder, FaFolderOpen, FaChevronRight, FaCheck, FaRedoAlt, FaTimes, FaUpload, FaFileImage } from 'react-icons/fa';
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

const PRICE_PER_IMAGE = 0;

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [email, setEmail] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [downloadCodeData, setDownloadCodeData] = useState<any>(null);
  const [loadingDownloadCode, setLoadingDownloadCode] = useState(false);
  const autoSelectedRef = useRef(false);

  const token = searchParams.get('token') || '';
  const filesParam = searchParams.get('files') || '';
  const downloadCode = searchParams.get('code') || '';

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

  const albums:any = useMemo(() => {
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

  // Fetch UPI settings for default perPhotoPrice
  const { data: upiSettings } = useQuery({
    queryKey: ['upiSettings'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/upi');
        return response.data as { upiId: string; perPhotoPrice: number };
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: 1,
  });

  const defaultPerPhotoPrice = upiSettings?.perPhotoPrice || PRICE_PER_IMAGE;

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
          : (defaultPerPhotoPrice > 0 ? defaultPerPhotoPrice : PRICE_PER_IMAGE);
        total += albumImageIds.size * imagePrice;
      }
    });
    
    return total;
  }, [selectedAlbums, selectedImages, albums, defaultPerPhotoPrice]);

  const toggleAlbum = (albumId: number) => {
    setIsPaid(false);
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
        if (album && album.images && album.images.length > 0) {
          setSelectedImages(prevImgs => {
            const nextImgs = new Map(prevImgs);
            const allImageIds = new Set<number>(album.images!.map(img => img.id));
            nextImgs.set(albumId, allImageIds);
            return nextImgs;
          });
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
      next.set(albumId, allImageIds as Set<number>);
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

  // Fetch download code data if code is present in URL
  const fetchDownloadCode = async () => {
    if (downloadCode && !downloadCodeData && !loadingDownloadCode) {
      setLoadingDownloadCode(true);
      setShowQr(false); // Hide QR immediately when download code is detected
      try {
        const response = await api.get(`/api/payments/download/${downloadCode}`);
        console.log('Download code data:', response);
        setDownloadCodeData(response.data);
        setIsPaid(true);
        setShowQr(false); // Ensure QR is hidden when download code is verified
        toast.success('Download code verified! You can now download your images.');
      } catch (error: any) {
        console.error('Error fetching download code:', error);
        const errorMessage = error.response?.data?.message || 'Invalid or expired download code';
        toast.error(errorMessage);
        setDownloadCodeData(null);
        setIsPaid(false);
        // Don't show QR even if download code fails
        setShowQr(false);
      } finally {
        setLoadingDownloadCode(false);
      }
    }
  };

  useEffect(() => {
    if (downloadCode) {
      fetchDownloadCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadCode]);

  // Auto-select images from download code after albums are loaded
  useEffect(() => {
    if (downloadCodeData && albums.length > 0) {
      const imageIds = downloadCodeData.imageIds || downloadCodeData.images?.map((img: any) => img.id) || [];
      if (imageIds.length > 0) {
        const albumIds = new Set<number>();
        const selectedImagesMap = new Map<number, Set<number>>();
        
        // Find which albums contain these images
        albums.forEach(album => {
          if (album.images) {
            const albumImageIds = new Set<number>();
            album.images.forEach(image => {
              if (imageIds.includes(image.id)) {
                albumImageIds.add(image.id);
                albumIds.add(album.id);
              }
            });
            if (albumImageIds.size > 0) {
              selectedImagesMap.set(album.id, albumImageIds);
              setExpandedAlbums(prev => new Set(prev).add(album.id));
            }
          }
        });
        
        if (albumIds.size > 0) {
          setSelectedAlbums(albumIds);
          setSelectedImages(selectedImagesMap);
        }
      }
    }
  }, [downloadCodeData, albums]);

  // Auto-select albums and images based on filenames from URL (only once when albums load)
  useEffect(() => {
    if (albums.length === 0 || targetFilenames.length === 0) return;
    // Only auto-select once (prevents overriding user selections)
    if (autoSelectedRef.current) return;
    // Don't auto-select if download code is being processed
    if (downloadCode && loadingDownloadCode) return;

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
      pn: 'PhotoStudio',
      am: String(totalAmount),
      cu: 'INR',
      tn: `PhotoStudio payment for ${allSelectedImages.length} photo(s)`,
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

  // Auto-show QR when images are selected (but not if download code is present)
  useEffect(() => {
    // Don't show QR if download code is present or being processed
    if (downloadCode || loadingDownloadCode || downloadCodeData) {
      setShowQr(false);
      return;
    }
    
    if (allSelectedImages.length > 0 && totalAmount > 0) {
      setShowQr(true);
      setIsPaid(false);
    } else {
      setShowQr(false);
      setIsPaid(false);
      setTransactionId('');
    }
  }, [allSelectedImages.length, totalAmount, downloadCode, loadingDownloadCode, downloadCodeData]);

  // const checkPaymentStatus = async (amount: number, imageCount: number): Promise<boolean> => {
  //   try {
  //     if (!transactionId) return false;

  //     try {
  //       const verifyResponse = await api.post('/api/payment/verify', {
  //         amount,
  //         imageCount,
  //         token,
  //         transactionId
  //       });
        
  //       console.log('Payment verify response:', verifyResponse.data);
        
  //       if (verifyResponse.data && verifyResponse.data.paid === true) {
  //         const storedData = localStorage.getItem(`payment_${transactionId}`);
  //         if (storedData) {
  //           const transactionData = JSON.parse(storedData);
  //           transactionData.status = 'paid';
  //           transactionData.paidAt = Date.now();
  //           localStorage.setItem(`payment_${transactionId}`, JSON.stringify(transactionData));
  //         }
  //         return true;
  //       }
  //     } catch (apiError: any) {
  //       if (apiError.response?.status !== 404) {
  //         console.error('Payment verification API error:', apiError);
  //         console.error('Error details:', apiError.response?.data || apiError.message);
  //       }
  //     }

  //     const storedData = localStorage.getItem(`payment_${transactionId}`);
  //     if (storedData) {
  //       const transactionData = JSON.parse(storedData);
  //       if (transactionData.status === 'paid') {
  //         return true;
  //       }
  //     }

  //     const urlParams = new URLSearchParams(window.location.search);
  //     const paymentConfirmed = urlParams.get('payment_confirmed');
  //     if (paymentConfirmed === 'true' && urlParams.get('txn_id') === transactionId) {
  //       const storedData = localStorage.getItem(`payment_${transactionId}`);
  //       if (storedData) {
  //         const transactionData = JSON.parse(storedData);
  //         transactionData.status = 'paid';
  //         transactionData.paidAt = Date.now();
  //         localStorage.setItem(`payment_${transactionId}`, JSON.stringify(transactionData));
  //       }
  //       return true;
  //     }

  //     return false;
  //   } catch (error) {
  //     console.error('Payment verification error:', error);
  //     return false;
  //   }
  // };

  // Auto-detect payment success
  useEffect(() => {
    if (showQr && qrData && !isPaid && allSelectedImages.length > 0 && totalAmount > 0 && transactionId) {
      setPaymentChecking(true);
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

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setPaymentScreenshot(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!utrNumber.trim()) {
      toast.error('Please enter UTR number');
      return;
    }

    if (!email) {
      toast.error('Please enter email address');
      return;
    }

    if (allSelectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setSubmittingPayment(true);

    try {
      // Determine purchase type
      let purchaseType = 'INDIVIDUAL_IMAGES';
      let albumId: string | undefined;
      let imageIds: string | undefined;
      
      // Check if all images from one album are selected
      if (selectedAlbums.size === 1) {
        const albumIdNum = Array.from(selectedAlbums)[0];
        const album = albums.find(a => a.id === albumIdNum);
        if (album) {
          albumId = String(albumIdNum); // Always set albumId for single album selection
          const albumImageIds = selectedImages.get(albumIdNum) || new Set();
          
          // If all images in album are selected, use FULL_ALBUM
          if (album.images && albumImageIds.size === album.images.length) {
            purchaseType = 'FULL_ALBUM';
            console.log('FULL_ALBUM purchase - albumId:', albumId);
          } else {
            // Individual images from one album - send both albumId and imageIds
            purchaseType = 'INDIVIDUAL_IMAGES';
            imageIds = Array.from(albumImageIds).join(',');
            console.log('INDIVIDUAL_IMAGES purchase - albumId:', albumId, 'imageIds:', imageIds);
          }
        }
      } else if (selectedAlbums.size > 1) {
        // Multiple albums - collect all image IDs
        const allImageIds: number[] = [];
        selectedAlbums.forEach(albumIdNum => {
          const albumImageIds = selectedImages.get(albumIdNum) || new Set();
          allImageIds.push(...Array.from(albumImageIds));
        });
        imageIds = allImageIds.join(',');
        console.log('Multiple albums - imageIds:', imageIds);
        // For multiple albums, we could send the first albumId or leave it undefined
        // If you want to send the first album's ID:
        const firstAlbumId = Array.from(selectedAlbums)[0];
        albumId = String(firstAlbumId);
        console.log('Multiple albums - first albumId:', albumId);
      }

      // Create FormData for multipart/form-data
      const formData = new FormData();
      if (paymentScreenshot) {
        formData.append('paymentScreenshot', paymentScreenshot);
      }
      formData.append('utrNumber', utrNumber.trim());
      formData.append('purchaseType', purchaseType);
      formData.append('otpEmail', email.trim());
      
      // Always append albumId if it exists (send both albumId and imageIds when available)
      if (albumId) {
        formData.append('albumId', albumId);
        console.log('✅ albumId appended:', albumId);
      } else {
        // Fallback: try to get albumId from selectedAlbums
        if (selectedAlbums.size > 0) {
          const selectedAlbumId = Array.from(selectedAlbums)[0];
          if (selectedAlbumId) {
            albumId = String(selectedAlbumId);
            formData.append('albumId', albumId);
            console.log('✅ albumId appended (from selectedAlbums fallback):', albumId);
          }
        }
      }
      
      // Always append imageIds if they exist (send both for better tracking)
      if (imageIds) {
        formData.append('imageIds', imageIds);
        console.log('✅ imageIds appended:', imageIds);
      } else if (purchaseType === 'FULL_ALBUM' && albumId) {
        // For FULL_ALBUM, also include imageIds for reference
        const albumIdNum = parseInt(albumId);
        const album = albums.find(a => a.id === albumIdNum);
        if (album && album.images) {
          const allImageIds = album.images.map(img => img.id).join(',');
          formData.append('imageIds', allImageIds);
          console.log('✅ imageIds appended (all album images for FULL_ALBUM):', allImageIds);
        }
      }
      
      // Validation: FULL_ALBUM must have albumId
      if (purchaseType === 'FULL_ALBUM' && !albumId) {
        console.error('❌ FULL_ALBUM purchase but albumId is missing!');
        toast.error('Error: Album ID is required for full album purchase');
        setSubmittingPayment(false);
        return;
      }
      
      // Validation: INDIVIDUAL_IMAGES should have imageIds
      if (purchaseType === 'INDIVIDUAL_IMAGES' && !imageIds) {
        console.error('❌ INDIVIDUAL_IMAGES purchase but imageIds is missing!');
        toast.error('Error: Image IDs are required for individual image purchase');
        setSubmittingPayment(false);
        return;
      }
      
      formData.append('totalAmount', String(totalAmount));
      formData.append('callbackUrl', window.location.href);
      
      // Debug: Log payment submission details
      console.log('📤 Payment submission details:', {
        purchaseType,
        albumId: albumId || 'none',
        imageIds: purchaseType === 'FULL_ALBUM' ? 'not sent (using albumId)' : (imageIds || 'none'),
        totalAmount,
        utrNumber: utrNumber.trim(),
        otpEmail: email.trim()
      });

      // Get auth token from localStorage or use token from URL
      const authToken = localStorage.getItem('token') || token;
      
      const response = await api.post('/api/payments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      console.log('Payment submitted for approval:', response.data);
      toast.success('Payment details submitted for approval! We will review and confirm your payment shortly.');
      
      // Close modal and reset form
      setShowPaymentModal(false);
      setUtrNumber('');
      setPaymentScreenshot(null);
      setScreenshotPreview(null);
      
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit payment';
      toast.error(errorMessage);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCloseModal = () => {
    if (!submittingPayment) {
      setShowPaymentModal(false);
      setUtrNumber('');
      setPaymentScreenshot(null);
      setScreenshotPreview(null);
    }
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
                <p className="text-sm text-gray-500">Pricing</p>
                <p className="text-sm font-medium text-[#2731db]">
                  {(() => {
                    // Check if any album has all images selected with perAlbumPrice
                    let hasFullAlbum = false;
                    let albumPrice = 0;
                    
                    selectedAlbums.forEach(albumId => {
                      const album = albums.find(a => a.id === albumId);
                      if (album) {
                        const albumImageIds = selectedImages.get(albumId) || new Set();
                        const albumImages = album.images || [];
                        const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
                        if (allSelected && album.perAlbumPrice && album.perAlbumPrice > 0) {
                          hasFullAlbum = true;
                          albumPrice = album.perAlbumPrice;
                        }
                      }
                    });
                    
                    if (hasFullAlbum) {
                      return `₹${albumPrice} per album`;
                    }
                    
                    // Check for perPhotoPrice from albums
                    let photoPrice = 0;
                    selectedAlbums.forEach(albumId => {
                      const album = albums.find(a => a.id === albumId);
                      if (album && album.perPhotoPrice && album.perPhotoPrice > 0) {
                        photoPrice = album.perPhotoPrice;
                      }
                    });
                    
                    if (photoPrice > 0) {
                      return `₹${photoPrice} per image`;
                    }
                    
                    // Fallback to UPI settings or default
                    const priceToShow = defaultPerPhotoPrice > 0 ? defaultPerPhotoPrice : PRICE_PER_IMAGE;
                    return priceToShow > 0 ? `₹${priceToShow} per image` : 'Free';
                  })()}
                </p>
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
            {downloadCode || loadingDownloadCode || downloadCodeData ? (
              // Don't show QR when download code is present
              loadingDownloadCode ? (
                <div className="text-center text-gray-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2731db] border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm">Verifying download code...</p>
                </div>
              ) : downloadCodeData && isPaid ? (
              <div className="text-center w-full">
                <FaCheckCircle className="mx-auto mb-3 text-5xl text-green-600" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Payment Confirmed!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your download code has been verified. You can now download your images.
                </p>
                {downloadCodeData.downloadCode && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Download Code</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{downloadCodeData.downloadCode}</p>
                  </div>
                )}
                <div className="w-full mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center justify-center">
                    <FaCheckCircle className="mr-2" /> Downloads unlocked - Click images to download
                  </p>
                </div>
              </div>
              ) : (
                <div className="text-center text-gray-500">
                  <FaQrcode className="mx-auto mb-3 text-4xl" />
                  <p className="text-sm">Processing download code...</p>
                </div>
              )
            ) : !showQr || !qrData ? (
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
                {!isPaid && allSelectedImages.length > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Submit Payment for Approval
                  </button>
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
                  isSelected && <div
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
                            {album.perAlbumPrice && album.perAlbumPrice > 0 && (
                              <span className="text-green-600 font-semibold">
                                ₹{album.perAlbumPrice} per album
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
                            {isSelected ? 'Selected Images (Full Album)' : 'Album Images'}
                            {isSelected && albumImageIds.size > 0 && (
                              <span className="ml-2 text-[#2731db] font-medium">
                                ({albumImageIds.size} of {albumImages.length} selected)
                              </span>
                            )}
                          </h4>
                          {  !isPaid && isSelected && !allSelected && (
                            <button
                              onClick={() => selectAllImagesInAlbum(album.id)}
                              className="text-xs text-[#2731db] hover:underline"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {albumImages.map((image) => {
                              const isImageSelected = albumImageIds.has(image.id);
                              const imageUrl = getImageUrl(image);
                              const filename = getImageFilename(image);
                              const fileType = getFileType(image);
                              const canView = imageUrl && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                              
                              // Calculate price for this image
                              const imagePrice = album.perPhotoPrice && album.perPhotoPrice > 0
                                ? album.perPhotoPrice
                                : (defaultPerPhotoPrice > 0 ? defaultPerPhotoPrice : PRICE_PER_IMAGE);
                              
                              // Check if all images in album are selected
                              const allImagesSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;

                            return (
                              <>
                             {isImageSelected && <div
                                key={image.id}
                                className={`relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                  isImageSelected
                                    ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => {
                                  // Always toggle image selection, album checkbox is independent
                                  if (!isSelected) {
                                    // Select album first if not selected
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
                            { isImageSelected && <div className="aspect-square bg-gray-100 overflow-hidden relative">
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
                                </div>}

                                <div className="p-2 bg-white">
                                  <p className="text-xs text-gray-900 truncate" title={filename}>
                                    {filename}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">{fileType.toUpperCase()}</p>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                      {allImagesSelected && album.perAlbumPrice && album.perAlbumPrice > 0
                                        ? `₹${album.perAlbumPrice} (album)`
                                        : imagePrice > 0 ? `₹${imagePrice}` : 'Free'}
                                    </span>
                                    {(isPaid || downloadCodeData) && (
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
                              </div>}
                              </>
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

        {/* Payment Verification Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FaQrcode className="mr-2 text-[#2731db]" />
                  Submit Payment for Approval
                </h2>
                <button
                  onClick={handleCloseModal}
                  disabled={submittingPayment}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Payment Summary</p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-medium">
                      {allSelectedImages.length} photo{allSelectedImages.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-lg font-bold text-green-600">₹{totalAmount}</span>
                  </div>
                </div>

                {/* UTR Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UTR Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter UTR/Transaction ID"
                    disabled={submittingPayment}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the UTR number from your payment receipt
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email Address"
                    disabled={submittingPayment}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your email address to receive the download code after payment approval
                  </p>
                </div>

                {/* Payment Screenshot Upload */}
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Screenshot
                  </label>
                  <div className="space-y-3">
                    {screenshotPreview ? (
                      <div className="relative">
                        <img
                          src={screenshotPreview}
                          alt="Payment screenshot preview"
                          className="w-full h-48 object-contain border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentScreenshot(null);
                            setScreenshotPreview(null);
                          }}
                          disabled={submittingPayment}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FaUpload className="text-3xl text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          disabled={submittingPayment}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div> */}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 mb-2">
                    <strong>Note:</strong> Please ensure the email address is correct and the payment approval email is received.
                  </p>
                  <p className="text-xs text-blue-700">
                    <strong>Approval Process:</strong> Your payment details will be reviewed and approved. You will be notified once the payment is confirmed.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  disabled={submittingPayment}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPayment}
                  // disabled={submittingPayment || !utrNumber.trim() || !paymentScreenshot}
                  className="px-4 py-2 bg-[#2731db] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submittingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Submitting for Approval...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="mr-1" />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCheckoutPage;
