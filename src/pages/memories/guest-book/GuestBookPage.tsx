import React from 'react';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import type { GuestBookEntry, GuestBookEntryInput, GuestBookReaction } from '../../../features/guest-book/types';
import { useGuestBook } from '../../../features/guest-book/useGuestBook';
import { GuestBookHeader } from './components/GuestBookHeader';
import { GuestBookFilters } from './components/GuestBookFilters';
import { GuestEntryGrid } from './components/GuestEntryGrid';
import { GuestEntryForm } from './components/GuestEntryForm';
import { GuestEntryDetailModal } from './components/GuestEntryDetailModal';
import { ImageLightbox } from './components/ImageLightbox';
import { EmptyGuestBookState } from './components/EmptyGuestBookState';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { FeaturedMemoriesSection } from './components/FeaturedMemoriesSection';
import './guest-book.css';

export type GuestBookPageProps = {
  scopeId: string;
  scopeName: string;
  apiEntries: GuestBookEntry[];
  subtitle?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  canUpload?: boolean;
  canManage?: boolean;
  onUploadFiles?: (files: File[], note?: string) => Promise<void>;
  onUploadSuccess?: () => void;
  /** Studio embed inside portal layout vs public dark page */
  variant?: 'embedded' | 'standalone';
};

export const GuestBookPage: React.FC<GuestBookPageProps> = ({
  scopeId,
  scopeName,
  apiEntries,
  subtitle,
  loading = false,
  error = false,
  onRetry,
  canUpload = false,
  canManage = false,
  onUploadFiles,
  onUploadSuccess,
  variant = 'standalone',
}) => {
  const {
    filters,
    setFilters,
    filteredEntries,
    featuredEntries,
    categories,
    tags,
    togglePin,
    toggleFeatured,
    toggleLike,
    setReaction,
    addLocalEntry,
    updateLocalEntry,
    deleteLocalEntry,
    setEntryMeta,
  } = useGuestBook({ scopeId, apiEntries, canManage });

  const [formOpen, setFormOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [detailEntry, setDetailEntry] = React.useState<GuestBookEntry | null>(null);
  const [lightbox, setLightbox] = React.useState<{
    entry: GuestBookEntry;
    index: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<GuestBookEntry | null>(null);
  const [editTarget, setEditTarget] = React.useState<GuestBookEntry | null>(null);

  const handleShare = React.useCallback(async (entry: GuestBookEntry) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `${entry.guestName}: ${entry.message.slice(0, 120)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: entry.guestName, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success('Link copied to clipboard');
      }
    } catch {
      /* cancelled */
    }
  }, []);

  const handleLike = React.useCallback(
    (entry: GuestBookEntry) => {
      toggleLike(scopeId, entry.id);
    },
    [scopeId, toggleLike]
  );

  const handleReaction = React.useCallback(
    (entry: GuestBookEntry, reaction: GuestBookReaction) => {
      setReaction(scopeId, entry.id, reaction);
    },
    [scopeId, setReaction]
  );

  const handleSubmit = React.useCallback(
    async (input: GuestBookEntryInput) => {
      setSubmitting(true);
      try {
        if (editTarget?.source === 'local') {
          updateLocalEntry(scopeId, editTarget.id, input);
          setEntryMeta(scopeId, editTarget.id, {
            title: input.title,
            date: input.date,
            category: input.category,
            tag: input.tag,
          });
          toast.success('Memory updated');
          setFormOpen(false);
          setEditTarget(null);
          return;
        }

        if (input.images.length > 0 && canUpload && onUploadFiles) {
          const note = [input.guestName, input.title, input.message].filter(Boolean).join(' — ');
          await onUploadFiles(input.images, note);
          setEntryMeta(scopeId, `pending:${Date.now()}`, {
            title: input.title,
            category: input.category,
            tag: input.tag,
            date: input.date,
          });
          onUploadSuccess?.();
          toast.success('Memory shared — thank you!');
        } else {
          addLocalEntry(scopeId, input);
          toast.success('Memory added to guest book');
        }
        setFormOpen(false);
        setEditTarget(null);
      } catch {
        toast.error('Could not save memory. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      editTarget,
      canUpload,
      scopeId,
      onUploadFiles,
      updateLocalEntry,
      setEntryMeta,
      onUploadSuccess,
      addLocalEntry,
    ]
  );

  const handleDelete = React.useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.source === 'local') {
      deleteLocalEntry(scopeId, deleteTarget.id);
      toast.success('Memory deleted');
    } else {
      toast.error('Server entries cannot be deleted from the guest book UI yet.');
    }
    setDeleteTarget(null);
    setDetailEntry(null);
  }, [deleteTarget, deleteLocalEntry, scopeId]);

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      tag: '',
      dateFrom: '',
      dateTo: '',
      sort: filters.sort,
      layout: filters.layout,
    });
  };

  const editInitialValues = React.useMemo(
    () =>
      editTarget
        ? {
            guestName: editTarget.guestName,
            message: editTarget.message,
            title: editTarget.title,
            date: editTarget.date?.slice(0, 10),
            category: editTarget.category,
            tag: editTarget.tag,
            images: [] as File[],
          }
        : undefined,
    [editTarget]
  );

  return (
    <div
      className={`guest-book-root guest-book-root--studio ${
        variant === 'embedded' ? 'guest-book-root--embedded' : 'guest-book-root--standalone'
      }`}
    >
      <GuestBookHeader
        eventName={scopeName}
        subtitle={subtitle}
        entryCount={filteredEntries.length}
        layout={filters.layout}
        onLayoutChange={(layout) => setFilters({ layout })}
        sort={filters.sort}
        onSortChange={(sort) => setFilters({ sort })}
        onAddClick={() => {
          setEditTarget(null);
          setFormOpen(true);
        }}
        showAddButton={canUpload || canManage}
        compact={variant === 'embedded'}
      />

      <GuestBookFilters
        filters={filters}
        categories={categories}
        tags={tags}
        onChange={(patch) => setFilters(patch)}
        onClear={clearFilters}
      />

      {loading ? <LoadingSkeleton /> : null}

      {!loading && error ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-4" aria-hidden />
          <p className="text-sm font-semibold text-red-200 mb-4">Could not load guest book memories</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 min-h-[44px]"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && featuredEntries.length > 0 ? (
        <FeaturedMemoriesSection
          entries={featuredEntries}
          onEntryOpen={setDetailEntry}
          onImageClick={(entry, idx) => setLightbox({ entry, index: idx })}
          onLike={handleLike}
          onReaction={handleReaction}
          onShare={handleShare}
        />
      ) : null}

      {!loading && !error && filteredEntries.length === 0 ? (
        <EmptyGuestBookState
          onAddClick={() => setFormOpen(true)}
          showAddButton={canUpload || canManage}
          showAlbumHint={canManage && variant === 'embedded'}
        />
      ) : null}

      {!loading && !error && filteredEntries.length > 0 ? (
        <GuestEntryGrid
          entries={filteredEntries}
          layout={filters.layout}
          onEntryOpen={setDetailEntry}
          onImageClick={(entry, idx) => setLightbox({ entry, index: idx })}
          onLike={handleLike}
          onReaction={handleReaction}
          onShare={handleShare}
          onPin={canManage ? (entry) => togglePin(scopeId, entry.id) : undefined}
          onFeature={canManage ? (entry) => toggleFeatured(scopeId, entry.id) : undefined}
          showManageActions={canManage}
        />
      ) : null}

      <GuestEntryForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        editMode={Boolean(editTarget)}
        initialValues={editInitialValues}
      />

      <GuestEntryDetailModal
        open={Boolean(detailEntry)}
        entry={detailEntry}
        entries={filteredEntries}
        onClose={() => setDetailEntry(null)}
        onNavigate={setDetailEntry}
        onImageClick={(idx) => detailEntry && setLightbox({ entry: detailEntry, index: idx })}
        onLike={() => detailEntry && handleLike(detailEntry)}
        onReaction={(r) => detailEntry && handleReaction(detailEntry, r)}
        onShare={() => detailEntry && handleShare(detailEntry)}
        onEdit={
          detailEntry?.canEdit
            ? () => {
                setEditTarget(detailEntry);
                setFormOpen(true);
                setDetailEntry(null);
              }
            : undefined
        }
        onDelete={detailEntry?.canDelete ? () => setDeleteTarget(detailEntry) : undefined}
      />

      <ImageLightbox
        open={Boolean(lightbox)}
        images={lightbox?.entry.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
        title={lightbox?.entry.guestName}
      />

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        guestName={deleteTarget?.guestName}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default GuestBookPage;
