/**
 * Video utilities: duration detection and trim to first 30s using FFmpeg WASM.
 * Used for upload flow - auto-trim videos > 30s without user confirmation.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const VIDEO_TRIM_MAX_SECONDS = 30;

/** Get video duration in seconds using a video element (no FFmpeg needed). */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('error', onErr);
      video.src = '';
      URL.revokeObjectURL(url);
    };

    const onMeta = () => {
      const duration = video.duration;
      cleanup();
      resolve(Number.isFinite(duration) ? duration : 0);
    };

    const onErr = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('error', onErr);
    video.src = url;
  });
}

/** Trim video to first 30 seconds using FFmpeg WASM. Preserves resolution and uses stream copy for speed. */
export async function trimVideoTo30Seconds(file: File): Promise<File> {
  // const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  // const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();

  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const inputName = `input.${ext}`;
  const outputName = `output.${ext}`;

  await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

  // Trim: from 00:00, duration 30s. -c copy = no re-encode, fast and keeps quality/size reasonable.
  await ffmpeg.exec([
    '-i', inputName,
    '-t', String(VIDEO_TRIM_MAX_SECONDS),
    '-c', 'copy',
    '-avoid_negative_ts', '1',
    outputName,
  ]);

  const data:any = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: file.type });
  const trimmedName = file.name.replace(/\.[^.]+$/, `_trimmed.${ext}`);

  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return new File([blob], trimmedName, { type: file.type, lastModified: Date.now() });
}

export const VIDEO_TRIM_THRESHOLD_SECONDS = VIDEO_TRIM_MAX_SECONDS;

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}
