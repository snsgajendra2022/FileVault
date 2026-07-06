import { pollVideoUntilReady } from '../api/services/videoService';
import { parseMediaUploadResponse } from './videoPlayback';
import type { MediaType } from '../types/video';

export interface MediaUploadQueueFields {
  imageId?: number | string;
  videoId?: number;
  streamUrl?: string;
  statusPollUrl?: string;
  mediaType?: MediaType;
  videoStatus?: string;
}

export function fieldsFromUploadResponse(data: unknown): MediaUploadQueueFields {
  const parsed = parseMediaUploadResponse(data);
  return {
    imageId: parsed.imageId,
    videoId: parsed.videoId,
    streamUrl: parsed.streamUrl,
    statusPollUrl: parsed.statusPollUrl,
    mediaType: parsed.mediaType,
    videoStatus: parsed.status,
  };
}

/** Background poll after upload when backend is still transcoding */
export function startVideoProcessingPoll(
  fields: MediaUploadQueueFields,
  onStatus: (status: string) => void
): void {
  if (fields.mediaType !== 'VIDEO' || fields.videoId == null) return;
  if (fields.videoStatus === 'READY') return;

  void pollVideoUntilReady(fields.videoId, {
    statusPollUrl: fields.statusPollUrl,
    onStatus: (s) => onStatus(s),
  })
    .then((result) => onStatus(result.status))
    .catch(() => {});
}
