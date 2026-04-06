import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOMServer from 'react-dom/server';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
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
  const { t } = useTranslation();
  const { user } = useAuth();
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

  // Function to generate QR code data URL

  // Function to generate shareable URL for QR codes
  const generateShareableUrl = (barcode: string): string => {
    return `${window.location.origin}/client/view/${barcode}`;
  };

      // Build a PNG Blob from a QR SVG rendered by react-qr-code
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

  // Types reused from Images API
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
    queryKey: ['userImages-barcodes'],
    queryFn: async (): Promise<UserImagesResponse> => {
      let token = localStorage.getItem('token');
      const response = await api.get(`/api/images/user/all?token=${token}`);
      return response.data as UserImagesResponse;
    },
    retry: 2,
    refetchInterval: 30000,
    enabled: true,
  });

  // Map images API to barcode items
  useEffect(() => {
    setLoading(isLoading);
    if (!isLoading && userImagesData) {
      const items: BarcodeItem[] = userImagesData.images.map((img, index) => {
        const safeName = (img.filename || 'MEDIA').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const barcode = `${safeName.slice(0, 8)}-${index}`;
        const qrCode = generateShareableUrl(barcode);
        const lower = img.fileType?.toLowerCase?.() || '';
        const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(lower);
        return {
          id: `${img.downloadUrl || img.filename}-${index}`,
          mediaId: `${index}`,
          mediaName: img.filename,
          mediaType: isVideo ? 'video' : 'image',
          mediaUrl: img.downloadUrl,
          thumbnail: img.previewUrl,
          barcode,
          qrCode,
          clientId: 'general',
          clientName: t('photoStudioBarcode.myLibrary'),
          sessionId: 'general',
          sessionName: t('photoStudioBarcode.general'),
          createdAt: img.uploadTime,
          isActive: true,
          scanCount: 0,
        };
      });
      setBarcodeItems(items);
      setClients([{ id: 'general', name: t('photoStudioBarcode.myLibrary') }]);
      setSessions([{ id: 'general', name: t('photoStudioBarcode.general'), clientId: 'general' }]);
    }
  }, [isLoading, userImagesData, t]);

  useEffect(() => {
    filterItems();
  }, [barcodeItems, searchTerm, clientFilter, statusFilter]);

  // Removed local mock data fetch in favor of live API

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
      
      const newBarcodes: BarcodeItem[] = mediaIds.map((mediaId, index) => {
          const barcode = `BC${Date.now().toString().slice(-6)}${index}`;
          const qrCode = generateShareableUrl(barcode);
          
          return {
            id: Date.now().toString() + index,
            mediaId,
            mediaName: `media_${mediaId}.jpg`,
            mediaType: 'image' as const,
            mediaUrl: `/api/media/${mediaId}`,
            thumbnail: `/api/thumbnails/${mediaId}`,
            barcode,
            qrCode,
            clientId: '1',
            clientName: 'Sarah Johnson',
            sessionId: 's1',
            sessionName: 'New Session',
            createdAt: new Date().toISOString().split('T')[0],
            isActive: true,
            scanCount: 0
          };
        });

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

  const regenerateQRCode = (item: BarcodeItem) => {
    try {
      const newQRCode = generateShareableUrl(item.barcode);
      setBarcodeItems(prev => prev.map(barcodeItem => 
        barcodeItem.id === item.id 
          ? { ...barcodeItem, qrCode: newQRCode }
          : barcodeItem
      ));
    } catch (error) {
      console.error('Error regenerating QR code:', error);
    }
  };

  const printBarcode = async (item: BarcodeItem) => {
    // Share QR Code image instead of printing
    const shareUrl = generateShareableUrl(item.barcode);
    try {
      const blob = await generateQrPngBlob(shareUrl, 512);
      const safeName = (item.mediaName || 'media').replace(/[^a-z0-9-_]+/gi, '_');
      const file = new File([blob], `${safeName}-qr.png`, { type: 'image/png' });
      // @ts-ignore - navigator.canShare may not be in TS lib
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // @ts-ignore - share with files
        await navigator.share({ files: [file], title: item.mediaName, text: t('photoStudioBarcode.shareScanText', { url: shareUrl }) });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: item.mediaName, text: t('photoStudioBarcode.shareScanShort'), url: shareUrl });
        return;
      }
      // Fallback: download the QR image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      alert(t('photoStudioBarcode.downloadedQrImage'));
    } catch (e) {
      alert(t('photoStudioBarcode.failedShareQr'));
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
        <p>{t('photoStudioBarcode.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="barcode-loading">
        <p>{t('photoStudioBarcode.failedLoad')}</p>
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
            {t('photoStudioBarcode.dashboard')}
          </Link>
          <div className="page-title">
            <FaQrcode className="title-icon" />
            <h1>{t('photoStudioBarcode.pageTitle')}</h1>
          </div>
        </div>
        {/* <div className="header-actions">
          <button 
            className="generate-btn"
            onClick={() => setShowGenerateModal(true)}
          >
            <FaPlus />
            Generate Barcodes
          </button>
        </div> */}
      </header>

      {/* Filters */}
      <div className="barcode-filters">
        <div className="search-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder={t('photoStudioBarcode.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            {/* <FaFilter className="filter-icon" /> */}
            <select
              value={clientFilter}
              className='filter-select'
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="all">{t('photoStudioBarcode.allClients')}</option>
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
              <option value="all">{t('photoStudioBarcode.allStatus')}</option>
              <option value="active">{t('photoStudioBarcode.active')}</option>
              <option value="inactive">{t('photoStudioBarcode.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      {selectedItems.length > 0 && (
        <div className="selection-controls">
          <div className="selection-info">
            <span>{t('photoStudioBarcode.itemsSelected', { count: selectedItems.length })}</span>
            <button 
              className="select-all-btn"
              onClick={handleSelectAll}
            >
              {selectedItems.length === filteredItems.length ? t('photoStudioBarcode.deselectAll') : t('photoStudioBarcode.selectAll')}
            </button>
          </div>
          <div className="selection-actions">
            <button className="action-btn print">
              <FaPrint />
              {t('photoStudioBarcode.printSelected')}
            </button>
            <button className="action-btn deactivate">
              <FaTimes />
              {t('photoStudioBarcode.deactivate')}
            </button>
          </div>
        </div>
      )}

      {/* Barcode Grid */}
      <div className="barcode-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <FaQrcode className="empty-icon" />
            <h3>{t('photoStudioBarcode.noBarcodesFound')}</h3>
            <p>{t('photoStudioBarcode.noBarcodesHint')}</p>
            {/* <button 
              className="generate-first-btn"
              onClick={() => setShowGenerateModal(true)}
            >
              <FaPlus />
              Generate Your First Barcode
            </button> */}
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
                  <div 
                    className="qr-code"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBarcode(item);
                      setShowBarcodeViewer(true);
                    }}
                  >
                    <QRCode value={item.qrCode} size={200} />
                  </div>
                  <p>{t('photoStudioBarcode.clickQrToView')}</p>
                  <div className="qr-actions">
                    <button
                      className="action-btn copy"
                      onClick={(e) => {
                        e.stopPropagation();
                        (async () => {
                          try {
                            await navigator.clipboard.writeText(item.thumbnail);
                            alert(t('photoStudioBarcode.linkCopied'));
                          } catch {
                            const ta = document.createElement('textarea');
                            ta.value = item.thumbnail;
                            ta.style.position = 'fixed';
                            ta.style.left = '-9999px';
                            document.body.appendChild(ta);
                            ta.focus();
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                            alert(t('photoStudioBarcode.linkCopied'));
                          }
                        })();
                      }}
                    >
                      <FaCopy />
                      {t('photoStudioBarcode.copyLink')}
                    </button>
                  </div>
                </div>

                <div className="barcode-stats">
                  <div className="stat">
                    <span className="label">{t('photoStudioBarcode.scans')}</span>
                    <span className="value">{item.scanCount}</span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('photoStudioBarcode.status')}</span>
                    <span className={`status ${item.isActive ? 'active' : 'inactive'}`}>
                      {item.isActive ? t('photoStudioBarcode.active') : t('photoStudioBarcode.inactive')}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('photoStudioBarcode.created')}</span>
                    <span className="value">{formatDate(item.createdAt)}</span>
                  </div>
                  {item.lastScanned && (
                    <div className="stat">
                      <span className="label">{t('photoStudioBarcode.lastScanned')}</span>
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
                  {t('photoStudioBarcode.view')}
                </button>
                <button 
                  className="action-btn share"
                  onClick={(e) => {
                    e.stopPropagation();
                    printBarcode(item);
                  }}
                >
                  <FaShare />
                  {t('photoStudioBarcode.shareQr')}
                </button>
                <button 
                  className="action-btn refresh"
                  onClick={(e) => {
                    e.stopPropagation();
                    regenerateQRCode(item);
                  }}
                  title={t('photoStudioBarcode.regenerateQrTitle')}
                >
                  <FaQrcode />
                  {t('photoStudioBarcode.refreshQr')}
                </button>
                <button 
                  className={`action-btn ${item.isActive ? 'deactivate' : 'activate'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBarcodeStatus(item.id);
                  }}
                >
                  {item.isActive ? <FaTimes /> : <FaCheck />}
                  {item.isActive ? t('photoStudioBarcode.deactivate') : t('photoStudioBarcode.activate')}
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
              <h2>{t('photoStudioBarcode.generateBarcodes')}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowGenerateModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="generate-content">
              <div className="media-selection">
                <h3>{t('photoStudioBarcode.selectMediaTitle')}</h3>
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
                  <label>{t('photoStudioBarcode.client')}</label>
                  <select>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="option-group">
                  <label>{t('photoStudioBarcode.session')}</label>
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
                {t('photoStudioBarcode.cancel')}
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
                    {t('photoStudioBarcode.generating')}
                  </>
                ) : (
                  <>
                    <FaQrcode />
                    {t('photoStudioBarcode.generateBarcodes')}
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
              <h2>{t('photoStudioBarcode.barcodeDetails')}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowBarcodeViewer(false)}
              >
                <FaTimes />
              </button>
            </div>

           <div className="viewer-content">
              {/*  <div className="media-info">
                <div className="media-header">
                  <h3 className="media-name">{selectedBarcode.mediaName}</h3>
                  <div className="media-divider"></div>
                </div>
                <div className="media-metadata">
                  <div className="metadata-row">
                    <span className="metadata-label">Client:</span>
                    <span className="metadata-value">{selectedBarcode.clientName}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="metadata-label">Session:</span>
                    <span className="metadata-value">{selectedBarcode.sessionName}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="metadata-label">Barcode:</span>
                    <span className="metadata-value">{selectedBarcode.barcode}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="metadata-label">Created:</span>
                    <span className="metadata-value">{formatDate(selectedBarcode.createdAt)}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="metadata-label">Scans:</span>
                    <span className="metadata-value">{selectedBarcode.scanCount}</span>
                  </div>
                </div>
              </div> */}

              <div className="qr-code-large">
                <QRCode value={selectedBarcode.qrCode} size={300} />
                <p>{t('photoStudioBarcode.scanQrHint')}</p>
              </div>
            </div>

            <div className="viewer-actions">
              <button 
                className="action-btn copy"
                onClick={() => copyBarcode(selectedBarcode.barcode)}
              >
                <FaCopy />
                {t('photoStudioBarcode.copyBarcode')}
              </button>
              <button 
                className="action-btn copy"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(selectedBarcode.qrCode);
                    alert(t('photoStudioBarcode.linkCopied'));
                  } catch {
                    const ta = document.createElement('textarea');
                    ta.value = selectedBarcode.qrCode;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    alert(t('photoStudioBarcode.linkCopied'));
                  }
                }}
              >
                <FaCopy />
                {t('photoStudioBarcode.copyLink')}
              </button>
              <button 
                className="action-btn share"
                onClick={() => {
                  navigator.share?.({
                    title: selectedBarcode.mediaName,
                    text: t('photoStudioBarcode.shareScanText', { url: selectedBarcode.qrCode }),
                    url: selectedBarcode.qrCode
                  });
                }}
              >
                <FaShare />
                {t('photoStudioBarcode.shareLink')}
              </button>
              <button 
                className="action-btn print"
                onClick={() => printBarcode(selectedBarcode)}
              >
                <FaShare />
                {t('photoStudioBarcode.shareQr')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeSystem;
