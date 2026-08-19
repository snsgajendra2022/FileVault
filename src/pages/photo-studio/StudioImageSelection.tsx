import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaImages, FaFolder, FaFolderOpen, FaChevronRight, FaCheck, FaCheckCircle, FaArrowRight, FaShare } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import api from 'src/api/client/axiosInstance';
import PublicShareModal from '../../components/modals/PublicShareModal';

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

interface FolderGroup {
  folderName: string;
  images: UserImage[];
}

const StudioImageSelection: React.FC = () => {
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // Share modal (public URL -> email/SMS) using existing /api/public-share/* endpoints.
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContactSearch, setShareContactSearch] = useState('');
  const [shareContactIds, setShareContactIds] = useState<Set<string>>(new Set());
  const [shareNewEmails, setShareNewEmails] = useState('');
  const [shareNewMobileCountryCode, setShareNewMobileCountryCode] = useState('+91');
  const [shareNewMobiles, setShareNewMobiles] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareChannels, setShareChannels] = useState<{ email: boolean; sms: boolean }>({ email: true, sms: true });
  const [shareAlreadySent, setShareAlreadySent] = useState<{ email?: string; mobile?: string; alreadySent: boolean } | null>(null);
  const [shareSending, setShareSending] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['studioImageSelection'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 1,
  });

  const allImages = data?.images ?? [];

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
    
    allImages.forEach((image) => {
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
  }, [allImages]);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  };

  const toggleImageSelection = (filename: string) => {
    setSelectedImages((prev) => {
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
    if (selectedImages.size === allImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(allImages.map(img => img.filename)));
    }
  };

  const handleSelectAllInFolder = (folder: FolderGroup) => {
    const folderImageFilenames = folder.images.map(img => img.filename);
    const allSelected = folderImageFilenames.every(filename => selectedImages.has(filename));
    
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in folder
        folderImageFilenames.forEach(filename => next.delete(filename));
      } else {
        // Select all in folder
        folderImageFilenames.forEach(filename => next.add(filename));
      }
      return next;
    });
  };

  // Generate public URL for selected images
  const publicUrl = useMemo(() => {
    if (selectedImages.size === 0) return '';
    const token = localStorage.getItem('token') || '';
    const selectedFilenames = Array.from(selectedImages).join(',');
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/selection?token=${encodeURIComponent(token)}&files=${encodeURIComponent(selectedFilenames)}`;
  }, [selectedImages]);

  // Fetch contacts for share modal.
  const { data: shareContactsData } = useQuery({
    queryKey: ['publicShareContacts', shareContactSearch],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (shareContactSearch.trim()) params.set('search', shareContactSearch.trim());
        params.set('limit', '50');
        params.set('offset', '0');
        const res = await api.get<{
          contacts?: { id: string; email?: string; mobile?: string; countryCode?: string; displayName?: string }[];
        }>(`/api/public-share/contacts?${params.toString()}`);
        return res.data ?? { contacts: [] };
      } catch {
        return { contacts: [] };
      }
    },
    enabled: showShareModal,
    retry: 0,
  });

  const shareContacts = shareContactsData?.contacts ?? [];

  const checkRecipient = useCallback(
    async (emailInput: string, mobileInput: string) => {
      const firstEmail = emailInput.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean)[0] ?? '';
      const firstPart = mobileInput.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean)[0] ?? '';
      const m = firstPart
        ? firstPart.startsWith('+')
          ? firstPart
          : `${shareNewMobileCountryCode.replace(/\s/g, '')}${firstPart}`
        : '';

      if (!firstEmail && !m) {
        setShareAlreadySent(null);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (firstEmail) params.set('email', firstEmail);
        if (m) params.set('mobile', m);
        if (publicUrl) params.set('publicUrl', publicUrl);

        const res = await api.get<{ alreadySent?: boolean; email?: string | null; mobile?: string | null }>(
          `/api/public-share/check-recipient?${params.toString()}`
        );
        setShareAlreadySent({
          email: res.data?.email ?? undefined,
          mobile: res.data?.mobile ?? undefined,
          alreadySent: !!res.data?.alreadySent,
        });
      } catch {
        setShareAlreadySent(null);
      }
    },
    [publicUrl, shareNewMobileCountryCode]
  );

  const handleShareSend = useCallback(async () => {
    if (!publicUrl) {
      toast.error('Please select images first to generate URL');
      return;
    }

    const emails = shareNewEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    const mobileParts = shareNewMobiles.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map((part) =>
      part.startsWith('+') ? part : `${shareNewMobileCountryCode.replace(/\s/g, '')}${part}`
    );

    if (shareContactIds.size === 0 && emails.length === 0 && mobiles.length === 0) {
      toast.error('Please select a contact or enter email/mobile');
      return;
    }

    const channels: string[] = [];
    if (shareChannels.email) channels.push('email');
    if (shareChannels.sms) channels.push('sms');
    if (channels.length === 0) {
      toast.error('Select email or SMS');
      return;
    }

    setShareSending(true);
    try {
      const res = await api.post<{
        success?: boolean;
        sent?: { email?: number; sms?: number };
        shareIds?: { email?: number[]; sms?: number[] };
      }>('/api/public-share/send', {
        publicUrl,
        message: shareMessage.trim() || undefined,
        sendTo: {
          contactIds: Array.from(shareContactIds),
          emails,
          mobiles,
        },
        albumName: 'Image Selection',
        channels,
      });

      if (res.data?.success) {
        toast.success('Link shared!');
        setShowShareModal(false);
        setShareContactIds(new Set());
        setShareNewEmails('');
        setShareNewMobiles('');
        setShareMessage('');
        setShareAlreadySent(null);
      } else {
        toast.error('Failed to share link');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to share link');
    } finally {
      setShareSending(false);
    }
  }, [
    publicUrl,
    shareChannels.email,
    shareChannels.sms,
    shareMessage,
    shareContactIds,
    shareNewEmails,
    shareNewMobileCountryCode,
    shareNewMobiles,
  ]);

  const handleProceedToCheckout = () => {
    if (selectedImages.size === 0) {
      toast.error('Please select at least one image');
      return;
    }

    // Store selected images in localStorage or pass via state
    const selectedFilenames = Array.from(selectedImages).join(',');
    navigate(`/studio/payments?selected=${encodeURIComponent(selectedFilenames)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading images..." />
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaImages className="mr-3 text-[#2731db]" />
            Select Images from Folders
          </h1>
          <p className="text-gray-600 mt-2">
            Browse folders and select images you want to include for payment.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total images</p>
          <p className="text-2xl font-bold text-gray-900">{allImages.length}</p>
        </div>
      </div>

      {/* Share controls (URL is NOT shown to user) */}
      {selectedImages.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FaShare className="text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Share with your client</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center px-3 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800 transition-colors"
                title="Share via email/SMS"
              >
                Share
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share selected photos with your client (opens email/SMS dialog).
          </p>
        </div>
      )}

      {/* Selection Summary Bar */}
      {selectedImages.size > 0 ? (
        <div className="bg-gradient-to-r from-[#2731db] to-blue-600 rounded-xl shadow-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaCheckCircle className="text-2xl" />
              <div>
                <p className="font-semibold text-lg">
                  {selectedImages.size} photo{selectedImages.size !== 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-blue-100">
                  {selectedImages.size} of {allImages.length} total photos
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 text-sm font-medium transition-colors"
              >
                {selectedImages.size === allImages.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleProceedToCheckout}
                className="px-6 py-2 rounded-lg bg-white text-[#2731db] hover:bg-gray-100 font-semibold transition-colors flex items-center space-x-2"
              >
                <span>Proceed to Checkout</span>
                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Select images by clicking on them. Selected images will appear here.
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

      {/* Folders List */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Folders</h2>
        
        {foldersByGroup.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FaFolder className="mx-auto mb-3 text-4xl" />
            <p className="text-lg font-medium mb-2">No folders found</p>
            <p className="text-sm">Upload images to see them organized in folders.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {foldersByGroup.map((folder) => {
              const isExpanded = expandedFolders.has(folder.folderName);
              const folderSelectedCount = folder.images.filter(img => selectedImages.has(img.filename)).length;
              const allInFolderSelected = folder.images.length > 0 && folderSelectedCount === folder.images.length;
              
              return (
                <div key={folder.folderName} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {/* Folder Header */}
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => toggleFolder(folder.folderName)}
                      className="flex-1 flex items-center justify-between"
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
                            {folderSelectedCount > 0 && (
                              <span className="ml-2 text-[#2731db] font-medium">
                                • {folderSelectedCount} selected
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <FaChevronRight
                        className={`text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'transform rotate-90' : ''
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAllInFolder(folder);
                      }}
                      className={`ml-4 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        allInFolderSelected
                          ? 'bg-[#2731db] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {allInFolderSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Folder Images (shown when expanded) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {folder.images.map((image) => {
                          const isSelected = selectedImages.has(image.filename);
                          return (
                            <div
                              key={image.filename}
                              onClick={() => toggleImageSelection(image.filename)}
                              className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50 shadow-lg'
                                  : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <div className="absolute top-2 left-2 z-10">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-[#2731db] text-white'
                                      : 'bg-white bg-opacity-80 border-2 border-gray-300'
                                  }`}
                                >
                                  {isSelected && <FaCheck className="text-xs" />}
                                </div>
                              </div>

                              <div className="h-48 bg-gray-100 overflow-hidden">
                                {image.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/) ? (
                                  <img
                                    src={image.previewUrl}
                                    alt={image.filename}
                                    className={`w-full h-full object-cover transition-transform duration-300 ${
                                      isSelected ? 'opacity-90' : 'group-hover:scale-105'
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
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500">{image.fileType.toUpperCase()}</span>
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

      {/* Share modal */}
      <PublicShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        contacts={shareContacts}
        contactSearch={shareContactSearch}
        onContactSearchChange={setShareContactSearch}
        selectedContactIds={shareContactIds}
        onSelectedContactIdsChange={setShareContactIds}
        showEmail={true}
        showPhone={true}
        newEmails={shareNewEmails}
        onNewEmailsChange={setShareNewEmails}
        mobileCountryCode={shareNewMobileCountryCode}
        onMobileCountryCodeChange={setShareNewMobileCountryCode}
        newMobiles={shareNewMobiles}
        onNewMobilesChange={setShareNewMobiles}
        alreadySent={shareAlreadySent}
        onAlreadySentChange={setShareAlreadySent}
        message={shareMessage}
        onMessageChange={setShareMessage}
        channels={shareChannels}
        onChannelsChange={setShareChannels}
        onCheckRecipient={checkRecipient}
        onSend={handleShareSend}
        sending={shareSending}
      />
    </div>
  );
};

export default StudioImageSelection;