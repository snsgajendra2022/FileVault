import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  FaUsers,
  FaSearch,
  FaEye,
  FaEnvelope,
  FaArrowLeft,
  FaUser,
  FaUserTag,
  FaFolder,
  FaImages,
  FaArrowRight
} from 'react-icons/fa';
import './ClientManagement.css';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DashboardLoading from '../../components/common/DashboardLoading';

interface Client {
  id: number;
  userId: number;
  name: string;
  email: string;
  username: string;
  relation: string;
  firstName?: string;
  lastName?: string;
}

interface Invitation {
  id: number;
  invitedById: number;
  invitedByUsername: string;
  inviteeEmail: string;
  inviteeFirstName: string;
  inviteeLastName: string;
  relationshipType: string;
  relationshipNotes: string;
  invitationToken: string;
  status: 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | string;
  canViewImages: boolean;
  canUploadImages: boolean;
  canDeleteImages: boolean;
  canManageAlbums: boolean;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

function getClientInitials(client: Client): string {
  const first = (client.firstName || '').trim();
  const last = (client.lastName || '').trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  const name = (client.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  const email = (client.email || '').trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

const ClientManagement: React.FC = () => {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'EXPIRED'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/simple-invitations/family-relationships');
      
      const allClients: Client[] = [];
      
      const flattenClients = (clientsArray: any[]) => {
        if (!Array.isArray(clientsArray)) return;
        
        clientsArray.forEach((client: any) => {
          if (client && client.relation === "Client") {
            const nameParts = (client.name || '').split(' ');
            allClients.push({
              id: client.userId,
              userId: client.userId,
              name: client.name || '',
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: client.email || '',
              username: client.username || '',
              relation: client.relation || 'Client'
            });
          }
          
          // Recursively process nested clients
          if (client && client.clients && Array.isArray(client.clients) && client.clients.length > 0) {
            flattenClients(client.clients);
          }
        });
      };
      
      if (response && response.data) {
        if (response.data.familyData && response.data.familyData.clients && Array.isArray(response.data.familyData.clients)) {
          flattenClients(response.data.familyData.clients);
        } else if (response.data.clients && Array.isArray(response.data.clients)) {
          flattenClients(response.data.clients);
        }
      }
      
      // Deduplicate clients by userId
      const uniqueClients = allClients.filter((client, index, self) => 
        index === self.findIndex((c) => c.userId === client.userId)
      );
      
      setClients(uniqueClients);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error(t('photoStudioClients.toastFailedLoad'));
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((client) => {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.name;
        return (
          fullName.toLowerCase().includes(query) ||
          (client.email || '').toLowerCase().includes(query) ||
          (client.username || '').toLowerCase().includes(query) ||
          (client.name || '').toLowerCase().includes(query)
        );
      });
    }

    // Status filter doesn't apply to clients, but keeping for compatibility
    // if (statusFilter !== 'all') {
    //   filtered = filtered.filter((client) => client.status === statusFilter);
    // }

    setFilteredClients(filtered);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLoading 
        title={t('photoStudioClients.loadingTitle')}
        subtitle={t('photoStudioClients.loadingSubtitle')}
        icon={FaUsers}
        features={[
          { icon: FaUsers, label: t('photoStudioClients.featureClients') },
          { icon: FaFolder, label: t('photoStudioClients.featureAlbums') },
          { icon: FaImages, label: t('photoStudioClients.featurePhotos') }
        ]}
      />
    );
  }

  if (selectedClient) {
    const displayName =
      selectedClient.name ||
      `${selectedClient.firstName} ${selectedClient.lastName}`.trim() ||
      selectedClient.email;
    return (
      <div className="client-management client-management--detail">
        <div className="client-shell client-shell--detail">
          <div className="client-detail">
            <div className="detail-header">
              <button
                type="button"
                className="back-btn"
                onClick={() => setSelectedClient(null)}
              >
                <FaArrowLeft />
                {t('photoStudioClients.backToClients')}
              </button>
            </div>

            <div className="client-profile">
              <div className="profile-header">
                <div className="client-avatar-large" aria-hidden>
                  <span>{getClientInitials(selectedClient)}</span>
                </div>
                <div className="profile-info">
                  <h1>{displayName}</h1>
                  <p className="client-status">
                    <span className="client-role-pill">{selectedClient.relation || 'Client'}</span>
                  </p>
                  {selectedClient.email && (
                    <div className="contact-info profile-contact">
                      <div className="contact-item">
                        <FaEnvelope className="meta-icon" aria-hidden />
                        <span>{selectedClient.email}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-stats">
                {selectedClient.username && (
                  <div className="stat-item">
                    <FaUser className="stat-item-icon" aria-hidden />
                    <div>
                      <p className="stat-item-label">{t('photoStudioClients.username')}</p>
                      <h3 className="stat-item-value">{selectedClient.username}</h3>
                    </div>
                  </div>
                )}
                {selectedClient.userId ? (
                  <div className="stat-item">
                    <FaUsers className="stat-item-icon" aria-hidden />
                    <div>
                      <p className="stat-item-label">{t('photoStudioClients.userId')}</p>
                      <h3 className="stat-item-value">{selectedClient.userId}</h3>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="profile-sections">
                <div className="section section--elevated">
                  <h3>{t('photoStudioClients.clientInformation')}</h3>
                  <div className="sessions-list">
                    {selectedClient.relation && (
                      <div className="session-item session-item--row">
                        <FaUserTag className="session-item-leading" aria-hidden />
                        <div className="session-info">
                          <h4>{t('photoStudioClients.relationship')}</h4>
                          <p>{selectedClient.relation}</p>
                        </div>
                      </div>
                    )}
                    {selectedClient.email && (
                      <div className="session-item session-item--row">
                        <FaEnvelope className="session-item-leading" aria-hidden />
                        <div className="session-info">
                          <h4>{t('photoStudioClients.email')}</h4>
                          <p>{selectedClient.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedClient.username && (
                      <div className="session-item session-item--row">
                        <FaUser className="session-item-leading" aria-hidden />
                        <div className="session-info">
                          <h4>{t('photoStudioClients.username')}</h4>
                          <p>{selectedClient.username}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-management">
      <div className="client-shell">
        {/* Header */}
        <header className="clients-header">
          <div className="header-left">
            <Link to="/studio/dashboard" className="back-link">
              <FaArrowLeft />
              {t('photoStudioClients.dashboard')}
            </Link>
            <div className="page-intro">
              <div className="page-title">
                <span className="title-icon-wrap" aria-hidden>
                  <FaUsers className="title-icon" />
                </span>
                <div className="page-title-text">
                  <h1>{t('photoStudioClients.pageTitle')}</h1>
                  <p className="page-subtitle">{t('photoStudioClients.pageSubtitle')}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <FaSearch className="search-icon" aria-hidden />
            <input
              type="search"
              placeholder={t('photoStudioClients.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('photoStudioClients.searchAriaLabel')}
            />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="clients-grid">
          {filteredClients.map((client, index) => {
            const displayName =
              client.name || `${client.firstName} ${client.lastName}`.trim() || client.email;
            return (
              <article
                key={client.userId}
                className="client-card"
                style={{ animationDelay: `${Math.min(index, 16) * 0.045}s` }}
              >
                <div className="card-header">
                  <div className="client-avatar" aria-hidden>
                    <span>{getClientInitials(client)}</span>
                  </div>
                  <div className="client-basic-info">
                    <h3 className="client-name" title={displayName}>
                      {displayName}
                    </h3>
                    {client.email ? (
                      <p className="client-email-line" title={client.email}>
                        {client.email}
                      </p>
                    ) : (
                      <p className="client-email-line client-email-line--muted">{t('photoStudioClients.noEmailOnFile')}</p>
                    )}
                    <span className="client-role-pill">{client.relation || 'Client'}</span>
                  </div>
                </div>

                <div className="card-meta">
                  <div className="meta-row">
                    <span className="meta-row-icon" aria-hidden>
                      <FaEnvelope />
                    </span>
                    <span className="meta-row-text" title={client.email || undefined}>
                      {client.email || '—'}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row-icon" aria-hidden>
                      <FaUser />
                    </span>
                    <span
                      className="meta-row-text"
                      title={client.username ? `@${client.username}` : undefined}
                    >
                      {client.username ? `@${client.username}` : t('photoStudioClients.noUsername')}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row-icon" aria-hidden>
                      <FaUserTag />
                    </span>
                    <span
                      className="meta-row-text"
                      title={client.relation || 'Client'}
                    >
                      {client.relation || 'Client'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="client-card-cta"
                  onClick={() => setSelectedClient(client)}
                >
                  <FaEye aria-hidden />
                  <span>{t('photoStudioClients.viewProfile')}</span>
                  <FaArrowRight className="client-card-cta-chevron" aria-hidden />
                </button>
              </article>
            );
          })}
        </div>

        {filteredClients.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon-wrap" aria-hidden>
              <FaUsers className="empty-icon" />
            </div>
            <h3>{t('photoStudioClients.noClientsFound')}</h3>
            <p>
              {searchTerm ? t('photoStudioClients.emptySearchHint') : t('photoStudioClients.emptyNoClients')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientManagement;
