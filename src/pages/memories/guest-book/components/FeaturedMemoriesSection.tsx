import React from 'react';
import { Star } from 'lucide-react';
import type { GuestBookEntry, GuestBookReaction } from '../../../../features/guest-book/types';
import { GuestEntryCard } from './GuestEntryCard';

type Props = {
  entries: GuestBookEntry[];
  onEntryOpen: (entry: GuestBookEntry) => void;
  onImageClick: (entry: GuestBookEntry, index: number) => void;
  onLike: (entry: GuestBookEntry) => void;
  onReaction: (entry: GuestBookEntry, reaction: GuestBookReaction) => void;
  onShare: (entry: GuestBookEntry) => void;
};

export const FeaturedMemoriesSection: React.FC<Props> = ({
  entries,
  onEntryOpen,
  onImageClick,
  onLike,
  onReaction,
  onShare,
}) => {
  if (!entries.length) return null;

  return (
    <section className="mb-8" aria-labelledby="featured-memories-heading">
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-400 fill-amber-400" aria-hidden />
        <h2
          id="featured-memories-heading"
          className="text-sm font-bold uppercase tracking-[0.15em] text-amber-200/90"
        >
          Featured memories
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory guest-book-scroll -mx-1 px-1">
        {entries.map((entry) => (
          <div key={entry.id} className="w-[min(85vw,320px)] shrink-0 snap-center">
            <GuestEntryCard
              entry={entry}
              onOpen={() => onEntryOpen(entry)}
              onImageClick={(idx) => onImageClick(entry, idx)}
              onLike={() => onLike(entry)}
              onReaction={(r) => onReaction(entry, r)}
              onShare={() => onShare(entry)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedMemoriesSection;
