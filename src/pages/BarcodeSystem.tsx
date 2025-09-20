import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaQrcode, 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaDownload,
  FaShare,
  FaArrowLeft,
  FaCamera,
  FaImages,
  FaPlus,
  FaTimes,
  FaPrint,
  FaCopy,
  FaCheck,
  FaSpinner,
  FaBarcode
} from 'react-icons/fa';
import './BarcodeSystem.css';

interface BarcodeItem {
  id: string;
  mediaId: string;
  mediaName: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnail?: string;
  barcode: string;
  qrCode: string;
  clientId: string;
  clientName: string;
  sessionId: string;
  sessionName: string;
  createdAt: string;
  isActive: boolean;
  scanCount: number;
  lastScanned?: string;
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

const BarcodeSystem: React.FC = () => {
  const [barcodeItems, setBarcodeItems] = useState<BarcodeItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BarcodeItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBarcodeViewer, setShowBarcodeViewer] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<BarcodeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [barcodeItems, searchTerm, clientFilter, statusFilter]);

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

      const mockBarcodeItems: BarcodeItem[] = [
        {
          id: '1',
          mediaId: 'm1',
          mediaName: 'portrait_001.jpg',
          mediaType: 'image',
          mediaUrl: '/api/media/1',
          thumbnail: '/api/thumbnails/1',
          barcode: 'PS001',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          clientId: '1',
          clientName: 'Sarah Johnson',
          sessionId: 's1',
          sessionName: 'Portrait Session',
          createdAt: '2024-09-10',
          isActive: true,
          scanCount: 5,
          lastScanned: '2024-09-12'
        },
        {
          id: '2',
          mediaId: 'm2',
          mediaName: 'portrait_002.jpg',
          mediaType: 'image',
          mediaUrl: '/api/media/2',
          thumbnail: '/api/thumbnails/2',
          barcode: 'PS002',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          clientId: '1',
          clientName: 'Sarah Johnson',
          sessionId: 's1',
          sessionName: 'Portrait Session',
          createdAt: '2024-09-10',
          isActive: true,
          scanCount: 3,
          lastScanned: '2024-09-11'
        },
        {
          id: '3',
          mediaId: 'm3',
          mediaName: 'headshot_001.jpg',
          mediaType: 'image',
          mediaUrl: '/api/media/3',
          thumbnail: '/api/thumbnails/3',
          barcode: 'CH001',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          clientId: '2',
          clientName: 'Mike Chen',
          sessionId: 's2',
          sessionName: 'Corporate Headshots',
          createdAt: '2024-09-08',
          isActive: false,
          scanCount: 0
        }
      ];

      setClients(mockClients);
      setSessions(mockSessions);
      setBarcodeItems(mockBarcodeItems);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = barcodeItems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.mediaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sessionName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(item => item.clientId === clientFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => 
        statusFilter === 'active' ? item.isActive : !item.isActive
      );
    }

    setFilteredItems(filtered);
  };

  const generateBarcodes = async (mediaIds: string[]) => {
    setGenerating(true);
    try {
      // Simulate barcode generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newBarcodes: BarcodeItem[] = mediaIds.map((mediaId, index) => ({
        id: Date.now().toString() + index,
        mediaId,
        mediaName: `media_${mediaId}.jpg`,
        mediaType: 'image' as const,
        mediaUrl: `/api/media/${mediaId}`,
        thumbnail: `/api/thumbnails/${mediaId}`,
        barcode: `BC${Date.now().toString().slice(-6)}${index}`,
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        clientId: '1',
        clientName: 'Sarah Johnson',
        sessionId: 's1',
        sessionName: 'New Session',
        createdAt: new Date().toISOString().split('T')[0],
        isActive: true,
        scanCount: 0
      }));

      setBarcodeItems(prev => [...newBarcodes, ...prev]);
      setShowGenerateModal(false);
    } catch (error) {
      console.error('Error generating barcodes:', error);
    } finally {
      setGenerating(false);
    }
  };

  const toggleBarcodeStatus = (barcodeId: string) => {
    setBarcodeItems(prev => prev.map(item => 
      item.id === barcodeId 
        ? { ...item, isActive: !item.isActive }
        : item
    ));
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

  const copyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    // Show success message
  };

  const printBarcode = (item: BarcodeItem) => {
    // Open print dialog with barcode
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Barcode - ${item.barcode}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .barcode-container { margin: 20px 0; }
              .barcode-info { margin: 10px 0; }
              .qr-code { margin: 20px 0; }
            </style>
          </head>
          <body>
            <h2>${item.mediaName}</h2>
            <div class="barcode-container">
              <div class="barcode-info">
                <strong>Barcode:</strong> ${item.barcode}
              </div>
              <div class="qr-code">
                <img src="${item.qrCode}" alt="QR Code" style="width: 200px; height: 200px;">
              </div>
              <div class="barcode-info">
                <strong>Client:</strong> ${item.clientName}<br>
                <strong>Session:</strong> ${item.sessionName}
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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
      <div className="barcode-loading">
        <div className="loading-spinner"></div>
        <p>Loading barcode system...</p>
      </div>
    );
  }

  return (
    <div className="barcode-system">
      {/* Header */}
      <header className="barcode-header">
        <div className="header-left">
          <Link to="/studio/dashboard" className="back-link">
            <FaArrowLeft />
            Dashboard
          </Link>
          <div className="page-title">
            <FaQrcode className="title-icon" />
            <h1>Barcode System</h1>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="generate-btn"
            onClick={() => setShowGenerateModal(true)}
          >
            <FaPlus />
            Generate Barcodes
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="barcode-filters">
        <div className="search-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search barcodes, media, or clients..."
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
            <button className="action-btn print">
              <FaPrint />
              Print Selected
            </button>
            <button className="action-btn deactivate">
              <FaTimes />
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Barcode Grid */}
      <div className="barcode-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <FaQrcode className="empty-icon" />
            <h3>No barcodes found</h3>
            <p>Generate barcodes for your photos and videos to enable easy sharing.</p>
            <button 
              className="generate-first-btn"
              onClick={() => setShowGenerateModal(true)}
            >
              <FaPlus />
              Generate Your First Barcode
            </button>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div 
              key={item.id} 
              className={`barcode-card ${selectedItems.includes(item.id) ? 'selected' : ''}`}
              onClick={() => handleSelectItem(item.id)}
            >
              <div className="card-header">
                <div className="media-preview">
                  {item.mediaType === 'image' ? (
                    <img 
                      src={item.thumbnail || item.mediaUrl} 
                      alt={item.mediaName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400';
                      }}
                    />
                  ) : (
                    <div className="video-preview">
                      <FaCamera />
                    </div>
                  )}
                </div>
                <div className="barcode-info">
                  <h3>{item.mediaName}</h3>
                  <p>{item.clientName} • {item.sessionName}</p>
                  <div className="barcode-code">
                    <FaBarcode />
                    <span>{item.barcode}</span>
                    <button 
                      className="copy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyBarcode(item.barcode);
                      }}
                    >
                      <FaCopy />
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-content">
                <div className="qr-code-section">
                  <img 
                    src={item.qrCode} 
                    alt="QR Code" 
                    className="qr-code"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBarcode(item);
                      setShowBarcodeViewer(true);
                    }}
                  />
                  <p>Click QR code to view</p>
                </div>

                <div className="barcode-stats">
                  <div className="stat">
                    <span className="label">Scans:</span>
                    <span className="value">{item.scanCount}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Status:</span>
                    <span className={`status ${item.isActive ? 'active' : 'inactive'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(item.createdAt)}</span>
                  </div>
                  {item.lastScanned && (
                    <div className="stat">
                      <span className="label">Last Scanned:</span>
                      <span className="value">{formatDate(item.lastScanned)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions">
                <button 
                  className="action-btn view"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBarcode(item);
                    setShowBarcodeViewer(true);
                  }}
                >
                  <FaEye />
                  View
                </button>
                <button 
                  className="action-btn print"
                  onClick={(e) => {
                    e.stopPropagation();
                    printBarcode(item);
                  }}
                >
                  <FaPrint />
                  Print
                </button>
                <button 
                  className={`action-btn ${item.isActive ? 'deactivate' : 'activate'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBarcodeStatus(item.id);
                  }}
                >
                  {item.isActive ? <FaTimes /> : <FaCheck />}
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Generate Barcode Modal */}
      {showGenerateModal && (
        <div className="modal-overlay">
          <div className="modal-content generate-modal">
            <div className="modal-header">
              <h2>Generate Barcodes</h2>
              <button 
                className="close-btn"
                onClick={() => setShowGenerateModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="generate-content">
              <div className="media-selection">
                <h3>Select Media to Generate Barcodes</h3>
                <div className="media-list">
                  {/* Mock media items for selection */}
                  {[
                    { id: 'm1', name: 'portrait_001.jpg', type: 'image' },
                    { id: 'm2', name: 'portrait_002.jpg', type: 'image' },
                    { id: 'm3', name: 'headshot_001.jpg', type: 'image' },
                    { id: 'm4', name: 'wedding_001.mp4', type: 'video' }
                  ].map((media) => (
                    <div key={media.id} className="media-item">
                      <input 
                        type="checkbox" 
                        id={media.id}
                        className="media-checkbox"
                      />
                      <label htmlFor={media.id} className="media-label">
                        <div className="media-icon">
                          {media.type === 'image' ? <FaImages /> : <FaCamera />}
                        </div>
                        <span>{media.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="generate-options">
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

            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="generate-btn"
                onClick={() => generateBarcodes(['m1', 'm2'])}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <FaSpinner className="spinning" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaQrcode />
                    Generate Barcodes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Viewer Modal */}
      {showBarcodeViewer && selectedBarcode && (
        <div className="modal-overlay">
          <div className="modal-content barcode-viewer">
            <div className="modal-header">
              <h2>Barcode Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowBarcodeViewer(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="viewer-content">
              <div className="media-info">
                <div className="media-preview-large">
                  {selectedBarcode.mediaType === 'image' ? (
                    <img 
                      src={selectedBarcode.thumbnail || selectedBarcode.mediaUrl} 
                      alt={selectedBarcode.mediaName}
                    />
                  ) : (
                    <div className="video-preview-large">
                      <FaCamera />
                    </div>
                  )}
                </div>
                <div className="media-details">
                  <h3>{selectedBarcode.mediaName}</h3>
                  <p><strong>Client:</strong> {selectedBarcode.clientName}</p>
                  <p><strong>Session:</strong> {selectedBarcode.sessionName}</p>
                  <p><strong>Barcode:</strong> {selectedBarcode.barcode}</p>
                  <p><strong>Created:</strong> {formatDate(selectedBarcode.createdAt)}</p>
                  <p><strong>Scans:</strong> {selectedBarcode.scanCount}</p>
                </div>
              </div>

              <div className="qr-code-large">
                <img src={selectedBarcode.qrCode} alt="QR Code" />
                <p>Scan this QR code to view the media</p>
              </div>
            </div>

            <div className="viewer-actions">
              <button 
                className="action-btn copy"
                onClick={() => copyBarcode(selectedBarcode.barcode)}
              >
                <FaCopy />
                Copy Barcode
              </button>
              <button 
                className="action-btn print"
                onClick={() => printBarcode(selectedBarcode)}
              >
                <FaPrint />
                Print
              </button>
              <button 
                className="action-btn share"
                onClick={() => {
                  // Share functionality
                  navigator.share?.({
                    title: selectedBarcode.mediaName,
                    text: `Check out this photo: ${selectedBarcode.barcode}`,
                    url: window.location.href
                  });
                }}
              >
                <FaShare />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeSystem;
