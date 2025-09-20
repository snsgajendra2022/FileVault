import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaImages, 
  FaVideo, 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaShare,
  FaQrcode,
  FaArrowLeft,
  FaCamera,
  FaFolder,
  FaFolderOpen,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaHeart,
  FaDownload,
  FaLock
} from 'react-icons/fa';
import './ClientPortal.css';

interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  size: number;
  uploadDate: string;
  sessionId: string;
  sessionName: string;
  tags: string[];
  barcode?: string;
  isFavorite?: boolean;
}

interface Client {
  id: string;
  name: string;
  email: string;
  studioName: string;
  totalPhotos: number;
  totalVideos: number;
  sessions: Session[];
}

interface Session {
  id: string;
  name: string;
  date: string;
  photos: number;
  videos: number;
}

const ClientPortal: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  useEffect(() => {
    filterItems();
  }, [mediaItems, selectedSession, typeFilter, searchTerm]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockClient: Client = {
        id: clientId || '1',
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        studioName: 'Elite Photography Studio',
        totalPhotos: 45,
        totalVideos: 8,
        sessions: [
          {
            id: 's1',
            name: 'Portrait Session',
            date: '2024-09-10',
            photos: 25,
            videos: 3
          },
          {
            id: 's2',
            name: 'Outdoor Shoot',
            date: '2024-08-15',
            photos: 20,
            videos: 5
          }
        ]
      };

      const mockMediaItems: MediaItem[] = [
        {
          id: '1',
          name: 'portrait_001.jpg',
          type: 'image',
          url: '/api/media/1',
          thumbnail: '/api/thumbnails/1',
          size: 2048576,
          uploadDate: '2024-09-10',
          sessionId: 's1',
          sessionName: 'Portrait Session',
          tags: ['portrait', 'professional'],
          barcode: 'PS001',
          isFavorite: true
        },
        {
          id: '2',
          name: 'portrait_002.jpg',
          type: 'image',
          url: '/api/media/2',
          thumbnail: '/api/thumbnails/2',
          size: 1876543,
          uploadDate: '2024-09-10',
          sessionId: 's1',
          sessionName: 'Portrait Session',
          tags: ['portrait', 'outdoor'],
          barcode: 'PS002'
        },
        {
          id: '3',
          name: 'outdoor_001.jpg',
          type: 'image',
          url: '/api/media/3',
          thumbnail: '/api/thumbnails/3',
          size: 1654321,
          uploadDate: '2024-08-15',
          sessionId: 's2',
          sessionName: 'Outdoor Shoot',
          tags: ['outdoor', 'nature'],
          barcode: 'OS001'
        },
        {
          id: '4',
          name: 'portrait_video.mp4',
          type: 'video',
          url: '/api/media/4',
          thumbnail: '/api/thumbnails/4',
          size: 52428800,
          uploadDate: '2024-09-10',
          sessionId: 's1',
          sessionName: 'Portrait Session',
          tags: ['portrait', 'video'],
          barcode: 'PV001'
        }
      ];

      setClient(mockClient);
      setMediaItems(mockMediaItems);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = mediaItems;

    // Session filter
    if (selectedSession !== 'all') {
      filtered = filtered.filter(item => item.sessionId === selectedSession);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sessionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredItems(filtered);
  };

  const openMediaViewer = (media: MediaItem) => {
    setSelectedMedia(media);
    const index = filteredItems.findIndex(item => item.id === media.id);
    setCurrentImageIndex(index);
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : filteredItems.length - 1;
      setCurrentImageIndex(newIndex);
      setSelectedMedia(filteredItems[newIndex]);
    } else {
      const newIndex = currentImageIndex < filteredItems.length - 1 ? currentImageIndex + 1 : 0;
      setCurrentImageIndex(newIndex);
      setSelectedMedia(filteredItems[newIndex]);
    }
  };

  const toggleFavorite = (mediaId: string) => {
    setMediaItems(prev => prev.map(item => 
      item.id === mediaId 
        ? { ...item, isFavorite: !item.isFavorite }
        : item
    ));
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
      <div className="portal-loading">
        <div className="loading-spinner"></div>
        <p>Loading your gallery...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="portal-error">
        <h2>Client not found</h2>
        <p>The requested client gallery could not be found.</p>
        <button onClick={() => navigate('/')} className="back-home-btn">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="client-portal">
      {/* Header */}
      <header className="portal-header">
        <div className="header-content">
          <div className="studio-info">
            <h1>{client.studioName}</h1>
            <p>Welcome back, {client.name}</p>
          </div>
          <div className="header-actions">
            <button className="share-btn">
              <FaShare />
              Share Gallery
            </button>
          </div>
        </div>
      </header>

      {/* Client Stats */}
      <section className="client-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <FaImages className="stat-icon" />
            <div>
              <h3>{client.totalPhotos}</h3>
              <p>Photos</p>
            </div>
          </div>
          <div className="stat-item">
            <FaVideo className="stat-icon" />
            <div>
              <h3>{client.totalVideos}</h3>
              <p>Videos</p>
            </div>
          </div>
          <div className="stat-item">
            <FaFolder className="stat-icon" />
            <div>
              <h3>{client.sessions.length}</h3>
              <p>Sessions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sessions */}
      <section className="sessions-section">
        <h2>Your Sessions</h2>
        <div className="sessions-grid">
          {client.sessions.map((session) => (
            <div 
              key={session.id} 
              className={`session-card ${selectedSession === session.id ? 'active' : ''}`}
              onClick={() => setSelectedSession(selectedSession === session.id ? 'all' : session.id)}
            >
              <div className="session-info">
                <h3>{session.name}</h3>
                <p>{formatDate(session.date)}</p>
              </div>
              <div className="session-stats">
                <span>{session.photos} photos</span>
                <span>{session.videos} videos</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery Controls */}
      <section className="gallery-controls">
        <div className="search-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search your photos and videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filters-section">
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
      </section>

      {/* Media Gallery */}
      <section className="media-gallery">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <FaImages className="empty-icon" />
            <h3>No media found</h3>
            <p>Try adjusting your filters or select a different session.</p>
          </div>
        ) : (
          <div className={`media-container ${viewMode}`}>
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="media-item"
                onClick={() => openMediaViewer(item)}
              >
                <div className="media-preview">
                  {item.type === 'image' ? (
                    <img 
                      src={item.thumbnail || item.url} 
                      alt={item.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
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
                          openMediaViewer(item);
                        }}
                      >
                        <FaEye />
                      </button>
                      <button 
                        className={`overlay-btn favorite ${item.isFavorite ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                      >
                        <FaHeart />
                      </button>
                    </div>
                  </div>

                  {item.isFavorite && (
                    <div className="favorite-indicator">
                      <FaHeart />
                    </div>
                  )}
                </div>

                <div className="media-info">
                  <h4 className="media-name">{item.name}</h4>
                  <p className="media-meta">{item.sessionName}</p>
                  <div className="media-details">
                    <span className="file-size">{formatFileSize(item.size)}</span>
                    <span className="upload-date">{formatDate(item.uploadDate)}</span>
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
            ))}
          </div>
        )}
      </section>

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div className="media-viewer-overlay">
          <div className="media-viewer">
            <div className="viewer-header">
              <div className="media-info-header">
                <h3>{selectedMedia.name}</h3>
                <p>{selectedMedia.sessionName} • {formatDate(selectedMedia.uploadDate)}</p>
              </div>
              <div className="viewer-actions">
                <button 
                  className={`favorite-btn ${selectedMedia.isFavorite ? 'active' : ''}`}
                  onClick={() => toggleFavorite(selectedMedia.id)}
                >
                  <FaHeart />
                </button>
                <button 
                  className="share-btn"
                  onClick={() => {
                    // Share functionality
                    navigator.share?.({
                      title: selectedMedia.name,
                      text: `Check out this photo from ${client.studioName}`,
                      url: window.location.href
                    });
                  }}
                >
                  <FaShare />
                </button>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedMedia(null)}
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="viewer-content">
              <button 
                className="nav-btn prev"
                onClick={() => navigateMedia('prev')}
              >
                <FaChevronLeft />
              </button>

              <div className="media-display">
                {selectedMedia.type === 'image' ? (
                  <img 
                    src={selectedMedia.url} 
                    alt={selectedMedia.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                    }}
                  />
                ) : (
                  <video 
                    src={selectedMedia.url}
                    controls
                    poster={selectedMedia.thumbnail}
                  />
                )}
              </div>

              <button 
                className="nav-btn next"
                onClick={() => navigateMedia('next')}
              >
                <FaChevronRight />
              </button>
            </div>

            <div className="viewer-footer">
              <div className="media-counter">
                {currentImageIndex + 1} of {filteredItems.length}
              </div>
              <div className="download-notice">
                <FaLock />
                <span>Downloading is disabled in client view</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
