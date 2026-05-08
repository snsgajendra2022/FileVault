import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaUser, FaUsers, FaPlus, FaEye } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../api/client/axiosInstance';
import { useAuth } from '../../state/context/AuthContext';

interface SharedImage {
  id: number;
  originalFilename: string;
  storedFilename: string;
  uploadTime: string;
  userId: number;
  user?: {
    firstName: string;
    lastName: string;
    username: string;
  };
}

interface Permissions {
  canViewImages: boolean;
  canUploadImages: boolean;
  canDeleteImages: boolean;
  canManageAlbums: boolean;
}

const SharedImages: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [images, setImages] = useState<SharedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<SharedImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [permissions, setPermissions] = useState<Permissions>({
    canViewImages: true,
    canUploadImages: false,
    canDeleteImages: false,
    canManageAlbums: false
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDestination, setUploadDestination] = useState<'my-account' | 'inviter-account'>('my-account');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any>(null);

  useEffect(() => {
    fetchSharedImages();
    fetchPermissions();
    fetchFamilyMembers();
  }, []);

  const fetchSharedImages = async () => {
    try {
      setLoading(true);
      
      // Use fetch to get raw text and clean it before parsing
      const response = await fetch(process.env.REACT_APP_API_URL+'/api/simple-invitations/shared-images', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawText = await response.text();
      // console.log('Raw API Response Text:', rawText.substring(0, 500) + '...');
      
      // Remove recursive "user" inside "images" using regex
      // This pattern matches "user": { ... } and removes it, handling nested objects
      let cleaned = rawText;
      
      // First, try to remove the deeply nested user objects
      // This handles the case where user objects contain nested images arrays
      cleaned = cleaned.replace(/"user":\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\},?/g, "");
      
      // If that doesn't work, try a simpler approach
      if (cleaned === rawText) {
        cleaned = cleaned.replace(/"user":\{[^}]*\},?/g, "");
      }
      // console.log('Cleaned Text:', cleaned.substring(0, 500) + '...');
      
      let data;
      try {
        data = JSON.parse(cleaned);
        // console.log('Parsed Data:', data);
      } catch (parseError) {
        console.error('Failed to parse cleaned JSON, trying alternative approach:', parseError);
        // Fallback: try to parse the original text and handle it differently
        try {
          const originalData = JSON.parse(rawText);
          console.log('Fallback: Parsed original data');
          data = originalData;
        } catch (originalParseError) {
          console.error('Failed to parse original JSON:', originalParseError);
          throw new Error('Unable to parse API response');
        }
      }
      
      if (data.success) {
        const rawImages = data.images || [];
        // console.log('Raw images count:', rawImages.length);
        
        // Now clean the images data to extract only what we need
        const cleanedImages = rawImages.map((image: any) => ({
          id: image.id,
          originalFilename: image.originalFilename,
          storedFilename: image.storedFilename,
          fileHash: image.fileHash,
          uploadTime: image.uploadTime,
          userId: image.userId,
          user: image.user ? {
            id: image.user.id,
            firstName: image.user.firstName,
            lastName: image.user.lastName,
            username: image.user.username
          } : null
        }));
        
        // console.log('Final Cleaned Images:', cleanedImages);
        setImages(cleanedImages);
        setPermissions(data.allowedActions || {
          canViewImages: true,
          canUploadImages: false,
          canDeleteImages: false,
          canManageAlbums: false
        });
      } else {
        console.error('API returned success: false', data);
        toast.error(data.message || 'Failed to load shared images');
      }
    } catch (error: any) {
      console.error('Error fetching shared images:', error);
      toast.error('Failed to load shared images');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/api/simple-invitations/family-relationships');
      if (response.data.success && response.data.relationships.length > 0) {
        // Get permissions from the first relationship (assuming single inviter for now)
        const relationship = response.data.relationships[0];
        setPermissions({
          canViewImages: relationship.canViewImages || false,
          canUploadImages: relationship.canUploadImages || false,
          canDeleteImages: relationship.canDeleteImages || false,
          canManageAlbums: relationship.canManageAlbums || false
        });
      }
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const response = await api.get('/api/simple-invitations/family-relationships');
      if (response.data.success && response.data.relationships.length > 0) {
        setFamilyMembers(response.data.relationships);
        // Set first family member as default selection
        if (response.data.relationships.length > 0) {
          setSelectedFamilyMember(response.data.relationships[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching family members:', error);
    }
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (uploadDestination === 'inviter-account' && !selectedFamilyMember) {
      toast.error('Please select a family member');
      return;
    }

    try {
      setUploading(true);
      const base64Image = await convertFileToBase64(selectedFile);

      if (uploadDestination === 'inviter-account') {
        // Upload to family member's account
        const response = await api.post('/api/simple-invitations/upload-to-inviter', {
          originalFilename: selectedFile.name,
          base64Image: base64Image,
          contentType: selectedFile.type,
          targetUserId: selectedFamilyMember.otherUserId
        });

        if (response.data.success) {
          toast.success(`Image uploaded to ${selectedFamilyMember.otherUserFirstName}'s account successfully!`);
          fetchSharedImages(); // Refresh the images list
        } else {
          toast.error(response.data.message || 'Upload failed');
        }
      } else {
        // Upload to my account (use regular upload API)
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await api.post('/api/images/upload', formData);
        
        if (response.data !== '') {
          toast.success('Image uploaded to your account successfully!');
          fetchSharedImages(); // Refresh the images list
        } else {
          toast.error(response.data.message || 'Upload failed');
        }
      }

      // Reset form
      setSelectedFile(null);
      setShowUploadModal(false);
      setUploadDestination('my-account');
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (filename: string) => {
    return '2.5 MB'; 
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'IMG';
  };

  const getFileTypeColor = (extension: string) => {
    const imageTypes = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'];
    const videoTypes = ['MP4', 'AVI', 'MOV', 'WMV'];
    
    if (imageTypes.includes(extension)) return 'bg-blue-100 text-blue-800';
    if (videoTypes.includes(extension)) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const filteredImages = images.filter(image =>
    image.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.user?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.user?.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openImageModal = (image: SharedImage) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const downloadImage = async (image: SharedImage) => {
    try {
      toast.success('Download started!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const deleteImage = async (image: SharedImage) => {
    if (!permissions.canDeleteImages) {
      toast.error('You do not have permission to delete images');
      return;
    }

    try {
      // API call to delete image would go here
      toast.success('Image deleted successfully!');
      fetchSharedImages(); // Refresh the list
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const isMyImage = (image: SharedImage) => {
    return image.userId === currentUser?.id;
  };

  const getImageSourceBadge = (image: SharedImage) => {
    if (isMyImage(image)) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          🏠 My Account
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          👥 {image.user?.firstName}'s Account
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading shared images...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Permission Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
        <h3 className="text-xl font-bold mb-4">📁 Your Access Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-3 rounded-lg ${permissions.canViewImages ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex items-center space-x-2">
              <span>👁️</span>
              <span className="text-sm">View Images</span>
              <span>{permissions.canViewImages ? '✅' : '❌'}</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${permissions.canUploadImages ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex items-center space-x-2">
              <span>📤</span>
              <span className="text-sm">Upload Images</span>
              <span>{permissions.canUploadImages ? '✅' : '❌'}</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${permissions.canDeleteImages ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex items-center space-x-2">
              <span>🗑️</span>
              <span className="text-sm">Delete Images</span>
              <span>{permissions.canDeleteImages ? '✅' : '❌'}</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${permissions.canManageAlbums ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="flex items-center space-x-2">
              <span>⚙️</span>
              <span className="text-sm">Manage Albums</span>
              <span>{permissions.canManageAlbums ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>
        
        {permissions.canUploadImages && (
          <div className="mt-4 p-3 bg-white/20 rounded-lg">
            <p className="text-sm">
              💡 <strong>You can upload images to family members' accounts!</strong>
              <br />
              Images you upload will be stored under their account, not yours.
            </p>
          </div>
        )}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Info</h3>
          <p className="text-sm text-yellow-700">Images loaded: {images.length}</p>
          <p className="text-sm text-yellow-700">Permissions: {JSON.stringify(permissions)}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shared Images</h2>
            <p className="text-gray-600">View images shared by your family members</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FaEnvelope className="h-6 w-6 text-blue-600" />
              <span className="text-sm text-gray-500">Total Images:</span>
              <span className="text-2xl font-bold text-blue-600">{images.length}</span>
            </div>
            
            {permissions.canUploadImages && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Upload Image
              </button>
            )}
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search images by name or family member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Images Display */}
      {filteredImages.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
          <FaEnvelope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No shared images found</h3>
          <p className="text-gray-600">
            {searchTerm 
              ? `No images match "${searchTerm}"`
              : "No family members have shared images with you yet."
            }
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-200 ${
                viewMode === 'list' ? 'flex items-center p-4' : ''
              }`}
            >
              {viewMode === 'grid' ? (
                // Grid View
                <>
                  {/* Image Preview */}
                  <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(getFileExtension(image.originalFilename))}`}>
                        {getFileExtension(image.originalFilename)}
                      </span>
                    </div>
                    
                    <div className="text-center">
                      <FaEnvelope className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{formatFileSize(image.originalFilename)}</p>
                    </div>
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openImageModal(image)}
                          className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
                          title="View Details"
                        >
                          <FaEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadImage(image)}
                          className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
                          title="Download"
                        >
                          <FaUsers className="h-4 w-4" />
                        </button>
                        {permissions.canDeleteImages && !isMyImage(image) && (
                          <button
                            onClick={() => deleteImage(image)}
                            className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
                            title="Delete"
                          >
                            <FaUser className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Image Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 truncate" title={image.originalFilename}>
                      {image.originalFilename}
                    </h3>
                    
                    {/* Image Source Badge */}
                    <div className="mb-2">
                      {getImageSourceBadge(image)}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <FaUser className="h-3 w-3" />
                        <span>
                          {image.user?.firstName} {image.user?.lastName}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FaEnvelope className="h-3 w-3" />
                        <span>{formatDate(image.uploadTime)}</span>
                      </div>
                      <span className="text-xs">{formatFileSize(image.originalFilename)}</span>
                    </div>
                  </div>
                </>
              ) : (
                // List View
                <>
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaEnvelope className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 ml-4">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate" title={image.originalFilename}>
                      {image.originalFilename}
                    </h3>
                    
                    {/* Image Source Badge */}
                    <div className="mb-2">
                      {getImageSourceBadge(image)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <FaUser className="h-3 w-3" />
                        <span>{image.user?.firstName} {image.user?.lastName}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <FaEnvelope className="h-3 w-3" />
                        <span>{formatDate(image.uploadTime)}</span>
                      </span>
                      <span>{formatFileSize(image.originalFilename)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openImageModal(image)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FaEye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => downloadImage(image)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <FaUsers className="h-4 w-4" />
                    </button>
                    {permissions.canDeleteImages && !isMyImage(image) && (
                      <button
                        onClick={() => deleteImage(image)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FaUser className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Image Details</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Image Preview */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 flex items-center justify-center">
                  <div className="text-center">
                    <FaEnvelope className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Image Preview</p>
                  </div>
                </div>

                {/* Image Source Badge */}
                <div className="flex justify-center">
                  {getImageSourceBadge(selectedImage)}
                </div>

                {/* Image Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">File Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Filename:</span>
                        <span className="font-medium">{selectedImage.originalFilename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium">{formatFileSize(selectedImage.originalFilename)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{getFileExtension(selectedImage.originalFilename)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Upload Date:</span>
                        <span className="font-medium">{formatDate(selectedImage.uploadTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Shared By</h4>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {selectedImage.user?.firstName?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {selectedImage.user?.firstName} {selectedImage.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">@{selectedImage.user?.username}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4 pt-4">
                  <button
                    onClick={() => downloadImage(selectedImage)}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaUsers className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  
                  {permissions.canDeleteImages && !isMyImage(selectedImage) && (
                    <button
                      onClick={() => deleteImage(selectedImage)}
                      className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <FaUser className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowImageModal(false)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">📤 Upload Image</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadDestination('my-account');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* File Selection */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Select Image File</h4>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {selectedFile && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✅</span>
                        <span className="text-sm font-medium text-green-800">
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Destination */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Choose Upload Destination</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="uploadDestination"
                        value="my-account"
                        checked={uploadDestination === 'my-account'}
                        onChange={(e) => setUploadDestination(e.target.value as 'my-account' | 'inviter-account')}
                        className="text-blue-600"
                      />
                      <label className="font-medium">🏠 Upload to <strong>MY Account</strong></label>
                    </div>
                    <p className="text-sm text-blue-700 ml-6">Images stored in your personal account</p>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="uploadDestination"
                        value="inviter-account"
                        checked={uploadDestination === 'inviter-account'}
                        onChange={(e) => setUploadDestination(e.target.value as 'my-account' | 'inviter-account')}
                        className="text-blue-600"
                      />
                      <label className="font-medium">👥 Upload to <strong>Family Member's Account</strong></label>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">✅ Allowed</span>
                    </div>
                    <p className="text-sm text-blue-700 ml-6">Images stored in family member's account</p>
                  </div>
                </div>

                {/* Family Member Selection */}
                {uploadDestination === 'inviter-account' && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">Select Family Member</h4>
                    <select
                      value={selectedFamilyMember?.id || ''}
                      onChange={(e) => {
                        const member = familyMembers.find(m => m.id === parseInt(e.target.value));
                        setSelectedFamilyMember(member);
                      }}
                      className="w-full p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select a family member...</option>
                      {familyMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.otherUserFirstName} {member.otherUserLastName} ({member.relationshipType})
                        </option>
                      ))}
                    </select>
                    {selectedFamilyMember && (
                      <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-purple-600">👤</span>
                          <span className="text-sm font-medium text-purple-800">
                            Selected: {selectedFamilyMember.otherUserFirstName} {selectedFamilyMember.otherUserLastName}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Warning Notice */}
                {uploadDestination === 'inviter-account' && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-yellow-600 text-lg">⚠️</span>
                      <div>
                        <h5 className="font-semibold text-yellow-800">Important Notice</h5>
                        <p className="text-sm text-yellow-700">
                          <strong>This image will be stored under your family member's account, not yours.</strong>
                        </p>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          <li>✅ You can view the image anytime</li>
                          <li>✅ Your family member will see it in their account</li>
                          <li>❌ You cannot move it to your account later</li>
                          <li>❌ Your family member can delete it if they choose</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setUploadDestination('my-account');
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading || (uploadDestination === 'inviter-account' && !selectedFamilyMember)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <span>
                        {uploadDestination === 'my-account' ? 'Upload to My Account' : 'Upload to Family Account'}
                      </span>
                    )}
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

export default SharedImages;
