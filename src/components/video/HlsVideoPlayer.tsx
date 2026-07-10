import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { getStoredToken } from '../../utils/authUtils';
import { appendShareToken, isHlsStreamUrl } from '../../utils/videoPlayback';
import { pollVideoUntilReady } from '../../api/services/videoService';
import type { VideoPlaybackSource } from '../../types/video';
import LoadingSpinner from '../common/LoadingSpinner';

export interface HlsVideoPlayerProps {
  source: VideoPlaybackSource;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  /** Poll backend until READY before attaching the HLS stream */
  waitForReady?: boolean;
  onReady?: () => void;
  onError?: (message: string) => void;
}

function needsAuthHeaders(streamUrl?: string, shareToken?: string): boolean {
  if (shareToken) return false;
  return !!getStoredToken();
}

export default function HlsVideoPlayer({
  source,
  className = 'w-full h-full object-contain',
  autoPlay = false,
  controls = true,
  muted = false,
  playsInline = true,
  waitForReady = true,
  onReady,
  onError,
}: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string | undefined>(source.streamUrl);

  const reportError = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError]
  );

  // Poll until transcoding is READY when needed
  useEffect(() => {
    let cancelled = false;
    const processing =
      source.processingStatus === 'PROCESSING' || source.processingStatus === 'UPLOADED';

    if (!waitForReady || !processing || !source.videoId) {
      setActiveStreamUrl(source.streamUrl);
      return;
    }

    setLoading(true);
    pollVideoUntilReady(source.videoId, {
      statusPollUrl: source.statusPollUrl,
    })
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'FAILED') {
          reportError(result.processingError || 'Video processing failed');
          return;
        }
        setActiveStreamUrl(source.streamUrl);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          reportError(err instanceof Error ? err.message : 'Video is still processing');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    source.videoId,
    source.streamUrl,
    source.statusPollUrl,
    source.processingStatus,
    waitForReady,
    reportError,
  ]);

  // Attach HLS or fallback src
  useEffect(() => {
    const video = videoRef.current;
    if (!video || loading || error) return;

    const streamUrl = activeStreamUrl;
    const fallback = source.fallbackSrc;
    const shareToken = source.shareToken;

    const destroyHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    const attachHlsPlayer = (url: string) => {
      destroyHls();
      const hls = new Hls({
        enableWorker: true,
        xhrSetup: (xhr) => {
          const token = getStoredToken();
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
        },
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onReady?.();
        if (autoPlay) void video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (fallback && !isHlsStreamUrl(fallback)) {
          destroyHls();
          video.src = fallback;
          video.load();
          return;
        }
        reportError('Unable to play video stream');
      });
    };

    if (streamUrl && isHlsStreamUrl(streamUrl)) {
      const url = appendShareToken(streamUrl, shareToken);
      const authRequired = needsAuthHeaders(streamUrl, shareToken);

      if (authRequired || !video.canPlayType('application/vnd.apple.mpegurl')) {
        if (Hls.isSupported()) {
          attachHlsPlayer(url);
        } else if (fallback) {
          video.src = fallback;
          video.load();
        } else {
          video.src = url;
        }
      } else {
        destroyHls();
        video.src = url;
        video.onloadeddata = () => onReady?.();
      }
    } else if (fallback) {
      destroyHls();
      video.src = fallback;
      video.onloadeddata = () => onReady?.();
    } else if (streamUrl) {
      destroyHls();
      video.src = streamUrl;
    }

    return () => {
      destroyHls();
      video.onloadeddata = null;
    };
  }, [
    activeStreamUrl,
    source.fallbackSrc,
    source.shareToken,
    loading,
    error,
    autoPlay,
    onReady,
    reportError,
  ]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-black/40 ${className}`}>
        <LoadingSpinner />
        <p className="text-sm text-white/80">Preparing video stream…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/40 p-4 text-center text-sm text-red-300 ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      controls={controls}
      muted={muted}
      playsInline={playsInline}
      poster={source.posterUrl}
      preload="metadata"
    />
  );
}
