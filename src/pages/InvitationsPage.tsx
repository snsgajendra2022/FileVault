import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaUsers, FaPlus } from 'react-icons/fa';
import CreateInvitationForm from '../components/invitations/CreateInvitationForm';
import InvitationHistory from '../components/invitations/InvitationHistory';
import SharedImages from '../components/invitations/SharedImages';
import { toast } from 'react-hot-toast';
import CreateClientInvitationForm from './CreateClient';
// import FamilyTree from '../components/invitations/FamilyTree';
// import FamilyTree from '../components/invitations/FamilyTree';

const InvitationsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'create', name: 'Create Client Invitation', icon: FaPlus, color: 'bg-blue-500' },
    { id: 'history', name: 'Client Invitation History', icon: FaUsers, color: 'bg-green-500' },
    //  { id: 'family', name: 'Family Tree', icon: FaUsers, color: 'bg-purple-500' },
    // { id: 'shared', name: 'Shared Images', icon: FaEnvelope, color: 'bg-orange-500' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'create':
        return <CreateClientInvitationForm onInvitationCreated={handleInvitationCreated} />;
      case 'history':
        return <InvitationHistory />;
      // case 'family':
      //   return <FamilyTree />;
      case 'shared':
        return <SharedImages />;
      default:
        return <CreateInvitationForm onInvitationCreated={handleInvitationCreated} />;
    }
  };

  const handleInvitationCreated = (newInvitation: any) => {
    toast.success('Invitation sent successfully!');
    if (activeTab === 'history') {
      // Trigger refresh in InvitationHistory component
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
                Invite members to view and share images
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
