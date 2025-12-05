import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaCopy, FaShare, FaFolder } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface UserImage {
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
}

const PRICE_PER_IMAGE = 1; // base price per photo

const StudioCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showQr, setShowQr] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['studioCheckoutImages'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 1,
  });

  const images = data?.images ?? [];

  // Load selected images from URL params
  useEffect(() => {
    const selectedParam = searchParams.get('selected');
    if (selectedParam) {
      const selectedArray = selectedParam.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedFiles(new Set(selectedArray));
    }
  }, [searchParams]);

  const toggleSelect = (filename: string) => {
    setIsPaid(false);
    setShowQr(false);
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

  const clearSelection = () => {
    setSelectedFiles(new Set());
    setIsPaid(false);
    setShowQr(false);
  };

  const selectedImages = useMemo(
    () => images.filter(img => selectedFiles.has(img.filename)),
    [images, selectedFiles]
  );

  const totalAmount = useMemo(
    () => selectedImages.length * PRICE_PER_IMAGE,
    [selectedImages.length]
  );

  const qrData = useMemo(() => {
    if (!totalAmount || selectedImages.length === 0) return '';
    // Generate a real UPI payment URL that UPI apps can understand
    const params = new URLSearchParams({
      pa: 'rohitrawat9009@ybl', // payee address (your UPI ID)
      pn: 'PhotoStudio',        // payee name
      am: String(totalAmount),  // amount
      cu: 'INR',                // currency
      tn: `PhotoStudio payment for ${selectedImages.length} photo(s)`,
    });
    const upiUrl = `upi://pay?${params.toString()}`;
    return encodeURIComponent(upiUrl);
  }, [selectedImages.length, totalAmount]);

  // Generate public checkout URL for selected images
  const publicCheckoutUrl = useMemo(() => {
    if (selectedImages.length === 0) return '';
    const token = localStorage.getItem('token') || '';
    const selectedFilenames = selectedImages.map(img => img.filename).join(',');
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/checkout?token=${encodeURIComponent(token)}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [selectedImages]);

  // Generate public selection URL (for viewing/selecting)
  const publicSelectionUrl = useMemo(() => {
    if (selectedImages.length === 0) return '';
    const token = localStorage.getItem('token') || '';
    const selectedFilenames = selectedImages.map(img => img.filename).join(',');
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/selection?token=${encodeURIComponent(token)}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [selectedImages]);

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
    if (selectedImages.length === 0) {
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
    toast.success('Payment marked as completed. Starting downloads for selected photos...');

    // Automatically download all selected images
    selectedImages.forEach((image) => {
      const link = document.createElement('a');
      link.href = image.downloadUrl;
      link.download = image.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading images for checkout..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Unable to load images</h1>
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
            <FaImages className="mr-3 text-pink-600" />
            Photo Selection & Payment
          </h1>
          <p className="text-gray-600 mt-2">
            Select images, review the total amount, collect payment via QR, and then allow downloads.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/studio/image-selection"
            className="flex items-center px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 text-sm font-medium"
          >
            <FaFolder className="mr-2" />
            Select from Folders
          </Link>
          <div className="text-right">
            <p className="text-sm text-gray-500">Price per photo</p>
            <p className="text-2xl font-bold text-pink-600">₹{PRICE_PER_IMAGE}</p>
          </div>
        </div>
      </div>

      {/* Summary / Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Selected photos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {selectedImages.length}{' '}
                <span className="text-sm text-gray-500">/ {images.length}</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total amount</p>
              <p className="text-2xl font-semibold text-green-600">
                {totalAmount ? `₹${totalAmount}` : '₹0'}
              </p>
            </div>
          </div>
          
          {/* Public URLs Section */}
          {selectedImages.length > 0 && (
            <div className="space-y-3">
              {/* Checkout URL */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FaQrcode className="text-green-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Public Checkout URL</h4>
                  </div>
                  <button
                    onClick={handleCopyCheckoutUrl}
                    className="flex items-center px-3 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
                    title="Copy Checkout URL"
                  >
                    <FaCopy className="mr-1" /> Copy
                  </button>
                </div>
                <p className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-green-200 font-mono">
                  {publicCheckoutUrl}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Share this URL for payment and download
                </p>
              </div>
              
              {/* Selection URL */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FaShare className="text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Public Selection URL</h4>
                  </div>
                  <button
                    onClick={handleCopySelectionUrl}
                    className="flex items-center px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    title="Copy Selection URL"
                  >
                    <FaCopy className="mr-1" /> Copy
                  </button>
                </div>
                <p className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-blue-200 font-mono">
                  {publicSelectionUrl}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Share this URL to view and select photos in folders
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={clearSelection}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
            >
              Clear
            </button>
            <button
              onClick={handleGenerateQr}
              className="flex items-center px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 text-sm font-semibold"
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
              <p className="text-sm">Generate a QR code after selecting photos.</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <FaQrcode className="mr-2 text-pink-600" />
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
                <span className="font-semibold">{selectedImages.length}</span> photo
                {selectedImages.length !== 1 ? 's' : ''}.
              </p>
              {isPaid && (
                <p className="mt-2 text-xs text-green-600 flex items-center">
                  <FaCheckCircle className="mr-1" /> Payment marked as completed.
                </p>
              )}

              {isPaid && selectedImages.length > 0 && (
                <div className="mt-3 w-full">
                  <h4 className="text-xs font-semibold text-gray-700 mb-1">
                    Public download links (selected photos)
                  </h4>
                  <div className="max-h-24 overflow-y-auto text-xs space-y-1">
                    {selectedImages.map((img) => (
                      <a
                        key={img.filename}
                        href={img.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-600 hover:underline break-all"
                      >
                        {img.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Images Grid */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Select Photos</h2>
          <p className="text-sm text-gray-500">
            Click on a card or checkbox to select / unselect images for this payment.
          </p>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No images available. Upload photos first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {images.map((image, index) => {
              const isSelected = selectedFiles.has(image.filename);
              // Use downloadUrl or create unique key with index to avoid duplicate keys
              const uniqueKey = image.downloadUrl || `${image.filename}-${index}`;
              return (
                <div
                  key={uniqueKey}
                  className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                    isSelected ? 'border-pink-500 ring-2 ring-pink-300' : 'border-gray-200'
                  }`}
                  onClick={() => toggleSelect(image.filename)}
                >
                  <div className="h-44 bg-gray-100 overflow-hidden">
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
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(image.filename)}
                      className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500 bg-white"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>

                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-gray-900 truncate" title={image.filename}>
                      {image.filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{image.fileType.toUpperCase()}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">₹{PRICE_PER_IMAGE} / photo</span>
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
  );
};

export default StudioCheckout;


