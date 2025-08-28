import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FaCloudUploadAlt, FaFileImage, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const UploadPage = () => {
  const { user } = useAuth();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending'
    }));
    
    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);

    try {
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading' as const }
            : f
        )
      );

      await api.post('/api/images/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          
          setUploadFiles(prev => 
            prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, progress }
                : f
            )
          );
        }
      });

      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'completed' as const, progress: 100 }
            : f
        )
      );

      toast.success(`${uploadFile.file.name} uploaded successfully!`);
    } catch (error: any) {
      toast.error(error?.response?.data || error?.message);
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error.response?.data || 'Upload failed'
              }
            : f
        )
      );
      // toast.error(`Failed to upload ${uploadFile.file.name}`);
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
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                <span className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></span>
                <span className="font-medium text-gray-700">JPG, PNG, GIF</span>
              </span>
              <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                <span className="w-3 h-3 bg-blue-400 rounded-full mr-3 animate-pulse"></span>
                <span className="font-medium text-gray-700">PDF Documents</span>
              </span>
              <span className="flex items-center bg-white/70 px-4 py-2 rounded-full shadow-sm">
                <span className="w-3 h-3 bg-purple-400 rounded-full mr-3 animate-pulse"></span>
                <span className="font-medium text-gray-700">Max 10MB</span>
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
                        <button
                          onClick={() => uploadSingleFile(uploadFile)}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg transform hover:scale-105"
                        >
                          Upload
                        </button>
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
    </div>
  );
};

export default UploadPage;
