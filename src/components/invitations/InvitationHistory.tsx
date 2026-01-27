import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaUser, FaUsers } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import './invitation.css';
interface Invitation {
  id: number;
  invitationToken: string;
  inviteeEmail: string;
  inviteeFirstName: string;
  inviteeLastName: string;
  relationshipType: string;
  relationshipNotes: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  canViewImages: boolean;
  canUploadImages: boolean;
  canDeleteImages: boolean;
  canManageAlbums: boolean;
}

const InvitationHistory: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'expired'>('all');

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/simple-invitations/my-invitations');
      console.log('response', response.data);
      
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <FaUser className="h-5 w-5 text-green-500" />;
      case 'PENDING':
        return <FaEnvelope className="h-5 w-5 text-yellow-500" />;
      case 'EXPIRED':
        return <FaUser className="h-5 w-5 text-red-500" />;
      default:
        return <FaEnvelope className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFilteredInvitations = () => {
    if (filter === 'all') return invitations;
    return invitations.filter(inv => inv.status === filter.toUpperCase());
  };

  const copyInvitationLink = (invitation: Invitation) => {
    const link = `${window.location.origin}/accept-invitation?token=${invitation.invitationToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Invitation link copied to clipboard!');
  };

  const resendInvitation = async (invitation: Invitation) => {
    try {
      toast.success('Invitation resent successfully!');
    } catch (error) {
      toast.error('Failed to resend invitation');
    }
  };

  const cancelInvitation = async (invitation: Invitation) => {
    try {
      await api.delete(`/api/simple-invitations/${invitation.id}`);
      toast.success('Invitation cancelled successfully!');
      fetchInvitations();
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getPermissionIcon = (permission: boolean) => {
    return permission ? '✅' : '❌';
  };

  const getPermissionColor = (permission: boolean) => {
    return permission ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const filteredInvitations = getFilteredInvitations();

  return (
    <div className="max-w-6xl mx-auto p-6 invitation">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invitation History</h2>
            <p className="text-gray-600">Track all your sent invitations and their status</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Total:</span>
            <span className="text-2xl font-bold text-blue-600">{invitations.length}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: invitations.length },
            { key: 'pending', label: 'Pending', count: invitations.filter(i => i.status === 'PENDING').length },
            { key: 'accepted', label: 'Accepted', count: invitations.filter(i => i.status === 'ACCEPTED').length },
            { key: 'expired', label: 'Expired', count: invitations.filter(i => i.status === 'EXPIRED').length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Invitations List */}
      {filteredInvitations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
          <FaEnvelope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No invitations found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "You haven't sent any invitations yet. Create your first invitation to get started!"
              : `No ${filter} invitations found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(invitation.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invitation.status)}`}>
                      {invitation.status}
                    </span>
                    {isExpired(invitation.expiresAt) && invitation.status === 'PENDING' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Expired
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Invitee</span>
                      <p className="text-gray-900 size-text-gray-900 font-semibold">
                        {invitation.inviteeFirstName} {invitation.inviteeLastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email</span>
                      <p className="text-gray-900 size-text-gray-900">{invitation.inviteeEmail}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Relationship</span>
                      <p className="text-gray-900 size-text-gray-900">{invitation.relationshipType}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Expires</span>
                      <p className="text-gray-900 size-text-gray-900">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Permissions Display */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">📋 Granted Permissions:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canViewImages)}`}>
                          {getPermissionIcon(invitation.canViewImages)}
                        </span>
                        <span className="text-sm text-gray-700">View Images</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canUploadImages)}`}>
                          {getPermissionIcon(invitation.canUploadImages)}
                        </span>
                        <span className="text-sm text-gray-700">Upload Images</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canDeleteImages)}`}>
                          {getPermissionIcon(invitation.canDeleteImages)}
                        </span>
                        <span className="text-sm text-gray-700">Delete Images</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canManageAlbums)}`}>
                          {getPermissionIcon(invitation.canManageAlbums)}
                        </span>
                        <span className="text-sm text-gray-700">Manage Albums</span>
                      </div>
                    </div>
                  </div>

                  {invitation.relationshipNotes && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-500">Notes</span>
                      <p className="text-gray-700 mt-1">{invitation.relationshipNotes}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    Sent on {new Date(invitation.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-4">
                  {invitation.status === 'PENDING' && !isExpired(invitation.expiresAt) && (
                    <>
                      <button
                        onClick={() => copyInvitationLink(invitation)}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FaEnvelope className="h-4 w-4 mr-2" />
                        Copy Link
                      </button>
                      {/* <button
                        onClick={() => resendInvitation(invitation)}
                        className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FaEnvelope className="h-4 w-4 mr-2" />
                        Resend
                      </button> */}
                    </>
                  )}

                  {invitation.status === 'PENDING' && (
                    <button
                      onClick={() => cancelInvitation(invitation)}
                      className="flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <FaUser className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvitationHistory;
