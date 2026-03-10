import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaUsers, FaPlus } from 'react-icons/fa';
import CreateInvitationForm from '../components/invitations/CreateInvitationForm';
import InvitationHistory from '../components/invitations/InvitationHistory';
import SharedImages from '../components/invitations/SharedImages';
import { toast } from 'react-hot-toast';
import CreateClientInvitationForm from '../components/invitations/CreateClient';
import InvitationCodeGenerator from '../components/invitations/InvitationCodeGenerator';
import InviteExistingUserForm from '../components/invitations/InviteExistingUserForm';
import InvitationsList from '../components/invitations/InvitationsList';
import ConnectedAccountsList from '../components/invitations/ConnectedAccountsList';

// Legacy + new invitation system combined as tabs
const InvitationsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'shared' | 'global'>('create');

  const tabs = [
    { id: 'create', name: 'Create Client Invitation', icon: FaPlus },
    { id: 'history', name: 'Client Invitation History', icon: FaUsers },
    // { id: 'shared', name: 'Shared Images', icon: FaEnvelope },
    { id: 'global', name: 'Global Invitation System', icon: FaEnvelope },
  ] as const;

  const handleInvitationCreated = () => {
    toast.success('Invitation sent successfully!');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'create':
        return <CreateClientInvitationForm onInvitationCreated={handleInvitationCreated} />;
      case 'history':
        return <InvitationHistory />;
      case 'shared':
        return <SharedImages />;
      case 'global':
        return (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <InvitationCodeGenerator />
              <InviteExistingUserForm />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <InvitationsList />
              <ConnectedAccountsList />
            </div>
          </div>
        );
      default:
        return <CreateInvitationForm onInvitationCreated={handleInvitationCreated} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invitation System</h1>
              <p className="text-gray-600 mt-2">
                Invite members to view and share images, or use the global invitation system.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full px-4 py-2">
                <span className="text-blue-800 font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default InvitationsPage;

