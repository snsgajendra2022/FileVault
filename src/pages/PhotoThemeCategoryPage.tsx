import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaStar,
  FaHeart,
  FaUsers,
  FaCalendarAlt,
  FaBriefcase,
  FaCloud,
  FaImages,
  FaFolderOpen,
  FaPalette,
} from 'react-icons/fa';

type PageKind = 'cover' | 'last';

export type EditablePageState = {
  headline: string;
  subheadline: string;
  description: string;
  imageDataUrl?: string;
  style?: {
    fontSize?: number;
    fontWeight?: number;
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
    fontFamily?: string;
    headlineColor?: string;
    subheadlineColor?: string;
    imageScale?: number;
  };
};

type ThemeMeta = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const THEME_META: ThemeMeta[] = [
  {
    id: 'birthday',
    title: 'Birthday Themes',
    subtitle: 'Celebrate special moments with vibrant birthday designs.',
    icon: FaStar,
    color: 'from-pink-500 via-rose-500 to-pink-600',
  },
  {
    id: 'anniversary',
    title: 'Anniversary Themes',
    subtitle: 'Romantic designs for celebrating love and milestones.',
    icon: FaHeart,
    color: 'from-red-500 via-pink-500 to-red-600',
  },
  {
    id: 'wedding',
    title: 'Wedding Themes',
    subtitle: 'Elegant and timeless designs for your special day.',
    icon: FaStar,
    color: 'from-purple-500 via-indigo-500 to-purple-600',
  },
  {
    id: 'baby-kids',
    title: 'Baby & Kids Themes',
    subtitle: 'Adorable themes for little ones and growing families.',
    icon: FaUsers,
    color: 'from-blue-500 via-cyan-500 to-blue-600',
  },
  {
    id: 'travel',
    title: 'Travel Memories',
    subtitle: 'Capture your adventures with stunning travel layouts.',
    icon: FaCloud,
    color: 'from-teal-500 via-emerald-500 to-teal-600',
  },
  {
    id: 'family',
    title: 'Family Album',
    subtitle: 'Cherish family moments with warm, classic designs.',
    icon: FaImages,
    color: 'from-amber-500 via-orange-500 to-amber-600',
  },
  {
    id: 'festival',
    title: 'Festival & Events',
    subtitle: 'Vibrant themes for celebrations and special occasions.',
    icon: FaCalendarAlt,
    color: 'from-violet-500 via-purple-500 to-violet-600',
  },
  {
    id: 'corporate',
    title: 'Corporate / Office',
    subtitle: 'Professional layouts for business and corporate events.',
    icon: FaBriefcase,
    color: 'from-slate-500 via-gray-500 to-slate-600',
  },
  {
    id: 'minimal',
    title: 'Minimal / Classic',
    subtitle: 'Clean, elegant designs with timeless appeal.',
    icon: FaFolderOpen,
    color: 'from-gray-400 via-gray-500 to-gray-600',
  },
  {
    id: 'custom',
    title: 'Custom Themes',
    subtitle: 'Create your own unique theme or request a custom design.',
    icon: FaPalette,
    color: 'from-indigo-500 via-blue-500 to-indigo-600',
  },
];

const defaultPageState: EditablePageState = {
  headline: '',
  subheadline: '',
  description: '',
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const PageEditorCard: React.FC<{
  kind: PageKind;
  state: EditablePageState;
  onChange: (next: EditablePageState) => void;
}> = ({ kind, state, onChange }) => {
  const title = kind === 'cover' ? 'Cover Page (First Page)' : 'Last Page (Back Cover)';
  const hint =
    kind === 'cover'
      ? 'This is the first page your users will see.'
      : 'This is the final page of your album.';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{hint}</p>

      {/* Preview */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-[260px,1fr] gap-4 items-start">
        <div className="relative w-full aspect-[3/4] rounded-2xl border border-gray-200 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          {state.imageDataUrl ? (
            <img
              src={state.imageDataUrl}
              alt={`${title} preview`}
              className="w-full h-full object-cover"
              style={{
                transform: `scale(${state.style?.imageScale ?? 1})`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <span className="text-xs text-gray-400 text-center px-4">
              No image selected yet. Upload a photo to see the page preview.
            </span>
          )}
          {/* Text overlay with adjustable font & position */}
          {(state.headline || state.subheadline) && (
            <div
              className={`absolute inset-0 flex px-4 py-4 bg-gradient-to-t from-black/70 via-black/10 to-transparent ${
                state.style?.verticalAlign === 'top'
                  ? 'items-start justify-start'
                  : state.style?.verticalAlign === 'center'
                  ? 'items-center justify-center'
                  : 'items-end justify-end'
              }`}
            >
              <div
                className={`w-full max-w-full ${
                  state.style?.align === 'center'
                    ? 'text-center'
                    : state.style?.align === 'right'
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                {state.headline && (
                  <div
                    className="truncate"
                    style={{
                      fontSize: state.style?.fontSize ?? 20,
                      fontWeight: state.style?.fontWeight ?? 700,
                      color: state.style?.headlineColor ?? '#ffffff',
                      fontFamily: state.style?.fontFamily,
                    }}
                  >
                    {state.headline}
                  </div>
                )}
                {state.subheadline && (
                  <div
                    className="truncate mt-1"
                    style={{
                      fontSize: (state.style?.fontSize ?? 20) - 4,
                      fontWeight: (state.style?.fontWeight ?? 700) - 200 || 400,
                      color: state.style?.subheadlineColor ?? '#e5e7eb',
                      fontFamily: state.style?.fontFamily,
                    }}
                  >
                    {state.subheadline}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Headline</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="e.g. Our Wedding Day"
              value={state.headline}
              onChange={(e) => onChange({ ...state, headline: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Subheadline</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="e.g. 5th June 2026 • Mumbai"
              value={state.subheadline}
              onChange={(e) => onChange({ ...state, subheadline: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
              placeholder="You can add a short story or note about this album."
              value={state.description}
              onChange={(e) => onChange({ ...state, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Page Image (cover photo)
            </label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-gray-600"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const dataUrl = await fileToDataUrl(file);
                onChange({ ...state, imageDataUrl: dataUrl });
              }}
            />
          </div>

          {/* Text style controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Font size
              </label>
              <input
                type="range"
                min={14}
                max={40}
                value={state.style?.fontSize ?? 20}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: { ...state.style, fontSize: Number(e.target.value) },
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Weight
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[11px]"
                value={state.style?.fontWeight ?? 700}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: { ...state.style, fontWeight: Number(e.target.value) },
                  })
                }
              >
                <option value={400}>Regular</option>
                <option value={600}>Semi‑bold</option>
                <option value={700}>Bold</option>
                <option value={800}>Extra bold</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Align
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[11px]"
                value={state.style?.align ?? 'center'}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: { ...state.style, align: e.target.value as 'left' | 'center' | 'right' },
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Position
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[11px]"
                value={state.style?.verticalAlign ?? (kind === 'cover' ? 'center' : 'bottom')}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: {
                      ...state.style,
                      verticalAlign: e.target.value as 'top' | 'center' | 'bottom',
                    },
                  })
                }
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Font family
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[11px]"
                value={state.style?.fontFamily ?? 'system'}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: {
                      ...state.style,
                      fontFamily:
                        e.target.value === 'system'
                          ? undefined
                          : e.target.value === 'serif'
                          ? 'Georgia, Cambria, "Times New Roman", serif'
                          : e.target.value === 'mono'
                          ? '"SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                          : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    },
                  })
                }
              >
                <option value="system">System</option>
                <option value="sans">Sans-serif</option>
                <option value="serif">Serif</option>
                <option value="mono">Monospace</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Headline color
              </label>
              <input
                type="color"
                className="w-full h-8 rounded-lg border border-gray-200 p-0"
                value={state.style?.headlineColor ?? '#ffffff'}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: { ...state.style, headlineColor: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Subheadline color
              </label>
              <input
                type="color"
                className="w-full h-8 rounded-lg border border-gray-200 p-0"
                value={state.style?.subheadlineColor ?? '#e5e7eb'}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: { ...state.style, subheadlineColor: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Image zoom
              </label>
              <input
                type="range"
                min={0.8}
                max={1.6}
                step={0.05}
                value={state.style?.imageScale ?? 1}
                onChange={(e) =>
                  onChange({
                    ...state,
                    style: { ...state.style, imageScale: Number(e.target.value) },
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PhotoThemeCategoryPage: React.FC = () => {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();

  const meta = THEME_META.find((m) => m.id === categorySlug) ?? {
    id: categorySlug || 'unknown',
    title: 'Custom Theme',
    subtitle: 'Design a custom cover and last page for your photo album.',
    icon: FaPalette,
    color: 'from-indigo-500 via-blue-500 to-indigo-600',
  };

  const Icon = meta.icon;

  const [coverPage, setCoverPage] = React.useState<EditablePageState>({
    ...defaultPageState,
    headline: meta.title,
    subheadline: meta.subtitle,
  });

  const [lastPage, setLastPage] = React.useState<EditablePageState>({
    ...defaultPageState,
    headline: 'Thank you',
    subheadline: 'Grateful for every moment captured here.',
  });

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10 flex items-center space-x-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              {meta.title}
            </h1>
            <p className="text-sm md:text-base text-blue-100">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Editors for first & last page */}
      <div className="space-y-6">
        <PageEditorCard kind="cover" state={coverPage} onChange={setCoverPage} />
        <PageEditorCard kind="last" state={lastPage} onChange={setLastPage} />
      </div>

      {/* Next step: go to multi-page album builder */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            navigate(`/photo-themes/${meta.id}/album`, {
              state: { coverPage, lastPage },
            })
          }
          className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        >
          Next: Build album
        </button>
      </div>
    </div>
  );
};

export default PhotoThemeCategoryPage;

