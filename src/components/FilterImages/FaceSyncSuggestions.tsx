import React from 'react';
import toast from 'react-hot-toast';
import {
  acceptSuggestionQueue,
  dismissSuggestion,
  fetchPeople,
  fetchSuggestions,
  mergePersons,
  type FaceSyncPerson,
  type SuggestionItem,
} from '../../api/services/faceSyncService';
import { confidencePct, getImageSource } from './utils';

function isLiveSuggestionId(id: string): boolean {
  return id.startsWith('live::');
}

async function pickMergeSourceTarget(
  s: SuggestionItem,
  people: FaceSyncPerson[]
): Promise<{ source: string; target: string } | null> {
  const ev = s.evidence as Record<string, unknown> | undefined;
  const rm = ev?.recommended_merge as { source?: string; target?: string } | undefined;
  if (rm?.source && rm?.target) return { source: String(rm.source), target: String(rm.target) };
  const persons = Array.isArray(s.persons) ? s.persons.filter(Boolean) : [];
  if (persons.length >= 2) {
    const a = String(persons[0]);
    const b = String(persons[1]);
    const map = Object.fromEntries(people.map((p) => [p.person_id, p.count || 0]));
    const ca = map[a] ?? 0;
    const cb = map[b] ?? 0;
    return ca <= cb ? { source: a, target: b } : { source: b, target: a };
  }
  return null;
}

const FaceSyncSuggestions: React.FC = () => {
  const [items, setItems] = React.useState<SuggestionItem[]>([]);
  const [thumbs, setThumbs] = React.useState<Record<string, FaceSyncPerson>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [healthBanner, setHealthBanner] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [sug, peopleRes] = await Promise.all([
        fetchSuggestions('open'),
        fetchPeople({ per_page: 500 }).catch(() => ({ people: [] })),
      ]);
      const sorted = [...(sug.items || [])].sort((a, b) => confidencePct(b) - confidencePct(a));
      setItems(sorted);
      const map: Record<string, FaceSyncPerson> = {};
      (peopleRes.people || []).forEach((p) => {
        if (p.person_id) map[p.person_id] = p;
      });
      setThumbs(map);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const accept = async (s: SuggestionItem) => {
    const dir = await pickMergeSourceTarget(s, Object.values(thumbs));
    if (!dir) {
      toast.error('Cannot merge: missing person pair.');
      return;
    }
    try {
      const body = await mergePersons({
        source: dir.source,
        target: dir.target,
        force: false,
        preview_only: false,
        include_preview: true,
      });
      toast.success(`Merged ${String(body.source || dir.source)} → ${String(body.target || dir.target)}`);
      const mhw = body.merge_health_warning as { merge_health?: string; reason?: string; snapshot_id?: string } | undefined;
      if (mhw?.merge_health && mhw.merge_health !== 'ok') {
        setHealthBanner(
          `Post-merge health: ${mhw.merge_health} — ${mhw.reason || 'Review recommended.'}${mhw.snapshot_id ? ` Snapshot: ${mhw.snapshot_id}` : ''}`
        );
      }
      if (!isLiveSuggestionId(String(s.suggestion_id))) {
        try {
          await acceptSuggestionQueue(String(s.suggestion_id));
        } catch {
          toast.error('Merged; suggestion queue update failed.');
        }
      }
      setItems((prev) => prev.filter((x) => x.suggestion_id !== s.suggestion_id));
      if (!items.length) load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Merge failed');
    }
  };

  const dismiss = async (s: SuggestionItem) => {
    const sid = String(s.suggestion_id);
    if (isLiveSuggestionId(sid)) {
      toast.success('Live hint dismissed.');
      setItems((prev) => prev.filter((x) => x.suggestion_id !== s.suggestion_id));
      return;
    }
    try {
      await dismissSuggestion(sid);
      toast.success('Dismissed');
      setItems((prev) => prev.filter((x) => x.suggestion_id !== s.suggestion_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Dismiss failed');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 py-10 pb-16 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Merge queue</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Suggestions</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-500">
          Review merge candidates from face clustering. Merge runs <code className="rounded-lg bg-slate-100 px-1.5 text-sm">POST /api/person/merge</code>.
        </p>
      </header>

      {healthBanner && (
        <div className="max-w-4xl rounded-2xl border border-amber-200/90 bg-amber-50/95 px-5 py-4 text-sm text-amber-950" role="alert">
          {healthBanner}
        </div>
      )}

      {loading && (
        <div className="grid gap-6">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      )}

      {error && !loading && (
        <div className="surface-card p-10 text-center">
          <p className="font-semibold text-slate-800">Could not load suggestions</p>
          <button type="button" className="mt-4 text-sm font-semibold text-indigo-600" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !items.length && (
        <div className="surface-card empty-state p-10 text-center">
          <p className="text-sm font-semibold text-slate-800">All caught up</p>
          <p className="mt-2 text-sm text-slate-500">No open merge suggestions right now.</p>
        </div>
      )}

      <div className="grid gap-6">
        {items.map((s) => {
          const pct = confidencePct(s);
          const persons = Array.isArray(s.persons) ? s.persons.filter(Boolean) : [];
          const pa = persons[0] ? String(persons[0]) : '';
          const pb = persons[1] ? String(persons[1]) : '';
          const Face = ({ pid }: { pid: string }) => {
            const p = thumbs[pid];
            const src = getImageSource(p, 'person');
            return (
              <div className="suggestion-face-tile mx-auto aspect-square w-32 overflow-hidden rounded-xl bg-slate-100">
                {src ? (
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 font-mono text-[0.65rem] text-slate-500">{pid || '—'}</div>
                )}
              </div>
            );
          };
          return (
            <article key={s.suggestion_id} className="surface-card lift rounded-2xl p-6 lg:p-8">
              <p className="text-sm font-semibold text-slate-900">{s.summary || s.type || 'Merge suggestion'}</p>
              <p className="mt-1 text-xs text-slate-500">{persons.join(' · ')}</p>
              <div className="mt-6 grid items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-2xl border border-slate-200/90 p-4 text-center">
                  <Face pid={pa} />
                  <p className="mt-3 font-mono text-xs">{pa || '—'}</p>
                </div>
                <div className="hidden items-center justify-center sm:flex">
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase text-slate-400">vs</span>
                </div>
                <div className="rounded-2xl border border-slate-200/90 p-4 text-center">
                  <Face pid={pb} />
                  <p className="mt-3 font-mono text-xs">{pb || '—'}</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Merge confidence</span>
                  <span className="font-mono font-semibold">{pct}%</span>
                </div>
                <div className="progress-track mt-2 h-2 rounded-full bg-slate-100">
                  <div className="progress-fill h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  onClick={() => accept(s)}
                >
                  Merge
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
                  onClick={() => dismiss(s)}
                >
                  Dismiss
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default FaceSyncSuggestions;
