import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FaMicrophone,
  FaPaperPlane,
  FaComments,
  FaImage,
  FaRedo,
  FaVolumeUp,
  FaVolumeMute,
  FaShieldAlt,
} from 'react-icons/fa';
import { openclawEnabled, openclawDevBaseUrl } from '../../config/openclaw';
import { matchOpenClawLocalRoute, sanitizeOpenClawNavigatePath } from '../../utils/openclawNavigation';
import { polishAssistantReplyForDisplay } from '../../utils/openclawMessages';
import {
  isAnnounceEventsCommand,
  isAnnounceThisEventCommand,
  isOpenImagePickerCommand,
  isSpeechSynthesisAvailable,
  isStopSpeechCommand,
  enqueueSpeech,
  stopSpeechSynthesis,
  textForAssistantSpeech,
} from '../../utils/openclawSpeech';
import { buildOpenClawContextPayload, parseMemoriesEventIdFromPath } from '../../utils/openclawPageContext';
import { computeFollowUpChips } from '../../utils/openclawAssistantFollowUps';
import {
  openclawSendChat,
  openclawSendVoice,
  openclawUploadImage,
  openclawCreateSession,
} from '../../services/openclawService';
import { listMemoriesEvents, getMemoriesEventById } from '../../services/memoriesService';

const SESSION_KEY = 'openclaw_session_id';
const ALWAYS_SPEAK_KEY = 'openclaw_always_speak';
const MAX_EVENTS_TTS = 25;

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatLine = { id: string; role: ChatRole; text: string; source?: 'voice' };

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type OpenClawSpeechResultRow = { 0: { transcript: string } };
type OpenClawSpeechResultEvent = { results: ArrayLike<OpenClawSpeechResultRow> };
type OpenClawSpeechErrorEvent = { error?: string };

type OpenClawSpeechRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: OpenClawSpeechResultEvent) => void) | null;
  onerror: ((ev: OpenClawSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

async function ensureMicPermission(): Promise<'ok' | 'denied' | 'skipped'> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'skipped';
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'ok';
  } catch {
    return 'denied';
  }
}

function getSpeechRecognitionCtor(): (new () => OpenClawSpeechRecognizer) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    webkitSpeechRecognition?: new () => OpenClawSpeechRecognizer;
    SpeechRecognition?: new () => OpenClawSpeechRecognizer;
  };
  return w.webkitSpeechRecognition || w.SpeechRecognition || null;
}

function isBrowserSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

export type OpenClawAssistantPanelProps = {
  layout: 'page' | 'drawer';
};

const OpenClawAssistantPanel: React.FC<OpenClawAssistantPanelProps> = ({ layout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation(undefined, { keyPrefix: 'openclawPage' });
  const isDrawer = layout === 'drawer';

  const memoriesEventId = React.useMemo(
    () => parseMemoriesEventIdFromPath(location.pathname),
    [location.pathname]
  );

  const { data: openEventForContext } = useQuery({
    queryKey: ['openclawMemoriesEvent', memoriesEventId],
    queryFn: () => getMemoriesEventById(memoriesEventId!),
    enabled: Boolean(openclawEnabled && memoriesEventId),
    staleTime: 20_000,
  });

  const memoriesEventSnapshot = React.useMemo(() => {
    if (!openEventForContext?.id) return null;
    return {
      id: openEventForContext.id,
      name: openEventForContext.name,
      dateTime: openEventForContext.dateTime,
      location: openEventForContext.location || '',
      imageCount: openEventForContext.images.length,
    };
  }, [openEventForContext]);

  const openClawContext = React.useMemo(
    () => buildOpenClawContextPayload(location.pathname, memoriesEventSnapshot),
    [location.pathname, memoriesEventSnapshot]
  );

  const followUpChips = React.useMemo(
    () => computeFollowUpChips(location.pathname, t),
    [location.pathname, t]
  );

  const [sessionId, setSessionId] = React.useState<string | undefined>(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) || undefined : undefined
  );
  const [lines, setLines] = React.useState<ChatLine[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [micUnlocking, setMicUnlocking] = React.useState(false);
  const [alwaysSpeakReplies, setAlwaysSpeakReplies] = React.useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(ALWAYS_SPEAK_KEY) === '1';
  });
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const recRef = React.useRef<OpenClawSpeechRecognizer | null>(null);

  const ttsLang = React.useMemo(
    () => (i18n.language?.toLowerCase().startsWith('hi') ? 'hi-IN' : document.documentElement.lang || 'en-US'),
    [i18n.language]
  );

  const speakAssistantIfEnabled = React.useCallback(
    (raw: string) => {
      if (!alwaysSpeakReplies || !isSpeechSynthesisAvailable()) return;
      const plain = textForAssistantSpeech(raw).slice(0, 8000);
      if (plain) enqueueSpeech(plain, ttsLang);
    },
    [alwaysSpeakReplies, ttsLang]
  );

  const [micTestLabel, setMicTestLabel] = React.useState<string | null>(null);

  const testMicPermissionUi = React.useCallback(async () => {
    const r = await ensureMicPermission();
    if (r === 'ok') setMicTestLabel(t('permMicGranted'));
    else if (r === 'denied') setMicTestLabel(t('permMicDenied'));
    else setMicTestLabel(t('permMicSkipped'));
  }, [t]);

  const toggleAlwaysSpeak = React.useCallback(() => {
    setAlwaysSpeakReplies((prev) => {
      const next = !prev;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(ALWAYS_SPEAK_KEY, next ? '1' : '0');
      }
      return next;
    });
  }, []);

  const persistSession = React.useCallback((id: string | undefined) => {
    setSessionId(id);
    if (typeof sessionStorage === 'undefined') return;
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const appendLine = React.useCallback((role: ChatRole, text: string, source?: 'voice') => {
    setLines((prev) => [...prev, { id: newId(), role, text, ...(source ? { source } : {}) }]);
  }, []);

  const tryHandleLocalAssistantCommands = React.useCallback(
    async (message: string, fromVoice: boolean): Promise<boolean> => {
      const m = message.trim();
      if (!m) return false;

      const eventIdOnPage = parseMemoriesEventIdFromPath(location.pathname);

      if (isStopSpeechCommand(m)) {
        stopSpeechSynthesis();
        appendLine('user', m, fromVoice ? 'voice' : undefined);
        if (!fromVoice) setInput('');
        appendLine('system', t('speechStopped'));
        return true;
      }

      if (isOpenImagePickerCommand(m)) {
        appendLine('user', m, fromVoice ? 'voice' : undefined);
        if (!fromVoice) setInput('');
        appendLine('system', t('imagePickerOpened'));
        window.setTimeout(() => fileRef.current?.click(), 0);
        return true;
      }

      if (isAnnounceThisEventCommand(m)) {
        appendLine('user', m, fromVoice ? 'voice' : undefined);
        if (!fromVoice) setInput('');
        if (!eventIdOnPage) {
          const hint = t('announceThisEventNeedPage');
          appendLine('assistant', hint);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(hint, ttsLang);
          return true;
        }
        setSending(true);
        try {
          const ev = await getMemoriesEventById(eventIdOnPage);
          if (!ev?.id) {
            const err = t('announceThisEventNone');
            appendLine('assistant', err);
            if (isSpeechSynthesisAvailable()) enqueueSpeech(err, ttsLang);
          } else {
            const fmt = new Intl.DateTimeFormat(i18n.language || undefined, {
              dateStyle: 'full',
              timeStyle: 'short',
            });
            const loc = ev.location?.trim();
            const locPart = loc ? ` ${t('announceThisEventLocation', { location: loc })}` : '';
            const body = `${t('announceThisEventTitle', { name: ev.name })} ${t('announceThisEventWhen', {
              when: fmt.format(new Date(ev.dateTime)),
            })}${locPart} ${t('announceThisEventPhotos', { count: ev.images.length })}`;
            appendLine('assistant', body);
            if (isSpeechSynthesisAvailable()) enqueueSpeech(body, ttsLang);
          }
        } catch {
          const err = t('announceThisEventNone');
          appendLine('assistant', err);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(err, ttsLang);
        } finally {
          setSending(false);
        }
        return true;
      }

      if (isAnnounceEventsCommand(m)) {
        appendLine('user', m, fromVoice ? 'voice' : undefined);
        if (!fromVoice) setInput('');
        setSending(true);
        try {
          const events = await listMemoriesEvents();
          const fmt = new Intl.DateTimeFormat(i18n.language || undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          let body: string;
          if (events.length === 0) {
            body = t('announceNoEvents');
          } else {
            const slice = events.slice(0, MAX_EVENTS_TTS);
            const spokenParts = slice.map((e) => `${e.name}, ${fmt.format(new Date(e.dateTime))}`);
            const more =
              events.length > MAX_EVENTS_TTS
                ? ` ${t('announceEventsTruncated', { n: events.length - MAX_EVENTS_TTS })}`
                : '';
            body = `${t('announceEventsIntro', { count: events.length })} ${spokenParts.join('. ')}${more}`;
          }
          appendLine('assistant', body);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(body, ttsLang);
        } catch {
          const err = t('announceEventsError');
          appendLine('assistant', err);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(err, ttsLang);
        } finally {
          setSending(false);
        }
        return true;
      }

      return false;
    },
    [appendLine, i18n.language, location.pathname, t, ttsLang]
  );

  const applyNavigation = React.useCallback(
    (apiNavigateTo: string | null | undefined, userText: string) => {
      const fromApi = sanitizeOpenClawNavigatePath(apiNavigateTo?.trim() || null);
      const fromLocal = matchOpenClawLocalRoute(userText);
      const path = fromApi ?? fromLocal;
      if (!path) return;
      appendLine('system', t('navOpened', { path }));
      navigate(path);
    },
    [appendLine, navigate, t]
  );

  const handleNewSession = React.useCallback(async () => {
    if (!openclawEnabled) return;
    setSending(true);
    try {
      const { sessionId: sid } = await openclawCreateSession();
      persistSession(sid);
      setLines([]);
      appendLine('system', sid ? t('sessionReady', { id: sid }) : t('sessionReset'));
      toast.success(t('toastSession'));
    } catch {
      persistSession(undefined);
      setLines([]);
      appendLine('system', t('sessionLocalOnly'));
      toast.error(t('toastSessionFail'));
    } finally {
      setSending(false);
    }
  }, [appendLine, persistSession, t]);

  const sendText = React.useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || !openclawEnabled) return;
      if (await tryHandleLocalAssistantCommands(message, false)) return;
      appendLine('user', message);
      setInput('');
      setSending(true);
      try {
        const { reply, sessionId: next, navigateTo } = await openclawSendChat({
          message,
          sessionId,
          context: openClawContext,
        });
        if (next) persistSession(next);
        const shown = polishAssistantReplyForDisplay(reply || t('emptyReply'));
        appendLine('assistant', shown);
        speakAssistantIfEnabled(shown);
        applyNavigation(navigateTo, message);
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { message?: string } } };
        const msg = ax?.response?.data?.message;
        const failText = typeof msg === 'string' && msg.trim() ? msg : t('sendFail');
        appendLine('assistant', failText);
        speakAssistantIfEnabled(failText);
        toast.error(t('toastSendFail'));
      } finally {
        setSending(false);
      }
    },
    [
      appendLine,
      applyNavigation,
      openClawContext,
      persistSession,
      sessionId,
      speakAssistantIfEnabled,
      t,
      tryHandleLocalAssistantCommands,
    ]
  );

  const sendVoiceTranscript = React.useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text || !openclawEnabled) return;
      if (await tryHandleLocalAssistantCommands(text, true)) return;
      appendLine('user', text, 'voice');
      setSending(true);
      try {
        const { reply, sessionId: next, navigateTo } = await openclawSendVoice({
          transcript: text,
          sessionId,
          context: openClawContext,
        });
        if (next) persistSession(next);
        const shown = polishAssistantReplyForDisplay(reply || t('emptyReply'));
        appendLine('assistant', shown);
        speakAssistantIfEnabled(shown);
        applyNavigation(navigateTo, text);
      } catch {
        appendLine('assistant', t('sendFail'));
        speakAssistantIfEnabled(t('sendFail'));
        toast.error(t('toastSendFail'));
      } finally {
        setSending(false);
      }
    },
    [
      appendLine,
      applyNavigation,
      openClawContext,
      persistSession,
      sessionId,
      speakAssistantIfEnabled,
      t,
      tryHandleLocalAssistantCommands,
    ]
  );

  const stopListening = React.useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const startListening = React.useCallback(async () => {
    if (listening) {
      stopListening();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error(t('noSpeechApi'));
      return;
    }

    const secure = isBrowserSecureContext();
    if (secure) {
      setMicUnlocking(true);
      let mic: 'ok' | 'denied' | 'skipped';
      try {
        mic = await ensureMicPermission();
      } finally {
        setMicUnlocking(false);
      }
      if (mic === 'denied') {
        toast(t('speechMicPreflightFail'), { duration: 6000, icon: 'ℹ️' });
      }
    }

    const rec = new Ctor();
    rec.lang = document.documentElement.lang || 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev: OpenClawSpeechResultEvent) => {
      const text = Array.from(ev.results)
        .map((r) => r[0]?.transcript)
        .filter(Boolean)
        .join(' ')
        .trim();
      stopListening();
      if (text) void sendVoiceTranscript(text);
    };
    rec.onerror = (ev: OpenClawSpeechErrorEvent) => {
      stopListening();
      const code = typeof ev?.error === 'string' ? ev.error : '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        toast.error(t('speechBlocked'), { duration: 10_000 });
      } else if (code === 'no-speech') {
        toast(t('speechNoSpeech'), { icon: 'ℹ️' });
      } else if (code === 'audio-capture') {
        toast.error(t('speechNoMic'));
      } else {
        toast.error(t('speechError'));
      }
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      toast.error(t('speechError'));
    }
  }, [listening, sendVoiceTranscript, stopListening, t]);

  React.useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      stopSpeechSynthesis();
    };
  }, []);

  const onPickImage = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !openclawEnabled) return;
      appendLine('user', t('uploadedImage', { name: file.name }));
      setSending(true);
      try {
        const { reply, sessionId: next, navigateTo } = await openclawUploadImage({
          file,
          sessionId,
          prompt: input.trim() || undefined,
          context: openClawContext,
        });
        if (next) persistSession(next);
        const shown = polishAssistantReplyForDisplay(reply || t('emptyReply'));
        appendLine('assistant', shown);
        speakAssistantIfEnabled(shown);
        const navHint = [input.trim(), file.name].filter(Boolean).join(' ');
        applyNavigation(navigateTo, navHint);
      } catch {
        appendLine('assistant', t('imageFail'));
        speakAssistantIfEnabled(t('imageFail'));
        toast.error(t('toastImageFail'));
      } finally {
        setSending(false);
      }
    },
    [appendLine, applyNavigation, input, openClawContext, persistSession, sessionId, speakAssistantIfEnabled, t]
  );

  const quickActions = React.useMemo(
    () => [
      { label: t('action.memories'), text: t('action.memoriesPrompt') },
      { label: t('action.events'), text: t('action.eventsPrompt') },
      { label: t('action.summarize'), text: t('action.summarizePrompt') },
    ],
    [t]
  );

  if (!openclawEnabled) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center rounded-2xl border border-amber-200 bg-amber-50/80">
        <FaComments className="h-10 w-10 text-amber-600 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-slate-900">{t('disabledTitle')}</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t('disabledBody')}</p>
      </div>
    );
  }

  const chatSection = (
    <section
      className={`flex flex-col min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
        isDrawer ? 'min-h-0 flex-1' : 'flex-1'
      }`}
    >
      {!isBrowserSecureContext() ? (
        <div className="shrink-0 mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
          <strong className="font-semibold">{t('micInsecureTitle')}</strong>
          <span className="block mt-1 text-amber-900/90">{t('micInsecureBanner')}</span>
        </div>
      ) : null}
      <div
        className={`min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 ${
          isDrawer ? 'flex-1' : 'max-h-[60vh] min-h-[280px] flex-1'
        }`}
        role="log"
        aria-label={t('chatLogAria')}
        aria-live="polite"
        aria-relevant="additions"
      >
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">{t('emptyState')}</p>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className={`rounded-xl px-3 py-2 text-sm max-w-[95%] ${
                line.role === 'user'
                  ? 'ml-auto bg-violet-600 text-white'
                  : line.role === 'system'
                    ? 'mx-auto bg-slate-100 text-slate-600 text-xs text-center'
                    : 'mr-auto bg-slate-100 text-slate-900 border border-slate-200'
              }`}
            >
              {line.role === 'user' && line.source === 'voice' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
                    <FaMicrophone className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
                    {t('voiceLabel')}
                  </div>
                  <p className="text-sm font-medium leading-snug">{line.text}</p>
                </div>
              ) : line.role === 'assistant' ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{line.text}</p>
              ) : (
                line.text
              )}
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 p-3 space-y-2 bg-slate-50/80">
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
          <button
            type="button"
            disabled={sending}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title={t('attachImage')}
          >
            <FaImage className="h-3.5 w-3.5" />
            {t('attachImage')}
          </button>
          <button
            type="button"
            disabled={sending || micUnlocking}
            onClick={() => void startListening()}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
              listening
                ? 'border-rose-400 bg-rose-50 text-rose-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title={t('micHint')}
          >
            <FaMicrophone className="h-3.5 w-3.5" />
            {micUnlocking ? t('micUnlocking') : listening ? t('listening') : t('mic')}
          </button>
          <button
            type="button"
            disabled={sending || !isSpeechSynthesisAvailable()}
            onClick={toggleAlwaysSpeak}
            aria-pressed={alwaysSpeakReplies}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
              alwaysSpeakReplies
                ? 'border-violet-400 bg-violet-50 text-violet-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title={t('alwaysSpeakTitle')}
          >
            {alwaysSpeakReplies ? <FaVolumeUp className="h-3.5 w-3.5" /> : <FaVolumeMute className="h-3.5 w-3.5" />}
            {alwaysSpeakReplies ? t('alwaysSpeakOn') : t('alwaysSpeakOff')}
          </button>
        </div>
        <details className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer list-none font-semibold text-slate-800 [&::-webkit-details-marker]:hidden flex items-center gap-2">
            <FaShieldAlt className="h-3.5 w-3.5 text-violet-600 shrink-0" aria-hidden />
            {t('permissionsSummary')}
          </summary>
          <ul className="mt-2 space-y-2 pl-0.5 leading-relaxed">
            <li>
              <span className="font-medium text-slate-700">{t('permSecure')}:</span>{' '}
              {isBrowserSecureContext() ? t('permHttpsOk') : t('permHttpsBad')}
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-700">{t('permMic')}:</span>
              <button
                type="button"
                onClick={() => void testMicPermissionUi()}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
              >
                {t('permMicTest')}
              </button>
              {micTestLabel ? <span className="text-[11px] text-slate-500">{micTestLabel}</span> : null}
            </li>
            <li>
              <span className="font-medium text-slate-700">{t('permSpeech')}:</span>{' '}
              {isSpeechSynthesisAvailable() ? t('permSpeechOk') : t('permSpeechBad')}
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-700">{t('permFiles')}:</span>
              <button
                type="button"
                disabled={sending}
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
              >
                {t('permOpenImagePicker')}
              </button>
            </li>
            <li className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">{t('permissionsFootnote')}</li>
          </ul>
        </details>
        <p className="text-[11px] text-slate-400 leading-snug">{t('micFooter')}</p>
        <p className="text-[11px] text-slate-400 leading-snug">{t('voiceAnnounceHint')}</p>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500">{t('nextStepsLabel')}</p>
          <div className="flex flex-wrap gap-1.5">
            {followUpChips.map((c) => (
              <button
                key={c.label}
                type="button"
                disabled={sending}
                onClick={() => void sendText(c.prompt)}
                className="rounded-lg border border-violet-200/80 bg-violet-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-violet-900 hover:bg-violet-100/90 disabled:opacity-50"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                void sendText(input);
              }
            }}
            placeholder={t('placeholder')}
            rows={isDrawer ? 2 : 2}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            disabled={sending}
          />
          <button
            type="button"
            disabled={sending || !input.trim()}
            onClick={() => void sendText(input)}
            className="self-end shrink-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-3 shadow-md disabled:opacity-40"
            title={t('send')}
          >
            <FaPaperPlane className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );

  const showDevHint = Boolean(openclawDevBaseUrl);

  if (isDrawer) {
    return (
      <div className="flex h-full max-h-full min-h-0 flex-col gap-2">
        <div className="shrink-0 space-y-2">
          <p className="text-[11px] text-slate-500 leading-relaxed px-0.5">{t('drawerHint')}</p>
          {showDevHint ? (
            <p className="text-[10px] text-slate-400 leading-snug px-0.5 border border-slate-100 rounded-lg bg-slate-50/90 py-1.5 px-2">
              {t('assistantBackendHint')}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={sending}
                onClick={() => void sendText(a.text)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              disabled={sending}
              onClick={() => void handleNewSession()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
            >
              <FaRedo className="h-2.5 w-2.5" />
              {t('newSession')}
            </button>
          </div>
        </div>
        {chatSection}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto min-h-[calc(100vh-8rem)]">
      <aside className="lg:w-56 shrink-0 space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <FaComments className="h-5 w-5 text-violet-600" />
          {t('title')}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{t('subtitle')}</p>
        {showDevHint ? (
          <p className="text-[10px] text-slate-400 leading-snug border border-slate-100 rounded-lg px-2 py-1.5 bg-slate-50/90">
            {t('assistantBackendHint')}
          </p>
        ) : null}
        <p className="text-[11px] text-slate-400 leading-relaxed border border-slate-100 rounded-lg px-2 py-1.5 bg-slate-50/80">
          {t('micHelp')}
        </p>
        <div className="space-y-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={sending}
              onClick={() => void sendText(a.text)}
              className="w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 transition-colors disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={sending}
          onClick={() => void handleNewSession()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-violet-600 hover:text-violet-800"
        >
          <FaRedo className="h-3 w-3" />
          {t('newSession')}
        </button>
        {sessionId ? (
          <p className="text-[10px] text-slate-400 break-all font-mono">
            {t('sessionLabel')}: {sessionId}
          </p>
        ) : null}
      </aside>
      {chatSection}
    </div>
  );
};

export default OpenClawAssistantPanel;
