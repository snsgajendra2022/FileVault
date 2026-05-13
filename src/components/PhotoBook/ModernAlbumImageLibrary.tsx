import React from 'react';
import { FaImages, FaMagic, FaSearch, FaCheck } from 'react-icons/fa';

type Props = {
  title: string;
  images: string[];
  selectedCount: number;
  onSelectImage: (url: string, imageId?: number) => void;
  onAutoFill: () => void;
  extractImageIdFromUrl: (url: string | undefined | null) => number | null;
};

export const ModernAlbumImageLibrary: React.FC<Props> = ({
  title,
  images,
  selectedCount,
  onSelectImage,
  onAutoFill,
  extractImageIdFromUrl,
}) => {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!search.trim()) return images;
    return images.filter((_, i) => String(i + 1).includes(search.trim()));
  }, [images, search]);

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
            <FaImages />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">{title}</h2>
            <p className="text-xs text-slate-500">{images.length} images available</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAutoFill}
          disabled={!images.length}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
        >
          <FaMagic className="w-3.5 h-3.5" />
          Auto Fill Photo Book
        </button>

        <div className="mt-3 rounded-2xl border border-indigo-100 bg-white px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500">Selected in book</span>
          <span className="text-xs font-bold text-indigo-700">{selectedCount}</span>
        </div>

        <div className="mt-3 relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search image no."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((url, i) => {
            const imageId = extractImageIdFromUrl(url) ?? undefined;
            return (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => onSelectImage(url, imageId)}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="absolute bottom-2 left-2 right-2 hidden group-hover:flex items-center justify-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-800">
                  <FaCheck className="w-2.5 h-2.5 text-indigo-600" />
                  Select
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};