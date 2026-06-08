import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

type Props = {
  open: boolean;
  guestName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export const DeleteConfirmationModal: React.FC<Props> = ({
  open,
  guestName,
  onConfirm,
  onCancel,
  loading,
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 gb-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-guest-entry-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0c12]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden />
        </div>
        <h2 id="delete-guest-entry-title" className="text-lg font-bold text-white mb-2">
          Delete this memory?
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          {guestName
            ? `This will permanently remove ${guestName}'s entry from your guest book.`
            : 'This will permanently remove this entry from your guest book.'}
          {' '}This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[44px] rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="min-h-[44px] rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete memory'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmationModal;
