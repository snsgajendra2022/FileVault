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
  FaUser
} from 'react-icons/fa';
import './ClientManagement.css';
import toast from 'react-hot-toast';
import api from '../services/api';

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
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'EXPIRED'>('all');
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvitations();
  }, []);

  useEffect(() => {
    filterInvitations();
  }, [invitations, searchTerm, statusFilter]);



  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/simple-invitations/my-invitations');
      if (response.data.length > 0) {
        setInvitations(response.data || response.data.invitations || []);
      } else {
        setInvitations([]);
      }
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };
  // const fetchClients = async () => {
  //   setLoading(true);
  //   try {
  //     // Simulate API call
  //     await new Promise(resolve => setTimeout(resolve, 1000));
      
  //     const mockClients: Client[] = [
  //       {
  //         id: '1',
  //         name: 'Sarah Johnson',
  //         email: 'sarah.j@email.com',
  //         phone: '+1 (555) 123-4567',
  //         address: '123 Main St, New York, NY 10001',
  //         dateJoined: '2024-01-15',
  //         lastSession: '2024-09-10',
  //         totalPhotos: 45,
  //         totalVideos: 8,
  //         status: 'active',
  //         notes: 'Prefers natural lighting, very particular about editing',
  //         sessions: [
  //           {
  //             id: 's1',
  //             date: '2024-09-10',
  //             type: 'Portrait Session',
  //             photos: 25,
  //             videos: 3,
  //             status: 'completed'
  //           }
  //         ]
  //       },
  //       {
  //         id: '2',
  //         name: 'Mike Chen',
  //         email: 'mike.chen@email.com',
  //         phone: '+1 (555) 987-6543',
  //         address: '456 Oak Ave, Los Angeles, CA 90210',
  //         dateJoined: '2024-02-20',
  //         lastSession: '2024-09-08',
  //         totalPhotos: 32,
  //         totalVideos: 5,
  //         status: 'active',
  //         notes: 'Corporate headshots, quick turnaround needed',
  //         sessions: [
  //           {
  //             id: 's2',
  //             date: '2024-09-08',
  //             type: 'Corporate Headshots',
  //             photos: 15,
  //             videos: 2,
  //             status: 'completed'
  //           }
  //         ]
  //       },
  //       {
  //         id: '3',
  //         name: 'Emily Davis',
  //         email: 'emily.davis@email.com',
  //         phone: '+1 (555) 456-7890',
  //         address: '789 Pine St, Chicago, IL 60601',
  //         dateJoined: '2024-03-10',
  //         lastSession: '2024-08-25',
  //         totalPhotos: 67,
  //         totalVideos: 12,
  //         status: 'inactive',
  //         notes: 'Wedding photographer, seasonal work',
  //         sessions: [
  //           {
  //             id: 's3',
  //             date: '2024-08-25',
  //             type: 'Wedding Photography',
  //             photos: 40,
  //             videos: 8,
  //             status: 'completed'
  //           }
  //         ]
  //       }
  //     ];
      
  //     setClients(mockClients);
  //   } catch (error) {
  //     console.error('Error fetching clients:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const filterInvitations = () => {
    let filtered = invitations;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((inv) => {
        const fullName = `${inv.inviteeFirstName || ''} ${inv.inviteeLastName || ''}`.trim();
        return (
          fullName.toLowerCase().includes(query) ||
          (inv.inviteeEmail || '').toLowerCase().includes(query) ||
          (inv.relationshipType || '').toLowerCase().includes(query) ||
          (inv.invitedByUsername || '').toLowerCase().includes(query)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    setFilteredInvitations(filtered);
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
      <div className="clients-loading">
        <div className="loading-spinner"></div>
        <p>Loading invitations...</p>
      </div>
    );
  }

  if (selectedInvitation) {
    return (
      <div className="client-detail">
        <div className="detail-header">
          <button 
            className="back-btn"
            onClick={() => setSelectedInvitation(null)}
          >
            <FaArrowLeft />
            Back to Invitations
          </button>
        </div>

        <div className="client-profile">
          <div className="profile-header">
            <div className="client-avatar-large">
              <span>{(selectedInvitation.inviteeFirstName || selectedInvitation.inviteeEmail || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="profile-info">
              <h1>
                {`${selectedInvitation.inviteeFirstName || ''} ${selectedInvitation.inviteeLastName || ''}`.trim() || selectedInvitation.inviteeEmail}
              </h1>
              <p className="client-status">
                <span className={`status-badge ${selectedInvitation.status}`}>
                  {selectedInvitation.status}
                </span>
              </p>
              {selectedInvitation.inviteeEmail && (
                <div className="contact-info">
                  <div className="contact-item">
                    <FaEnvelope />
                    <span>{selectedInvitation.inviteeEmail}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-stats">
            {selectedInvitation.invitedByUsername && (
              <div className="stat-item">
                <FaUser />
                <div>
                  <h3 style={{fontSize: '1rem',color:'#000'}}>{selectedInvitation.invitedByUsername}</h3>
                  <p style={{color:'#000'}}>Invited By</p>
                </div>
              </div>
            )}
            {selectedInvitation.createdAt && (
              <div className="stat-item">
                <FaCalendarAlt />
                <div>
                  <h3 style={{fontSize: '1rem',color:'#000'}}>{formatDate(selectedInvitation.createdAt)}</h3>
                  <p style={{color:'#000'}}>Created</p>
                </div>
              </div>
            )}
            {selectedInvitation.acceptedAt && (
              <div className="stat-item">
                <FaCalendarAlt />
                <div>
                  <h3 style={{fontSize: '1rem',color:'#000'}}>{formatDate(selectedInvitation.acceptedAt)}</h3>
                  <p style={{color:'#000'}}>Accepted</p>
                </div>
              </div>
            )}
            {selectedInvitation.expiresAt && (
              <div className="stat-item">
                <FaCalendarAlt />
                <div>
                  <h3 style={{fontSize: '1rem',color:'#000'}}>{formatDate(selectedInvitation.expiresAt)}</h3>
                  <p style={{color:'#000'}}>Expires</p>
                </div>
              </div>
            )}
          </div>

          <div className="profile-sections">
            <div className="section">
              <h3>Notes</h3>
              <p>{selectedInvitation.relationshipNotes || '—'}</p>
            </div>

            <div className="section">
              <h3>Details</h3>
              <div className="sessions-list">
                {selectedInvitation.relationshipType && (
                  <div className="session-item" style={{justifyContent: 'flex-start', gap: 12}}>
                    <div className="session-info">
                      <h4>Relationship</h4>
                      <p  style={{color:'#000'}}>{selectedInvitation.relationshipType}</p>
                    </div>
                  </div>
                )}
                <div className="session-item" style={{justifyContent: 'flex-start', gap: 12}}>
                  <div className="session-info">
                    <h4>Permissions</h4>
                    <p  style={{color:'#000'}}>
                      {[
                        selectedInvitation.canViewImages ? 'View' : null,
                        selectedInvitation.canUploadImages ? 'Upload' : null,
                        selectedInvitation.canDeleteImages ? 'Delete' : null,
                        selectedInvitation.canManageAlbums ? 'Manage Albums' : null,
                      ].filter(Boolean).join(', ') || '—'}
                    </p>
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
      {/* Header */}
      <header className="clients-header">
        <div className="header-left">
          <Link to="/studio/dashboard" className="back-link">
            <FaArrowLeft />
            Dashboard
          </Link>
          <div className="page-title">
            <FaUsers className="title-icon" />
            <h1>Invitations</h1>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, relationship, inviter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-dropdown">
          <FaFilter className="filter-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="clients-grid">
        {filteredInvitations.map((invitation) => (
          <div key={invitation.id} className="client-card">
            <div className="card-header">
              <div className="client-avatar">
                <span>{(invitation.inviteeFirstName || invitation.inviteeEmail || '?').charAt(0).toUpperCase()}</span>
              </div>
              <div className="client-basic-info">
                <h3>
                  {`${invitation.inviteeFirstName || ''} ${invitation.inviteeLastName || ''}`.trim() || invitation.inviteeEmail}
                </h3>
                {invitation.inviteeEmail && <p>{invitation.inviteeEmail}</p>}
                <span className={`status-badge ${invitation.status}`}>
                  {invitation.status}
                </span>
              </div>
            </div>

            <div className="card-content">
              <div className="client-stats">
                {invitation.relationshipType && (
                  <div className="stat">
                    <FaUser />
                    <span>{invitation.relationshipType}</span>
                  </div>
                )}
                {invitation.invitedByUsername && (
                  <div className="stat">
                    <FaUser />
                    <span>By {invitation.invitedByUsername}</span>
                  </div>
                )}
                {invitation.createdAt && (
                  <div className="stat">
                    <FaCalendarAlt />
                    <span>Created {formatDate(invitation.createdAt)}</span>
                  </div>
                )}
                {invitation.acceptedAt && (
                  <div className="stat">
                    <FaCalendarAlt />
                    <span>Accepted {formatDate(invitation.acceptedAt)}</span>
                  </div>
                )}
                {invitation.expiresAt && (
                  <div className="stat">
                    <FaCalendarAlt />
                    <span>Expires {formatDate(invitation.expiresAt)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-actions">
              <button 
                className="action-btn view"
                onClick={() => setSelectedInvitation(invitation)}
              >
                <FaEye />
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredInvitations.length === 0 && (
        <div className="empty-state">
          <FaUsers className="empty-icon" />
          <h3>No invitations found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
