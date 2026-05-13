import type { TFunction } from 'i18next';

export type FollowUpChip = { label: string; prompt: string };

/** Short prompts the user can tap to continue the conversation. */
export function computeFollowUpChips(pathname: string, t: TFunction): FollowUpChip[] {
  const p = pathname.split('?')[0] || '/';
  const m = p.match(/^\/memories\/events\/([^/]+)$/);
  const onEventDetail = Boolean(m?.[1] && m[1] !== 'new');

  const chips: FollowUpChip[] = [];
  if (onEventDetail) {
    chips.push({ label: t('nextChipThisEvent'), prompt: t('nextPromptThisEvent') });
  }
  chips.push(
    { label: t('nextChipReadEvents'), prompt: t('nextPromptReadEvents') },
    { label: t('nextChipAttachImage'), prompt: t('nextPromptAttachImage') },
    { label: t('nextChipDashboard'), prompt: t('nextPromptDashboard') },
    { label: t('nextChipPhoneBook'), prompt: t('nextPromptPhoneBook') }
  );
  return chips.slice(0, 6);
}
