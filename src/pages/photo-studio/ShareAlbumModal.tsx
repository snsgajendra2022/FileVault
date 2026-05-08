import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaShare, FaTimes, FaUserFriends } from 'react-icons/fa';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export interface ShareAlbumClient {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  username?: string;
  relation?: string;
}

interface ShareAlbumModalProps {
  isOpen: boolean;
  albumName?: string;
  clients: ShareAlbumClient[];
  isLoadingClients: boolean;
  selectedClientIds: Set<number>;
  isSubmitting: boolean;
  onToggleClient: (clientId: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const ShareAlbumModal: React.FC<ShareAlbumModalProps> = ({
  isOpen,
  albumName,
  clients,
  isLoadingClients,
  selectedClientIds,
  isSubmitting,
  onToggleClient,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <FaShare className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('photoStudioAlbumPage.shareAlbum')}</h2>
              {albumName ? <p className="text-sm text-gray-600 mt-1">{albumName}</p> : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            disabled={isSubmitting}
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingClients ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" text={t('photoStudioAlbumPage.loadingClients')} />
            </div>
          ) : clients?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaUserFriends className="mx-auto mb-3 text-4xl text-gray-300" />
              <p className="text-lg font-medium mb-2">{t('photoStudioAlbumPage.noMembersAvailable')}</p>
              <p className="text-sm">{t('photoStudioAlbumPage.noMembersHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{t('photoStudioAlbumPage.selectMembersPrompt')}</p>
                <p className="text-xs text-gray-500">
                  {t('photoStudioAlbumPage.selectedCount', { count: selectedClientIds.size })}
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {clients.map((client) => {
                  const isSelected = selectedClientIds.has(client.id);
                  return (
                    <div
                      key={client.id}
                      onClick={() => onToggleClient(client.id)}
                      className={`flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}
                      >
                        {client.firstName?.charAt(0)?.toUpperCase() ||
                          client.fullName?.charAt(0)?.toUpperCase() ||
                          'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 truncate">
                            {client.fullName || `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || 'Unknown'}
                          </p>
                          {client.relation && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                              {client.relation}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 mt-1">
                          {client.email && <p className="text-xs text-gray-500 truncate">{client.email}</p>}
                          {client.username && <span className="text-xs text-gray-400">@{client.username}</span>}
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                          isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <FaCheck className="text-white text-xs" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedClientIds.size > 0 ? (
                <span className="font-medium text-purple-600">
                  {t('photoStudioAlbumPage.membersSelected', { count: selectedClientIds.size })}
                </span>
              ) : (
                <span>{t('photoStudioAlbumPage.noMembersSelected')}</span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('photoStudioAlbumPage.cancel')}
              </button>
              <button
                onClick={onConfirm}
                disabled={selectedClientIds.size === 0 || isSubmitting || isLoadingClients}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('photoStudioAlbumPage.sharing')}</span>
                  </>
                ) : (
                  <>
                    <FaShare />
                    <span>{t('photoStudioAlbumPage.shareAlbumBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareAlbumModal;

