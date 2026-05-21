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
  FaPlus,
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
} from '../../api/services/openclawService';
import { listMemoriesEvents, getMemoriesEventById } from '../../api/services/memoriesService';
import { useAuth } from '../../state/context/AuthContext';
import {
  clearOldUploadStatuses,
  getNetworkStatusSnapshot,
  getRecentApiCallsSnapshot,
  getRecentUiErrorsSnapshot,
  getUploadStatusSnapshot,
  installAssistantErrorListeners,
  trackUploadFailed,
  trackUploadProgress,
  trackUploadSelected,
  trackUploadStarted,
  trackUploadSuccess,
  type AssistantUploadItem,
} from '../../utils/openclawAssistantMonitor';
const SESSION_KEY = 'openclaw_session_id';
const ALWAYS_SPEAK_KEY = 'openclaw_always_speak';
const OPENCLAW_CHAT_SESSIONS_KEY = 'openclaw_chat_sessions';
const OPENCLAW_ACTIVE_CHAT_ID_KEY = 'openclaw_active_chat_id';
const MAX_EVENTS_TTS = 25;
const MAX_CONTEXT_CHARS = 18_000;
const MAX_CONTEXT_ITEMS = 80;

export type ChatRole = 'user' | 'assistant' | 'system';

export type OpenClawMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  type?: 'text' | 'image' | 'voice';
  imageUrl?: string;
};

export type OpenClawChatSession = {
  id: string;
  userId: string;
  backendSessionId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: OpenClawMessage[];
};

type AssistantActionPermission =
  | 'navigation'
  | 'read_ui'
  | 'click'
  | 'open_modal'
  | 'close_modal'
  | 'fill_form'
  | 'submit_form'
  | 'upload_file'
  | 'download_file'
  | 'select_record'
  | 'create_record'
  | 'update_record'
  | 'delete_record'
  | 'share'
  | 'copy'
  | 'search'
  | 'filter'
  | 'sort'
  | 'debug_network'
  | 'debug_upload'
  | 'debug_ui';

type AssistantActionRisk = 'safe' | 'medium' | 'dangerous';

type AssistantActionRequest = {
  id: string;
  payload?: Record<string, unknown>;
};

type AssistantActionDefinition = {
  id: string;
  label: string;
  description: string;
  permission: AssistantActionPermission;
  risk: AssistantActionRisk;
  requiresConfirmation: boolean;
  handler: (payload?: unknown) => Promise<unknown> | unknown;
};

type PendingAssistantAction = {
  id: string;
  payload?: Record<string, unknown>;
  label: string;
  description: string;
};

const assistantPermissionsDefaults: Record<AssistantActionPermission, boolean> = {
  navigation: true,
  read_ui: true,
  click: true,
  open_modal: true,
  close_modal: true,
  fill_form: true,
  submit_form: true,
  upload_file: true,
  download_file: true,
  select_record: true,
  create_record: true,
  update_record: true,
  delete_record: false,
  share: true,
  copy: true,
  search: true,
  filter: true,
  sort: true,
  debug_network: true,
  debug_upload: true,
  debug_ui: true,
};

const allowedDomActionIds = new Set([
  'open-phonebook',
  'create-event',
  'upload-family-images',
  'upload-client-images',
  'upload-album-images',
  'upload-event-gallery-images',
  'close-modal',
  'open-albums',
  'open-events',
  'copy-share-link',
]);

const allowedUploadIds = new Set([
  'upload_family_images',
  'upload_client_images',
  'upload_album_images',
  'upload_event_gallery_images',
  'upload_profile_image',
]);

const allowedFormFieldIds = new Set([
  'event_name',
  'event_date',
  'event_location',
  'client_name',
  'phone_number',
  'email',
  'description',
  'search',
  'album_name',
  'gallery_name',
]);

const allowedFormIds = new Set([
  'create_event_form',
  'edit_event_form',
  'phonebook_contact_form',
  'album_form',
  'search_form',
]);

function isElementVisible(el: Element): boolean {
  const anyEl = el as HTMLElement;
  if (!anyEl) return false;
  const style = window.getComputedStyle(anyEl);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = anyEl.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function safeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function limitString(s: string, max = 800): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function sanitizeAssistantContext(context: unknown): unknown {
  const seen = new WeakSet<object>();

  const denyKey = (k: string) =>
    /token|secret|password|api[-_]?key|authorization|cookie/i.test(k);

  const walk = (value: unknown, depth: number): unknown => {
    if (depth > 6) return undefined;
    if (value == null) return value;
    if (typeof value === 'string') return limitString(value.replace(/\s+/g, ' ').trim(), 2000);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      return value.slice(0, MAX_CONTEXT_ITEMS).map((v) => walk(v, depth + 1)).filter((v) => v !== undefined);
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (seen.has(obj)) return undefined;
      seen.add(obj);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (denyKey(k)) continue;
        if (/password/i.test(k)) {
          out[k] = '';
          continue;
        }
        const next = walk(v, depth + 1);
        if (next !== undefined) out[k] = next;
      }
      return out;
    }
    return undefined;
  };

  return walk(context, 0);
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createMessage(role: OpenClawMessage['role'], content: string, type?: OpenClawMessage['type']): OpenClawMessage {
  return {
    id: newId(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(type ? { type } : {}),
  };
}

function generateChatTitle(messages: OpenClawMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === 'user' && message.content.trim());
  if (!firstUserMessage) return 'New Chat';
  const normalized = firstUserMessage.content.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New Chat';
  return normalized.length > 40 ? `${normalized.slice(0, 40).trimEnd()}...` : normalized;
}

function createNewChatSession(userId: string): OpenClawChatSession {
  const now = new Date().toISOString();
  return {
    id: newId(),
    userId,
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function isValidRole(role: unknown): role is ChatRole {
  return role === 'user' || role === 'assistant' || role === 'system';
}

function loadChatSessions(storageKey: string, currentUserId: string): OpenClawChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw =
      window.localStorage.getItem(storageKey) ||
      (storageKey !== OPENCLAW_CHAT_SESSIONS_KEY ? window.localStorage.getItem(OPENCLAW_CHAT_SESSIONS_KEY) : null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((session) => {
        if (!session || typeof session !== 'object') return null;
        const messagesRaw = Array.isArray((session as { messages?: unknown }).messages)
          ? ((session as { messages: unknown[] }).messages ?? [])
          : [];
        const messages: OpenClawMessage[] = messagesRaw
          .map((message) => {
            if (!message || typeof message !== 'object') return null;
            const role = (message as { role?: unknown }).role;
            const content = (message as { content?: unknown; text?: unknown }).content;
            const createdAt = (message as { createdAt?: unknown }).createdAt;
            if (!isValidRole(role)) return null;
            const contentText = typeof content === 'string' ? content : typeof (message as { text?: unknown }).text === 'string' ? String((message as { text?: unknown }).text) : '';
            const safeCreatedAt = typeof createdAt === 'string' && createdAt.trim() ? createdAt : new Date().toISOString();
            const typeCandidate = (message as { type?: unknown }).type;
            const typeValue =
              typeCandidate === 'text' || typeCandidate === 'image' || typeCandidate === 'voice'
                ? typeCandidate
                : undefined;
            const imageUrl = typeof (message as { imageUrl?: unknown }).imageUrl === 'string'
              ? (message as { imageUrl: string }).imageUrl
              : undefined;
            return {
              id: typeof (message as { id?: unknown }).id === 'string' ? String((message as { id: string }).id) : newId(),
              role,
              content: contentText,
              createdAt: safeCreatedAt,
              ...(typeValue ? { type: typeValue } : {}),
              ...(imageUrl ? { imageUrl } : {}),
            };
          })
          .filter((message): message is OpenClawMessage => Boolean(message));

        const createdAt = typeof (session as { createdAt?: unknown }).createdAt === 'string'
          ? String((session as { createdAt: string }).createdAt)
          : new Date().toISOString();
        const updatedAt = typeof (session as { updatedAt?: unknown }).updatedAt === 'string'
          ? String((session as { updatedAt: string }).updatedAt)
          : createdAt;
        const titleCandidate = typeof (session as { title?: unknown }).title === 'string'
          ? String((session as { title: string }).title)
          : '';
        const backendSessionId =
          typeof (session as { backendSessionId?: unknown }).backendSessionId === 'string'
            ? String((session as { backendSessionId: string }).backendSessionId)
            : undefined;

        return {
          id: typeof (session as { id?: unknown }).id === 'string' ? String((session as { id: string }).id) : newId(),
          userId:
            typeof (session as { userId?: unknown }).userId === 'string'
              ? String((session as { userId: string }).userId)
              : currentUserId,
          ...(backendSessionId ? { backendSessionId } : {}),
          title: titleCandidate.trim() || generateChatTitle(messages),
          createdAt,
          updatedAt,
          messages,
        };
      })
      .filter((session): session is OpenClawChatSession => Boolean(session) && session.userId === currentUserId);
  } catch {
    return [];
  }
}

function saveChatSessions(sessions: OpenClawChatSession[], storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(sessions));
  } catch {
    /* ignore */
  }
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
  const { user } = useAuth();
  const isDrawer = layout === 'drawer';
  const assistantRootRef = React.useRef<HTMLDivElement | null>(null);
  const getCurrentOpenClawUserId = React.useCallback((): string => {
    const idCandidate = user?.id != null ? String(user.id).trim() : '';
    if (idCandidate) return idCandidate;
    const emailCandidate = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
    if (emailCandidate) return emailCandidate;
    const usernameCandidate = typeof user?.username === 'string' ? user.username.trim().toLowerCase() : '';
    if (usernameCandidate) return usernameCandidate;
    return 'guest';
  }, [user?.email, user?.id, user?.username]);

  const getOpenClawChatSessionsKey = React.useCallback(
    (uid: string) => `openclaw_chat_sessions_${uid}`,
    []
  );
  const getOpenClawActiveChatIdKey = React.useCallback(
    (uid: string) => `openclaw_active_chat_id_${uid}`,
    []
  );

  const currentUserId = React.useMemo(() => getCurrentOpenClawUserId(), [getCurrentOpenClawUserId]);
  const chatSessionsStorageKey = React.useMemo(
    () => getOpenClawChatSessionsKey(currentUserId),
    [currentUserId, getOpenClawChatSessionsKey]
  );
  const activeChatStorageKey = React.useMemo(
    () => getOpenClawActiveChatIdKey(currentUserId),
    [currentUserId, getOpenClawActiveChatIdKey]
  );

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

  const [chatSessions, setChatSessions] = React.useState<OpenClawChatSession[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string>('');
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [micUnlocking, setMicUnlocking] = React.useState(false);
  const [assistantPermissions, setAssistantPermissions] = React.useState<Record<AssistantActionPermission, boolean>>(
    assistantPermissionsDefaults
  );
  const [pendingAssistantAction, setPendingAssistantAction] = React.useState<PendingAssistantAction | null>(null);
  const [alwaysSpeakReplies, setAlwaysSpeakReplies] = React.useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(ALWAYS_SPEAK_KEY) === '1';
  });
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const recRef = React.useRef<OpenClawSpeechRecognizer | null>(null);
  const [hasLoadedChatSessions, setHasLoadedChatSessions] = React.useState(false);

  const activeChat = React.useMemo(
    () => chatSessions.find((session) => session.id === activeChatId),
    [chatSessions, activeChatId]
  );
  const activeMessages = activeChat?.messages ?? [];
  const activeBackendSessionId = activeChat?.backendSessionId;

  const getVisiblePageText = React.useCallback((): string => {
    if (typeof document === 'undefined') return '';
    const root = document.body;
    if (!root) return '';
    const assistantRoot = assistantRootRef.current;
    const textNodes: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null = walker.nextNode();
    while (n) {
      const parent = (n.parentElement || null) as HTMLElement | null;
      if (parent) {
        if (assistantRoot && assistantRoot.contains(parent)) {
          n = walker.nextNode();
          continue;
        }
        if (!isElementVisible(parent)) {
          n = walker.nextNode();
          continue;
        }
      }
      const v = safeText(String(n.nodeValue || ''));
      if (v) textNodes.push(v);
      if (textNodes.join(' ').length > 10_000) break;
      n = walker.nextNode();
    }
    return limitString(textNodes.join(' ').replace(/\s+/g, ' ').trim(), 10_000);
  }, []);

  const getVisibleButtons = React.useCallback(() => {
    if (typeof document === 'undefined') return [];
    const assistantRoot = assistantRootRef.current;
    const els = Array.from(document.querySelectorAll('button, [role="button"]')).filter((el) => {
      if (assistantRoot && assistantRoot.contains(el)) return false;
      return isElementVisible(el);
    });
    return els.slice(0, MAX_CONTEXT_ITEMS).map((el) => {
      const btn = el as HTMLElement & { disabled?: boolean };
      const text = safeText(btn.innerText || btn.textContent || '');
      const ariaLabel = (btn.getAttribute('aria-label') || '').trim() || undefined;
      const title = (btn.getAttribute('title') || '').trim() || undefined;
      const disabled =
        Boolean(btn.getAttribute('aria-disabled') === 'true') || Boolean(btn.disabled) || btn.getAttribute('disabled') != null;
      const actionId = (btn.getAttribute('data-ai-action') || '').trim() || undefined;
      return {
        text: limitString(text, 120),
        ...(ariaLabel ? { ariaLabel: limitString(ariaLabel, 140) } : {}),
        ...(title ? { title: limitString(title, 140) } : {}),
        disabled,
        ...(actionId ? { actionId } : {}),
      };
    });
  }, []);

  const getVisibleLinks = React.useCallback(() => {
    if (typeof document === 'undefined') return [];
    const assistantRoot = assistantRootRef.current;
    const els = Array.from(document.querySelectorAll('a[href]')).filter((el) => {
      if (assistantRoot && assistantRoot.contains(el)) return false;
      return isElementVisible(el);
    });
    return els.slice(0, MAX_CONTEXT_ITEMS).map((el) => {
      const a = el as HTMLAnchorElement;
      const text = safeText(a.innerText || a.textContent || '');
      return { text: limitString(text, 140), href: limitString(a.href || a.getAttribute('href') || '', 400) };
    });
  }, []);

  const getVisibleInputs = React.useCallback(() => {
    if (typeof document === 'undefined') return [];
    const assistantRoot = assistantRootRef.current;
    const els = Array.from(document.querySelectorAll('input, select, textarea')).filter((el) => {
      if (assistantRoot && assistantRoot.contains(el)) return false;
      return isElementVisible(el);
    });
    return els.slice(0, MAX_CONTEXT_ITEMS).map((el) => {
      const any = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const tag = any.tagName.toLowerCase();
      const type = tag === 'input' ? ((any as HTMLInputElement).type || 'text') : tag;
      const fieldId = (any.getAttribute('data-ai-field') || '').trim() || undefined;
      const name = (any.getAttribute('name') || '').trim() || undefined;
      const placeholder = (any.getAttribute('placeholder') || '').trim() || undefined;
      const ariaLabel = (any.getAttribute('aria-label') || '').trim() || undefined;
      const required = any.getAttribute('required') != null;
      const disabled = (any as HTMLInputElement).disabled || any.getAttribute('aria-disabled') === 'true';
      const safeValue =
        type === 'password' ? '' : typeof (any as HTMLInputElement).value === 'string' ? limitString((any as HTMLInputElement).value, 80) : '';
      return {
        ...(name ? { name } : {}),
        ...(placeholder ? { placeholder: limitString(placeholder, 120) } : {}),
        ...(ariaLabel ? { label: limitString(ariaLabel, 140) } : {}),
        type,
        ...(safeValue ? { value: safeValue } : {}),
        ...(required ? { required } : {}),
        ...(disabled ? { disabled } : {}),
        ...(fieldId ? { fieldId } : {}),
      };
    });
  }, []);

  const getVisibleForms = React.useCallback(() => {
    if (typeof document === 'undefined') return [];
    const assistantRoot = assistantRootRef.current;
    const forms = Array.from(document.querySelectorAll('form')).filter((el) => {
      if (assistantRoot && assistantRoot.contains(el)) return false;
      return isElementVisible(el);
    });
    return forms.slice(0, 25).map((f) => {
      const formId = (f.getAttribute('data-ai-form') || '').trim() || undefined;
      const id = (f.getAttribute('id') || '').trim() || undefined;
      const name = (f.getAttribute('name') || '').trim() || undefined;
      const fields = Array.from(f.querySelectorAll('input,select,textarea'))
        .map((el) => (el.getAttribute('data-ai-field') || el.getAttribute('name') || '').trim())
        .filter(Boolean)
        .slice(0, 40);
      return { ...(id ? { id } : {}), ...(name ? { name } : {}), ...(formId ? { actionId: formId } : {}), fields };
    });
  }, []);

  const getVisibleTables = React.useCallback(() => {
    if (typeof document === 'undefined') return [];
    const assistantRoot = assistantRootRef.current;
    const tables = Array.from(document.querySelectorAll('table')).filter((el) => {
      if (assistantRoot && assistantRoot.contains(el)) return false;
      return isElementVisible(el);
    });
    return tables.slice(0, 10).map((table) => {
      const caption = safeText((table.querySelector('caption')?.textContent || '').trim()) || undefined;
      const headers = Array.from(table.querySelectorAll('thead th'))
        .map((th) => safeText(String(th.textContent || '')).slice(0, 80))
        .filter(Boolean)
        .slice(0, 20);
      const bodyRows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 5);
      const sampleRows = bodyRows.map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => limitString(safeText(String(td.textContent || '')), 80))
      );
      const rowCount = table.querySelectorAll('tbody tr').length;
      return { ...(caption ? { caption } : {}), headers, rowCount, sampleRows };
    });
  }, []);

  const getVisibleModals = React.useCallback(() => {
    if (typeof document === 'undefined') return [];
    const assistantRoot = assistantRootRef.current;
    const candidates = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter((el) => {
      if (assistantRoot && assistantRoot.contains(el)) return false;
      return isElementVisible(el);
    });
    return candidates.slice(0, 8).map((el) => {
      const title =
        safeText(String((el.querySelector('[data-modal-title], h1, h2, h3')?.textContent || '').trim())) || undefined;
      const text = limitString(safeText(String((el.textContent || '').trim())), 500);
      const actionId = (el.getAttribute('data-ai-action') || '').trim() || undefined;
      return { ...(title ? { title } : {}), ...(text ? { text } : {}), ...(actionId ? { actionId } : {}) };
    });
  }, []);

  const getSelectedRecords = React.useCallback(() => {
    const records: Array<{ type: string; id?: string; title?: string; data?: Record<string, unknown> }> = [];
    if (memoriesEventSnapshot?.id) {
      records.push({
        type: 'memoriesEvent',
        id: String(memoriesEventSnapshot.id),
        title: String(memoriesEventSnapshot.name || ''),
        data: memoriesEventSnapshot as unknown as Record<string, unknown>,
      });
    }
    return records;
  }, [memoriesEventSnapshot]);

  const getUploadAreas = React.useCallback(() => {
    if (typeof document === 'undefined') return [];
    const assistantRoot = assistantRootRef.current;
    const inputs = Array.from(document.querySelectorAll('input[type="file"][data-ai-upload]')).filter((el) => {
      if (assistantRoot && assistantRoot.contains(el)) return false;
      return isElementVisible(el);
    });
    return inputs.slice(0, MAX_CONTEXT_ITEMS).map((el) => {
      const input = el as HTMLInputElement;
      const id = (input.getAttribute('data-ai-upload') || '').trim();
      const accept = (input.getAttribute('accept') || '').trim() || undefined;
      const multiple = input.multiple === true;
      const disabled = input.disabled === true;
      const label = (input.getAttribute('aria-label') || input.getAttribute('title') || '').trim() || undefined;
      return { id, ...(label ? { label } : {}), ...(accept ? { accept } : {}), multiple, disabled };
    });
  }, []);

  const getAvailableAssistantActions = React.useCallback(() => {
    const base = [
      { id: 'click_allowed_element', label: 'Click Allowed Element', permission: 'click', risk: 'medium', requiresConfirmation: false },
      { id: 'fill_allowed_form_field', label: 'Fill Allowed Form Field', permission: 'fill_form', risk: 'medium', requiresConfirmation: false },
      { id: 'submit_allowed_form', label: 'Submit Allowed Form', permission: 'submit_form', risk: 'dangerous', requiresConfirmation: true },
      { id: 'open_upload_dialog', label: 'Open Upload Dialog', permission: 'upload_file', risk: 'medium', requiresConfirmation: false },
      { id: 'copy_current_page_link', label: 'Copy Current Page Link', permission: 'copy', risk: 'safe', requiresConfirmation: false },
    ] as const;
    return base.filter((a) => assistantPermissions[a.permission as AssistantActionPermission] !== false);
  }, [assistantPermissions]);

  const getReadableRouteName = React.useCallback((): string => {
    const path = window.location.pathname || '/';
    if (path === '/') return 'Home';
    const clean = path
      .split('/')
      .filter(Boolean)
      .map((part) => part.replace(/[-_]/g, ' '))
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' > ');
    return clean || 'Home';
  }, []);

  const buildAssistantPageContext = React.useCallback(
    (extraContext?: Record<string, unknown>) => {
      if (typeof window === 'undefined') return sanitizeAssistantContext(extraContext || {});
      clearOldUploadStatuses();
      const ctx = sanitizeAssistantContext({
        path: window.location.pathname,
        url: window.location.href,
        title: document.title,
        routeName: getReadableRouteName(),
        visibleText: getVisiblePageText(),
        buttons: getVisibleButtons(),
        links: getVisibleLinks(),
        inputs: getVisibleInputs(),
        forms: getVisibleForms(),
        tables: getVisibleTables(),
        modals: getVisibleModals(),
        selectedRecords: getSelectedRecords(),
        uploadAreas: getUploadAreas(),
        uploadStatus: getUploadStatusSnapshot(),
        networkStatus: getNetworkStatusSnapshot(),
        recentApiCalls: getRecentApiCallsSnapshot(8),
        recentUiErrors: getRecentUiErrorsSnapshot(8),
        availableActions: getAvailableAssistantActions(),
        timestamp: new Date().toISOString(),
        ...extraContext,
      });
      try {
        const json = JSON.stringify(ctx);
        if (json.length <= MAX_CONTEXT_CHARS) return ctx;
        return sanitizeAssistantContext({ ...(ctx as Record<string, unknown>), visibleText: limitString(getVisiblePageText(), 3500) });
      } catch {
        return sanitizeAssistantContext({ path: window.location.pathname, timestamp: new Date().toISOString() });
      }
    },
    [
      getAvailableAssistantActions,
      getReadableRouteName,
      getSelectedRecords,
      getUploadAreas,
      getVisibleButtons,
      getVisibleForms,
      getVisibleInputs,
      getVisibleLinks,
      getVisibleModals,
      getVisiblePageText,
      getVisibleTables,
    ]
  );

  const runSafeDomAction = React.useCallback((actionId: string): boolean => {
    const id = String(actionId || '').trim();
    if (!id || !allowedDomActionIds.has(id)) return false;
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(`[data-ai-action="${CSS.escape(id)}"]`);
    if (!el) return false;
    if (!isElementVisible(el)) return false;
    const any = el as HTMLElement & { disabled?: boolean };
    const disabled =
      Boolean(any.getAttribute('aria-disabled') === 'true') || Boolean(any.disabled) || any.getAttribute('disabled') != null;
    if (disabled) return false;
    try {
      (any as HTMLElement).click();
      return true;
    } catch {
      return false;
    }
  }, []);

  const openAllowedUploadInput = React.useCallback((uploadId: string): boolean => {
    const id = String(uploadId || '').trim();
    if (!id || !allowedUploadIds.has(id)) return false;
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(`input[type="file"][data-ai-upload="${CSS.escape(id)}"]`) as HTMLInputElement | null;
    if (!el) return false;
    if (!isElementVisible(el) || el.disabled) return false;
    try {
      el.click();
      return true;
    } catch {
      return false;
    }
  }, []);

  const fillAllowedFormField = React.useCallback((fieldId: string, value: string): boolean => {
    const id = String(fieldId || '').trim();
    if (!id || !allowedFormFieldIds.has(id)) return false;
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(`[data-ai-field="${CSS.escape(id)}"]`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    if (!el) return false;
    if (!isElementVisible(el)) return false;
    if ((el as HTMLInputElement).type === 'password') return false;
    if ((el as HTMLInputElement).disabled) return false;
    try {
      const next = String(value ?? '');
      if (el instanceof HTMLSelectElement) {
        el.value = next;
      } else {
        (el as HTMLInputElement | HTMLTextAreaElement).value = next;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const submitAllowedForm = React.useCallback((formId: string): boolean => {
    const id = String(formId || '').trim();
    if (!id || !allowedFormIds.has(id)) return false;
    if (typeof document === 'undefined') return false;
    const form = document.querySelector(`form[data-ai-form="${CSS.escape(id)}"]`) as HTMLFormElement | null;
    if (!form) return false;
    if (!isElementVisible(form)) return false;
    try {
      form.requestSubmit?.();
      if (!form.requestSubmit) form.submit();
      return true;
    } catch {
      return false;
    }
  }, []);

  const assistantActionRegistry = React.useMemo<Record<string, AssistantActionDefinition>>(() => {
    const routeActions: Array<{ id: string; label: string; description: string; path: string }> = [
      { id: 'open_route_view', label: 'Open View Image', description: 'Open view image page', path: '/view' },
      { id: 'open_route_privacy_policy', label: 'Open Privacy Policy', description: 'Open privacy policy', path: '/privacy-policy' },
      { id: 'open_route_our_memories_privacy_policy', label: 'Open OM Privacy Policy', description: 'Open OM privacy policy', path: '/our-memories-privacy-policy' },
      { id: 'open_route_memories', label: 'Open Memories Landing', description: 'Open memories landing', path: '/memories' },
      { id: 'open_route_login', label: 'Open Login', description: 'Open login page', path: '/login' },
      { id: 'open_route_register', label: 'Open Register', description: 'Open register page', path: '/register' },
      { id: 'open_route_forgot_password', label: 'Open Forgot Password', description: 'Open forgot password', path: '/forgot-password' },
      { id: 'open_route_reset_password', label: 'Open Reset Password', description: 'Open reset password', path: '/reset-password' },
      { id: 'open_route_accept_invitation', label: 'Open Accept Invitation', description: 'Open accept invitation', path: '/accept-invitation' },
      { id: 'open_route_public_checkout', label: 'Open Public Checkout', description: 'Open public checkout', path: '/public/checkout' },
      { id: 'open_route_public_selection', label: 'Open Public Selection', description: 'Open public selection', path: '/public/selection' },
      { id: 'open_route_public_images_display', label: 'Open Public Images Display', description: 'Open public images display', path: '/public/images-display' },
      { id: 'open_route_studio', label: 'Open Studio Landing', description: 'Open studio landing', path: '/studio' },
      { id: 'open_route_studio_auth', label: 'Open Studio Auth', description: 'Open studio auth', path: '/studio/auth' },

      // App shell routes (mounted under "/")
      { id: 'open_route_dashboard', label: 'Open Dashboard', description: 'Open dashboard', path: '/dashboard' },
      { id: 'open_route_profile', label: 'Open Profile', description: 'Open profile', path: '/profile' },
      { id: 'open_route_change_password', label: 'Open Change Password', description: 'Open change password', path: '/change-password' },
      { id: 'open_route_services', label: 'Open Services', description: 'Open services', path: '/services' },
      { id: 'open_route_plans', label: 'Open Plans', description: 'Open plans', path: '/plans' },
      { id: 'open_route_usage', label: 'Open Usage', description: 'Open usage', path: '/usage' },
      { id: 'open_route_billing', label: 'Open Billing', description: 'Open billing', path: '/billing' },
      { id: 'open_route_settings', label: 'Open Settings', description: 'Open settings', path: '/settings' },
      { id: 'open_route_upload', label: 'Open Upload', description: 'Open upload', path: '/upload' },
      { id: 'open_route_upload_family_images', label: 'Open Family Upload', description: 'Open family upload', path: '/upload-family-images' },
      { id: 'open_route_images', label: 'Open Images', description: 'Open images', path: '/images' },
      { id: 'open_route_client_images', label: 'Open Client Images', description: 'Open client images', path: '/client-images' },
      { id: 'open_route_analytics', label: 'Open Analytics', description: 'Open analytics', path: '/analytics' },
      { id: 'open_route_invitation_code', label: 'Open Invitation Code', description: 'Open invitation code', path: '/invitation/code' },
      { id: 'open_route_invitation_invite', label: 'Open Invite User', description: 'Open invite user', path: '/invitation/invite' },
      { id: 'open_route_invitations', label: 'Open Invitations', description: 'Open invitations', path: '/invitations' },
      { id: 'open_route_connections', label: 'Open Connections', description: 'Open connections', path: '/connections' },
      { id: 'open_route_studio_dashboard', label: 'Open Studio Dashboard', description: 'Open studio dashboard', path: '/studio/dashboard' },
      { id: 'open_route_studio_openclaw', label: 'Open Assistant', description: 'Open assistant page', path: '/studio/openclaw' },
      { id: 'open_route_studio_whatsapp', label: 'Open WhatsApp', description: 'Open WhatsApp channel settings', path: '/studio/whatsapp' },
      { id: 'open_route_filter_images', label: 'Open Face Filter', description: 'Open face filter / FaceSync', path: '/filter-images' },
      { id: 'open_route_studio_clients', label: 'Open Studio Clients', description: 'Open studio clients', path: '/studio/clients' },
      { id: 'open_route_studio_gallery', label: 'Open Studio Gallery', description: 'Open studio gallery', path: '/studio/gallery' },
      { id: 'open_route_studio_barcodes', label: 'Open Barcodes', description: 'Open barcodes', path: '/studio/barcodes' },
      { id: 'open_route_studio_payments', label: 'Open Payments', description: 'Open payments', path: '/studio/payments' },
      { id: 'open_route_studio_payment_management', label: 'Open Payment Management', description: 'Open payment management', path: '/studio/payment-management' },
      { id: 'open_route_studio_settings', label: 'Open Studio Settings', description: 'Open studio settings', path: '/studio/settings' },
      { id: 'open_route_studio_albums', label: 'Open Albums', description: 'Open albums', path: '/studio/albums' },
      { id: 'open_route_studio_shared_albums', label: 'Open Shared Albums', description: 'Open shared albums', path: '/studio/shared-albums' },
      { id: 'open_route_studio_shared_photo_links', label: 'Open Shared Photo Links', description: 'Open shared photo links', path: '/studio/shared-photo-links' },
      { id: 'open_route_client_tree', label: 'Open Client Tree', description: 'Open client tree', path: '/client-tree' },
      { id: 'open_route_family_tree', label: 'Open Family Tree', description: 'Open family tree', path: '/family-tree' },
      { id: 'open_route_sheet', label: 'Open Sheet', description: 'Open sheet page', path: '/Sheet' },
      { id: 'open_route_create_client', label: 'Open Create Client', description: 'Open create client', path: '/create-client' },
      { id: 'open_route_photo_themes', label: 'Open Photo Themes', description: 'Open photo themes', path: '/photo-themes' },
      { id: 'open_route_photo_book', label: 'Open Photo Book', description: 'Open photo book', path: '/photo-book' },
      { id: 'open_route_memories_dashboard', label: 'Open Memories Dashboard', description: 'Open memories dashboard', path: '/memories/dashboard' },
      { id: 'open_route_memories_events', label: 'Open Events', description: 'Open memories events', path: '/memories/events' },
      { id: 'open_route_memories_events_new', label: 'Open New Event', description: 'Open create memories event', path: '/memories/events/new' },
      { id: 'open_route_memories_shared', label: 'Open Shared Memories', description: 'Open shared with me', path: '/memories/shared' },
      { id: 'open_route_phonebook', label: 'Open Phonebook', description: 'Open phonebook', path: '/phonebook' },
      { id: 'open_route_phonebook_new', label: 'Open New Contact', description: 'Open create contact', path: '/phonebook/new' },
      { id: 'open_route_admin', label: 'Open Admin', description: 'Open admin', path: '/admin' },
    ];

    const registry: Record<string, AssistantActionDefinition> = {};
    for (const r of routeActions) {
      registry[r.id] = {
        id: r.id,
        label: r.label,
        description: r.description,
        permission: 'navigation',
        risk: 'safe',
        requiresConfirmation: false,
        handler: () => navigate(r.path),
      };
    }

    registry.click_allowed_element = {
      id: 'click_allowed_element',
      label: 'Click Allowed Element',
      description: 'Click a whitelisted UI element using data-ai-action',
      permission: 'click',
      risk: 'medium',
      requiresConfirmation: false,
      handler: (payload) => (runSafeDomAction(String((payload as { actionId?: unknown })?.actionId || '')) ? 'Clicked.' : 'Click failed.'),
    };

    registry.open_upload_dialog = {
      id: 'open_upload_dialog',
      label: 'Open Upload Dialog',
      description: 'Open a whitelisted file upload input',
      permission: 'upload_file',
      risk: 'medium',
      requiresConfirmation: false,
      handler: (payload) =>
        openAllowedUploadInput(String((payload as { uploadId?: unknown })?.uploadId || '')) ? 'Upload dialog opened.' : 'Upload dialog not available.',
    };

    registry.fill_allowed_form_field = {
      id: 'fill_allowed_form_field',
      label: 'Fill Allowed Form Field',
      description: 'Fill field marked with data-ai-field',
      permission: 'fill_form',
      risk: 'medium',
      requiresConfirmation: false,
      handler: (payload) =>
        fillAllowedFormField(
          String((payload as { fieldId?: unknown })?.fieldId || ''),
          String((payload as { value?: unknown })?.value || '')
        )
          ? 'Field filled.'
          : 'Field fill failed.',
    };

    registry.submit_allowed_form = {
      id: 'submit_allowed_form',
      label: 'Submit Allowed Form',
      description: 'Submit whitelisted form marked with data-ai-form',
      permission: 'submit_form',
      risk: 'dangerous',
      requiresConfirmation: true,
      handler: (payload) =>
        submitAllowedForm(String((payload as { formId?: unknown })?.formId || '')) ? 'Form submitted.' : 'Form submit failed.',
    };

    registry.copy_current_page_link = {
      id: 'copy_current_page_link',
      label: 'Copy Current Page Link',
      description: 'Copy current page URL',
      permission: 'copy',
      risk: 'safe',
      requiresConfirmation: false,
      handler: async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          return 'Copied page link.';
        } catch {
          return 'Copy failed.';
        }
      },
    };

    return registry;
  }, [fillAllowedFormField, navigate, openAllowedUploadInput, runSafeDomAction, submitAllowedForm]);

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
    if (typeof sessionStorage === 'undefined') return;
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const updateChatSessionById = React.useCallback(
    (chatId: string, updater: (chat: OpenClawChatSession) => OpenClawChatSession) => {
      setChatSessions((prev) => prev.map((chat) => (chat.id === chatId ? updater(chat) : chat)));
    },
    []
  );

  const selectChatSession = React.useCallback((chatId: string): void => {
    setActiveChatId(chatId);
  }, []);

  const updateCurrentChatSession = React.useCallback(
    (updater: (chat: OpenClawChatSession) => OpenClawChatSession): void => {
      if (!activeChatId) return;
      updateChatSessionById(activeChatId, updater);
    },
    [activeChatId, updateChatSessionById]
  );

  const appendMessageToChat = React.useCallback(
    (chatId: string, message: OpenClawMessage): void => {
      updateChatSessionById(chatId, (chat) => {
        const nextMessages = [...chat.messages, message];
        return {
          ...chat,
          userId: chat.userId || currentUserId,
          updatedAt: message.createdAt,
          title: generateChatTitle(nextMessages),
          messages: nextMessages,
        };
      });
    },
    [currentUserId, updateChatSessionById]
  );

  const appendMessageToCurrentChat = React.useCallback(
    (message: OpenClawMessage): void => {
      if (!activeChatId) return;
      appendMessageToChat(activeChatId, message);
    },
    [activeChatId, appendMessageToChat]
  );

  const appendLine = React.useCallback(
    (role: ChatRole, text: string, source?: 'voice', chatId?: string) => {
      const messageType: OpenClawMessage['type'] = source === 'voice' ? 'voice' : 'text';
      const message = createMessage(role, text, messageType);
      if (chatId) {
        appendMessageToChat(chatId, message);
      } else {
        appendMessageToCurrentChat(message);
      }
    },
    [appendMessageToCurrentChat, appendMessageToChat]
  );

  const executeAssistantAction = React.useCallback(
    async (actionId: string, payload?: Record<string, unknown>) => {
      const id = String(actionId || '').trim();
      if (!id) return;
      const def = assistantActionRegistry[id];
      if (!def) {
        appendLine('system', `Action not available: ${id}`);
        return;
      }
      if (assistantPermissions[def.permission] === false) {
        appendLine('system', `Permission denied for action: ${def.label}`);
        return;
      }
      if (def.requiresConfirmation || def.risk === 'dangerous') {
        setPendingAssistantAction({ id: def.id, payload, label: def.label, description: def.description });
        return;
      }
      try {
        const result = await def.handler(payload);
        if (typeof result === 'string' && result.trim()) appendLine('system', result.trim());
      } catch {
        appendLine('system', `Action failed: ${def.label}`);
      }
    },
    [appendLine, assistantActionRegistry, assistantPermissions]
  );

  const executeAssistantActions = React.useCallback(
    async (actions: AssistantActionRequest[]) => {
      for (const a of actions) {
        if (!a?.id) continue;
        if (pendingAssistantAction) break;
        await executeAssistantAction(a.id, a.payload);
      }
    },
    [executeAssistantAction, pendingAssistantAction]
  );

  const confirmPendingAssistantAction = React.useCallback(async () => {
    if (!pendingAssistantAction) return;
    const def = assistantActionRegistry[pendingAssistantAction.id];
    if (!def) {
      setPendingAssistantAction(null);
      return;
    }
    try {
      setPendingAssistantAction(null);
      const result = await def.handler(pendingAssistantAction.payload);
      if (typeof result === 'string' && result.trim()) appendLine('system', result.trim());
    } catch {
      appendLine('system', `Action failed: ${def.label}`);
    }
  }, [appendLine, assistantActionRegistry, pendingAssistantAction]);

  const cancelPendingAssistantAction = React.useCallback(() => {
    setPendingAssistantAction(null);
  }, []);

  React.useEffect(() => {
    const loadedSessions = loadChatSessions(chatSessionsStorageKey, currentUserId);
    let nextSessions = loadedSessions;
    if (nextSessions.length === 0) {
      nextSessions = [createNewChatSession(currentUserId)];
    }

    let preferredChatId = '';
    if (typeof window !== 'undefined') {
      preferredChatId =
        window.localStorage.getItem(activeChatStorageKey) ||
        (activeChatStorageKey !== OPENCLAW_ACTIVE_CHAT_ID_KEY
          ? window.localStorage.getItem(OPENCLAW_ACTIVE_CHAT_ID_KEY) || ''
          : '');
    }

    const existingPreferred = nextSessions.find((session) => session.id === preferredChatId);
    const fallbackSession =
      existingPreferred ||
      [...nextSessions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
    const resolvedChatId = fallbackSession?.id || nextSessions[0].id;

    setChatSessions(nextSessions);
    setActiveChatId(resolvedChatId);
    persistSession(fallbackSession?.backendSessionId);
    setHasLoadedChatSessions(true);
  }, [activeChatStorageKey, chatSessionsStorageKey, currentUserId, persistSession]);

  React.useEffect(() => {
    if (!hasLoadedChatSessions) return;
    saveChatSessions(chatSessions, chatSessionsStorageKey);
  }, [chatSessions, chatSessionsStorageKey, hasLoadedChatSessions]);

  React.useEffect(() => {
    if (!hasLoadedChatSessions || !activeChatId || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(activeChatStorageKey, activeChatId);
    } catch {
      /* ignore */
    }
  }, [activeChatId, activeChatStorageKey, hasLoadedChatSessions]);

  React.useEffect(() => {
    persistSession(activeBackendSessionId);
  }, [activeBackendSessionId, persistSession]);

  React.useEffect(() => {
    installAssistantErrorListeners();
  }, []);

  const tryHandleLocalAssistantCommands = React.useCallback(
    async (message: string, fromVoice: boolean, chatId?: string): Promise<boolean> => {
      const m = message.trim();
      if (!m) return false;
      const targetChatId = chatId || activeChatId;
      if (!targetChatId) return false;

      const eventIdOnPage = parseMemoriesEventIdFromPath(location.pathname);

      if (isStopSpeechCommand(m)) {
        stopSpeechSynthesis();
        appendLine('user', m, fromVoice ? 'voice' : undefined, targetChatId);
        if (!fromVoice) setInput('');
        appendLine('system', t('speechStopped'), undefined, targetChatId);
        return true;
      }

      if (isOpenImagePickerCommand(m)) {
        appendLine('user', m, fromVoice ? 'voice' : undefined, targetChatId);
        if (!fromVoice) setInput('');
        appendLine('system', t('imagePickerOpened'), undefined, targetChatId);
        window.setTimeout(() => fileRef.current?.click(), 0);
        return true;
      }

      if (isAnnounceThisEventCommand(m)) {
        appendLine('user', m, fromVoice ? 'voice' : undefined, targetChatId);
        if (!fromVoice) setInput('');
        if (!eventIdOnPage) {
          const hint = t('announceThisEventNeedPage');
          appendLine('assistant', hint, undefined, targetChatId);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(hint, ttsLang);
          return true;
        }
        setSending(true);
        try {
          const ev = await getMemoriesEventById(eventIdOnPage);
          if (!ev?.id) {
            const err = t('announceThisEventNone');
            appendLine('assistant', err, undefined, targetChatId);
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
            appendLine('assistant', body, undefined, targetChatId);
            if (isSpeechSynthesisAvailable()) enqueueSpeech(body, ttsLang);
          }
        } catch {
          const err = t('announceThisEventNone');
          appendLine('assistant', err, undefined, targetChatId);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(err, ttsLang);
        } finally {
          setSending(false);
        }
        return true;
      }

      if (isAnnounceEventsCommand(m)) {
        appendLine('user', m, fromVoice ? 'voice' : undefined, targetChatId);
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
          appendLine('assistant', body, undefined, targetChatId);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(body, ttsLang);
        } catch {
          const err = t('announceEventsError');
          appendLine('assistant', err, undefined, targetChatId);
          if (isSpeechSynthesisAvailable()) enqueueSpeech(err, ttsLang);
        } finally {
          setSending(false);
        }
        return true;
      }

      return false;
    },
    [activeChatId, appendLine, i18n.language, location.pathname, t, ttsLang]
  );

  const applyNavigation = React.useCallback(
    (apiNavigateTo: string | null | undefined, userText: string, chatId?: string) => {
      const fromApi = sanitizeOpenClawNavigatePath(apiNavigateTo?.trim() || null);
      const fromLocal = matchOpenClawLocalRoute(userText);
      const path = fromApi ?? fromLocal;
      if (!path) return;
      if (chatId) appendLine('system', t('navOpened', { path }), undefined, chatId);
      else appendLine('system', t('navOpened', { path }));
      navigate(path);
    },
    [appendLine, navigate, t]
  );

  const handleNewSession = React.useCallback(async () => {
    if (!openclawEnabled) return;
    const newSession = createNewChatSession(currentUserId);
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    setInput('');
    toast.success(t('toastSession'));
  }, [currentUserId, t]);

  const sendText = React.useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || !openclawEnabled) return;
      const requestChatId = activeChatId || activeChat?.id;
      if (!requestChatId) return;
      if (await tryHandleLocalAssistantCommands(message, false, requestChatId)) return;
      appendLine('user', message, undefined, requestChatId);
      setInput('');
      setSending(true);
      try {
        const { reply, sessionId: next, navigateTo, action, actions } = await openclawSendChat({
          message,
          sessionId: chatSessions.find((chat) => chat.id === requestChatId)?.backendSessionId,
          userId: currentUserId,
          context: buildAssistantPageContext({
            ...(openClawContext as unknown as Record<string, unknown>),
            userId: currentUserId,
          }) as Record<string, unknown>,
        });
        const shown = polishAssistantReplyForDisplay(reply || t('emptyReply'));
        updateChatSessionById(requestChatId, (chat) => ({
          ...chat,
          backendSessionId: next || chat.backendSessionId,
        }));
        appendLine('assistant', shown, undefined, requestChatId);
        speakAssistantIfEnabled(shown);
        applyNavigation(navigateTo, message, requestChatId);
        if (actions && actions.length > 0) {
          await executeAssistantActions(actions);
        } else if (action) {
          await executeAssistantAction(action.id, action.payload);
        }
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { message?: string } } };
        const msg = ax?.response?.data?.message;
        const failText = typeof msg === 'string' && msg.trim() ? msg : t('sendFail');
        appendLine('assistant', failText, undefined, requestChatId);
        speakAssistantIfEnabled(failText);
        toast.error(t('toastSendFail'));
      } finally {
        setSending(false);
      }
    },
    [
      appendLine,
      activeChat?.id,
      activeChatId,
      applyNavigation,
      chatSessions,
      openClawContext,
      currentUserId,
      speakAssistantIfEnabled,
      t,
      tryHandleLocalAssistantCommands,
      updateChatSessionById,
    ]
  );

  const sendVoiceTranscript = React.useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text || !openclawEnabled) return;
      const requestChatId = activeChatId || activeChat?.id;
      if (!requestChatId) return;
      if (await tryHandleLocalAssistantCommands(text, true, requestChatId)) return;
      appendLine('user', text, 'voice', requestChatId);
      setSending(true);
      try {
        const { reply, sessionId: next, navigateTo, action, actions } = await openclawSendVoice({
          transcript: text,
          sessionId: chatSessions.find((chat) => chat.id === requestChatId)?.backendSessionId,
          userId: currentUserId,
          context: buildAssistantPageContext({
            ...(openClawContext as unknown as Record<string, unknown>),
            userId: currentUserId,
          }) as Record<string, unknown>,
        });
        const shown = polishAssistantReplyForDisplay(reply || t('emptyReply'));
        updateChatSessionById(requestChatId, (chat) => ({
          ...chat,
          backendSessionId: next || chat.backendSessionId,
        }));
        appendLine('assistant', shown, undefined, requestChatId);
        speakAssistantIfEnabled(shown);
        applyNavigation(navigateTo, text, requestChatId);
        if (actions && actions.length > 0) {
          await executeAssistantActions(actions);
        } else if (action) {
          await executeAssistantAction(action.id, action.payload);
        }
      } catch {
        appendLine('assistant', t('sendFail'), undefined, requestChatId);
        speakAssistantIfEnabled(t('sendFail'));
        toast.error(t('toastSendFail'));
      } finally {
        setSending(false);
      }
    },
    [
      appendLine,
      activeChat?.id,
      activeChatId,
      applyNavigation,
      chatSessions,
      openClawContext,
      currentUserId,
      speakAssistantIfEnabled,
      t,
      tryHandleLocalAssistantCommands,
      updateChatSessionById,
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
      const requestChatId = activeChatId || activeChat?.id;
      if (!requestChatId) return;
      const uploadId = trackUploadSelected({
        uploadAreaId: 'upload_profile_image',
        uploadAreaLabel: 'Assistant image upload',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
      });
      appendMessageToChat(
        requestChatId,
        {
          ...createMessage('user', t('uploadedImage', { name: file.name }), 'image'),
          imageUrl: URL.createObjectURL(file),
        }
      );
      setSending(true);
      trackUploadStarted(uploadId, {
        apiMethod: 'POST',
        apiUrl: '/api/openclaw/image',
      });
      try {
        const { reply, sessionId: next, navigateTo, action, actions } = await openclawUploadImage({
          file,
          sessionId: chatSessions.find((chat) => chat.id === requestChatId)?.backendSessionId,
          prompt: input.trim() || undefined,
          uploadId,
          onUploadProgress: (pct) => trackUploadProgress(uploadId, pct),
          userId: currentUserId,
          context: buildAssistantPageContext({
            ...(openClawContext as unknown as Record<string, unknown>),
            userId: currentUserId,
          }) as Record<string, unknown>,
        });
        trackUploadSuccess(uploadId, { reply, navigateTo, sessionId: next });
        const shown = polishAssistantReplyForDisplay(reply || t('emptyReply'));
        updateChatSessionById(requestChatId, (chat) => ({
          ...chat,
          backendSessionId: next || chat.backendSessionId,
        }));
        appendLine('assistant', shown, undefined, requestChatId);
        speakAssistantIfEnabled(shown);
        const navHint = [input.trim(), file.name].filter(Boolean).join(' ');
        applyNavigation(navigateTo, navHint, requestChatId);
        if (actions && actions.length > 0) {
          await executeAssistantActions(actions);
        } else if (action) {
          await executeAssistantAction(action.id, action.payload);
        }
      } catch (err) {
        trackUploadFailed(uploadId, err);
        appendLine('assistant', t('imageFail'), undefined, requestChatId);
        speakAssistantIfEnabled(t('imageFail'));
        toast.error(t('toastImageFail'));
      } finally {
        setSending(false);
      }
    },
    [
      activeChat?.id,
      activeChatId,
      appendLine,
      appendMessageToChat,
      applyNavigation,
      chatSessions,
      input,
      openClawContext,
      currentUserId,
      speakAssistantIfEnabled,
      t,
      updateChatSessionById,
    ]
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

  const recentUploads = getUploadStatusSnapshot();
  const recentApiCalls = getRecentApiCallsSnapshot(5);
  const recentUiErrors = getRecentUiErrorsSnapshot(5);
  const uploadSummary = {
    uploading: recentUploads.filter((u) => u.status === 'uploading').length,
    success: recentUploads.filter((u) => u.status === 'success').length,
    failed: recentUploads.filter((u) => u.status === 'failed').length,
  };
  const lastApi = recentApiCalls[0];
  const lastUiError = recentUiErrors[0];

  const chatHistoryItems = [...chatSessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const chatSection = (
    <section
      className={`flex flex-col min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${isDrawer ? 'min-h-0 flex-1' : 'flex-1'
        }`}
    >
      {pendingAssistantAction ? (
        <div className="shrink-0 mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
          <div className="font-semibold">Action confirmation required</div>
          <div className="mt-1">
            AI wants to perform: <span className="font-semibold">{pendingAssistantAction.label}</span>
          </div>
          <div className="mt-1 text-amber-900/90">{pendingAssistantAction.description}</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmPendingAssistantAction()}
              className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={cancelPendingAssistantAction}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {!isBrowserSecureContext() ? (
        <div className="shrink-0 mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
          <strong className="font-semibold">{t('micInsecureTitle')}</strong>
          <span className="block mt-1 text-amber-900/90">{t('micInsecureBanner')}</span>
        </div>
      ) : null}
      <div
        className={`min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 ${isDrawer ? 'flex-1' : 'max-h-[60vh] min-h-[280px] flex-1'
          }`}
        role="log"
        aria-label={t('chatLogAria')}
        aria-live="polite"
        aria-relevant="additions"
      >
        {activeMessages.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">{t('emptyState')}</p>
        ) : (
          activeMessages.map((line) => (
            <div
              key={line.id}
              className={`rounded-xl px-3 py-2 text-sm max-w-[95%] ${line.role === 'user'
                  ? 'ml-auto bg-violet-600 text-white'
                  : line.role === 'system'
                    ? 'mx-auto bg-slate-100 text-slate-600 text-xs text-center'
                    : 'mr-auto bg-slate-100 text-slate-900 border border-slate-200'
                }`}
            >
              {line.role === 'user' && line.type === 'voice' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
                    <FaMicrophone className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
                    {t('voiceLabel')}
                  </div>
                  <p className="text-sm font-medium leading-snug">{line.content}</p>
                </div>
              ) : line.role === 'assistant' ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{line.content}</p>
              ) : (
                line.content
              )}
              {line.type === 'image' && line.imageUrl ? (
                <img src={line.imageUrl} alt="" className="mt-2 max-h-40 rounded-lg border border-white/20 object-cover" />
              ) : null}
            </div>
          ))
        )}
        {sending ? (
          <div className="mr-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
            <span className="inline-flex items-center gap-1" aria-label="Assistant typing">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:140ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:280ms]" />
            </span>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 border-t border-slate-200 p-3 space-y-2 bg-slate-50/80">
        <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">Debug context</summary>
          <div className="mt-2 space-y-1.5 text-[11px] text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">Page:</span> {location.pathname}
            </p>
            <p>
              <span className="font-semibold text-slate-700">User:</span> {currentUserId}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Chat:</span> {activeChatId || 'none'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Uploads:</span>{' '}
              {uploadSummary.uploading} uploading, {uploadSummary.success} success, {uploadSummary.failed} failed
            </p>
            <p>
              <span className="font-semibold text-slate-700">Last API:</span>{' '}
              {lastApi ? `${lastApi.method} ${lastApi.path || lastApi.url} (${lastApi.responseStatus || '-'})` : 'No calls'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Last Error:</span>{' '}
              {lastUiError ? lastUiError.message : 'No UI errors'}
            </p>
          </div>
        </details>
        <details className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">Permissions and actions</summary>
          <div className="mt-2">
            <div className="flex flex-wrap gap-2 mb-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                data-ai-upload="upload_profile_image"
                data-ai-upload-label="Assistant image upload"
                className="hidden"
                onChange={onPickImage}
              />
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
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${listening
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
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${alwaysSpeakReplies
                    ? 'border-violet-400 bg-violet-50 text-violet-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                title={t('alwaysSpeakTitle')}
              >
                {alwaysSpeakReplies ? <FaVolumeUp className="h-3.5 w-3.5" /> : <FaVolumeMute className="h-3.5 w-3.5" />}
                {alwaysSpeakReplies ? t('alwaysSpeakOn') : t('alwaysSpeakOff')}
              </button>
            </div>
            <details className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 mb-2">
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
          </div>
        </details>
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
      <div
        ref={assistantRootRef}
        className="flex h-full max-h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]"
      >
        <div className="shrink-0 space-y-2">
          {/* <p className="text-[11px] text-slate-500 leading-relaxed px-0.5">{t('drawerHint')}</p> */}
          {/* {showDevHint ? (
            <p className="text-[10px] text-slate-400 leading-snug px-0.5 border border-slate-100 rounded-lg bg-slate-50/90 py-1.5 px-2">
              {t('assistantBackendHint')}
            </p>
          ) : null} */}
          {/* <div className="flex flex-wrap gap-1.5">
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
          </div> */}
          <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">Chat History</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {chatHistoryItems.length}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">Tap to switch chats</div>
                </div>
                <button
                  type="button"
                  disabled={sending}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleNewSession();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
                  title="New Chat"
                  aria-label="New Chat"
                >
                  <FaPlus className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" aria-hidden />
            </summary>
            <div className="px-3 pb-3 pt-2">
              <div className="flex gap-2 overflow-x-auto overflow-y-hidden pr-1 pb-1 [-webkit-overflow-scrolling:touch]">
              {chatHistoryItems.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => selectChatSession(chat.id)}
                  className={`group shrink-0 w-[156px] h-[46px] rounded-2xl border px-3 py-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-400/35 active:scale-[0.99] ${
                    chat.id === activeChatId
                      ? 'border-violet-300 bg-gradient-to-b from-violet-50 to-white  ring-violet-200 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[11px] font-semibold text-slate-900 capitalize leading-snug" style={{ fontFamily: 'initial' }}>
                      {chat.title || 'New Chat'}
                    </p>
                    {chat.id === activeChatId ? (
                      <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-hidden />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500 leading-snug">
                    {new Date(chat.updatedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </button>
              ))}
            </div>
            </div>
          </details>
        </div>
        {chatSection}
      </div>
    );
  }

  return (
    <div
      ref={assistantRootRef}
      className="flex h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] min-h-0 flex-col gap-6 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch] lg:flex-row max-w-6xl mx-auto"
    >
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
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-[11px] text-center font-semibold text-slate-600">Chat History</p>
          <div className="flex justify-center">
            <button
              type="button"
              disabled={sending}
              onClick={() => void handleNewSession()}
              className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 p-2 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              title="Start New Chat"
              aria-label="Start New Chat"
            >
              <FaPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {chatHistoryItems.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => selectChatSession(chat.id)}
                className={`w-full rounded-xl h-[46px] border px-2.5 py-2 text-left transition-colors ${chat.id === activeChatId
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'
                  }`}
              >
                <p className="truncate text-[11px] font-semibold text-slate-800">{chat.title || 'New Chat'}</p>
                <p className="text-[10px] text-slate-500">
                {new Date(chat.updatedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              </button>
            ))}
          </div>
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
        {activeBackendSessionId ? (
          <p className="text-[10px] text-slate-400 break-all font-mono">
            {t('sessionLabel')}: {activeBackendSessionId}
          </p>
        ) : null}
      </aside>
      {chatSection}
    </div>
  );
};

export default OpenClawAssistantPanel;
