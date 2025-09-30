import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUsers, 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaPhone, 
  FaEnvelope, 
  FaCalendarAlt,
  FaImages,
  FaQrcode,
  FaShare,
  FaArrowLeft,
  FaUser,
  FaMapMarkerAlt,
  FaCamera
} from 'react-icons/fa';
import './ClientManagement.css';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dateJoined: string;
  lastSession: string;
  totalPhotos: number;
  totalVideos: number;
  status: 'active' | 'inactive';
  notes: string;
  avatar?: string;
  sessions: Session[];
}

interface Session {
  id: string;
  date: string;
  type: string;
  photos: number;
  videos: number;
  status: 'completed' | 'pending' | 'in-progress';
}

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockClients: Client[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.j@email.com',
          phone: '+1 (555) 123-4567',
          address: '123 Main St, New York, NY 10001',
          dateJoined: '2024-01-15',
          lastSession: '2024-09-10',
          totalPhotos: 45,
          totalVideos: 8,
          status: 'active',
          notes: 'Prefers natural lighting, very particular about editing',
          sessions: [
            {
              id: 's1',
              date: '2024-09-10',
              type: 'Portrait Session',
              photos: 25,
              videos: 3,
              status: 'completed'
            }
          ]
        },
        {
          id: '2',
          name: 'Mike Chen',
          email: 'mike.chen@email.com',
          phone: '+1 (555) 987-6543',
          address: '456 Oak Ave, Los Angeles, CA 90210',
          dateJoined: '2024-02-20',
          lastSession: '2024-09-08',
          totalPhotos: 32,
          totalVideos: 5,
          status: 'active',
          notes: 'Corporate headshots, quick turnaround needed',
          sessions: [
            {
              id: 's2',
              date: '2024-09-08',
              type: 'Corporate Headshots',
              photos: 15,
              videos: 2,
              status: 'completed'
            }
          ]
        },
        {
          id: '3',
          name: 'Emily Davis',
          email: 'emily.davis@email.com',
          phone: '+1 (555) 456-7890',
          address: '789 Pine St, Chicago, IL 60601',
          dateJoined: '2024-03-10',
          lastSession: '2024-08-25',
          totalPhotos: 67,
          totalVideos: 12,
          status: 'inactive',
          notes: 'Wedding photographer, seasonal work',
          sessions: [
            {
              id: 's3',
              date: '2024-08-25',
              type: 'Wedding Photography',
              photos: 40,
              videos: 8,
              status: 'completed'
            }
          ]
        }
      ];
      
      setClients(mockClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    setFilteredClients(filtered);
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(client => client.id !== clientId));
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
      <div className="clients-loading">
        <div className="loading-spinner"></div>
        <p>Loading clients...</p>
      </div>
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
          <div className="client-actions">
            <button className="action-btn edit">
              <FaEdit />
              Edit Client
            </button>
            <button className="action-btn share">
              <FaShare />
              Share Gallery
            </button>
          </div>
        </div>

        <div className="client-profile">
          <div className="profile-header">
            <div className="client-avatar-large">
              {selectedClient.avatar ? (
                <img src={selectedClient.avatar} alt={selectedClient.name} />
              ) : (
                <span>{selectedClient.name.charAt(0)}</span>
              )}
            </div>
            <div className="profile-info">
              <h1>{selectedClient.name}</h1>
              <p className="client-status">
                <span className={`status-badge ${selectedClient.status}`}>
                  {selectedClient.status}
                </span>
              </p>
              <div className="contact-info">
                <div className="contact-item">
                  <FaEnvelope />
                  <span>{selectedClient.email}</span>
                </div>
                <div className="contact-item">
                  <FaPhone />
                  <span>{selectedClient.phone}</span>
                </div>
                <div className="contact-item">
                  <FaMapMarkerAlt />
                  <span>{selectedClient.address}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <FaImages />
              <div>
                <h3>{selectedClient.totalPhotos}</h3>
                <p>Photos</p>
              </div>
            </div>
            <div className="stat-item">
              <FaCamera />
              <div>
                <h3>{selectedClient.totalVideos}</h3>
                <p>Videos</p>
              </div>
            </div>
            <div className="stat-item">
              <FaCalendarAlt />
              <div>
                <h3>{selectedClient.sessions.length}</h3>
                <p>Sessions</p>
              </div>
            </div>
          </div>

          <div className="profile-sections">
            <div className="section">
              <h3>Notes</h3>
              <p>{selectedClient.notes}</p>
            </div>

            <div className="section">
              <h3>Recent Sessions</h3>
              <div className="sessions-list">
                {selectedClient.sessions.map((session) => (
                  <div key={session.id} className="session-item">
                    <div className="session-info">
                      <h4>{session.type}</h4>
                      <p>{formatDate(session.date)}</p>
                    </div>
                    <div className="session-stats">
                      <span>{session.photos} photos</span>
                      <span>{session.videos} videos</span>
                    </div>
                    <span className={`session-status ${session.status}`}>
                      {session.status}
                    </span>
                  </div>
                ))}
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
            <h1>Client Management</h1>
          </div>
        </div>
        {/* <button 
          className="add-client-btn"
          onClick={() => setShowAddModal(true)}
        >
          <FaPlus />
          Add Client
        </button> */}
      </header>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search clients by name, email, or phone..."
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
            <option value="all">All Clients</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="clients-grid">
        {filteredClients.map((client) => (
          <div key={client.id} className="client-card">
            <div className="card-header">
              <div className="client-avatar">
                {client.avatar ? (
                  <img src={client.avatar} alt={client.name} />
                ) : (
                  <span>{client.name.charAt(0)}</span>
                )}
              </div>
              <div className="client-basic-info">
                <h3>{client.name}</h3>
                <p>{client.email}</p>
                <span className={`status-badge ${client.status}`}>
                  {client.status}
                </span>
              </div>
            </div>

            <div className="card-content">
              <div className="contact-info">
                <div className="contact-item">
                  <FaPhone />
                  <span>{client.phone}</span>
                </div>
                <div className="contact-item">
                  <FaMapMarkerAlt />
                  <span>{client.address}</span>
                </div>
              </div>

              <div className="client-stats">
                <div className="stat">
                  <FaImages />
                  <span>{client.totalPhotos} photos</span>
                </div>
                <div className="stat">
                  <FaCamera />
                  <span>{client.totalVideos} videos</span>
                </div>
                <div className="stat">
                  <FaCalendarAlt />
                  <span>Joined {formatDate(client.dateJoined)}</span>
                </div>
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
              <button className="action-btn edit">
                <FaEdit />
                Edit
              </button>
              <button className="action-btn gallery">
                <FaImages />
                Gallery
              </button>
              <button className="action-btn barcode">
                <FaQrcode />
                Barcode
              </button>
              <button 
                className="action-btn delete"
                onClick={() => handleDeleteClient(client.id)}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="empty-state">
          <FaUsers className="empty-icon" />
          <h3>No clients found</h3>
          <p>Try adjusting your search or add a new client to get started.</p>
          <button 
            className="add-first-client-btn"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus />
            Add Your First Client
          </button>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Client</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form className="add-client-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="Enter client's full name" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="Enter email address" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" placeholder="Enter phone number" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" placeholder="Enter client's address" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea placeholder="Add any notes about this client..."></textarea>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
