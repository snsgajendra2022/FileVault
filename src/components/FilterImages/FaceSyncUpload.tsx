import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { uploadImages } from '../../api/services/faceSyncService';
import { formatBytes } from './utils';

type FileRow = { name: string; size: number; status: 'pending' | 'uploading' | 'ok' | 'error' };

const FaceSyncUpload: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [rows, setRows] = React.useState<FileRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [pct, setPct] = React.useState(0);
  const [status, setStatus] = React.useState('Ready when you are.');
  const [error, setError] = React.useState('');
  const [resultJson, setResultJson] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);

  const revokePreviews = (urls: string[]) => {
    urls.forEach((u) => URL.revokeObjectURL(u));
  };

  const syncFiles = (list: FileList | File[]) => {
    const arr = Array.from(list);
    setPreviewUrls((prev) => {
      revokePreviews(prev);
      return arr.filter((f) => f.type.startsWith('image/')).map((f) => URL.createObjectURL(f));
    });
    setFiles(arr);
    setRows(arr.map((f) => ({ name: f.name, size: f.size, status: 'pending' as const })));
    setSuccess(false);
    setError('');
    setResultJson('');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) syncFiles(e.dataTransfer.files);
    setStatus('Files ready to upload.');
  };

  const runUpload = async () => {
    if (!files.length) {
      toast.error('Select at least one image.');
      return;
    }
    setBusy(true);
    setError('');
    setPct(0);
    setStatus('Uploading…');
    setRows(files.map((f) => ({ name: f.name, size: f.size, status: 'uploading' })));

    const timer = window.setInterval(() => {
      setPct((p) => Math.min(92, p + 4 + Math.random() * 7));
    }, 160);

    try {
      const { ok, status: httpStatus, body, text } = await uploadImages(files);
      window.clearInterval(timer);
      if (ok) {
        setPct(100);
        setStatus('Upload complete. Opening People…');
        setRows(files.map((f) => ({ name: f.name, size: f.size, status: 'ok' })));
        setSuccess(true);
        setResultJson(JSON.stringify(body, null, 2));
        toast.success('Upload successful.');
        sessionStorage.setItem('upload_success', 'true');
        setPreviewUrls((prev) => {
          revokePreviews(prev);
          return [];
        });
        setFiles([]);
        if (inputRef.current) inputRef.current.value = '';
        window.setTimeout(() => navigate('/filter-images/people?from=upload'), 1200);
      } else {
        setPct(0);
        setStatus(`Error: HTTP ${httpStatus}`);
        setError(`Upload failed (HTTP ${httpStatus}). Fix the issue or retry.`);
        setRows(files.map((f) => ({ name: f.name, size: f.size, status: 'error' })));
        setResultJson(text || String(httpStatus));
        toast.error(`Upload failed (${httpStatus}).`);
      }
    } catch {
      window.clearInterval(timer);
      setPct(0);
      setStatus('Network error.');
      setError('Could not reach the server. Check FaceSync is running and retry.');
      setRows(files.map((f) => ({ name: f.name, size: f.size, status: 'error' })));
      toast.error('Upload failed (network).');
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => () => revokePreviews(previewUrls), [previewUrls]);

  return (
    <section className="mx-auto max-w-6xl space-y-10 px-4 py-10 pb-16 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Ingest</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Add photos to your library
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
          Drag in files or browse. Images are sent as <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-sm">multipart/form-data</code>{' '}
          to <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-sm">POST /upload-images</code>.
        </p>
      </header>

      <div className="upload-shell space-y-8" data-upload-ui={busy ? 'uploading' : success ? 'success' : 'idle'}>
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop images here or click to browse"
          aria-busy={busy}
          className={`surface-card glass group min-h-[300px] cursor-pointer rounded-2xl p-10 text-center shadow-sm transition duration-200 ring-offset-2 hover:shadow-md hover:ring-2 hover:ring-indigo-200/80 sm:p-14 ${
            dragOver ? 'ring-2 ring-indigo-400 bg-indigo-50/60' : ''
          }`}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !busy) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                syncFiles(e.target.files);
                setStatus('Files ready to upload.');
              }
            }}
          />
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl text-white shadow-xl shadow-indigo-500/30 transition group-hover:scale-105">
            ↑
          </div>
          <p className="text-lg font-semibold text-slate-800">Drag &amp; drop images here</p>
          <p className="mt-2 text-sm text-slate-500">
            or <span className="font-semibold text-indigo-600">click to browse</span> — JPEG, PNG, WebP, BMP
          </p>
          <p className="mt-5 text-xs font-medium text-slate-400">
            {files.length ? `${files.length} file(s) selected` : 'No files selected'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={busy}
          >
            Choose files
          </button>
          <button
            type="button"
            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={runUpload}
            disabled={busy || !files.length}
          >
            {busy ? 'Uploading…' : 'Start upload'}
          </button>
          <Link to="/filter-images/people" className="rounded-2xl px-4 py-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            View People →
          </Link>
          <Link to="/filter-images/photos" className="rounded-2xl px-4 py-3 text-sm font-semibold text-violet-600 hover:text-violet-800">
            View Photos →
          </Link>
        </div>

        <article className="surface-card rounded-2xl p-6 lg:p-8">
          <h2 className="text-sm font-semibold text-slate-800">Preview</h2>
          <div className="upload-preview-grid mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {previewUrls.length === 0 && (
              <span className="text-xs text-slate-400 col-span-full">Select images to preview locally.</span>
            )}
            {previewUrls.map((url, i) => (
              <div key={url} className="upload-preview-cell overflow-hidden rounded-xl border border-slate-100">
                <img src={url} alt={files[i]?.name || ''} className="upload-preview-thumb h-24 w-full object-cover" loading="lazy" />
                <div className="upload-preview-caption truncate px-2 py-1 text-[10px] text-slate-500" title={files[i]?.name}>
                  {files[i]?.name}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6">
            {!rows.length ? (
              <p className="text-xs text-slate-400">No files queued.</p>
            ) : (
              rows.map((row, idx) => (
                <div key={`${row.name}-${idx}`} className="upload-file-row flex gap-3 border-b border-slate-50 py-2 text-sm">
                  <div className="min-w-0 flex-1 truncate text-slate-700">{row.name}</div>
                  <div className="shrink-0 text-slate-400">{formatBytes(row.size)}</div>
                  <div
                    className={`shrink-0 text-xs font-medium ${
                      row.status === 'ok'
                        ? 'text-emerald-600'
                        : row.status === 'error'
                          ? 'text-red-600'
                          : row.status === 'uploading'
                            ? 'text-indigo-600'
                            : 'text-slate-500'
                    }`}
                  >
                    {row.status === 'ok' ? 'Done' : row.status === 'error' ? 'Failed' : row.status === 'uploading' ? 'Uploading…' : 'Ready'}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {success && (
          <div className="surface-card rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">Upload finished</p>
            <p className="mt-1 text-sm text-emerald-800/90">Review identities and merge hints.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/filter-images/people"
                className="inline-flex rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                View people
              </Link>
              <Link
                to="/filter-images/suggestions"
                className="rounded-2xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                Suggestions
              </Link>
            </div>
          </div>
        )}

        <article className="surface-card rounded-2xl p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-800">Progress</h2>
            <span className="font-mono text-sm text-slate-500">{Math.round(pct)}%</span>
          </div>
          <div className="progress-track mt-4 h-2.5 rounded-full bg-slate-100">
            <div className="progress-fill h-full rounded-full bg-indigo-600 transition-all duration-200" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-4 text-sm text-slate-500">{status}</p>
          {error && (
            <div className="mt-5 rounded-2xl border border-red-200/90 bg-red-50/95 p-4">
              <p className="text-sm font-medium text-red-900">{error}</p>
              <button
                type="button"
                className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
                onClick={runUpload}
              >
                Retry upload
              </button>
            </div>
          )}
          {resultJson && (
            <pre className="mt-5 max-h-52 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-700">
              {resultJson}
            </pre>
          )}
        </article>
      </div>
    </section>
  );
};

export default FaceSyncUpload;
