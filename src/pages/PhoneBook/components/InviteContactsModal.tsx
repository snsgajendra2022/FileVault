import React from 'react';
import PublicShareModal, {
  type PublicShareContact,
  type ShareAlreadySent,
  type ShareChannels,
} from '../../../components/modals/PublicShareModal';

export const InviteContactsModal: React.FC<{
  open: boolean;
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
  sending: boolean;
  onCheckRecipient: (emailInput: string, mobileInput: string) => void | Promise<void>;
  onSend: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  sendLabel: string;
}> = ({
  open,
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
  sending,
  onCheckRecipient,
  onSend,
  title,
  subtitle,
  sendLabel,
}) => {
  return (
    <PublicShareModal
      isOpen={open}
      onClose={onClose}
      contacts={contacts}
      contactSearch={contactSearch}
      onContactSearchChange={onContactSearchChange}
      selectedContactIds={selectedContactIds}
      onSelectedContactIdsChange={onSelectedContactIdsChange}
      showEmail={showEmail}
      showPhone={showPhone}
      newEmails={newEmails}
      onNewEmailsChange={onNewEmailsChange}
      mobileCountryCode={mobileCountryCode}
      onMobileCountryCodeChange={onMobileCountryCodeChange}
      newMobiles={newMobiles}
      onNewMobilesChange={onNewMobilesChange}
      alreadySent={alreadySent}
      onAlreadySentChange={onAlreadySentChange}
      message={message}
      onMessageChange={onMessageChange}
      channels={channels}
      onChannelsChange={onChannelsChange}
      onCheckRecipient={onCheckRecipient}
      onSend={onSend}
      sending={sending}
      labels={{
        title,
        existingContactsLabel: subtitle || 'Choose recipients',
        searchContactsPlaceholder: 'Search by name, email, mobile…',
        noContactsYet: 'No contacts yet. Add email or mobile below.',
        newRecipientsEmailLabel: 'New recipients — email (comma separated)',
        emailPlaceholder: 'name@example.com',
        newRecipientsMobileLabel: 'New recipients — mobile (comma separated)',
        mobilePlaceholder: '9876543210',
        optionalMessageLabel: 'Optional message',
        messagePlaceholder: 'Add a short note…',
        sendViaEmailLabel: 'Email',
        sendViaSmsLabel: 'SMS',
        cancelLabel: 'Cancel',
        sendingLabel: 'Sending…',
        sendLabel,
        alreadySentWarning: (typeLabel: string) => `Already sent to this ${typeLabel}. You can resend if needed.`,
        emailTypeLabel: 'email',
        mobileTypeLabel: 'mobile',
      }}
    />
  );
};

