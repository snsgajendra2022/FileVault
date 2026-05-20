import React from 'react';

type Props = {
  open: boolean;
  value: string;
  busy?: boolean;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

const RenameModal: React.FC<Props> = ({ open, value, busy, onChange, onCancel, onSave }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm scale-100 rounded-2xl bg-white p-6 opacity-100 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">Rename photo</h3>
        <p className="mt-1 text-xs italic text-slate-500">Extensions (.jpg, .png) are added automatically.</p>
        <div className="mt-4">
          <label htmlFor="rename-input" className="sr-only">
            New filename
          </label>
          <input
            id="rename-input"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            placeholder="Enter new name..."
            autoFocus
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            onClick={onSave}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameModal;
