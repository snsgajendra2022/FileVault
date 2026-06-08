import React from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, ImagePlus, X } from 'lucide-react';
import { objectUrlsFromFiles, revokeObjectUrls } from '../../../../features/guest-book/utils';

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
};

export const ImageUploader: React.FC<Props> = ({
  files,
  onChange,
  maxFiles = 12,
  disabled = false,
}) => {
  const [previews, setPreviews] = React.useState<string[]>([]);

  React.useEffect(() => {
    const urls = objectUrlsFromFiles(files);
    setPreviews(urls);
    return () => revokeObjectUrls(urls);
  }, [files]);

  const onDrop = React.useCallback(
    (accepted: File[]) => {
      if (!accepted.length) return;
      const merged = [...files, ...accepted].slice(0, maxFiles);
      onChange(merged);
    },
    [files, maxFiles, onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    maxFiles,
    disabled,
    noClick: true,
    noKeyboard: false,
  });

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300 ${
          isDragActive ? 'gb-drag-active border-violet-500/70' : 'border-white/15 bg-white/[0.03]'
        } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-violet-500/40 hover:bg-white/[0.05]'}`}
        onClick={() => !disabled && open()}
      >
        <input {...getInputProps()} aria-label="Upload photos" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/30">
          <CloudUpload className="h-7 w-7 text-violet-300" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-slate-200">
          {isDragActive ? 'Drop your photos here' : 'Drag & drop photos, or tap to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP · up to {maxFiles} images</p>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${file.size}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30"
            >
              <img
                src={previews[i]}
                alt={`Preview ${i + 1}: ${file.name}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-600/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {files.length < maxFiles ? (
            <button
              type="button"
              onClick={() => open()}
              aria-label="Add more photos"
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-slate-400 hover:border-violet-500/40 hover:text-violet-300 transition-colors min-h-[44px]"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">Add more</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default ImageUploader;
