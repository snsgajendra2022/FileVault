import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X } from 'lucide-react';
import type { GuestBookEntryInput } from '../../../../features/guest-book/types';
import { ImageUploader } from './ImageUploader';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: GuestBookEntryInput) => Promise<void> | void;
  submitting?: boolean;
  initialValues?: Partial<GuestBookEntryInput>;
  editMode?: boolean;
};

type FormErrors = Partial<Record<'guestName' | 'message', string>>;

const CATEGORIES = ['Wishes', 'Congratulations', 'Memory', 'Advice', 'Funny moment', 'Other'];

export const GuestEntryForm: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  submitting = false,
  initialValues,
  editMode = false,
}) => {
  const [guestName, setGuestName] = React.useState(initialValues?.guestName ?? '');
  const [message, setMessage] = React.useState(initialValues?.message ?? '');
  const [title, setTitle] = React.useState(initialValues?.title ?? '');
  const [date, setDate] = React.useState(initialValues?.date ?? '');
  const [category, setCategory] = React.useState(initialValues?.category ?? '');
  const [tag, setTag] = React.useState(initialValues?.tag ?? '');
  const [files, setFiles] = React.useState<File[]>(initialValues?.images ?? []);
  const [errors, setErrors] = React.useState<FormErrors>({});

  React.useEffect(() => {
    if (!open) return;
    setGuestName(initialValues?.guestName ?? '');
    setMessage(initialValues?.message ?? '');
    setTitle(initialValues?.title ?? '');
    setDate(initialValues?.date ?? '');
    setCategory(initialValues?.category ?? '');
    setTag(initialValues?.tag ?? '');
    setFiles(initialValues?.images ?? []);
    setErrors({});
  }, [open, initialValues]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!guestName.trim()) next.guestName = 'Please enter your name';
    if (!message.trim() && files.length === 0) {
      next.message = 'Add a message, photos, or both';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      guestName: guestName.trim(),
      message: message.trim(),
      title: title.trim() || undefined,
      date: date || undefined,
      category: category || undefined,
      tag: tag.trim() || undefined,
      images: files,
    });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-entry-form-title"
        >
          <button
            type="button"
            aria-label="Close form"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.form
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onSubmit={handleSubmit}
            className="relative flex flex-col w-full max-h-[92vh] sm:max-h-[88vh] sm:max-w-xl rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0c0c14]/98 shadow-[0_32px_100px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30">
                  <Sparkles className="h-4 w-4 text-violet-200" aria-hidden />
                </div>
                <div>
                  <h2 id="guest-entry-form-title" className="text-base font-bold text-white">
                    {editMode ? 'Edit memory' : 'Share a memory'}
                  </h2>
                  <p className="text-[11px] text-slate-500">Photos, wishes, or both</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto guest-book-scroll px-5 py-5 space-y-5">
              <div>
                <label htmlFor="gb-guest-name" className="mb-1.5 block text-xs font-semibold text-slate-400">
                  Your name <span className="text-red-400">*</span>
                </label>
                <input
                  id="gb-guest-name"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Sarah & James"
                  aria-invalid={Boolean(errors.guestName)}
                  aria-describedby={errors.guestName ? 'gb-name-error' : undefined}
                  className={`w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-600 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${
                    errors.guestName ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.guestName ? (
                  <p id="gb-name-error" className="mt-1.5 text-xs text-red-400" role="alert">
                    {errors.guestName}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="gb-title" className="mb-1.5 block text-xs font-semibold text-slate-400">
                  Title <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  id="gb-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="A special moment"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-600 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>

              <div>
                <label htmlFor="gb-message" className="mb-1.5 block text-xs font-semibold text-slate-400">
                  Message / wishes
                </label>
                <textarea
                  id="gb-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Share your warm wishes, a favorite moment, or a note for the hosts…"
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'gb-message-error' : undefined}
                  className={`w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${
                    errors.message ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.message ? (
                  <p id="gb-message-error" className="mt-1.5 text-xs text-red-400" role="alert">
                    {errors.message}
                  </p>
                ) : null}
              </div>

              <ImageUploader files={files} onChange={setFiles} disabled={submitting} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gb-date" className="mb-1.5 block text-xs font-semibold text-slate-400">
                    Date <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    id="gb-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white min-h-[48px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="gb-category" className="mb-1.5 block text-xs font-semibold text-slate-400">
                    Category
                  </label>
                  <select
                    id="gb-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white min-h-[48px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="gb-tag" className="mb-1.5 block text-xs font-semibold text-slate-400">
                  Tag <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  id="gb-tag"
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. ceremony, dance-floor"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-600 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 px-5 py-4 bg-black/30">
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold text-white shadow-lg shadow-violet-900/30 disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.99]"
              >
                <Send className="h-4 w-4" aria-hidden />
                {submitting ? 'Saving…' : editMode ? 'Save changes' : 'Add to guest book'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default GuestEntryForm;
