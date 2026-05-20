import React from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  deletePhoto,
  fetchPerson,
  overrideDemographics,
  renamePerson,
  type PersonDetail,
} from '../../api/services/faceSyncService';
import ConfirmModal from './ConfirmModal';
import { getImageSource, maturityBadgeClass, qualityPillClasses } from './utils';

const FaceSyncPersonDetail: React.FC = () => {
  const { personId: rawId } = useParams<{ personId: string }>();
  const personId = rawId ? decodeURIComponent(rawId) : '';
  const [detail, setDetail] = React.useState<PersonDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [lbIndex, setLbIndex] = React.useState(-1);
  const [demoOpen, setDemoOpen] = React.useState(false);
  const [ageVal, setAgeVal] = React.useState('');
  const [genderVal, setGenderVal] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<{ filename: string } | null>(null);
  const renameTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = React.useCallback(async () => {
    if (!personId) return;
    setLoading(true);
    setError('');
    try {
      const d = await fetchPerson(personId);
      setDetail(d);
      setDisplayName(d.name || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRenameInput = (name: string) => {
    setDisplayName(name);
    if (renameTimer.current) clearTimeout(renameTimer.current);
    renameTimer.current = setTimeout(async () => {
      try {
        await renamePerson(personId, name);
        toast.success('Name updated');
        setDetail((d) => (d ? { ...d, name } : d));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Rename failed');
      }
    }, 500);
  };

  const images = detail?.images || [];
  const lbImage = lbIndex >= 0 ? images[lbIndex] : null;

  if (!personId) {
    return (
      <section className="p-10 text-center">
        <Link to="/filter-images/people" className="font-semibold text-indigo-600">
          Go to People
        </Link>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="p-10">
        <div className="skeleton h-48 rounded-2xl" />
      </section>
    );
  }

  if (error || !detail) {
    return (
      <section className="mx-auto max-w-7xl p-10">
        <p className="text-red-600">{error || 'Not found'}</p>
        <Link to="/filter-images/people" className="mt-4 inline-block text-indigo-600">
          Back to People
        </Link>
      </section>
    );
  }

  const name = detail.name || personId;

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 pb-16 lg:px-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/filter-images/people" className="font-medium text-indigo-600 hover:underline">
          People
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-800">{name}</span>
      </nav>

      <article className="surface-card glass rounded-2xl p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Identity</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`badge ${maturityBadgeClass(String(detail.maturity_level || 'growing'))}`}>
                Maturity: {detail.maturity_level || '—'}
              </span>
              {detail.identity_locked && <span className="badge badge-lock">Locked</span>}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {detail.person_id} · {detail.count || images.length} photos
            </p>
            {detail.suggested_name && (
              <div className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-3 text-sm">
                <p className="font-semibold">Suggested name (pending)</p>
                <p className="mt-1">{detail.suggested_name}</p>
              </div>
            )}
            <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white/80 p-5">
              <label htmlFor="rename-input" className="text-xs font-semibold uppercase text-slate-500">
                Display name
              </label>
              <input
                id="rename-input"
                value={displayName}
                onChange={(e) => onRenameInput(e.target.value)}
                className="mt-2 w-full max-w-md rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="How this person appears in FaceSync"
              />
              <p className="mt-2 text-xs text-slate-400">Saved automatically after you pause typing.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card-premium rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Images</p>
              <p className="mt-2 text-2xl font-semibold">{detail.count || images.length}</p>
            </div>
            <div className="stat-card-premium rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Stability</p>
              <p className="mt-2 text-2xl font-semibold">{detail.maturity_level || detail.stability || '—'}</p>
            </div>
            <div className="stat-card-premium rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Cohesion</p>
              <p className="mt-2 text-2xl font-semibold">
                {detail.identity_cohesion != null ? Number(detail.identity_cohesion).toFixed(3) : '—'}
              </p>
            </div>
            <div className="stat-card-premium rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Lock</p>
              <p className="mt-2 text-2xl font-semibold">{detail.identity_locked ? 'Locked' : 'None'}</p>
            </div>
            <div className="stat-card-premium rounded-2xl border border-slate-100 p-4">
              <div className="flex justify-between">
                <p className="text-xs text-slate-500">Predicted Age</p>
                <button type="button" className="text-slate-400 hover:text-indigo-600" onClick={() => setDemoOpen(true)}>
                  Edit
                </button>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {detail.average_age != null ? `${Math.round(detail.average_age)}y` : '—'}
              </p>
            </div>
            <div className="stat-card-premium rounded-2xl border border-slate-100 p-4">
              <p className="text-xs text-slate-500">Gender Identity</p>
              <p className="mt-2 text-2xl font-semibold">
                {detail.manual_gender ||
                  (detail.gender_distribution?.male && detail.gender_distribution.male > 70
                    ? 'Male'
                    : detail.gender_distribution?.female && detail.gender_distribution.female > 70
                      ? 'Female'
                      : '—')}
              </p>
            </div>
          </div>
        </div>
      </article>

      <article className="surface-card rounded-2xl p-6 lg:p-8">
        <h2 className="text-lg font-semibold">Gallery</h2>
        <div className="masonry mt-6 columns-2 gap-4 md:columns-3 lg:columns-4">
          {images.map((img, idx) => {
            const row = { ...img, person_id: personId };
            const src = getImageSource(row, 'person');
            return (
              <button
                key={img.filename}
                type="button"
                className="mb-4 block w-full overflow-hidden rounded-2xl break-inside-avoid"
                onClick={() => setLbIndex(idx)}
              >
                {src ? (
                  <img src={src} alt={img.filename} loading="lazy" className="w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-slate-100 text-xs">{img.filename}</div>
                )}
              </button>
            );
          })}
        </div>
      </article>

      {lbImage && (
        <div className="modal-backdrop is-open fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4">
          <div className="split-lightbox flex max-h-[92vh] max-w-5xl overflow-hidden rounded-2xl bg-white">
            <div className="split-lightbox-media relative flex flex-1 items-center justify-center bg-black">
              <button type="button" className="absolute top-4 right-4 z-50 rounded-full bg-black/60 p-3 text-white" onClick={() => setLbIndex(-1)}>
                ✕
              </button>
              <img src={getImageSource({ ...lbImage, person_id: personId }, 'lightbox')} alt="" className="max-h-[85vh] object-contain" />
            </div>
            <div className="w-72 p-6">
              <p className="text-sm font-semibold break-all">{lbImage.filename}</p>
              {lbImage.quality_score != null && (
                <span className={`mt-2 inline-block rounded-lg border px-2 py-0.5 text-xs ${qualityPillClasses(String(lbImage.quality_level || ''))}`}>
                  Quality {lbImage.quality_level} · {Math.round(Number(lbImage.quality_score) * 100)}%
                </span>
              )}
              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-rose-200 py-2 text-sm text-rose-600"
                onClick={() => setDeleteTarget({ filename: lbImage.filename })}
              >
                Delete photo
              </button>
            </div>
          </div>
        </div>
      )}

      {demoOpen && (
        <div className="modal-backdrop is-open fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Override Demographics</h2>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-slate-500">Age</label>
              <input
                type="number"
                step="0.1"
                value={ageVal}
                onChange={(e) => setAgeVal(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-slate-500">Gender</label>
              <select value={genderVal} onChange={(e) => setGenderVal(e.target.value)} className="mt-1 w-full rounded-xl border px-4 py-2 text-sm">
                <option value="">(Keep existing)</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-xl border px-5 py-2 text-sm" onClick={() => setDemoOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  try {
                    const payload: { person_id: string; age?: number; gender?: string } = { person_id: personId };
                    if (ageVal !== '') payload.age = parseFloat(ageVal);
                    if (genderVal) payload.gender = genderVal;
                    await overrideDemographics(payload);
                    toast.success('Demographics updated');
                    setDemoOpen(false);
                    load();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Update failed');
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Confirm deletion"
        message={`Delete ${deleteTarget?.filename}?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deletePhoto(personId, deleteTarget.filename);
            toast.success('Photo deleted');
            setLbIndex(-1);
            setDeleteTarget(null);
            load();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Delete failed');
          }
        }}
      />
    </section>
  );
};

export default FaceSyncPersonDetail;
