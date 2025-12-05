import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaImages, FaDownload, FaExclamationTriangle, FaFolder, FaFolderOpen, FaChevronRight, FaCheckCircle, FaCheck, FaCopy, FaShare } from 'react-icons/fa';
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

interface FolderGroup {
  folderName: string;
  images: UserImage[];
}

const PublicSelectionPage: React.FC = () => {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [userSelectedImages, setUserSelectedImages] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get('token') || '';

  // Comma separated list of filenames or URLs for selected images
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
    queryKey: ['publicSelectionImages', token],
    enabled: !!token,
    queryFn: async () => {
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 1,
  });

  const allImages = data?.images ?? [];

  const selectedImages = useMemo(() => {
    if (selectedKeys.size === 0) {
      return [] as UserImage[];
    }

    return allImages.filter((img) => {
      // Match either by filename or by downloadUrl
      if (selectedKeys.has(img.filename)) return true;
      if (img.downloadUrl && selectedKeys.has(img.downloadUrl)) return true;
      // Also check if filename or downloadUrl contains any of the selected keys
      const keysArray = Array.from(selectedKeys);
      for (const key of keysArray) {
        if (img.filename.includes(key) || (img.downloadUrl && img.downloadUrl.includes(key))) {
          return true;
        }
      }
      return false;
    });
  }, [allImages, selectedKeys]);

  // Extract folder name from filename or downloadUrl
  const getFolderName = (image: UserImage): string => {
    // Try to extract folder from downloadUrl first
    if (image.downloadUrl) {
      try {
        const url = new URL(image.downloadUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Look for folder structure in path (usually before filename)
        if (pathParts.length > 1) {
          // Return the folder name (second to last part, or last directory)
          const folderPart = pathParts[pathParts.length - 2];
          if (folderPart && !folderPart.includes('.')) {
            return folderPart;
          }
        }
      } catch (e) {
        // If URL parsing fails, try filename
      }
    }
    
    // Try to extract folder from filename path
    if (image.filename.includes('/')) {
      const parts = image.filename.split('/');
      if (parts.length > 1) {
        return parts[parts.length - 2];
      }
    }
    
    // Default to "Root" if no folder found
    return 'Root';
  };

  // Group images by folder
  const foldersByGroup = useMemo(() => {
    const folderMap = new Map<string, UserImage[]>();
    
    selectedImages.forEach((image) => {
      const folderName = getFolderName(image);
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName)!.push(image);
    });

    // Convert to array and sort
    const folders: FolderGroup[] = Array.from(folderMap.entries()).map(([folderName, images]) => ({
      folderName,
      images,
    }));

    // Sort folders: Root last, others alphabetically
    folders.sort((a, b) => {
      if (a.folderName === 'Root') return 1;
      if (b.folderName === 'Root') return -1;
      return a.folderName.localeCompare(b.folderName);
    });

    return folders;
  }, [selectedImages]);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
        if (selectedFolder === folderName) {
          setSelectedFolder(null);
        }
      } else {
        next.add(folderName);
        setSelectedFolder(folderName);
      }
      return next;
    });
  };

  const toggleImageSelection = (filename: string) => {
    setUserSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (userSelectedImages.size === selectedImages.length) {
      setUserSelectedImages(new Set());
    } else {
      setUserSelectedImages(new Set(selectedImages.map(img => img.filename)));
    }
  };

  const handleDownload = (image: UserImage) => {
    const link = document.createElement('a');
    link.href = image.downloadUrl;
    link.download = image.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate current page URL
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
    if (userSelectedImages.size === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get selected image details
      const selectedImageDetails = selectedImages.filter(img => 
        userSelectedImages.has(img.filename)
      );

      // Here you can send to backend API if needed
      // For now, we'll just show success and log the selection
      console.log('User selected images:', Array.from(userSelectedImages));
      console.log('Selected image details:', selectedImageDetails);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(
        `Successfully submitted ${userSelectedImages.size} photo${userSelectedImages.size !== 1 ? 's' : ''} for selection!`,
        { duration: 5000 }
      );

      // Optionally clear selection after submission
      // setUserSelectedImages(new Set());
    } catch (error) {
      toast.error('Failed to submit selection. Please try again.');
      console.error('Submission error:', error);
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
        <LoadingSpinner size="lg" text="Loading your selected photos..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to load photos</h1>
          <p className="text-gray-600 text-sm">Please check the link or try again later.</p>
        </div>
      </div>
    );
  }

  if (selectedKeys.size === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaImages className="mx-auto mb-3 text-3xl text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No photos selected</h1>
          <p className="text-gray-600 text-sm">
            This public link does not contain any selected photos. Please ask your photographer to resend the link.
          </p>
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
              Browse folders and select the photos you want. Click on a folder to view images inside.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Secure Public Link</p>
            <p className="text-sm font-medium text-gray-800">
              {foldersByGroup.length} folder{foldersByGroup.length !== 1 ? 's' : ''} • {selectedImages.length} photo{selectedImages.length !== 1 ? 's' : ''}
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
            Share this URL with others to view and select from these photos
          </p>
        </div>

        {/* Selection Summary Bar */}
        {userSelectedImages.size > 0 ? (
          <div className="mb-6 bg-gradient-to-r from-[#2731db] to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaCheckCircle className="text-2xl" />
                <div>
                  <p className="font-semibold text-lg">
                    {userSelectedImages.size} photo{userSelectedImages.size !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-sm text-blue-100">
                    {userSelectedImages.size} of {selectedImages.length} available photos
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 text-sm font-medium transition-colors"
                >
                  {userSelectedImages.size === selectedImages.length ? 'Deselect All' : 'Select All'}
                </button>
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
                  Select photos by clicking on them. Selected photos will appear here.
                </p>
              </div>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Select All
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          {selectedImages.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg font-medium mb-2">No matching photos found</p>
              <p className="text-sm">
                The selected photo list does not match any available images. The link may be outdated.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Folders List */}
              <div className="space-y-2">
                {foldersByGroup.map((folder) => {
                  const isExpanded = expandedFolders.has(folder.folderName);
                  return (
                    <div key={folder.folderName} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      {/* Folder Header */}
                      <button
                        onClick={() => toggleFolder(folder.folderName)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <FaFolderOpen className="text-[#2731db] text-xl" />
                          ) : (
                            <FaFolder className="text-gray-400 text-xl" />
                          )}
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-gray-900">{folder.folderName}</h3>
                            <p className="text-sm text-gray-500">
                              {folder.images.length} photo{folder.images.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <FaChevronRight
                          className={`text-gray-400 transition-transform duration-200 ${
                            isExpanded ? 'transform rotate-90' : ''
                          }`}
                        />
                      </button>

                      {/* Folder Images (shown when expanded) */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {folder.images.map((image) => {
                              const isUserSelected = userSelectedImages.has(image.filename);
                              return (
                                <div
                                  key={image.filename}
                                  onClick={() => toggleImageSelection(image.filename)}
                                  className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                                    isUserSelected
                                      ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50 shadow-lg'
                                      : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                                  }`}
                                >
                                  {/* Selection Checkbox */}
                                  <div className="absolute top-2 left-2 z-10">
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                        isUserSelected
                                          ? 'bg-[#2731db] text-white'
                                          : 'bg-white bg-opacity-80 border-2 border-gray-300'
                                      }`}
                                    >
                                      {isUserSelected && <FaCheck className="text-xs" />}
                                    </div>
                                  </div>

                                  <div className="h-48 bg-gray-100 overflow-hidden">
                                    {image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
                                      <img
                                        src={image.previewUrl}
                                        alt={image.filename}
                                        className={`w-full h-full object-cover transition-transform duration-300 ${
                                          isUserSelected ? 'opacity-90' : 'group-hover:scale-105'
                                        }`}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                        {image.fileType.toUpperCase()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-3 bg-white">
                                    <p className="text-sm font-medium text-gray-900 truncate" title={image.filename}>
                                      {image.filename.split('/').pop() || image.filename}
                                    </p>
                                    {image.uploadTime && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(image.uploadTime).toLocaleString()}
                                      </p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                      <span className="text-xs text-gray-500">{image.fileType.toUpperCase()}</span>
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PublicSelectionPage;


