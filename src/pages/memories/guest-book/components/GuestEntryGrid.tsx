import React from 'react';
import type { GuestBookEntry, GuestBookLayoutMode, GuestBookReaction } from '../../../../features/guest-book/types';
import { formatGuestBookDate } from '../../../../features/guest-book/utils';
import { GuestEntryCard } from './GuestEntryCard';

type Props = {
  entries: GuestBookEntry[];
  layout: GuestBookLayoutMode;
  onEntryOpen: (entry: GuestBookEntry) => void;
  onImageClick: (entry: GuestBookEntry, index: number) => void;
  onLike: (entry: GuestBookEntry) => void;
  onReaction: (entry: GuestBookEntry, reaction: GuestBookReaction) => void;
  onShare: (entry: GuestBookEntry) => void;
  onPin?: (entry: GuestBookEntry) => void;
  onFeature?: (entry: GuestBookEntry) => void;
  showManageActions?: boolean;
};

export const GuestEntryGrid: React.FC<Props> = ({
  entries,
  layout,
  onEntryOpen,
  onImageClick,
  onLike,
  onReaction,
  onShare,
  onPin,
  onFeature,
  showManageActions,
}) => {
  if (layout === 'timeline') {
    return (
      <div className="guest-book-timeline space-y-6">
        {entries.map((entry, i) => (
          <div key={entry.id} className="guest-book-timeline-item">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-violet-400/80">
              {formatGuestBookDate(entry.date ?? entry.createdAt)}
            </p>
            <GuestEntryCard
              entry={entry}
              onOpen={() => onEntryOpen(entry)}
              onImageClick={(idx) => onImageClick(entry, idx)}
              onLike={() => onLike(entry)}
              onReaction={(r) => onReaction(entry, r)}
              onShare={() => onShare(entry)}
              onPin={onPin ? () => onPin(entry) : undefined}
              onFeature={onFeature ? () => onFeature(entry) : undefined}
              showManageActions={showManageActions}
              style={{ animationDelay: `${i * 60}ms` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'masonry') {
    return (
      <div className="guest-book-masonry">
        {entries.map((entry, i) => (
          <GuestEntryCard
            key={entry.id}
            entry={entry}
            onOpen={() => onEntryOpen(entry)}
            onImageClick={(idx) => onImageClick(entry, idx)}
            onLike={() => onLike(entry)}
            onReaction={(r) => onReaction(entry, r)}
            onShare={() => onShare(entry)}
            onPin={onPin ? () => onPin(entry) : undefined}
            onFeature={onFeature ? () => onFeature(entry) : undefined}
            showManageActions={showManageActions}
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
      {entries.map((entry, i) => (
        <GuestEntryCard
          key={entry.id}
          entry={entry}
          onOpen={() => onEntryOpen(entry)}
          onImageClick={(idx) => onImageClick(entry, idx)}
          onLike={() => onLike(entry)}
          onReaction={(r) => onReaction(entry, r)}
          onShare={() => onShare(entry)}
          onPin={onPin ? () => onPin(entry) : undefined}
          onFeature={onFeature ? () => onFeature(entry) : undefined}
          showManageActions={showManageActions}
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
};

export default GuestEntryGrid;
