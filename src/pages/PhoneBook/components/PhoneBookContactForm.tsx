import React from 'react';
import type { PhoneBookContactMeta, PhoneBookContactType } from '../../../api/services/phoneBookService';

export type PhoneBookContactFormValue = {
  displayName: string;
  email: string;
  countryCode: string;
  mobile: string;
  avatarUrl: string;
  notes: string;
  meta: PhoneBookContactMeta;
};

const TYPES: Array<PhoneBookContactType> = [
  'Client',
  'Family',
  'Bride/Groom',
  'Event Organizer',
  'Photographer',
  'Staff',
  'VIP Customer',
  'Other',
];

function parseTags(input: string): string[] | undefined {
  const tags = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
  return tags.length ? Array.from(new Set(tags)) : undefined;
}

function tagsToString(tags?: string[]): string {
  return Array.isArray(tags) && tags.length ? tags.join(', ') : '';
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 shadow-sm transition focus:border-violet-300 focus:ring-2 focus:ring-violet-500/30';

const labelClass = 'mb-1 block text-xs font-semibold text-slate-600';

export const PhoneBookContactForm: React.FC<{
  value: PhoneBookContactFormValue;
  onChange: (next: PhoneBookContactFormValue) => void;
}> = ({ value, onChange }) => {
  const [tagsText, setTagsText] = React.useState(tagsToString(value.meta.tags));

  React.useEffect(() => {
    setTagsText(tagsToString(value.meta.tags));
  }, [value.meta.tags]);

  const set = (patch: Partial<PhoneBookContactFormValue>) => onChange({ ...value, ...patch });
  const setMeta = (patch: Partial<PhoneBookContactMeta>) => onChange({ ...value, meta: { ...value.meta, ...patch } });

  return (
    <div className="grid gap-4" data-ai-form="phonebook_contact_form">
      <div className="grid gap-4 sm:grid-cols-[96px_1fr] sm:items-center">
        <div className="h-24 w-24 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 ring-1 ring-slate-100">
          {value.avatarUrl.trim() ? (
            <img src={value.avatarUrl.trim()} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-extrabold text-slate-600">
              {(value.displayName.trim() || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="grid gap-3">
          <div>
            <label className={labelClass}>Profile photo</label>
            <input
              value={value.avatarUrl}
              onChange={(e) => set({ avatarUrl: e.target.value })}
              data-ai-field="profile_image_url"
              className={inputClass}
              placeholder="Paste image URL (upload/camera can be added later)"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Contact type</label>
              <select
                value={value.meta.contactType || 'Client'}
                onChange={(e) => setMeta({ contactType: e.target.value as PhoneBookContactType })}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tags</label>
              <input
                value={tagsText}
                onChange={(e) => {
                  const next = e.target.value;
                  setTagsText(next);
                  setMeta({ tags: parseTags(next) });
                }}
                className={inputClass}
                data-ai-field="tags"
                placeholder="wedding, vip, lead…"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Full name</label>
        <input
          value={value.displayName}
          onChange={(e) => set({ displayName: e.target.value })}
          data-ai-field="client_name"
          className={inputClass}
          placeholder="Full name"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Email</label>
          <input
            value={value.email}
            onChange={(e) => set({ email: e.target.value })}
            data-ai-field="email"
            className={inputClass}
            placeholder="name@example.com"
            type="email"
          />
        </div>

        <div>
          <label className={labelClass}>Mobile</label>
          <div className="flex gap-2">
            <input
              value={value.countryCode}
              onChange={(e) => set({ countryCode: e.target.value })}
              className={`${inputClass} w-24`}
              placeholder="+91"
            />
            <input
              value={value.mobile}
              onChange={(e) => set({ mobile: e.target.value })}
              data-ai-field="phone_number"
              className={`${inputClass} flex-1`}
              placeholder="9876543210"
              inputMode="tel"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>WhatsApp number</label>
          <input
            value={value.meta.whatsapp || ''}
            onChange={(e) => setMeta({ whatsapp: e.target.value })}
            className={inputClass}
            placeholder="Optional, defaults to mobile"
            inputMode="tel"
          />
        </div>

        <div>
          <label className={labelClass}>Invite status</label>
          <select
            value={value.meta.inviteStatus || 'not_invited'}
            onChange={(e) => setMeta({ inviteStatus: e.target.value as PhoneBookContactMeta['inviteStatus'] })}
            className={inputClass}
          >
            {[
              { id: 'not_invited', label: 'Not invited' },
              { id: 'invited', label: 'Invited' },
              { id: 'accepted', label: 'Accepted' },
              { id: 'rejected', label: 'Rejected' },
            ].map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Address</label>
        <input
          value={value.meta.address || ''}
          onChange={(e) => setMeta({ address: e.target.value })}
          className={inputClass}
          placeholder="Street / area"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>City</label>
          <input
            value={value.meta.city || ''}
            onChange={(e) => setMeta({ city: e.target.value })}
            className={inputClass}
            placeholder="City"
          />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <input
            value={value.meta.state || ''}
            onChange={(e) => setMeta({ state: e.target.value })}
            className={inputClass}
            placeholder="State"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
          data-ai-field="description"
          className={`${inputClass} min-h-[110px] resize-y`}
          placeholder="Preferences, last shoot details, reminders…"
        />
      </div>
    </div>
  );
};
