import React, { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import api from '../../api/client/axiosInstance';
import { FaUpload, FaEye, FaLock, FaTimes, FaCloud, FaUsers, FaUser } from 'react-icons/fa';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { FamilyRelationship } from '../../types/user';

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
  page?: number;
  size?: number;
  totalPages?: number;
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

// Using FamilyRelationship from types/user.ts instead of separate interface

const IMAGES_PAGE_SIZE = 20;

const ImagesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FamilyRelationship | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'invited'>('my');
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const familyRelationships = user?.familyRelationships || [];

  const {
    data: userImagesData,
    isLoading,
    error,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['userImages', selectedUser?.inviterApiToken, viewMode],
    queryFn: async ({ pageParam }) => {
      let token = localStorage.getItem('token');
      if (selectedUser && viewMode === 'invited') {
        token = selectedUser.inviterApiToken;
      }
      const response = await api.get('/api/images/user/all', {
        params: { token, page: pageParam, size: IMAGES_PAGE_SIZE },
      });
      return response.data as UserImagesResponse;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = lastPage?.page ?? 0;
      const totalPages = lastPage?.totalPages ?? 1;
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 2,
    refetchInterval: 30000,
    enabled: !!user && (viewMode === 'my' || (viewMode === 'invited' && !!selectedUser))
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await api.delete(`/api/images/${imageId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success(t('imagesPageRoot.toastDeleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    },
    onError: () => {
      toast.error(t('imagesPageRoot.toastDeleteFailed'));
    }
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return t('imagesPageRoot.sizeZero');
    const k = 1024;
    const sizes = [t('imagesPageRoot.sizeBytes'), t('imagesPageRoot.sizeKb'), t('imagesPageRoot.sizeMb'), t('imagesPageRoot.sizeGb')];
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
    toast.success(t('imagesPageRoot.downloading', { name: image.filename }));
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

  const handleUserSelect = (familyMember: FamilyRelationship) => {
    setSelectedUser(familyMember);
    setViewMode('invited');
  };

  const handleBackToMyFiles = () => {
    setSelectedUser(null);
    setViewMode('my');
  };

  // Infinite scroll: load more when sentinel is visible
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
          <h2 className="text-xl font-semibold text-red-900 mb-2">{t('imagesPageRoot.errorTitle')}</h2>
          <p className="text-red-600 mb-4">{t('imagesPageRoot.errorBody')}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('imagesPageRoot.retry')}
          </button>
        </div>
      </div>
    );
  }

  const images = userImagesData?.pages?.flatMap((p) => (p as UserImagesResponse).images ?? []) ?? [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'my'
                ? t('imagesPageRoot.myFiles')
                : t('imagesPageRoot.theirFiles', {
                    first: selectedUser?.inviterFirstName ?? '',
                    last: selectedUser?.inviterLastName ?? ''
                  })}
            </h1>
            <p className="text-gray-600">
              {viewMode === 'my' ? t('imagesPageRoot.subtitleMy') : t('imagesPageRoot.subtitleInvited')}
            </p>
          </div>
          {viewMode === 'invited' && (
            <button
              onClick={handleBackToMyFiles}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaUser className="h-4 w-4 mr-2" />
              {t('imagesPageRoot.backToMyFiles')}
            </button>
          )}
        </div>
      </div>

      {/* User Selection for Invited Users */}
      {viewMode === 'my' && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaUsers className="h-5 w-5 mr-2 text-blue-600" />
              {t('imagesPageRoot.familyMembers')}
            </h3>
            {familyRelationships.length === 0 ? (
              <div className="text-center py-6">
                <FaUsers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">{t('imagesPageRoot.noFamily')}</p>
                <p className="text-sm text-gray-400">{t('imagesPageRoot.noFamilyHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-red-500">
                {familyRelationships.map((familyMember, index) => (
                  <div
                    key={familyMember.inviterId}
                    onClick={() => handleUserSelect(familyMember)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">
                          {familyMember.inviterFirstName} {familyMember.inviterLastName}
                        </h4>
                        <p className="text-sm text-gray-500">{familyMember.relationshipType}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">{t('imagesPageRoot.usernameLabel')}</span> {familyMember.inviterUsername}
                      </p>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">{t('imagesPageRoot.relationshipLabel')}</span> {familyMember.relationshipNotes}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {familyMember.canViewImages && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('imagesPageRoot.badgeView')}
                          </span>
                        )}
                        {familyMember.canUploadImages && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {t('imagesPageRoot.badgeUpload')}
                          </span>
                        )}
                        {familyMember.canDeleteImages && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {t('imagesPageRoot.badgeDelete')}
                          </span>
                        )}
                        {familyMember.canManageAlbums && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {t('imagesPageRoot.badgeAlbums')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaUpload className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.totalFiles')}</p>
              <p className="text-lg font-semibold text-gray-900">{userImagesData?.pages?.[0]?.totalImages ?? images.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCloud className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.cloudServices')}</p>
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
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.fileTypes')}</p>
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
              <p className="text-sm font-medium text-gray-500">{t('imagesPageRoot.available')}</p>
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {viewMode === 'my' ? t('imagesPageRoot.noFilesMy') : t('imagesPageRoot.noFilesShared')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {viewMode === 'my'
              ? t('imagesPageRoot.uploadHint')
              : t('imagesPageRoot.noFilesTheir', {
                  name: `${selectedUser?.inviterFirstName ?? ''} ${selectedUser?.inviterLastName ?? ''}`.trim()
                })}
          </p>
          {viewMode === 'my' && (
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/upload'}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaUpload className="-ml-1 mr-2 h-4 w-4" />
                {t('imagesPageRoot.uploadFile')}
              </button>
            </div>
          )}
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
                    {t('imagesPageRoot.view')}
                  </button>
                  <button
                    onClick={() => handleDownload(image)}
                    className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <FiDownload className="h-3 w-3 mr-1" />
                    {t('imagesPageRoot.download')}
                  </button>
                  {/* Only show delete button for own files and if user has delete permission */}
                  {viewMode === 'my' && (
                    <button
                      onClick={() => handleDelete(image)}
                      disabled={deleteImageMutation.isPending}
                      className="inline-flex justify-center items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleteImageMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <FiTrash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && <div ref={loadMoreSentinelRef} className="h-4" aria-hidden />}
      {images.length > 0 && isFetchingNextPage && (
        <div className="mt-4 flex justify-center py-4">
          <LoadingSpinner size="md" text={t('imagesPageRoot.loadingMore')} />
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
              <h3 className="text-lg font-medium text-gray-900 mt-4">{t('imagesPageRoot.upgradeTitle')}</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('imagesPageRoot.upgradeBody')}
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
                  {t('imagesPageRoot.viewPlans')}
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="mt-2 px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  {t('imagesPageRoot.cancel')}
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
                {t('imagesPageRoot.fileMeta', {
                  type: selectedImage.fileType.toUpperCase(),
                  date: formatDate(selectedImage.uploadTime)
                })}
              </div>
              
              {/* Cloud Services Info */}
              {Object.keys(selectedImage.enabledServices).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{t('imagesPageRoot.cloudServicesHeading')}</h4>
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
                  {t('imagesPageRoot.download')}
                </button>
                {/* Only show delete button for own files */}
                {viewMode === 'my' && (
                  <button
                    onClick={() => handleDelete(selectedImage)}
                    className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    <FiTrash2 className="-ml-1 mr-2 h-4 w-4" />
                    {t('imagesPageRoot.delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesPage;
