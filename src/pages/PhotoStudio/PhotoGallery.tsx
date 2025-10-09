import React, { useState, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import QRCode from 'react-qr-code';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaImages, 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaDownload,
  FaShare,
  FaQrcode,
  FaArrowLeft,
  FaCamera,
  FaVideo,
  FaFolder,
  FaFolderOpen,
  FaUpload,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaCopy
} from 'react-icons/fa';
import './PhotoGallery.css';

interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  size: number;
  uploadDate: string;
  clientId: string;
  clientName: string;
  sessionId: string;
  sessionName: string;
  tags: string[];
  barcode?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Session {
  id: string;
  name: string;
  clientId: string;
}

const PhotoGallery: React.FC = () => {
  const { user } = useAuth();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  const [qrItem, setQrItem] = useState<MediaItem | null>(null);
  const navigate = useNavigate();
  // Types reused from ImagesPage API
  interface UserImage {
    previewUrl: string;
    filename: string;
    downloadUrl: string;
    enabledServices: { [key: string]: string };
    uploadTime: string;
    fileType: string;
  }

  interface UserImagesResponse {
    totalImages: number;
    images: UserImage[];
  }

  // Fetch user images dynamically (same API flow as ImagesPage)
  const { data: userImagesData, isLoading, error } = useQuery({
    queryKey: ['userImages-gallery'],
    queryFn: async (): Promise<UserImagesResponse> => {
      let token = localStorage.getItem('token');
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 2,
    refetchInterval: 30000,
    enabled: true,
  });

  // Map API images into gallery media items when data loads
  useEffect(() => {
    setLoading(isLoading);
    if (!isLoading && userImagesData) {
      const items: MediaItem[] = userImagesData.images.map((img, index) => {
        const lower = img.fileType?.toLowerCase?.() || '';
        const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(lower);
        return {
          id: `${img.downloadUrl || img.filename}-${index}`,
          name: img.filename,
          type: isVideo ? 'video' : 'image',
          url: img.downloadUrl,
          thumbnail: img.previewUrl,
          size: 0,
          uploadDate: img.uploadTime,
          clientId: 'general',
          clientName: 'My Library',
          sessionId: 'general',
          sessionName: 'General',
          tags: [],
        };
      });
      setMediaItems(items);
      // Build simple client/session lists from items (unique by id)
      const clientList: Client[] = [
        { id: 'general', name: 'My Library' },
      ];
      setClients(clientList);
      const sessionList: Session[] = [
        { id: 'general', name: 'General', clientId: 'general' },
      ];
      setSessions(sessionList);
    }
  }, [isLoading, userImagesData]);

  useEffect(() => {
    filterItems();
  }, [mediaItems, searchTerm, clientFilter, typeFilter]);

  // Removed local mock data fetch in favor of live API

  const filterItems = () => {
    let filtered = mediaItems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sessionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(item => item.clientId === clientFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    setFilteredItems(filtered);
  };

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadProgress(progress);
        }
        
        // Simulate successful upload (client/session default to General)
        const newItem: MediaItem = {
          id: Date.now().toString() + index,
          name: file.name,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: URL.createObjectURL(file),
          thumbnail: undefined,
          size: file.size,
          uploadDate: new Date().toISOString().split('T')[0],
          clientId: 'general',
          clientName: 'My Library',
          sessionId: 'general',
          sessionName: 'General',
          tags: [],
        };
        return newItem;
      });

      const uploadedItems = await Promise.all(uploadPromises);
      setMediaItems(prev => [...uploadedItems, ...prev]);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
      setMediaItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
    }
  };

  const handleDownloadSelected = () => {
    const selectedMedia = mediaItems.filter(item => selectedItems.includes(item.id));
    console.log('Downloading items:', selectedMedia.map(item => item.name));
      
    var download = selectedMedia.map(item => item.url);

    for (const item of download) {
      const link = document.createElement('a');
      link.href = item;
      link.download = item.split('/').pop() || item;
      link.click();
    }
    // alert(`Downloading ${selectedItems.length} items...`);
  };

  const handleShareSelected = () => {
    const selectedMedia = mediaItems.filter(item => selectedItems.includes(item.id));
    if (selectedMedia.length === 0) {
      alert('Select at least one item to share.');
      return;
    }
    // Open QR modal for the first selected item
    var share = selectedMedia.map(item => item.url);
    for (const item of share) {
      const link = document.createElement('a');
      link.href = item;
      link.download = item.split('/').pop() || item;
      link.target = '_blank';
      link.click();
    }
    setQrItem(selectedMedia[0]);
  };

  const handleGenerateBarcodes = () => {
    const selectedMedia = mediaItems.filter(item => selectedItems.includes(item.id));
    if (selectedMedia.length === 0) {
      alert('Select at least one item to generate QR.');
      return;
    }
    // Reuse QR modal for per-item QR preview
    setQrItem(selectedMedia[0]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Display filename cleanly (keep original name, trim length only)
  const getDisplayName = (filename: string): string => {
    if (!filename) return 'Untitled';
    const base = filename.split('/').pop() || filename;
    const noExt = base.replace(/\.[^.]+$/, '');
    const display = noExt;
    if (display.length > 28) {
      return display.slice(0, 18) + '…' + display.slice(-8);
    }
    return display;
  };

  const buildShareUrl = (item: MediaItem): string => {
    const target = item.url || item.id;
    const encoded = encodeURIComponent(btoa(target));
    return `${window.location.origin}/view?u=${encoded}`;
  };

  const copyTextToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied');
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        alert('Copied');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const generateQrPngBlob = async (value: string, size: number = 512): Promise<Blob> => {
    const svgString = ReactDOMServer.renderToStaticMarkup(
      <QRCode value={value} size={size} level="M" />
    );
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    return await new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Failed to create QR image blob'));
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load QR SVG'));
      };
      img.src = url;
    });
  };

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner"></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-loading">
        <p>Failed to load gallery.</p>
      </div>
    );
  }

  return (
    <div className="photo-gallery">
      {/* Header */}
      <header className="gallery-header">
        <div className="header-left">
          <Link to="/studio/dashboard" className="back-link">
            <FaArrowLeft />
            Dashboard
          </Link>
          <div className="page-title">
            <FaImages className="title-icon" />
            <h1>Photo Gallery</h1>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="upload-btn"
            // onClick={() => setShowUploadModal(true)}
            onClick={() => window.location.href = '/upload'}
          >
            <FaUpload />
            Upload Media
          </button>
        </div>
      </header>

      {/* Filters and Controls */}
      <div className="gallery-controls">
        <div className="search-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search photos, videos, clients, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-groups">
            <FaFilter className="filter-icon" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-groups">
           <FaFilter className="filter-icon" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">All Media</option>
              <option value="image">Photos Only</option>
              <option value="video">Videos Only</option>
            </select>
          </div>

          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FaImages />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FaFolder />
            </button>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      {selectedItems.length > 0 && (
        <div className="selection-controls">
          <div className="selection-info">
            <span>{selectedItems.length} items selected</span>
            <button 
              className="select-all-btn"
              onClick={handleSelectAll}
            >
              {selectedItems.length === filteredItems.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="selection-actions">
            <button 
              className="action-btns download"
              onClick={handleDownloadSelected}
            >
              <FaDownload />
              Download
            </button>
            <button 
              className="action-btns share"
              onClick={handleShareSelected}
            >
              <FaShare />
              Share
            </button>
            <button 
              className="action-btns barcode"
              onClick={handleGenerateBarcodes}
            >
              <FaQrcode />
              Generate Barcodes
            </button>
          </div>
        </div>
      )}

      {/* Media Grid/List */}
      <div className={`media-container ${viewMode}`}>
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <FaImages className="empty-icon" />
            <h3>No media found</h3>
            <p>Try adjusting your filters or upload some photos and videos.</p>
            <button 
              className="upload-first-btn"
              onClick={() => navigate('/upload')}
            >
              <FaUpload />
              Upload Your First Media
            </button>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div 
              key={item.id} 
              className={`media-item ${selectedItems.includes(item.id) ? 'selected' : ''}`}
              onClick={() => handleSelectItem(item.id)}
            >
              <div className="media-preview">
                {item.type === 'image' ? (
                  <img 
                    src={item.thumbnail || item.url || 'https://placehold.co/1200x800'} 
                    alt={getDisplayName(item.name)}
                    loading="lazy"
                    decoding="async"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerItem(item);
                    }}
                    onError={(e) => {
                      const imgEl = e.target as HTMLImageElement;
                      const primary = item.thumbnail || '';
                      const secondary = item.url || '';
                      if (imgEl.src !== secondary && secondary) {
                        imgEl.src = secondary;
                      } else {
                        imgEl.src = 'https://placehold.co/1200x800?text=Preview+Unavailable';
                      }
                    }}
                  />
                ) : (
                  <div className="video-preview">
                    <video 
                      src={item.url}
                      poster={item.thumbnail}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewerItem(item);
                      }}
                    />
                    <div className="video-overlay">
                      <FaVideo />
                    </div>
                  </div>
                )}
                {/* Overlay actions intentionally removed; persistent actions shown below */}

                {selectedItems.includes(item.id) && (
                  <div className="selection-indicator">
                    <FaCheck />
                  </div>
                )}
              </div>
              {viewMode === 'grid' && (
                <div className="media-actions">
                  <button 
                    className="media-action-btn view"
                    title="View"
                    aria-label="View"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerItem(item);
                    }}
                  >
                    <FaEye />
                    <span className="label">View</span>
                  </button>
                  {/* <button 
                    className="media-action-btn edit"
                    title="Edit"
                    aria-label="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open edit modal
                    }}
                  >
                    <FaEdit />
                    <span className="label">Edit</span>
                  </button> */}
                  <button 
                    className="media-action-btn barcode"
                    title="Barcode"
                    aria-label="Barcode"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrItem(item);
                    }}
                  >
                    <FaQrcode />
                    <span className="label">Code</span>
                  </button>
                </div>
              )}
              {viewMode === 'grid' && (
                <div className="media-caption" title={item.name}>
                  {getDisplayName(item.name)}
                </div>
              )}
              {viewMode === 'list' && (
              <div className="media-info">
                <h4 className="media-name" title={item.name}>{getDisplayName(item.name)}</h4>
                <p className="media-meta">
                  {item.clientName} • {item.sessionName}
                </p>
                <div className="media-details">
                  {item.size > 0 && (
                    <span className="file-size">{formatFileSize(item.size)}</span>
                  )}
                  <span className="upload-date">{formatDate(item.uploadDate)}</span>
                  {item.barcode && (
                    <span className="barcode">#{item.barcode}</span>
                  )}
                </div>
                {item.tags.length > 0 && (
                  <div className="media-tags">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="media-actions">
                  <button 
                    className="media-action-btn view"
                    title="View"
                    aria-label="View"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerItem(item);
                    }}
                  >
                    <FaEye />
                    <span className="label">View</span>
                  </button>
                  {/* <button 
                    className="media-action-btn edit"
                    title="Edit"
                    aria-label="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open edit modal
                    }}
                  >
                    <FaEdit />
                    <span className="label">Edit</span>
                  </button> */}
                  <button 
                    className="media-action-btn barcode"
                    title="Barcode"
                    aria-label="Barcode"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrItem(item);
                    }}
                  >
                    <FaQrcode />
                    <span className="label">Code</span>
                  </button>
                </div>
              </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content upload-modal">
            <div className="modal-header">
              <h2>Upload Media</h2>
              <button 
                className="close-btn"
                onClick={() => setShowUploadModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="upload-area">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,video/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="upload-dropzone">
                <FaUpload className="upload-icon" />
                <h3>Drop files here or click to browse</h3>
                <p>Supports images and videos up to 100MB each</p>
              </label>

              {uploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p>Uploading... {uploadProgress}%</p>
                </div>
              )}
            </div>

            <div className="upload-options">
              <div className="option-group">
                <label>Client</label>
                <select>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="option-group">
                <label>Session</label>
                <select>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewerItem && (
        <div className="modal-overlay">
          <div className="modal-content upload-modal">
            <div className="modal-header">
              <h2>{getDisplayName(viewerItem.name)}</h2>
              <button 
                className="close-btn"
                onClick={() => setViewerItem(null)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="upload-area" style={{ display: 'flex', justifyContent: 'center' }}>
              {viewerItem.type === 'image' ? (
                <img
                  src={viewerItem.url || viewerItem.thumbnail || 'https://placehold.co/1600x1200'}
                  alt={viewerItem.name}
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12 }}
                />
              ) : (
                <video
                  src={viewerItem.url}
                  poster={viewerItem.thumbnail}
                  controls
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12 }}
                />
              )}
            </div>

            <div className="upload-options" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="option-group">
                <label>Filename</label>
                <div>{viewerItem.name}</div>
              </div>
              <div className="option-group">
                <label>Uploaded</label>
                <div>{formatDate(viewerItem.uploadDate)}</div>
              </div>
              <div className="option-group">
                <label>Client • Session</label>
                <div>{viewerItem.clientName} • {viewerItem.sessionName}</div>
              </div>
              {viewerItem.size > 0 && (
                <div className="option-group">
                  <label>Size</label>
                  <div>{formatFileSize(viewerItem.size)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrItem && (
        <div className="modal-overlay">
          <div className="modal-content upload-modal">
            <div className="modal-header">
              <h2>QR Code</h2>
              <button 
                className="close-btn"
                onClick={() => setQrItem(null)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="upload-area" style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: 16, borderRadius: 12 }}>
                <QRCode value={buildShareUrl(qrItem)} size={220} level="M" />
              </div>
            </div>

            <div className="upload-options" style={{ gridTemplateColumns: '1fr 220px', alignItems: 'end' }}>
              <div className="option-group">
                <label>Item</label>
                <div>{getDisplayName(qrItem.name)}</div>
              </div>
              <div className="option-group" style={{ alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="media-action-btn view"
                    title="Open link"
                    aria-label="Open link"
                    onClick={() => {
                      const url = buildShareUrl(qrItem);
                      window.open(url, '_blank', 'noopener');
                    }}
                  >
                    <FaEye />
                    <span className="label">Open</span>
                  </button>
                  <button
                    className="media-action-btn view"
                    title="Copy link"
                    aria-label="Copy link"
                    onClick={() => {
                      const qrValue = buildShareUrl(qrItem);
                      const svgMarkup = ReactDOMServer.renderToStaticMarkup(
                        <QRCode value={qrValue} size={220} level="M" />
                      );
                      copyTextToClipboard(svgMarkup);
                    }}
                  >
                    <FaCopy />
                    <span className="label">Copy QR</span>
                  </button>
                  <button
                    className="media-action-btn share"
                    title="Share link"
                    aria-label="Share link"
                    onClick={async () => {
                      const shareValue = buildShareUrl(qrItem);
                      try {
                        const blob = await generateQrPngBlob(shareValue, 512);
                        const file = new File([blob], `${getDisplayName(qrItem.name)}-qr.png`, { type: 'image/png' });
                        // @ts-ignore
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                          // @ts-ignore
                          await navigator.share({ files: [file], title: getDisplayName(qrItem.name) });
                        } else if (navigator.share) {
                          await navigator.share({ title: getDisplayName(qrItem.name), url: shareValue });
                        } else {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${getDisplayName(qrItem.name)}-qr.png`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                          alert('Downloaded QR image');
                        }
                      } catch (e) {
                        alert('Failed to share QR');
                      }
                    }}
                  >
                    <FaShare />
                    <span className="label">Share QR</span>
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

export default PhotoGallery;
