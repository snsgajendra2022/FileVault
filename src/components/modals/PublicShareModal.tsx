import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';

export type PublicShareContact = {
  id: string;
  displayName?: string;
  email?: string;
  mobile?: string;
};

export type ShareChannels = { email: boolean; sms: boolean };

export type ShareAlreadySent = { email?: string; mobile?: string; alreadySent: boolean } | null;

export type PublicShareModalLabels = {
  title: string;
  existingContactsLabel: string;
  searchContactsPlaceholder: string;
  noContactsYet: string;
  newRecipientsEmailLabel: string;
  emailPlaceholder: string;
  newRecipientsMobileLabel: string;
  mobilePlaceholder: string;
  optionalMessageLabel: string;
  messagePlaceholder: string;
  sendViaEmailLabel: string;
  sendViaSmsLabel: string;
  cancelLabel: string;
  sendingLabel: string;
  sendLabel: string;
  alreadySentWarning: (typeLabel: string) => string;
  emailTypeLabel: string;
  mobileTypeLabel: string;
};

interface PublicShareModalProps {
  isOpen: boolean;
  onClose: () => void;

  contacts: PublicShareContact[];
  contactSearch: string;
  onContactSearchChange: (value: string) => void;

  selectedContactIds: Set<string>;
  onSelectedContactIdsChange: (next: Set<string>) => void;

  showEmail: boolean;
  showPhone: boolean;

  newEmails: string;
  onNewEmailsChange: (value: string) => void;

  mobileCountryCode: string;
  onMobileCountryCodeChange: (value: string) => void;

  newMobiles: string;
  onNewMobilesChange: (value: string) => void;

  alreadySent: ShareAlreadySent;
  onAlreadySentChange: (next: ShareAlreadySent) => void;

  message: string;
  onMessageChange: (value: string) => void;

  channels: ShareChannels;
  onChannelsChange: (next: ShareChannels) => void;

  onCheckRecipient: (emailInput: string, mobileInput: string) => void | Promise<void>;
  onSend: () => void | Promise<void>;
  sending: boolean;

  /** Optional: override all copy/labels (default uses studioCheckoutPage.*) */
  labels?: PublicShareModalLabels;
  /** Optional: if provided, show this content instead of the form (e.g. “select an album first”). */
  disabledContent?: React.ReactNode;

  /** Optional: hide message box (default: true). */
  showMessage?: boolean;
  /** Optional: hide channel toggles (default: true). */
  showChannels?: boolean;
}

const PublicShareModal: React.FC<PublicShareModalProps> = ({
  isOpen,
  onClose,
  contacts,
  contactSearch,
  onContactSearchChange,
  selectedContactIds,
  onSelectedContactIdsChange,
  showEmail,
  showPhone,
  newEmails,
  onNewEmailsChange,
  mobileCountryCode,
  onMobileCountryCodeChange,
  newMobiles,
  onNewMobilesChange,
  alreadySent,
  onAlreadySentChange,
  message,
  onMessageChange,
  channels,
  onChannelsChange,
  onCheckRecipient,
  onSend,
  sending,
  labels,
  disabledContent,
  showMessage = true,
  showChannels = true,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const defaultLabels: PublicShareModalLabels = {
    title: t('studioCheckoutPage.shareModalTitle'),
    existingContactsLabel: t('studioCheckoutPage.existingContacts'),
    searchContactsPlaceholder: t('studioCheckoutPage.searchContactsPlaceholder'),
    noContactsYet: t('studioCheckoutPage.noContactsYet'),
    newRecipientsEmailLabel: t('studioCheckoutPage.newRecipientsEmail'),
    emailPlaceholder: t('studioCheckoutPage.emailPlaceholderShare'),
    newRecipientsMobileLabel: t('studioCheckoutPage.newRecipientsMobile'),
    mobilePlaceholder: t('studioCheckoutPage.mobilePlaceholderShare'),
    optionalMessageLabel: t('studioCheckoutPage.optionalMessage'),
    messagePlaceholder: t('studioCheckoutPage.messagePlaceholderShare'),
    sendViaEmailLabel: t('studioCheckoutPage.sendViaEmail'),
    sendViaSmsLabel: t('studioCheckoutPage.sendViaSms'),
    cancelLabel: t('studioCheckoutPage.cancel'),
    sendingLabel: t('studioCheckoutPage.sending'),
    sendLabel: t('studioCheckoutPage.send'),
    alreadySentWarning: (typeLabel: string) => t('studioCheckoutPage.alreadySentWarning', { type: typeLabel }),
    emailTypeLabel: t('studioCheckoutPage.emailType'),
    mobileTypeLabel: t('studioCheckoutPage.mobileType'),
  };

  const L = labels ?? defaultLabels;

  const handleClose = () => {
    onClose();
    onContactSearchChange('');
    onAlreadySentChange(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{L.title}</h3>
          <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100 text-gray-600">
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {disabledContent ? (
            <div>{disabledContent}</div>
          ) : (
            <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{L.existingContactsLabel}</label>
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => onContactSearchChange(e.target.value)}
              placeholder={L.searchContactsPlaceholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
            />
            <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500">{L.noContactsYet}</p>
              ) : (
                contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(c.id)}
                      onChange={(e) => {
                        const next = new Set(selectedContactIds);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        onSelectedContactIdsChange(next);
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{c.displayName || c.email || c.mobile || c.id}</span>
                    {(c.email || c.mobile) && (
                      <span className="text-xs text-gray-500">({[c.email, c.mobile].filter(Boolean).join(', ')})</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {showEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.newRecipientsEmailLabel}</label>
              <input
                type="text"
                value={newEmails}
                onChange={(e) => {
                  onNewEmailsChange(e.target.value);
                  onAlreadySentChange(null);
                }}
                onBlur={() => onCheckRecipient(newEmails, newMobiles)}
                placeholder={L.emailPlaceholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {showPhone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.newRecipientsMobileLabel}</label>
              <div className="flex gap-2">
                <select
                  value={mobileCountryCode}
                  onChange={(e) => onMobileCountryCodeChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 shrink-0"
                >
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+971">+971</option>
                  <option value="+61">+61</option>
                  <option value="+81">+81</option>
                  <option value="+86">+86</option>
                  <option value="+33">+33</option>
                  <option value="+49">+49</option>
                  <option value="+55">+55</option>
                </select>
                <input
                  type="text"
                  value={newMobiles}
                  onChange={(e) => {
                    onNewMobilesChange(e.target.value);
                    onAlreadySentChange(null);
                  }}
                  onBlur={() => onCheckRecipient(newEmails, newMobiles)}
                  placeholder={L.mobilePlaceholder}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {alreadySent?.alreadySent && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {L.alreadySentWarning(alreadySent.email ? L.emailTypeLabel : L.mobileTypeLabel)}
            </p>
          )}

          {showMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.optionalMessageLabel}</label>
              <textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                placeholder={L.messagePlaceholder}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {showChannels && (
            <div className="flex gap-4">
              {showEmail && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) => onChannelsChange({ ...channels, email: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{L.sendViaEmailLabel}</span>
                </label>
              )}
              {showPhone && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.sms}
                    onChange={(e) => onChannelsChange({ ...channels, sms: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{L.sendViaSmsLabel}</span>
                </label>
              )}
            </div>
          )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            {L.cancelLabel}
          </button>
          {!disabledContent && (
            <button
              onClick={onSend}
              disabled={sending}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold"
            >
              {sending ? L.sendingLabel : L.sendLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicShareModal;

