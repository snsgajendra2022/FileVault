import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FaUpload, FaEye, FaLock, FaTimes, FaCloud } from 'react-icons/fa';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

// API Response Interfaces
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

interface Image {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  thumbnail?: string;
}

const ImagesPage = () => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Fetch user images from API
  const { data: userImagesData, isLoading, error, refetch } = useQuery({
          queryKey: ['userImages'],
      queryFn: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get(`/api/images/user/all?token=${token}`);
        return response.data as UserImagesResponse;
      },
    retry: 2,
    refetchInterval: 30000,
    enabled: !!user // Only fetch if user is authenticated
  });

  // Delete image mutation
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
    }
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (image: UserImage) => {
    // Check if user has access to download
    if (user?.accountType === 'FREE') {
      setShowUpgradeModal(true);
      return;
    }
    
    // Download using the API URL
    toast.success(`Downloading ${image.filename}...`);
    const link = document.createElement('a');
    link.href = image.downloadUrl;
    link.download = image.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (image: UserImage) => {
    if (user?.accountType === 'FREE') {
      setShowUpgradeModal(true);
      return;
    }
    
    // Extract image ID from the URL
    const imageId = image.downloadUrl.split('/').pop()?.split('?')[0];
    if (imageId) {
      deleteImageMutation.mutate(imageId);
    }
  };

  const handleView = (image: UserImage) => {
    setSelectedImage(image);
  };

  const getFileTypeIcon = (fileType: string) => {
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
  };

  const getFileTypeColor = (fileType: string) => {
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
  };

  const getEnabledServicesCount = (enabledServices: { [key: string]: string }) => {
    return Object.keys(enabledServices).length;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Images</h2>
          <p className="text-red-600 mb-4">Failed to load your images. Please try again later.</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const images = userImagesData?.images || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Files</h1>
        <p className="text-gray-600">Manage and view your uploaded files</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaUpload className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Files</p>
              <p className="text-lg font-semibold text-gray-900">{userImagesData?.totalImages || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
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
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FaEye className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">File Types</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Set(images.map(img => img.fileType)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiDownload className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="text-lg font-semibold text-gray-900">
                {images.filter(img => Object.keys(img.enabledServices).length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <FaUpload className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No files uploaded</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading your first file.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.location.href = '/upload'}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <FaUpload className="-ml-1 mr-2 h-4 w-4" />
              Upload File
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* File Preview */}
              <div className="relative h-48 bg-gray-100">
                {image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
                  <img
                    src={image.previewUrl}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center ${image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? 'hidden' : ''}`}>
                  <div className={`${getFileTypeColor(image.fileType)} text-white rounded-lg p-4 text-4xl`}>
                    {getFileTypeIcon(image.fileType)}
                  </div>
                </div>
                
                {/* File Type Badge */}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-white">
                    {image.fileType.toUpperCase()}
                  </span>
                </div>

                {/* Cloud Services Badge */}
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaCloud className="h-3 w-3 mr-1" />
                    {getEnabledServicesCount(image.enabledServices)}
                  </span>
                </div>

                {user?.accountType === 'FREE' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <FaLock className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 truncate" title={image.filename}>
                  {image.filename}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(image.uploadTime)}
                </p>

                {/* Cloud Services Info */}
                {Object.keys(image.enabledServices).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(image.enabledServices).map(([service, status]) => (
                      <span
                        key={service}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => handleView(image)}
                    className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <FaEye className="h-3 w-3 mr-1" />
                    View
                  </button>
                                      <button
                      onClick={() => handleDownload(image)}
                      className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <FiDownload className="h-3 w-3 mr-1" />
                      Download
                    </button>
                  {/* <button
                    onClick={() => handleDelete(image)}
                    disabled={deleteImageMutation.isPending}
                    className="inline-flex justify-center items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                                         {deleteImageMutation.isPending ? (
                       <LoadingSpinner size="sm" />
                     ) : (
                       <FiTrash2 className="h-3 w-3" />
                     )}
                  </button> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <FaLock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Upgrade Required</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  This feature is only available for premium plans. Upgrade your plan to access advanced features.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                     navigate('/plans');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  View Plans
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="mt-2 px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{selectedImage.filename}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <div className="text-center">
              {selectedImage.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
                <img
                  src={selectedImage.previewUrl}
                  alt={selectedImage.filename}
                  className="max-w-full max-h-96 mx-auto rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <div className={`${getFileTypeColor(selectedImage.fileType)} text-white rounded-lg p-8 text-6xl`}>
                    {getFileTypeIcon(selectedImage.fileType)}
                  </div>
                </div>
              )}
              <div className="mt-4 text-sm text-gray-500">
                File Type: {selectedImage.fileType.toUpperCase()} • Uploaded: {formatDate(selectedImage.uploadTime)}
              </div>
              
              {/* Cloud Services Info */}
              {Object.keys(selectedImage.enabledServices).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Cloud Services:</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(selectedImage.enabledServices).map(([service, status]) => (
                      <span
                        key={service}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        <FaCloud className="h-3 w-3 mr-1" />
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-center space-x-4">
                                 <button
                   onClick={() => handleDownload(selectedImage)}
                   className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                 >
                   <FiDownload className="-ml-1 mr-2 h-4 w-4" />
                   Download
                 </button>
                 {/* <button
                   onClick={() => handleDelete(selectedImage)}
                   className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                 >
                   <FiTrash2 className="-ml-1 mr-2 h-4 w-4" />
                   Delete
                 </button> */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesPage;
