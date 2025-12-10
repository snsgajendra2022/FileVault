import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUsers, 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaEnvelope, 
  FaCalendarAlt,
  FaArrowLeft,
  FaUser,
  FaFolder,
  FaImages
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

const ClientManagement: React.FC = () => {
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
      toast.error('Failed to load clients');
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
        title="Loading Clients"
        subtitle="Retrieving client information..."
        icon={FaUsers}
        features={[
          { icon: FaUsers, label: 'Clients' },
          { icon: FaFolder, label: 'Albums' },
          { icon: FaImages, label: 'Photos' }
        ]}
      />
    );
  }

  if (selectedClient) {
    return (
      <div className="client-detail">
        <div className="detail-header">
          <button 
            className="back-btn"
            onClick={() => setSelectedClient(null)}
          >
            <FaArrowLeft />
            Back to Clients
          </button>
        </div>

        <div className="client-profile">
          <div className="profile-header">
            <div className="client-avatar-large">
              <span>{(selectedClient.firstName || selectedClient.name || selectedClient.email || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="profile-info">
              <h1>
                {selectedClient.name || `${selectedClient.firstName} ${selectedClient.lastName}`.trim() || selectedClient.email}
              </h1>
              <p className="client-status">
                <span className="status-badge ACCEPTED">
                  Client
                </span>
              </p>
              {selectedClient.email && (
                <div className="contact-info">
                  <div className="contact-item">
                    <FaEnvelope />
                    <span>{selectedClient.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-stats">
            {selectedClient.username && (
              <div className="stat-item">
                <FaUser />
                <div>
                  <h3 style={{fontSize: '1rem',color:'#000'}}>{selectedClient.username}</h3>
                  <p style={{color:'#000'}}>Username</p>
                </div>
              </div>
            )}
            {selectedClient.userId && (
              <div className="stat-item">
                <FaUser />
                <div>
                  <h3 style={{fontSize: '1rem',color:'#000'}}>ID: {selectedClient.userId}</h3>
                  <p style={{color:'#000'}}>User ID</p>
                </div>
              </div>
            )}
          </div>

          <div className="profile-sections">
            <div className="section">
              <h3>Client Information</h3>
              <div className="sessions-list">
                {selectedClient.relation && (
                  <div className="session-item" style={{justifyContent: 'flex-start', gap: 12}}>
                    <div className="session-info">
                      <h4>Relationship Type</h4>
                      <p style={{color:'#000'}}>{selectedClient.relation}</p>
                    </div>
                  </div>
                )}
                {selectedClient.email && (
                  <div className="session-item" style={{justifyContent: 'flex-start', gap: 12}}>
                    <div className="session-info">
                      <h4>Email</h4>
                      <p style={{color:'#000'}}>{selectedClient.email}</p>
                    </div>
                  </div>
                )}
                {selectedClient.username && (
                  <div className="session-item" style={{justifyContent: 'flex-start', gap: 12}}>
                    <div className="session-info">
                      <h4>Username</h4>
                      <p style={{color:'#000'}}>{selectedClient.username}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-management">
      {/* Header */}
      <header className="clients-header">
        <div className="header-left">
          <Link to="/studio/dashboard" className="back-link">
            <FaArrowLeft />
            Dashboard
          </Link>
          <div className="page-title">
            <FaUsers className="title-icon" />
            <h1>Clients</h1>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="clients-grid">
        {filteredClients.map((client) => (
          <div key={client.userId} className="client-card">
            <div className="card-header">
              <div className="client-avatar">
                <span>{(client.firstName || client.name || client.email || '?').charAt(0).toUpperCase()}</span>
              </div>
              <div className="client-basic-info">
                <h3>
                  {client.name || `${client.firstName} ${client.lastName}`.trim() || client.email}
                </h3>
                {client.email && <p>{client.email}</p>}
                <span className="status-badge ACCEPTED">
                  Client
                </span>
              </div>
            </div>

            <div className="card-content">
              <div className="client-stats">
                {client.username && (
                  <div className="stat">
                    <FaUser />
                    <span>@{client.username}</span>
                  </div>
                )}
                {client.email && (
                  <div className="stat">
                    <FaEnvelope />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.relation && (
                  <div className="stat">
                    <FaUser />
                    <span>{client.relation}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-actions">
              <button 
                className="action-btn view"
                onClick={() => setSelectedClient(client)}
              >
                <FaEye />
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && !loading && (
        <div className="empty-state">
          <FaUsers className="empty-icon" />
          <h3>No clients found</h3>
          <p>{searchTerm ? 'Try adjusting your search.' : 'You don\'t have any clients yet.'}</p>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
