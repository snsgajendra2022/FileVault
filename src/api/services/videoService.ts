import api from '../client/axiosInstance';
import type { VideoProcessingStatus, VideoStatusResponse } from '../../types/video';

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 90; // ~6 min

export async function getVideoStatus(videoId: number | string): Promise<VideoStatusResponse> {
  const response = await api.get<VideoStatusResponse>(`/api/videos/${videoId}/status`);
  return response.data;
}

export async function reprocessVideo(videoId: number | string): Promise<void> {
  await api.post(`/api/videos/${videoId}/reprocess`);
}

/**
 * Poll until video transcoding finishes (READY or FAILED).
 * Uses statusPollUrl when provided (may be absolute); otherwise /api/videos/{id}/status.
 */
export async function pollVideoUntilReady(
  videoId: number | string,
  options?: {
    statusPollUrl?: string;
    onStatus?: (status: VideoProcessingStatus) => void;
    signal?: AbortSignal;
  }
): Promise<VideoStatusResponse> {
  const path =
    options?.statusPollUrl?.replace(/^https?:\/\/[^/]+/, '') ||
    `/api/videos/${videoId}/status`;

  let reprocessTriggered = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (options?.signal?.aborted) {
      throw new Error('Video status polling aborted');
    }

    const response = await api.get<VideoStatusResponse>(path);
    const data = response.data;
    options?.onStatus?.(data.status);

    if (data.status === 'UPLOADED' && !reprocessTriggered) {
      reprocessTriggered = true;
      try {
        await reprocessVideo(videoId);
        options?.onStatus?.('PROCESSING');
      } catch {
        // reprocess may fail if another worker already picked it up
      }
    }

    if (data.status === 'READY' || data.status === 'FAILED') {
      return data;
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS);
      if (options?.signal) {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error('Video status polling aborted'));
        };
        options.signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  throw new Error('Video processing timed out. Try again later.');
}

export async function recordVideoPlayback(
  videoId: number | string,
  watchedSeconds?: number,
  shareToken?: string
): Promise<void> {
  const params = shareToken ? { shareToken } : undefined;
  await api.post(`/api/videos/${videoId}/playback`, { watchedSeconds: watchedSeconds ?? 0 }, { params });
}
