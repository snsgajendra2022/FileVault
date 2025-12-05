import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaExclamationTriangle } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface UserImage {
  previewUrl: string;
  filename: string;
  downloadUrl: string;
  uploadTime?: string;
  fileType: string;
}

interface UserImagesResponse {
  totalImages: number;
  images: UserImage[];
}

const PRICE_PER_IMAGE = 1; // base price per photo

const PublicCheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showQr, setShowQr] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');

  const token = searchParams.get('token') || '';
  const selectedParam = searchParams.get('files') || searchParams.get('images') || '';

  const selectedKeys = useMemo(() => {
    if (!selectedParam) return new Set<string>();
    return new Set(
      selectedParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }, [selectedParam]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicCheckoutImages', token],
    enabled: !!token,
    queryFn: async () => {
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 1,
  });

  const allImages = data?.images ?? [];

  // Filter images based on selected keys
  const availableImages = useMemo(() => {
    if (selectedKeys.size === 0) {
      return allImages;
    }
    return allImages.filter((img) => {
      if (selectedKeys.has(img.filename)) return true;
      if (img.downloadUrl && selectedKeys.has(img.downloadUrl)) return true;
      const keysArray = Array.from(selectedKeys);
      for (const key of keysArray) {
        if (img.filename.includes(key) || (img.downloadUrl && img.downloadUrl.includes(key))) {
          return true;
        }
      }
      return false;
    });
  }, [allImages, selectedKeys]);

  // Initialize selected files from URL params
  useEffect(() => {
    if (selectedParam) {
      const selectedArray = selectedParam.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedFiles(new Set(selectedArray));
    }
  }, [selectedParam]);

  const toggleSelect = (filename: string) => {
    setIsPaid(false);
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const selectedImages = useMemo(
    () => availableImages.filter(img => selectedFiles.has(img.filename)),
    [availableImages, selectedFiles]
  );

  const totalAmount = useMemo(
    () => selectedImages.length * PRICE_PER_IMAGE,
    [selectedImages.length]
  );

  const qrData = useMemo(() => {
    if (!totalAmount || selectedImages.length === 0) return '';
    const params = new URLSearchParams({
      pa: 'rohitrawat9009@ybl',
      pn: 'PhotoStudio',
      am: String(totalAmount),
      cu: 'INR',
      tn: `PhotoStudio payment for ${selectedImages.length} photo(s)`,
    });
    const upiUrl = `upi://pay?${params.toString()}`;
    return encodeURIComponent(upiUrl);
  }, [selectedImages.length, totalAmount]);

  // Generate transaction ID when QR is shown
  useEffect(() => {
    if (selectedImages.length > 0 && totalAmount > 0 && !transactionId) {
      const txId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setTransactionId(txId);
      
      // Store transaction details in localStorage for verification
      const transactionData = {
        transactionId: txId,
        amount: totalAmount,
        imageCount: selectedImages.length,
        selectedFiles: Array.from(selectedFiles),
        token,
        timestamp: Date.now(),
        status: 'pending'
      };
      localStorage.setItem(`payment_${txId}`, JSON.stringify(transactionData));
    }
  }, [selectedImages.length, totalAmount, transactionId, selectedFiles, token]);

  // Auto-show QR when images are selected
  useEffect(() => {
    if (selectedImages.length > 0 && totalAmount > 0) {
      setShowQr(true);
      setIsPaid(false);
    } else {
      setShowQr(false);
      setIsPaid(false);
      setTransactionId('');
    }
  }, [selectedImages.length, totalAmount]);

  // Function to verify payment
  const checkPaymentStatus = async (amount: number, imageCount: number): Promise<boolean> => {
    try {
      if (!transactionId) return false;

      // Try to verify via backend API first
      try {
        const response = await api.post('/api/payment/verify', {
          amount,
          imageCount,
          token,
          selectedFiles: Array.from(selectedFiles),
          transactionId
        });
        console.log('response', response);
        
        if (response.data && response.data.paid === true) {
          // Update localStorage
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
        // If API endpoint doesn't exist, fall back to localStorage check
        if (apiError.response?.status !== 404) {
          console.error('Payment verification API error:', apiError);
        }
      }

      // Fallback: Check localStorage for manual payment confirmation
      // This allows manual marking of payment (for testing or manual verification)
      const storedData = localStorage.getItem(`payment_${transactionId}`);
      if (storedData) {
        const transactionData = JSON.parse(storedData);
        if (transactionData.status === 'paid') {
          return true;
        }
      }

      // Check if payment was manually confirmed via URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const paymentConfirmed = urlParams.get('payment_confirmed');
      if (paymentConfirmed === 'true' && urlParams.get('txn_id') === transactionId) {
        // Mark as paid in localStorage
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

  // Auto-detect payment success - Polling mechanism
  useEffect(() => {
    if (showQr && qrData && !isPaid && selectedImages.length > 0 && totalAmount > 0 && transactionId) {
      setPaymentChecking(true);
      
      // Poll for payment status every 2 seconds (more frequent for better UX)
      const paymentCheckInterval = setInterval(async () => {
        try {
          const paymentConfirmed = await checkPaymentStatus(totalAmount, selectedImages.length);
          
          if (paymentConfirmed) {
            setIsPaid(true);
            setPaymentChecking(false);
            clearInterval(paymentCheckInterval);
            toast.success('Payment detected! Unlocking downloads...');
          }
        } catch (error) {
          console.error('Payment check error:', error);
        }
      }, 2000); // Check every 2 seconds

      // Auto-stop checking after 15 minutes
      const timeout = setTimeout(() => {
        clearInterval(paymentCheckInterval);
        setPaymentChecking(false);
        if (!isPaid) {
          toast.error('Payment verification timeout. Please refresh and try again.');
        }
      }, 900000); // 15 minutes

      return () => {
        clearInterval(paymentCheckInterval);
        clearTimeout(timeout);
        setPaymentChecking(false);
      };
    }
  }, [showQr, qrData, isPaid, selectedImages.length, totalAmount, transactionId]);

  // Auto-unlock downloads when payment is confirmed
  useEffect(() => {
    if (isPaid && selectedImages.length > 0) {
      toast.success('Payment confirmed! Downloads unlocked.');
      
      // Automatically download all selected images after a short delay
      setTimeout(() => {
        selectedImages.forEach((image, index) => {
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = image.downloadUrl;
            link.download = image.filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }, index * 500); // Stagger downloads by 500ms
        });
      }, 1000);
    }
  }, [isPaid, selectedImages]);

  const handleDownload = (image: UserImage) => {
    if (!isPaid) {
      toast.error('Please complete payment before downloading');
      return;
    }

    const link = document.createElement('a');
    link.href = image.downloadUrl;
    link.download = image.filename;
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
        <LoadingSpinner size="lg" text="Loading images..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to load images</h1>
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
            Select photos, make payment, and download your selected images.
          </p>
        </header>

        {/* Summary / Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selected photos</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {selectedImages.length}{' '}
                  <span className="text-sm text-gray-500">/ {availableImages.length}</span>
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

            {selectedImages.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Select photos to see payment QR code</p>
              </div>
            )}
          </div>

          {/* QR / Payment Panel */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center justify-center">
            {!showQr || !qrData ? (
              <div className="text-center text-gray-500">
                <FaQrcode className="mx-auto mb-3 text-4xl" />
                <p className="text-sm">Select photos to see payment QR code.</p>
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
                  <span className="font-semibold">{selectedImages.length}</span> photo
                  {selectedImages.length !== 1 ? 's' : ''}.
                </p>
                {paymentChecking && !isPaid && (
                  <div className="w-full mt-3 space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                        Waiting for payment confirmation...
                      </p>
                    </div>
                    {/* <button
                      onClick={() => {
                        // Manual payment confirmation
                        if (transactionId) {
                          const storedData = localStorage.getItem(`payment_${transactionId}`);
                          if (storedData) {
                            const transactionData = JSON.parse(storedData);
                            transactionData.status = 'paid';
                            transactionData.paidAt = Date.now();
                            transactionData.manualConfirmation = true;
                            localStorage.setItem(`payment_${transactionId}`, JSON.stringify(transactionData));
                            setIsPaid(true);
                            setPaymentChecking(false);
                            toast.success('Payment confirmed manually!');
                          }
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold transition-colors flex items-center justify-center text-sm"
                    >
                      <FaCheckCircle className="mr-2" />
                      I've Paid - Confirm Payment
                    </button> */}
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

        {/* Images Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Photos</h2>
            <p className="text-sm text-gray-500">
              Click on images to select/deselect for payment.
            </p>
          </div>

          {availableImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">No images available</p>
              <p className="text-sm">Please check the link or contact the photographer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {availableImages.map((image, index) => {
                const isSelected = selectedFiles.has(image.filename);
                const uniqueKey = image.downloadUrl || `${image.filename}-${index}`;
                return (
                  <div
                    key={uniqueKey}
                    className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                      isSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                    }`}
                    onClick={() => toggleSelect(image.filename)}
                  >
                    <div className="h-48 bg-gray-100 overflow-hidden">
                      {image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
                        <img
                          src={image.previewUrl}
                          alt={image.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                          {image.fileType.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="absolute top-2 left-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#2731db] text-white'
                            : 'bg-white bg-opacity-80 border-2 border-gray-300'
                        }`}
                      >
                        {isSelected && <FaCheckCircle className="text-xs" />}
                      </div>
                    </div>

                    <div className="p-3 bg-white">
                      <p className="text-sm font-medium text-gray-900 truncate" title={image.filename}>
                        {image.filename.split('/').pop() || image.filename}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{image.fileType.toUpperCase()}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">₹{PRICE_PER_IMAGE}</span>
                        {isPaid && isSelected && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicCheckoutPage;

