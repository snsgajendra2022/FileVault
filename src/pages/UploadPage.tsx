import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import imageService from '../services/imageService';
import toast from 'react-hot-toast';
import { FaCloudUploadAlt, FaFileImage, FaTimes, FaCheck, FaExclamationTriangle, FaLock, FaDownload } from 'react-icons/fa';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadDestination?: 'my-account' | 'family-account';
  targetFamilyMember?: any;
}

const UploadPage = () => {
  const { user } = useAuth();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [selectedFileForOptions, setSelectedFileForOptions] = useState<UploadFile | null>(null);

  // Fetch user profile data dynamically
  const { data: userProfile, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await api.get('/api/auth/profile');
      return response.data;
    },
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // (Deprecated) Separate upload-permissions endpoint not used anymore; rely on profile flags

  // Fetch storage usage
  const { data: storageUsage } = useQuery({
    queryKey: ['storageUsage'],
    queryFn: () => imageService.getStorageUsage(),
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Fetch family members on component mount
  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const response = await api.get('/api/simple-invitations/family-relationships');
      if (response.data.success && response.data.relationships.length > 0) {
        setFamilyMembers(response.data.relationships);
      }
    } catch (error: any) {
      console.error('Error fetching family members:', error);
    }
  };

  // Permission checking functions (source of truth: user profile flags)
  const canUpload = () => {
    if (!userProfile) return false;
    return !!userProfile.canUploadImages && !!userProfile.allowedFileTypes && userProfile.maxFileSizeMB > 0;
  };

  const canViewImages = () => {
    if (!userProfile) return false;
    return !!userProfile.canViewImages;
  };

  const canDownloadImages = () => {
    if (!userProfile) return false;
    return !!userProfile.canDownloadImages;
  };

  const isFileTypeAllowed = (file: File) => {
    if (!userProfile?.allowedFileTypes) return false;
    const allowedTypes = userProfile.allowedFileTypes.split(',').map(t => t.trim().toLowerCase());
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(fileExtension || '');
  };

  const isFileSizeAllowed = (file: File) => {
    if (!userProfile?.maxFileSizeMB) return false;
    const maxSizeBytes = userProfile.maxFileSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  };

  const hasStorageSpace = (fileSize: number) => {
    if (!storageUsage) return true; // Assume true if we can't check
    const fileSizeMB = fileSize / (1024 * 1024);
    return (storageUsage.used + fileSizeMB) <= storageUsage.total;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!canUpload()) {
      toast.error('You do not have permission to upload files');
      return;
    }

    const validFiles: UploadFile[] = [];
    const invalidFiles: string[] = [];

    acceptedFiles.forEach(file => {
      if (!isFileTypeAllowed(file)) {
        invalidFiles.push(`${file.name} - File type not allowed`);
        return;
      }
      
      if (!isFileSizeAllowed(file)) {
        invalidFiles.push(`${file.name} - File size exceeds ${userProfile?.maxFileSizeMB || 0}MB limit`);
        return;
      }

      if (!hasStorageSpace(file.size)) {
        invalidFiles.push(`${file.name} - Insufficient storage space`);
        return;
      }

      validFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: 'pending',
        uploadDestination: 'my-account' // Default to my account
      });
    });

    if (invalidFiles.length > 0) {
      toast.error(`Some files were rejected:\n${invalidFiles.join('\n')}`);
    }

    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added to upload queue`);
    }
  }, [userProfile, canUpload, isFileTypeAllowed, isFileSizeAllowed, hasStorageSpace]);

  // Dynamic accept types based on profile allowedFileTypes
  const getAcceptTypes = () => {
    if (!userProfile?.allowedFileTypes) return {};
    const acceptTypes: any = {};
    const allowedTypes = userProfile.allowedFileTypes.split(',').map(t => t.trim().toLowerCase());

    if (allowedTypes.some(type => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(type))) {
      acceptTypes['image/*'] = ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'];
    }
    if (allowedTypes.includes('pdf')) {
      acceptTypes['application/pdf'] = ['.pdf'];
    }
    if (allowedTypes.some(type => ['doc', 'docx'].includes(type))) {
      acceptTypes['application/msword'] = ['.doc'];
      acceptTypes['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx'];
    }
    return acceptTypes;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptTypes(),
    multiple: true,
    disabled: !canUpload()
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== id));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading' as const }
            : f
        )
      );

      if (uploadFile.uploadDestination === 'family-account' && uploadFile.targetFamilyMember) {
        // Upload to family member's account
        const response = await imageService.uploadToFamilyMember(
          uploadFile.file, 
          uploadFile.targetFamilyMember.otherUserId
        );

        if (response.success) {
          setUploadFiles(prev => 
            prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'completed' as const, progress: 100 }
                : f
            )
          );

          toast.success(`${uploadFile.file.name} uploaded to ${uploadFile.targetFamilyMember.otherUserFirstName}'s account successfully!`);
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      } else {
        // Upload to my account
        const response = await imageService.uploadImage(uploadFile.file);

        if (response.success) {
          setUploadFiles(prev => 
            prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'completed' as const, progress: 100 }
                : f
            )
          );

          toast.success(`${uploadFile.file.name} uploaded to your account successfully!`);
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Upload failed');
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error.response?.data?.message || error?.message || 'Upload failed'
              }
            : f
        )
      );
    }
  };

  const uploadAll = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    
    for (const file of pendingFiles) {
      await uploadSingleFile(file);
    }
    
    setUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <FaCheck className="h-4 w-4 text-green-500" />;
      case 'error':
        return <FaExclamationTriangle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <LoadingSpinner size="sm" text="" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const openUploadOptions = (uploadFile: UploadFile) => {
    // Get the current state of the file from uploadFiles array
    const currentFile = uploadFiles.find(f => f.id === uploadFile.id) || uploadFile;
    setSelectedFileForOptions(currentFile);
    setShowUploadOptions(true);
  };

  const setUploadDestination = (fileId: string, destination: 'my-account' | 'family-account', familyMember?: any) => {
    setUploadFiles(prev => 
      prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              uploadDestination: destination,
              targetFamilyMember: familyMember
            }
          : f
      )
    );
    
    // Update the selectedFileForOptions to reflect the current state
    if (selectedFileForOptions && selectedFileForOptions.id === fileId) {
      setSelectedFileForOptions(prev => prev ? {
        ...prev,
        uploadDestination: destination,
        targetFamilyMember: familyMember
      } : null);
    }
    
    // Only close modal if it's "my-account" or if family member is selected
    if (destination === 'my-account' || familyMember) {
      setShowUploadOptions(false);
      setSelectedFileForOptions(null);
    }
  };

  const getUploadDestinationText = (uploadFile: UploadFile) => {
    if (uploadFile.uploadDestination === 'family-account') {
      if (uploadFile.targetFamilyMember) {
        return `👥 ${uploadFile.targetFamilyMember.otherUserFirstName}'s Account`;
      } else {
        return '👥 Family Account (Select Member)';
      }
    }
    return '🏠 My Account';
  };

  // Show loading state while fetching user profile
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading your profile..." />
        </div>
      </div>
    );
  }

  // Show error state if user profile fetch failed
  if (userError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Loading Failed</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile information</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show permission denied if user cannot upload
  if (!canUpload()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Not Available</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to upload files. Please contact your administrator or upgrade your account.
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
          Upload Files
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Upload and secure your images and documents with advanced cloud storage
        </p>
        
        {/* User Info and Permissions */}
        {userProfile && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 max-w-4xl mx-auto border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {userProfile.accountType?.charAt(0) || 'U'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Account Type</h3>
                <p className="text-sm text-gray-600">{userProfile.accountType || 'Unknown'}</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {userProfile.maxFileSizeMB || 0}MB
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Max File Size</h3>
                <p className="text-sm text-gray-600">Per file limit</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {userProfile.allowedFileTypes?.split(',').length || 0}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Allowed Types</h3>
                <p className="text-sm text-gray-600">{userProfile.allowedFileTypes?.toUpperCase() || 'None'}</p>
              </div>

              {/* <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {storageUsage ? `${Math.round((storageUsage.used / storageUsage.total) * 100)}%` : '0%'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">Storage Used</h3>
                <p className="text-sm text-gray-600">
                  {storageUsage ? `${storageUsage.used}MB / ${storageUsage.total}MB` : '0MB / 0MB'}
                </p>
              </div>*/}
            </div> 
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-blue-100/50 backdrop-blur-sm">
        <div className="p-10">
          <div
            {...getRootProps()}
            className={`border-3 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-500 transform hover:scale-105 ${
              isDragActive 
                ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-2xl' 
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gradient-to-br from-blue-50/50 to-purple-50/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="relative">
              <div className="relative">
                <FaCloudUploadAlt className="mx-auto h-20 w-20 text-indigo-500 mb-6 drop-shadow-lg" />
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-bold">+</span>
                </div>
              </div>
            </div>
            <p className="mt-6 text-2xl font-bold text-gray-800">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="mt-3 text-lg text-gray-600">
              or click to select files
            </p>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm flex-wrap gap-4">
              {userProfile?.allowedFileTypes && (
                <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                  <span className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></span>
                  <span className="font-medium text-gray-700">
                    {userProfile.allowedFileTypes.toUpperCase()}
                  </span>
                </span>
              )}
              <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                <span className="w-3 h-3 bg-purple-400 rounded-full mr-3 animate-pulse"></span>
                <span className="font-medium text-gray-700">
                  Max {userProfile?.maxFileSizeMB || 0}MB
                </span>
              </span>
              <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                <span className="w-3 h-3 bg-blue-400 rounded-full mr-3 animate-pulse"></span>
                <span className="font-medium text-gray-700">
                  {storageUsage ? `${storageUsage.total - storageUsage.used}MB Available` : '0MB Available'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50">
          <div className="px-10 py-8 border-b border-blue-200/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaFileImage className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Files to Upload
                  </h2>
                  <p className="text-base text-gray-600">
                    {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              <button
                onClick={uploadAll}
                disabled={uploading || uploadFiles.every(f => f.status !== 'pending')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl transform hover:scale-105"
              >
                {uploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  'Upload All Files'
                )}
              </button>
            </div>
          </div>
          
          <div className="p-8">
            <div className="space-y-4">
              {uploadFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className={`border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-lg ${getStatusColor(uploadFile.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                        uploadFile.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                        uploadFile.status === 'error' ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                        uploadFile.status === 'uploading' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                        'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}>
                        <FaFileImage className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getUploadDestinationText(uploadFile)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(uploadFile.status)}
                      
                      {uploadFile.status === 'uploading' && (
                        <div className="w-40 bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {uploadFile.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openUploadOptions(uploadFile)}
                            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg transform hover:scale-105 text-sm"
                          >
                            Choose Destination
                          </button>
                          <button
                            onClick={() => uploadSingleFile(uploadFile)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg transform hover:scale-105"
                          >
                            Upload
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        className="w-10 h-10 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md"
                      >
                        <FaTimes className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {uploadFile.error && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-sm">
                      <p className="text-sm text-red-700 flex items-center font-medium">
                        <FaExclamationTriangle className="h-5 w-5 mr-3 text-red-500" />
                        {uploadFile.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Stats */}
      {uploadFiles.length > 0 && (
        <div className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50 p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FaCloudUploadAlt className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Upload Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-xl">{uploadFiles.length}</span>
                </div>
                <p className="text-base font-semibold text-gray-800">Total Files</p>
                <p className="text-sm text-gray-500">Selected for upload</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-xl">{uploadFiles.filter(f => f.status === 'completed').length}</span>
                </div>
                <p className="text-base font-semibold text-gray-800">Completed</p>
                <p className="text-sm text-gray-500">Successfully uploaded</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-xl">{uploadFiles.filter(f => f.status === 'uploading').length}</span>
                </div>
                <p className="text-base font-semibold text-gray-800">Uploading</p>
                <p className="text-sm text-gray-500">Currently in progress</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-xl">{uploadFiles.filter(f => f.status === 'error').length}</span>
                </div>
                <p className="text-base font-semibold text-gray-800">Failed</p>
                <p className="text-sm text-gray-500">Upload errors</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Options Modal */}
      {showUploadOptions && selectedFileForOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">📤 Choose Upload Destination</h3>
                <button
                  onClick={() => {
                    setShowUploadOptions(false);
                    setSelectedFileForOptions(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* File Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Selected File</h4>
                  <div className="flex items-center space-x-3">
                    <FaFileImage className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFileForOptions.file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFileForOptions.file.size)}</p>
                    </div>
                  </div>
                </div>

                {/* Upload Destination Options */}
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="uploadDestination"
                          value="my-account"
                          checked={selectedFileForOptions.uploadDestination === 'my-account'}
                          onChange={() => setUploadDestination(selectedFileForOptions.id, 'my-account')}
                          className="text-blue-600"
                        />
                        <div>
                          <label className="font-medium text-blue-900">🏠 Upload to MY Account</label>
                          <p className="text-sm text-blue-700">Store in your personal account</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {familyMembers.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="uploadDestination"
                            value="family-account"
                            checked={selectedFileForOptions.uploadDestination === 'family-account'}
                            onChange={() => setUploadDestination(selectedFileForOptions.id, 'family-account')}
                            className="text-purple-600"
                          />
                          <div>
                            <label className="font-medium text-purple-900">👥 Upload to Family Member's Account</label>
                            <p className="text-sm text-purple-700">Store in family member's account</p>
                          </div>
                        </div>
                      </div>
                      
                      {selectedFileForOptions.uploadDestination === 'family-account' && (
                        <div className="ml-6">
                          <select
                            value={selectedFileForOptions.targetFamilyMember?.id || ''}
                            onChange={(e) => {
                              const member = familyMembers.find(m => m.id === parseInt(e.target.value));
                              setUploadDestination(selectedFileForOptions.id, 'family-account', member);
                            }}
                            className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">Select a member...</option>
                            {familyMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.otherUserFirstName} {member.otherUserLastName} ({member.relationshipType})
                              </option>
                            ))}
                          </select>
                          
                          {/* Show status when family-account is selected but no member chosen */}
                          {selectedFileForOptions.uploadDestination === 'family-account' && !selectedFileForOptions.targetFamilyMember && (
                            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                              <p className="text-sm text-orange-700">
                                ⚠️ Please select a member to complete the upload destination.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Warning Notice */}
                {selectedFileForOptions.uploadDestination === 'family-account' && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-yellow-600 text-lg">⚠️</span>
                      <div>
                        <h5 className="font-semibold text-yellow-800">Important Notice</h5>
                        <p className="text-sm text-yellow-700">
                          <strong>This image will be stored under your member's account, not yours.</strong>
                        </p>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          <li>✅ You can view the image anytime</li>
                          <li>✅ Your member will see it in their account</li>
                          <li>❌ You cannot move it to your account later</li>
                          <li>❌ Your member can delete it if they choose</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowUploadOptions(false);
                      setSelectedFileForOptions(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadOptions(false);
                      setSelectedFileForOptions(null);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
