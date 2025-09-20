import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  FaSpinner
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [mediaItems, searchTerm, clientFilter, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockClients: Client[] = [
        { id: '1', name: 'Sarah Johnson' },
        { id: '2', name: 'Mike Chen' },
        { id: '3', name: 'Emily Davis' }
      ];

      const mockSessions: Session[] = [
        { id: 's1', name: 'Portrait Session', clientId: '1' },
        { id: 's2', name: 'Corporate Headshots', clientId: '2' },
        { id: 's3', name: 'Wedding Photography', clientId: '3' }
      ];

      const mockMediaItems: MediaItem[] = [
        {
          id: '1',
          name: 'portrait_001.jpg',
          type: 'image',
          url: '/api/media/1',
          thumbnail: '/api/thumbnails/1',
          size: 2048576,
          uploadDate: '2024-09-10',
          clientId: '1',
          clientName: 'Sarah Johnson',
          sessionId: 's1',
          sessionName: 'Portrait Session',
          tags: ['portrait', 'professional'],
          barcode: 'PS001'
        },
        {
          id: '2',
          name: 'portrait_002.jpg',
          type: 'image',
          url: '/api/media/2',
          thumbnail: '/api/thumbnails/2',
          size: 1876543,
          uploadDate: '2024-09-10',
          clientId: '1',
          clientName: 'Sarah Johnson',
          sessionId: 's1',
          sessionName: 'Portrait Session',
          tags: ['portrait', 'outdoor'],
          barcode: 'PS002'
        },
        {
          id: '3',
          name: 'headshot_001.jpg',
          type: 'image',
          url: '/api/media/3',
          thumbnail: '/api/thumbnails/3',
          size: 1654321,
          uploadDate: '2024-09-08',
          clientId: '2',
          clientName: 'Mike Chen',
          sessionId: 's2',
          sessionName: 'Corporate Headshots',
          tags: ['corporate', 'headshot'],
          barcode: 'CH001'
        },
        {
          id: '4',
          name: 'wedding_ceremony.mp4',
          type: 'video',
          url: '/api/media/4',
          thumbnail: '/api/thumbnails/4',
          size: 52428800,
          uploadDate: '2024-08-25',
          clientId: '3',
          clientName: 'Emily Davis',
          sessionId: 's3',
          sessionName: 'Wedding Photography',
          tags: ['wedding', 'ceremony', 'video'],
          barcode: 'WP001'
        }
      ];

      setClients(mockClients);
      setSessions(mockSessions);
      setMediaItems(mockMediaItems);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        
        // Simulate successful upload
        const newItem: MediaItem = {
          id: Date.now().toString() + index,
          name: file.name,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: URL.createObjectURL(file),
          size: file.size,
          uploadDate: new Date().toISOString().split('T')[0],
          clientId: '1', // Default client for demo
          clientName: 'Sarah Johnson',
          sessionId: 's1',
          sessionName: 'New Session',
          tags: []
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
    // In a real app, this would trigger actual downloads
    alert(`Downloading ${selectedItems.length} items...`);
  };

  const handleShareSelected = () => {
    const selectedMedia = mediaItems.filter(item => selectedItems.includes(item.id));
    console.log('Sharing items:', selectedMedia.map(item => item.name));
    // In a real app, this would open a share dialog
    alert(`Sharing ${selectedItems.length} items...`);
  };

  const handleGenerateBarcodes = () => {
    const selectedMedia = mediaItems.filter(item => selectedItems.includes(item.id));
    console.log('Generating barcodes for:', selectedMedia.map(item => item.name));
    // In a real app, this would generate QR codes
    alert(`Generating barcodes for ${selectedItems.length} items...`);
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

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner"></div>
        <p>Loading gallery...</p>
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
            onClick={() => setShowUploadModal(true)}
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
          <div className="filter-group">
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

          <div className="filter-group">
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
              className="action-btn download"
              onClick={handleDownloadSelected}
            >
              <FaDownload />
              Download
            </button>
            <button 
              className="action-btn share"
              onClick={handleShareSelected}
            >
              <FaShare />
              Share
            </button>
            <button 
              className="action-btn barcode"
              onClick={handleGenerateBarcodes}
            >
              <FaQrcode />
              Generate Barcodes
            </button>
            <button 
              className="action-btn delete"
              onClick={handleDeleteSelected}
            >
              <FaTrash />
              Delete
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
              onClick={() => setShowUploadModal(true)}
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
                    src={item.thumbnail || item.url} 
                    alt={item.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x400';
                    }}
                  />
                ) : (
                  <div className="video-preview">
                    <video 
                      src={item.url}
                      poster={item.thumbnail}
                    />
                    <div className="video-overlay">
                      <FaVideo />
                    </div>
                  </div>
                )}
                
                <div className="media-overlay">
                  <div className="overlay-actions">
                    <button 
                      className="overlay-btn view"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open media viewer
                      }}
                    >
                      <FaEye />
                    </button>
                    <button 
                      className="overlay-btn edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open edit modal
                      }}
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="overlay-btn barcode"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show barcode
                      }}
                    >
                      <FaQrcode />
                    </button>
                  </div>
                </div>

                {selectedItems.includes(item.id) && (
                  <div className="selection-indicator">
                    <FaCheck />
                  </div>
                )}
              </div>

              <div className="media-info">
                <h4 className="media-name">{item.name}</h4>
                <p className="media-meta">
                  {item.clientName} • {item.sessionName}
                </p>
                <div className="media-details">
                  <span className="file-size">{formatFileSize(item.size)}</span>
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
              </div>
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
    </div>
  );
};

export default PhotoGallery;
