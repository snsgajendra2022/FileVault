import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaUser, FaUsers } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../services/api';

interface CreateInvitationFormProps {
  onInvitationCreated: (invitation: any) => void;
}

const RELATIONSHIP_TYPES = [
  'CLIENT', 
  'SUB CLIENT',
];

const CreateClientInvitationForm: React.FC<CreateInvitationFormProps> = ({ onInvitationCreated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<any>(null);

  const [formData, setFormData] = useState({
    inviteeEmail: '',
    inviteeFirstName: '',
    inviteeLastName: '',
    relationshipType: 'CLIENT',
    relationshipNotes: '',
    expiresInDays: 30,
    canViewImages: true,
    canUploadImages: true,
    canDeleteImages: false,
    canManageAlbums: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/simple-invitations', formData);
      
      if (response.data.success) {
        setCreatedInvitation(response.data.invitation);
        setShowSuccess(true);
        onInvitationCreated(response.data.invitation);
        
        // Reset form
        setFormData({
          inviteeEmail: '',
          inviteeFirstName: '',
          inviteeLastName: '',
          relationshipType: 'CLIENT',
          relationshipNotes: '',
          expiresInDays: 30,
          canViewImages: true,
          canUploadImages: true,
          canDeleteImages: false,
          canManageAlbums: false
        });
      }
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = () => {
    if (createdInvitation) {
      const link = `${window.location.origin}/accept-invitation?token=${createdInvitation.invitationToken}`;
      navigator.clipboard.writeText(link);
      toast.success('Invitation link copied to clipboard!');
    }
  };

  const sendInvitationEmail = () => {
    if (createdInvitation) {
      const link = `${window.location.origin}/accept-invitation?token=${createdInvitation.invitationToken}`;
      const subject = `Invitation to join ${user?.firstName}'s `;
      const body = `Hi ${formData.inviteeFirstName},\n\n${user?.firstName} ${user?.lastName} has invited you to join their client on FileVault to view and share client images.\n\nYour relationship: ${formData.relationshipType}\nNotes: ${formData.relationshipNotes}\n\nClick the link below to accept the invitation and create your account:\n${link}\n\nThis invitation expires on ${new Date(createdInvitation.expiresAt).toLocaleDateString()}.\n\nBest regards,\nFileVault Team`;
      
      const mailtoLink = `mailto:${formData.inviteeEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink);
    }
  };

  if (showSuccess && createdInvitation) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaEnvelope className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Invitation Sent Successfully!</h2>
            <p className="text-green-700">
              Your invitation has been created and is ready to share with {formData.inviteeFirstName}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 mb-6 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invitation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-600">Invitee:</span>
                <span className="ml-2 text-gray-900">{formData.inviteeFirstName} {formData.inviteeLastName}</span>
              </div>
              <div>
                <span className="font-medium text-blue-600">Email:</span>
                <span className="ml-2 text-gray-900">{formData.inviteeEmail}</span>
              </div>
              <div>
                <span className="font-medium text-blue-600">Relationship:</span>
                <span className="ml-2 text-gray-900">{formData.relationshipType}</span>
              </div>
              <div>
                <span className="font-medium text-blue-600">Expires:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(createdInvitation.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Permissions Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Granted Permissions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${formData.canViewImages ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>View Images: {formData.canViewImages ? '✅ Allowed' : '❌ Not Allowed'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${formData.canUploadImages ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>Upload Images: {formData.canUploadImages ? '✅ Allowed' : '❌ Not Allowed'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${formData.canDeleteImages ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>Delete Images: {formData.canDeleteImages ? '✅ Allowed' : '❌ Not Allowed'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${formData.canManageAlbums ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>Manage Albums: {formData.canManageAlbums ? '✅ Allowed' : '❌ Not Allowed'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={copyInvitationLink}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaEnvelope className="h-4 w-4 mr-2" />
              Copy Invitation Link
            </button>
            <button
              onClick={sendInvitationEmail}
              className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaEnvelope className="h-4 w-4 mr-2" />
              Send Email
            </button>
            <button
              onClick={() => setShowSuccess(false)}
              className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Create Another Invitation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
              <FaEnvelope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Create New Invitation</h2>
              <p className="text-blue-100">Invite members to view and share images</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invitee Email */}
            <div className="md:col-span-2">
              <label htmlFor="inviteeEmail" className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline h-4 w-4 mr-2 text-blue-500" />
                Invitee Email Address
              </label>
              <input
                type="email"
                id="inviteeEmail"
                name="inviteeEmail"
                required
                value={formData.inviteeEmail}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter email address"
              />
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="inviteeFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline h-4 w-4 mr-2 text-blue-500" />
                First Name
              </label>
              <input
                type="text"
                id="inviteeFirstName"
                name="inviteeFirstName"
                required
                value={formData.inviteeFirstName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="inviteeLastName" className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline h-4 w-4 mr-2 text-blue-500" />
                Last Name
              </label>
              <input
                type="text"
                id="inviteeLastName"
                name="inviteeLastName"
                required
                value={formData.inviteeLastName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter last name"
              />
            </div>

            {/* Relationship Type */}
            <div>
              <label htmlFor="relationshipType" className="block text-sm font-medium text-gray-700 mb-2">
                <FaUsers className="inline h-4 w-4 mr-2 text-blue-500" />
                Relationship Type
              </label>
              <select
                id="relationshipType"
                name="relationshipType"
                required
                value={formData.relationshipType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {RELATIONSHIP_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiration Days */}
            <div>
              <label htmlFor="expiresInDays" className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline h-4 w-4 mr-2 text-blue-500" />
                Expires In (Days)
              </label>
              <select
                id="expiresInDays"
                name="expiresInDays"
                required
                value={formData.expiresInDays}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>

          {/* Relationship Notes */}
          <div>
            <label htmlFor="relationshipNotes" className="block text-sm font-medium text-gray-700 mb-2">
              <FaUsers className="inline h-4 w-4 mr-2 text-blue-500" />
              Relationship Notes (Optional)
            </label>
            <textarea
              id="relationshipNotes"
              name="relationshipNotes"
              rows={3}
              value={formData.relationshipNotes}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Add any additional notes about your relationship..."
            />
          </div>

          {/* Permissions Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Set Permissions</h3>
            <p className="text-gray-600 mb-4">
              Choose what this client member can do with your images and account:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="canViewImages"
                  name="canViewImages"
                  checked={formData.canViewImages}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="canViewImages" className="text-sm font-medium text-gray-700">
                  👁️ View Images
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="canUploadImages"
                  name="canUploadImages"
                  checked={formData.canUploadImages}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="canUploadImages" className="text-sm font-medium text-gray-700">
                  📤 Upload Images to Your Account
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="canDeleteImages"
                  name="canDeleteImages"
                  checked={formData.canDeleteImages}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="canDeleteImages" className="text-sm font-medium text-gray-700">
                  🗑️ Delete Images from Your Account
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="canManageAlbums"
                  name="canManageAlbums"
                  checked={formData.canManageAlbums}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="canManageAlbums" className="text-sm font-medium text-gray-700">
                  ⚙️ Manage Albums & Organization
                </label>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                💡 <strong>Note:</strong> Images uploaded by client members will be stored under your account, 
                but they can view and manage them according to the permissions you set above.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating Invitation...
                </>
              ) : (
                <>
                  <FaEnvelope className="h-5 w-5 mr-3" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClientInvitationForm;
