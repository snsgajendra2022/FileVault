import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Sparkles,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ScanFace,
} from 'lucide-react';
import { FaTimes } from 'react-icons/fa';
import { FiDownload } from 'react-icons/fi';
import { useAuth } from '../../state/context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProgressiveImage from '../../components/photo-studio/ProgressiveImage';
import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc';
import { LIGHTBOX_PROGRESSIVE_OPTIONS } from '../../utils/progressiveImageConfig';
import {
  variantsNeedPolling,
  type UserImageWithVariants,
} from '../../utils/progressiveImageVariants';
import {
  fetchFacePersonImages,
  fetchFacePersons,
  mapFaceImageToGallery,
  resolveMediaUrl,
  type FacePerson,
  type FacePersonsResponse,
} from '../../api/services/faceRecognitionService';
import '../photo-studio/imagesPageTheme.css';
import './filterImagesTheme.css';

const VISIBLE_AVATARS = 15;
const ASPECT_RATIO = 4 / 3;

const EMPTY_PERSONS: FacePersonsResponse = {
  userId: 0,
  username: '',
  fullName: '',
  totalPersons: 0,
  persons: [],
};

function personInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/[\s_]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function personThumbUrl(person: FacePerson): string {
  return resolveMediaUrl(person.personThumbnailUrl);
}

function imageKey(image: UserImageWithVariants): string {
  if (image.id != null && image.id !== '') return String(image.id);
  return image.previewUrl || image.filename;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const SkeletonPlaceholder = memo(function SkeletonPlaceholder() {
  return <div className="lumina-shimmer" aria-hidden />;
});

// ---------------------------------------------------------------------------
// Person avatar button
// ---------------------------------------------------------------------------

interface PersonAvatarButtonProps {
  person: FacePerson;
  active: boolean;
  onSelect: (personId: string) => void;
}

const PersonAvatarButton = memo(function PersonAvatarButton({
  person,
  active,
  onSelect,
}: PersonAvatarButtonProps) {
  const [imgError, setImgError] = useState(false);
  const thumb = personThumbUrl(person);

  return (
    <button
      type="button"
      className={`ff-avatar-btn ${active ? 'ff-avatar-btn--active' : ''}`}
      onClick={() => onSelect(person.personId)}
      aria-pressed={active}
      aria-label={`${person.displayName || person.personId}, ${person.imageCount ?? 0} photos`}
    >
      <div className="ff-avatar-ring">
        {thumb && !imgError ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="ff-avatar-fallback" aria-hidden>
            {personInitials(person.displayName)}
          </div>
        )}
        {person.isNewPerson && <span className="ff-badge-new">New</span>}
      </div>
      <span className="ff-avatar-name" title={person.displayName || person.personId}>
        {person.displayName || person.personId}
      </span>
      <span className="ff-avatar-count">{person.imageCount ?? 0} photos</span>
    </button>
  );
});

// ---------------------------------------------------------------------------
// Image card
// ---------------------------------------------------------------------------

type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface FilterImageCardProps {
  image: UserImageWithVariants;
  index: number;
  isVisible: boolean;
  onView: (image: UserImageWithVariants) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}

const FilterImageCard = memo(function FilterImageCard({
  image,
  index,
  isVisible,
  onView,
  cardRef,
}: FilterImageCardProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>('idle');

  useEffect(() => {
    if (!isVisible) return;
    if (loadState === 'idle') setLoadState('loading');
  }, [isVisible, loadState]);

  const handleLoad = useCallback(() => setLoadState('loaded'), []);
  const handleError = useCallback(() => setLoadState('error'), []);

  const showSkeleton = loadState === 'idle' || loadState === 'loading';
  const showImg = loadState === 'loading' || loadState === 'loaded';

  return (
    <article ref={cardRef} data-index={index} className="lumina-gallery-card group">
      <div
        className="lumina-media cursor-pointer"
        onClick={() => onView(image)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView(image);
          }
        }}
        aria-label={image.filename}
      >
        {showSkeleton && <SkeletonPlaceholder />}
        {showImg && (
          <div
            className="absolute inset-0 transition-opacity duration-500 ease-out"
            style={{ opacity: loadState === 'loaded' ? 1 : 0 }}
          >
            <ProgressiveImage
              image={image}
              enabled={isVisible}
              mode="thumbnail"
              alt={image.filename}
              className="h-full w-full object-cover"
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        )}
        {loadState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#eceef0]">
            <ImageIcon className="h-8 w-8 text-[#94a3b8]" />
          </div>
        )}
        <div className="lumina-media-overlay" aria-hidden />
      </div>
      <div className="lumina-card-footer">
        <p className="lumina-card-filename" title={image.filename}>
          {image.filename}
        </p>
      </div>
    </article>
  );
});

// ---------------------------------------------------------------------------
// All persons modal
// ---------------------------------------------------------------------------

interface PersonPickerModalProps {
  persons: FacePerson[];
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onClose: () => void;
}

function PersonPickerModal({ persons, selectedId, onSelect, onClose }: PersonPickerModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) => p.displayName.toLowerCase().includes(q));
  }, [persons, search]);

  return (
    <div
      className="ff-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="ff-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="All people"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--ff-border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[color:var(--ff-on-surface)]">All people</h3>
            <p className="text-xs text-[color:var(--ff-muted)]">{persons.length} detected</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[color:var(--ff-muted)] transition hover:bg-[color:var(--ff-primary-soft)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ff-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              className="w-full rounded-xl border border-[color:var(--ff-border)] bg-[color:var(--ff-bg)] py-2.5 pl-10 pr-4 text-sm text-[color:var(--ff-on-surface)] placeholder:text-[color:var(--ff-muted)] focus:border-[color:var(--ff-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ff-ring)]"
            />
          </div>
        </div>
        <div className="ff-person-grid mb-4">
          {filtered.map((person) => (
            <PersonAvatarButton
              key={person.personId}
              person={person}
              active={selectedId === person.personId}
              onSelect={(id) => {
                onSelect(id);
                onClose();
              }}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-[color:var(--ff-muted)]">
              No people match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const FilterImagesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    () => searchParams.get('person') || null
  );
  const [showAllPersons, setShowAllPersons] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UserImageWithVariants | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const cardRefsMapRef = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    data: personsData,
    isPending: personsLoading,
    isError: personsError,
    error: personsErr,
    refetch: refetchPersons,
  } = useQuery({
    queryKey: ['facePersons', userId],
    queryFn: async () => {
      if (!userId) return EMPTY_PERSONS;
      try {
        return await fetchFacePersons(userId);
      } catch (err) {
        console.warn('Failed to load face persons:', err);
        throw err;
      }
    },
    enabled: !!userId,
    staleTime: 30_000,
    retry: 1,
  });

  const persons = Array.isArray(personsData?.persons) ? personsData.persons : [];

  const selectPerson = useCallback(
    (personId: string) => {
      setSelectedPersonId(personId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('person', personId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    const fromUrl = searchParams.get('person');
    if (fromUrl && persons.some((p) => p.personId === fromUrl)) {
      setSelectedPersonId(fromUrl);
      return;
    }
    if (persons.length === 0) {
      setSelectedPersonId(null);
      return;
    }
    if (!selectedPersonId || !persons.some((p) => p.personId === selectedPersonId)) {
      const first = persons[0].personId;
      setSelectedPersonId(first);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('person', first);
          return next;
        },
        { replace: true }
      );
    }
  }, [persons, selectedPersonId, searchParams, setSearchParams]);

  const selectedPerson = useMemo(
    () => persons.find((p) => p.personId === selectedPersonId) ?? null,
    [persons, selectedPersonId]
  );

  const visiblePersons = persons.slice(0, VISIBLE_AVATARS);
  const hiddenPersonCount = Math.max(0, persons.length - VISIBLE_AVATARS);

  const {
    data: imagesData,
    isPending: imagesLoading,
    isFetching: imagesFetching,
    isError: imagesError,
    error: imagesErr,
    refetch: refetchImages,
  } = useQuery({
    queryKey: ['facePersonImages', userId, selectedPersonId],
    queryFn: async () => {
      if (!userId || !selectedPersonId) {
        return { userId: userId ?? 0, person: { personId: '', displayName: '', confidence: 0, imageCount: 0 }, totalImages: 0, imageIds: [], images: [] };
      }
      return fetchFacePersonImages(userId, selectedPersonId);
    },
    enabled: !!userId && !!selectedPersonId,
    staleTime: 15_000,
    retry: 1,
    refetchInterval: (q) => {
      const imgs = q.state.data?.images ?? [];
      const mapped = imgs.map(mapFaceImageToGallery);
      return variantsNeedPolling(mapped) ? 4000 : false;
    },
  });

  const images = useMemo(
    () => (Array.isArray(imagesData?.images) ? imagesData.images : []).map(mapFaceImageToGallery),
    [imagesData]
  );

  const activeLightboxImage = useMemo(() => {
    if (!selectedImage) return null;
    const key = imageKey(selectedImage);
    return images.find((img) => imageKey(img) === key) ?? selectedImage;
  }, [selectedImage, images]);

  const lightboxProgressive = useProgressiveImageSrc(
    activeLightboxImage ?? {
      previewUrl: '',
      filename: '',
      downloadUrl: '',
      thumbnailUrl: '',
      enabledServices: {},
      uploadTime: '',
      fileType: '',
    },
    !!activeLightboxImage,
    'progressive',
    LIGHTBOX_PROGRESSIVE_OPTIONS
  );

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) el.dataset.index = String(index);
      cardRefsMapRef.current.set(index, el);
    },
    []
  );

  useEffect(() => {
    if (images.length === 0) return;
    const observer =
      observerRef.current ||
      new IntersectionObserver(
        (entries) => {
          setVisibleIndices((prev) => {
            const next = new Set(prev);
            let changed = false;
            entries.forEach((entry) => {
              const idx = Number((entry.target as HTMLElement).dataset.index);
              if (Number.isNaN(idx)) return;
              if (entry.isIntersecting && !next.has(idx)) {
                next.add(idx);
                changed = true;
              } else if (!entry.isIntersecting && next.has(idx)) {
                next.delete(idx);
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        },
        { rootMargin: '120px', threshold: 0.01 }
      );
    observerRef.current = observer;
    const map = cardRefsMapRef.current;
    const id = requestAnimationFrame(() => {
      map.forEach((el) => {
        if (el) observer.observe(el);
      });
    });
    return () => {
      cancelAnimationFrame(id);
      map.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [images.length, selectedPersonId]);

  const handleView = useCallback(
    (image: UserImageWithVariants) => {
      const idx = images.findIndex((img) => imageKey(img) === imageKey(image));
      setSelectedImage(image);
      setSelectedImageIndex(idx >= 0 ? idx : 0);
    },
    [images]
  );

  const closeLightbox = useCallback(() => {
    setSelectedImage(null);
    setSelectedImageIndex(-1);
  }, []);

  const handlePrevImage = useCallback(() => {
    if (images.length <= 1) return;
    const next = selectedImageIndex <= 0 ? images.length - 1 : selectedImageIndex - 1;
    setSelectedImageIndex(next);
    setSelectedImage(images[next]);
  }, [images, selectedImageIndex]);

  const handleNextImage = useCallback(() => {
    if (images.length <= 1) return;
    const next = selectedImageIndex >= images.length - 1 ? 0 : selectedImageIndex + 1;
    setSelectedImageIndex(next);
    setSelectedImage(images[next]);
  }, [images, selectedImageIndex]);

  const handleDownload = useCallback((image: UserImageWithVariants) => {
    if (!image.downloadUrl) return;
    const a = document.createElement('a');
    a.href = image.downloadUrl;
    a.download = image.filename || 'image';
    a.rel = 'noopener';
    a.click();
  }, []);

  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImage, closeLightbox, handlePrevImage, handleNextImage]);

  const pageTitle = t('nav.studio.filterImages', { defaultValue: 'People Frame' });

  if (!userId) {
    return (
      <div className="filter-images-scope flex min-h-[50vh] items-center justify-center p-8">
        <LoadingSpinner text="Loading account…" />
      </div>
    );
  }

  return (
    <div className="filter-images-scope images-library-scope min-h-full">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
        {/* Hero */}
        <section className="ff-hero">
          <div className="ff-hero-glow" aria-hidden />
          <div className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ff-primary-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--ff-primary)]">
                <ScanFace className="h-3.5 w-3.5" />
                Face recognition
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[color:var(--ff-on-surface)] md:text-4xl">
                {pageTitle}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-[color:var(--ff-muted)] md:text-base">
                Browse photos grouped by detected people. Tap a face to instantly filter your library
                with smooth, progressive image loading.
              </p>
              {personsData && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="ff-confidence">
                    <Users className="h-3.5 w-3.5" />
                    {personsData.totalPersons} people
                  </span>
                  {selectedPerson && (
                    <span className="ff-confidence">
                      <Sparkles className="h-3.5 w-3.5" />
                      {Math.round(selectedPerson.confidence * 100)}% match
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Person strip */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--ff-muted)]">
            Select a person
          </h2>
          {personsLoading ? (
            <div className="ff-person-strip justify-center py-6">
              <LoadingSpinner size="md" text="Detecting faces…" />
            </div>
          ) : personsError ? (
            <div className="ff-empty">
              <p className="text-sm font-medium text-[color:var(--ff-on-surface)]">
                Could not load people
              </p>
              <p className="text-xs">{(personsErr as Error)?.message || 'Unknown error'}</p>
              <button
                type="button"
                onClick={() => refetchPersons()}
                className="lumina-btn-primary mt-2 px-5 py-2 text-sm"
              >
                Retry
              </button>
            </div>
          ) : persons.length === 0 ? (
            <div className="ff-empty">
              <ScanFace className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">No faces detected yet</p>
              <p className="max-w-sm text-xs">
                Upload photos with clear faces and they will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="ff-person-strip">
              {visiblePersons.map((person) => (
                <PersonAvatarButton
                  key={person.personId}
                  person={person}
                  active={selectedPersonId === person.personId}
                  onSelect={selectPerson}
                />
              ))}
              {hiddenPersonCount > 0 && (
                <button
                  type="button"
                  className="ff-view-more"
                  onClick={() => setShowAllPersons(true)}
                  aria-label={`View ${hiddenPersonCount} more people`}
                >
                  <div className="ff-view-more-stack" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>+{hiddenPersonCount}</span>
                  <span>View more</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Gallery */}
        {selectedPersonId && (
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[color:var(--ff-on-surface)]">
                  {selectedPerson?.displayName ?? 'Photos'}
                </h2>
                <p className="text-sm text-[color:var(--ff-muted)]">
                  {imagesData?.totalImages ?? images.length} photos
                  {imagesFetching && !imagesLoading ? ' · refreshing…' : ''}
                </p>
              </div>
            </div>

            {imagesLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner size="lg" text="Loading photos…" />
              </div>
            ) : imagesError ? (
              <div className="ff-empty">
                <p className="text-sm font-medium">Could not load photos</p>
                <p className="text-xs">{(imagesErr as Error)?.message || 'Unknown error'}</p>
                <button
                  type="button"
                  onClick={() => refetchImages()}
                  className="lumina-btn-primary mt-2 px-5 py-2 text-sm"
                >
                  Retry
                </button>
              </div>
            ) : images.length === 0 ? (
              <div className="ff-empty">
                <ImageIcon className="h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">No photos for this person</p>
              </div>
            ) : (
              <div
                className="lumina-gallery-grid"
                style={{ '--lumina-aspect': ASPECT_RATIO } as React.CSSProperties}
              >
                {images.map((image, index) => (
                  <FilterImageCard
                    key={imageKey(image)}
                    image={image}
                    index={index}
                    isVisible={visibleIndices.has(index)}
                    onView={handleView}
                    cardRef={setCardRef(index)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {showAllPersons && (
        <PersonPickerModal
          persons={persons}
          selectedId={selectedPersonId}
          onSelect={selectPerson}
          onClose={() => setShowAllPersons(false)}
        />
      )}

      {/* Lightbox */}
      {selectedImage && activeLightboxImage && (
        <div
          className="fixed inset-0 z-[99999] bg-[oklch(0.12_0.02_270/0.97)] backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="lumina-lightbox-chrome pointer-events-none absolute inset-x-0 top-0 z-[100000] flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="pointer-events-auto min-w-0 flex-1 pr-4">
              <p className="truncate text-sm font-semibold text-white">
                {activeLightboxImage.filename}
              </p>
              {selectedPerson && (
                <p className="mt-0.5 text-xs text-white/55">{selectedPerson.displayName}</p>
              )}
            </div>
            <div className="lumina-lightbox-pill pointer-events-auto shrink-0">
              <button
                type="button"
                onClick={() => handleDownload(activeLightboxImage)}
                aria-label="Download"
              >
                <FiDownload className="h-5 w-5" />
              </button>
              <button type="button" onClick={closeLightbox} aria-label="Close">
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="absolute inset-0 pt-[4.5rem]">
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="lumina-nav-btn absolute left-3 top-1/2 z-30 -translate-y-1/2 md:left-6"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="lumina-nav-btn absolute right-3 top-1/2 z-30 -translate-y-1/2 md:right-6"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              {lightboxProgressive.baseSrc ? (
                <>
                  <img
                    src={lightboxProgressive.baseSrc}
                    alt={activeLightboxImage.filename}
                    className="absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain"
                    draggable={false}
                  />
                  {lightboxProgressive.overlaySrc && (
                    <img
                      src={lightboxProgressive.overlaySrc}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain transition-opacity duration-300 ease-in-out"
                      style={{ opacity: lightboxProgressive.overlayVisible ? 1 : 0 }}
                      draggable={false}
                    />
                  )}
                </>
              ) : null}

              {(lightboxProgressive.isUpgrading ||
                lightboxProgressive.stepIndex < lightboxProgressive.totalSteps - 1) && (
                <div
                  className="pointer-events-none absolute bottom-5 left-1/2 z-20 w-[min(280px,88vw)] -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 backdrop-blur-sm"
                  aria-live="polite"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-white/90">
                    <span>{lightboxProgressive.qualityLabel}</span>
                    <span className="text-white/60">
                      {lightboxProgressive.stepIndex + 1}/{lightboxProgressive.totalSteps}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white/85 transition-all duration-300 ease-out"
                      style={{
                        width: `${
                          lightboxProgressive.totalSteps > 1
                            ? Math.round(
                                ((lightboxProgressive.stepIndex + 1) /
                                  lightboxProgressive.totalSteps) *
                                  100
                              )
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterImagesPage;
