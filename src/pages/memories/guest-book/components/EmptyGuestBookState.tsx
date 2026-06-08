import React from 'react';
import { BookHeart, Sparkles } from 'lucide-react';

type Props = {
  onAddClick?: () => void;
  showAddButton?: boolean;
  /** Studio hint: how event albums / guest uploads populate the book */
  showAlbumHint?: boolean;
};

export const EmptyGuestBookState: React.FC<Props> = ({ onAddClick, showAddButton, showAlbumHint }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/40 via-black/20 to-fuchsia-950/30 px-6 py-16 sm:py-20 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-8 h-32 w-32 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-400/30 shadow-[0_20px_60px_rgba(124,58,237,0.25)]">
          <BookHeart className="h-10 w-10 text-violet-300" aria-hidden />
        </div>
        <h2 className="font-memories-display text-2xl sm:text-3xl font-semibold text-white mb-3">
          Your memory wall awaits
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          This guest book is ready for heartfelt messages, warm wishes, and beautiful photos.
          Be the first to share a moment that lasts forever.
        </p>
        {showAlbumHint ? (
          <div className="mb-8 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left text-xs text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-300 mb-2">Build your digital guest book</p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>Upload photos to this album — each image appears as a memory card.</li>
              <li>Use <strong className="text-slate-300 font-medium">Share a memory</strong> to add guest names, messages, and photos.</li>
              <li>Pin and feature favorites, react with hearts, and switch grid or timeline layouts above.</li>
            </ul>
          </div>
        ) : (
          <div className="mb-8" />
        )}
        {showAddButton && onAddClick ? (
          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Leave the first memory
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default EmptyGuestBookState;
