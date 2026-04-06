import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaUser } from 'react-icons/fa';
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

const FILTER_KEYS: Record<'pending' | 'accepted' | 'expired', string> = {
  pending: 'tabPending',
  accepted: 'tabAccepted',
  expired: 'tabExpired',
};

const InvitationHistory: React.FC = () => {
  const { t } = useTranslation();
  const h = 'invitationsComponents.history';
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      toast.error(t(`${h}.toastLoadFail`));
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
    const byStatus =
      filter === 'all'
        ? invitations
        : invitations.filter((inv) => inv.status === filter.toUpperCase());

    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatus;

    return byStatus.filter((inv) => {
      const fullName = `${inv.inviteeFirstName} ${inv.inviteeLastName}`.toLowerCase();
      const email = (inv.inviteeEmail || '').toLowerCase();
      const relationship = (inv.relationshipType || '').toLowerCase();
      const notes = (inv.relationshipNotes || '').toLowerCase();
      const status = (inv.status || '').toLowerCase();
      return (
        fullName.includes(q) ||
        email.includes(q) ||
        relationship.includes(q) ||
        notes.includes(q) ||
        status.includes(q)
      );
    });
  };

  const copyInvitationLink = (invitation: Invitation) => {
    const link = `${window.location.origin}/accept-invitation?token=${invitation.invitationToken}`;
    navigator.clipboard.writeText(link);
    toast.success(t(`${h}.toastLinkCopied`));
  };

  const cancelInvitation = async (invitation: Invitation) => {
    try {
      await api.delete(`/api/simple-invitations/${invitation.id}`);
      toast.success(t(`${h}.toastCancelled`));
      fetchInvitations();
    } catch (error) {
      toast.error(t(`${h}.toastCancelFail`));
    }
  };

  const getPermissionIcon = (permission: boolean) => {
    return permission ? '✅' : '❌';
  };

  const getPermissionColor = (permission: boolean) => {
    return permission ? 'text-green-600' : 'text-red-600';
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return t(`${h}.status_PENDING`);
      case 'ACCEPTED':
        return t(`${h}.status_ACCEPTED`);
      case 'EXPIRED':
        return t(`${h}.status_EXPIRED`);
      default:
        return status;
    }
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

  const emptyMessage =
    filter === 'all'
      ? t(`${h}.emptyNone`)
      : t(`${h}.emptyFilter`, { filter: t(`${h}.${FILTER_KEYS[filter]}`) });

  return (
    <div className="max-w-6xl mx-auto p-6 invitation">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t(`${h}.title`)}</h2>
            <p className="text-gray-600">{t(`${h}.subtitle`)}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{t(`${h}.total`)}</span>
            <span className="text-2xl font-bold text-blue-600">{invitations.length}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all' as const, labelKey: 'tabAll', count: invitations.length },
            {
              key: 'pending' as const,
              labelKey: 'tabPending',
              count: invitations.filter((i) => i.status === 'PENDING').length,
            },
            {
              key: 'accepted' as const,
              labelKey: 'tabAccepted',
              count: invitations.filter((i) => i.status === 'ACCEPTED').length,
            },
            {
              key: 'expired' as const,
              labelKey: 'tabExpired',
              count: invitations.filter((i) => i.status === 'EXPIRED').length,
            },
          ].map(({ key, labelKey, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t(`${h}.${labelKey}`)} ({count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(`${h}.searchPlaceholder`)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Invitations List */}
      {filteredInvitations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
          <FaEnvelope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t(`${h}.noResultsTitle`)}</h3>
          <p className="text-gray-600">{emptyMessage}</p>
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
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invitation.status)}`}
                    >
                      {statusLabel(invitation.status)}
                    </span>
                    {isExpired(invitation.expiresAt) && invitation.status === 'PENDING' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        {t(`${h}.badgeExpired`)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t(`${h}.labelInvitee`)}</span>
                      <p className="text-gray-900 size-text-gray-900 font-semibold">
                        {invitation.inviteeFirstName} {invitation.inviteeLastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t(`${h}.labelEmail`)}</span>
                      <p className="text-gray-900 size-text-gray-900">{invitation.inviteeEmail}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t(`${h}.labelRelationship`)}</span>
                      <p className="text-gray-900 size-text-gray-900">{invitation.relationshipType}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t(`${h}.labelExpires`)}</span>
                      <p className="text-gray-900 size-text-gray-900">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Permissions Display */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t(`${h}.grantedPermissions`)}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canViewImages)}`}>
                          {getPermissionIcon(invitation.canViewImages)}
                        </span>
                        <span className="text-sm text-gray-700">{t(`${h}.permView`)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canUploadImages)}`}>
                          {getPermissionIcon(invitation.canUploadImages)}
                        </span>
                        <span className="text-sm text-gray-700">{t(`${h}.permUpload`)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canDeleteImages)}`}>
                          {getPermissionIcon(invitation.canDeleteImages)}
                        </span>
                        <span className="text-sm text-gray-700">{t(`${h}.permDelete`)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${getPermissionColor(invitation.canManageAlbums)}`}>
                          {getPermissionIcon(invitation.canManageAlbums)}
                        </span>
                        <span className="text-sm text-gray-700">{t(`${h}.permManage`)}</span>
                      </div>
                    </div>
                  </div>

                  {invitation.relationshipNotes && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-500">{t(`${h}.labelNotes`)}</span>
                      <p className="text-gray-700 mt-1">{invitation.relationshipNotes}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    {t(`${h}.sentOn`, { date: new Date(invitation.createdAt).toLocaleDateString() })}
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
                        {t(`${h}.copyLink`)}
                      </button>
                    </>
                  )}

                  {invitation.status === 'PENDING' && (
                    <button
                      onClick={() => cancelInvitation(invitation)}
                      className="flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <FaUser className="h-4 w-4 mr-2" />
                      {t(`${h}.cancel`)}
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

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

export default InvitationHistory;
