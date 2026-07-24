import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft, FaChevronLeft, FaChevronRight, FaEye, FaSave, FaSpinner,
  FaPlus, FaTrash, FaCopy, FaArrowUp, FaArrowDown, FaRandom,
  FaFont, FaPalette, FaImage, FaLayerGroup, FaDownload,
} from 'react-icons/fa';
import api from '../../../api/client/axiosInstance';
import { getStoredToken } from '../../../utils/authUtils';
import StudioFlipbookPageCanvas from './StudioFlipbookPageCanvas';
import StudioFlipbookPreview from './StudioFlipbookPreview';
import LayoutPickerModal from './LayoutPickerModal';
import ChooseImageModal from './ChooseImageModal';
import FlipbookElementContextMenu, {
  type FlipbookContextAction,
  type FlipbookLivePatch,
} from './FlipbookElementContextMenu';
import { getConnectionHint, getSaveData } from '../../../utils/progressiveImageConfig';
import type { UserImageWithVariants } from '../../../utils/progressiveImageVariants';
import { isHlsStreamUrl, isVideoMediaItem } from '../../../utils/videoPlayback';
import {
  createFlipbookFromAlbum,
  dtoToGeneratedPages,
  getFlipbook,
  listFlipbooksByAlbum,
  previewGenerateFromAlbumImages,
  saveFlipbookAll,
} from '../api/flipbookService';
import { exportPagesToPdf } from '../utils/pdfExport';
import { loadFlipbookFromStorage, saveFlipbookToStorage } from '../utils/localFlipbookStorage';
import { autoFillPageText, createFreeTextElement, resolveAutoTextContent, type TextContext } from '../utils/pageTextDefaults';
import { STUDIO_THEMES, getTheme } from '../themes';
import { ALL_LAYOUT_TYPES, getTemplate } from '../templates';
import type { EventType, FitMode, FrameType, GeneratedPage, GeneratedPageElement, LayoutType, ThemeId } from '../types';
import { BUILDER_LAYOUT } from '../constants/canvas';
import '../studio-flipbook.css';

function buildPreviewUrl(imageId: number): string {
  const base = (process.env.REACT_APP_API_URL || api.defaults.baseURL || window.location.origin)
    .toString().replace(/\/+$/, '');
  const token = getStoredToken();
  return token ? `${base}/api/images/${imageId}/preview?token=${encodeURIComponent(token)}` : `${base}/api/images/${imageId}/preview`;
}

function stillMediaUrl(url?: string | null): string {
  if (!url || isHlsStreamUrl(url)) return '';
  return url;
}

function mapAlbumImage(img: Record<string, unknown>): UserImageWithVariants {
  const id = Number(img.id);
  const thumb = stillMediaUrl(typeof img.thumbnailUrl === 'string' ? img.thumbnailUrl : '');
  const rawPreview = String(img.previewUrl ?? img.url ?? img.imageUrl ?? '');
  const isVideo = isVideoMediaItem(img) || isHlsStreamUrl(rawPreview);
  const previewUrl = isVideo
    ? thumb || stillMediaUrl(rawPreview) || ''
    : stillMediaUrl(rawPreview) || thumb || buildPreviewUrl(id);

  return {
    id,
    previewUrl: previewUrl || (isVideo ? '' : buildPreviewUrl(id)),
    thumbnailUrl: thumb || (isVideo ? '' : previewUrl),
    filename: String(img.filename ?? img.originalFilename ?? `image-${id}`),
    downloadUrl: String(img.downloadUrl ?? rawPreview ?? previewUrl),
    fileType: String(img.fileType ?? (isVideo ? 'mp4' : 'image/jpeg')),
    mediaType: typeof img.mediaType === 'string' ? img.mediaType : isVideo ? 'VIDEO' : undefined,
    uploadTime: String(img.uploadTime ?? ''),
    variants: img.variants as UserImageWithVariants['variants'],
  };
}

/** Flipbook canvas: photos use preview; videos use thumbnail still (never HLS). */
function canvasImageUrl(img: UserImageWithVariants): string {
  if (isVideoMediaItem(img) || isHlsStreamUrl(img.previewUrl)) {
    return stillMediaUrl(img.thumbnailUrl) || stillMediaUrl(img.previewUrl) || '';
  }
  return stillMediaUrl(img.previewUrl) || stillMediaUrl(img.thumbnailUrl) || buildPreviewUrl(Number(img.id));
}

function thumbImageUrl(img: UserImageWithVariants): string {
  return (
    stillMediaUrl(img.thumbnailUrl) ||
    stillMediaUrl(img.previewUrl) ||
    (isVideoMediaItem(img) ? '' : buildPreviewUrl(Number(img.id)))
  );
}

const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: 'wedding', label: 'Wedding' }, { id: 'engagement', label: 'Engagement' },
  { id: 'anniversary', label: 'Anniversary' }, { id: 'birthday', label: 'Birthday' },
  { id: 'party', label: 'Party' }, { id: 'reception', label: 'Reception' },
  { id: 'baby_shower', label: 'Baby Shower' }, { id: 'family', label: 'Family' },
  { id: 'corporate', label: 'Corporate' }, { id: 'general', label: 'General' },
];

const FRAME_TYPES: { id: FrameType; label: string }[] = [
  { id: 'none', label: 'Rectangle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle', label: 'Circle' },
  { id: 'oval', label: 'Oval' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'pentagon', label: 'Pentagon' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'star', label: 'Star' },
  { id: 'diagonal', label: 'Diagonal' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'border', label: 'Border' },
  { id: 'golden', label: 'Golden' },
  { id: 'soft_shadow', label: 'Soft Shadow' },
  { id: 'full_bleed', label: 'Full Bleed' },
];

const FIT_MODES: { id: FitMode; label: string }[] = [
  { id: 'cover', label: 'Cover' }, { id: 'contain', label: 'Contain' }, { id: 'fill', label: 'Fill' },
];

const FONT_FAMILIES = [
  { value: '"Playfair Display", Georgia, serif', label: 'Playfair Display' },
  { value: '"Cormorant Garamond", Georgia, serif', label: 'Cormorant Garamond' },
  { value: '"Dancing Script", cursive', label: 'Dancing Script' },
  { value: '"Merriweather", Georgia, serif', label: 'Merriweather' },
  { value: '"Inter", system-ui, sans-serif', label: 'Inter' },
  { value: '"Fredoka", system-ui, sans-serif', label: 'Fredoka' },
];

/* ─── apply a layout template to an existing page ─── */
function applyLayoutToPage(
  page: GeneratedPage,
  layoutType: LayoutType,
  albumImages: UserImageWithVariants[],
  themeId: ThemeId,
  textCtx: TextContext,
): GeneratedPage {
  const theme = getTheme(themeId);
  const tmpl = getTemplate(layoutType);
  const usedIds = new Set<number>();
  // collect image ids already used on OTHER pages
  // (we keep current page's images if they exist)
  const existingImageIds = new Set(
    page.elements.filter(e => e.elementType === 'image' && e.albumImageId).map(e => e.albumImageId!)
  );

  // pick images for empty slots
  const available = albumImages.filter(i => !existingImageIds.has(Number(i.id)));
  let availIdx = 0;

  const newElements: GeneratedPageElement[] = [];

  // image slots
  for (const slot of tmpl.imageSlots) {
    const existing = page.elements.find(
      e => e.elementType === 'image' && e.styleJson?.role === slot.role &&
           Math.abs(e.x - slot.x) < 1 && Math.abs(e.y - slot.y) < 1
    );
    if (existing) {
      newElements.push(existing);
      if (existing.albumImageId) usedIds.add(existing.albumImageId);
    } else {
      const img = available[availIdx++];
      const defaultFit = slot.fitMode ?? 'cover';
      newElements.push({
        elementType: slot.role === 'decorative' ? 'decorative' : 'image',
        albumImageId: img ? Number(img.id) : undefined,
        x: slot.x, y: slot.y, width: slot.width, height: slot.height,
        rotation: 0, zIndex: slot.zIndex ?? 1, opacity: slot.opacity,
        frameType: slot.frameType, fitMode: defaultFit,
        cropX: 50, cropY: 50,
        styleJson: { borderRadius: slot.borderRadius, shadow: slot.shadow, role: slot.role, imageZoom: 1 },
      });
      if (img) usedIds.add(Number(img.id));
    }
  }

  // text slots
  for (const slot of tmpl.textSlots) {
    const existing = page.elements.find(
      e => e.elementType === 'text' && e.styleJson?.role === slot.role &&
           Math.abs(e.x - slot.x) < 1 && Math.abs(e.y - slot.y) < 1
    );
    if (existing) {
      newElements.push(
        existing.content?.trim()
          ? existing
          : { ...existing, content: resolveAutoTextContent(slot, textCtx) }
      );
    } else {
      newElements.push({
        elementType: 'text',
        content: resolveAutoTextContent(slot, textCtx),
        x: slot.x, y: slot.y, width: slot.width, height: slot.height,
        zIndex: 10,
        styleJson: {
          role: slot.role, fontSizePx: slot.fontSizePx, fontFamily: slot.fontFamily ?? theme.titleFont,
          fontWeight: slot.fontWeight, color: slot.color, align: slot.align,
          letterSpacing: slot.letterSpacing, lineHeight: slot.lineHeight, shadow: slot.shadow,
        },
      });
    }
  }

  // decorative
  for (const dec of tmpl.decorativeSlots ?? []) {
    newElements.push({
      elementType: 'decorative',
      x: dec.x, y: dec.y, width: dec.width, height: dec.height,
      zIndex: dec.zIndex ?? 5, styleJson: { kind: dec.kind },
    });
  }

  return {
    ...page,
    layoutType,
    pageType: tmpl.pageType,
    backgroundType: tmpl.background.type,
    backgroundValue: tmpl.background.value,
    themeVariant: themeId,
    settingsJson: { ...page.settingsJson, overlayGradient: tmpl.background.overlayGradient },
    elements: newElements,
  };
}

/* ═══════════════════════════════════════════════════════════════ */

const StudioFlipbookBuilderPage: React.FC = () => {
  const { albumId: albumIdParam } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const albumId = Number(albumIdParam);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [flipbookId, setFlipbookId] = React.useState<number | null>(null);
  const [albumTitle, setAlbumTitle] = React.useState('');
  const [pages, setPages] = React.useState<GeneratedPage[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [selectedElement, setSelectedElement] = React.useState<number | null>(null);
  const [eventType, setEventType] = React.useState<EventType>('wedding');
  const [theme, setTheme] = React.useState<ThemeId>('wedding_modern');
  const [imageUrlById, setImageUrlById] = React.useState<Record<number, string>>({});
  const [thumbUrlById, setThumbUrlById] = React.useState<Record<number, string>>({});
  const [albumImages, setAlbumImages] = React.useState<UserImageWithVariants[]>([]);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saved' | 'error'>('idle');
  const [zoom, setZoom] = React.useState(1);
  const [showImageLibrary, setShowImageLibrary] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = React.useState(false);
  const [rightTab, setRightTab] = React.useState<'template' | 'image' | 'text' | 'page'>('template');
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; elIdx: number } | null>(null);
  const clipboardRef = React.useRef<GeneratedPageElement | null>(null);

  /* ── load album + flipbook from API (localStorage as offline cache only) ── */
  const loadAlbumAndFlipbook = React.useCallback(async () => {
    if (!Number.isFinite(albumId) || albumId <= 0) { setError('Invalid album'); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [albumRes, imagesRes] = await Promise.all([
        api.get(`/api/albums/${albumId}`),
        api.get(`/api/albums/${albumId}/images`, {
          params: {
            size: 200,
            variantDetail: 'full',
            connection: getConnectionHint(),
            saveData: getSaveData(),
          },
        }),
      ]);
      const album = albumRes.data;
      const titleFromAlbum = album?.name ?? 'Album';
      setAlbumTitle(titleFromAlbum);
      const raw = imagesRes.data?.images ?? imagesRes.data?.content ?? (Array.isArray(imagesRes.data) ? imagesRes.data : []);
      const imgs = (Array.isArray(raw) ? raw : []).map((img: Record<string, unknown>) => mapAlbumImage(img));
      const urlMap: Record<number, string> = {};
      const thumbMap: Record<number, string> = {};
      imgs.forEach((i) => {
        const id = Number(i.id);
        urlMap[id] = canvasImageUrl(i);
        thumbMap[id] = thumbImageUrl(i);
      });
      setImageUrlById(urlMap);
      setThumbUrlById(thumbMap);
      setAlbumImages(imgs);

      const imageMetas = imgs.map((i) => ({
        id: Number(i.id),
        imageUrl: canvasImageUrl(i),
        thumbnailUrl: thumbImageUrl(i),
        width: undefined as number | undefined,
        height: undefined as number | undefined,
      }));

      let loadedFromApi = false;
      try {
        const list = await listFlipbooksByAlbum(albumId);
        const latest = list[0];
        if (latest?.id != null) {
          const full = await getFlipbook(latest.id);
          setFlipbookId(full.id);
          if (full.title) setAlbumTitle(full.title);
          if (full.eventType) setEventType(full.eventType as EventType);
          if (full.theme) setTheme(full.theme as ThemeId);
          const apiPages = dtoToGeneratedPages(full.pages ?? []);
          if (apiPages.length > 0) {
            setPages(apiPages);
            loadedFromApi = true;
          }
        }
      } catch (apiErr) {
        console.warn('Flipbook API load failed, falling back to local draft', apiErr);
      }

      if (!loadedFromApi) {
        const stored = loadFlipbookFromStorage(albumId);
        if (stored?.pages?.length) {
          setFlipbookId(null);
          setEventType(stored.eventType);
          setTheme(stored.theme);
          setPages(stored.pages);
          setAlbumTitle(stored.title || titleFromAlbum);
        } else {
          const draft = previewGenerateFromAlbumImages(
            albumId,
            titleFromAlbum,
            'wedding',
            imageMetas
          );
          setFlipbookId(null);
          setPages(draft.pages);
          setEventType(draft.eventType);
          setTheme(draft.theme);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load album');
    } finally { setLoading(false); }
  }, [albumId]);

  React.useEffect(() => { void loadAlbumAndFlipbook(); }, [loadAlbumAndFlipbook]);

  /* ── save to API (+ local cache) ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      let id = flipbookId;
      if (id == null) {
        const created = await createFlipbookFromAlbum({
          albumId,
          title: albumTitle,
          eventType,
          theme,
          pages,
        });
        id = created.id;
        setFlipbookId(id);
      } else {
        await saveFlipbookAll(id, {
          title: albumTitle,
          eventType,
          theme,
          pages,
        });
      }
      saveFlipbookToStorage({
        albumId,
        title: albumTitle,
        eventType,
        theme,
        pages,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Flipbook save failed:', err);
      // Keep a local draft so work is not lost if API is down
      try {
        saveFlipbookToStorage({
          albumId,
          title: albumTitle,
          eventType,
          theme,
          pages,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  /* ── PDF export ── */
  const handleDownloadPdf = async () => {
    setExporting(true);
    try {
      await exportPagesToPdf(pages, imageUrlById, theme, albumTitle.replace(/\s+/g, '-').toLowerCase());
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally { setExporting(false); }
  };

  /* ── element mutation ── */
  const updateElement = (pageIdx: number, elIdx: number, patch: Partial<GeneratedPageElement>) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== pageIdx) return p;
      return { ...p, elements: p.elements.map((el, j) => j === elIdx ? { ...el, ...patch } : el) };
    }));
  };
  const handleCanvasElementChange = (elIdx: number, patch: Partial<GeneratedPageElement>) => {
    updateElement(currentPage, elIdx, patch);
  };

  const removeElement = (pageIdx: number, elIdx: number) => {
    setPages((prev) =>
      prev.map((p, i) =>
        i !== pageIdx ? p : { ...p, elements: p.elements.filter((_, j) => j !== elIdx) }
      )
    );
    setSelectedElement(null);
  };

  const duplicateElementAt = (pageIdx: number, elIdx: number) => {
    let newIdx = elIdx;
    setPages((prev) =>
      prev.map((p, i) => {
        if (i !== pageIdx) return p;
        const el = p.elements[elIdx];
        if (!el) return p;
        const dup: GeneratedPageElement = {
          ...el,
          x: Math.min(el.x + 2, Math.max(0, 98 - el.width)),
          y: Math.min(el.y + 2, Math.max(0, 98 - el.height)),
          zIndex: (el.zIndex ?? 1) + 1,
        };
        const elements = [...p.elements];
        elements.splice(elIdx + 1, 0, dup);
        newIdx = elIdx + 1;
        return { ...p, elements };
      })
    );
    setSelectedElement(newIdx);
  };

  const layerElement = (pageIdx: number, elIdx: number, dir: 'up' | 'down') => {
    const pg = pages[pageIdx];
    const el = pg?.elements[elIdx];
    if (!el) return;
    const zValues = pg.elements.map((e) => e.zIndex ?? 0);
    const maxZ = Math.max(...zValues, 0);
    const minZ = Math.min(...zValues, 0);
    updateElement(pageIdx, elIdx, {
      zIndex: dir === 'up' ? maxZ + 1 : Math.max(0, minZ - 1),
    });
  };

  const handleElementContextAction = (action: FlipbookContextAction) => {
    if (contextMenu == null) return;
    const elIdx = contextMenu.elIdx;
    const el = pages[currentPage]?.elements[elIdx];
    if (!el) return;

    switch (action) {
      case 'cut':
        clipboardRef.current = { ...el };
        removeElement(currentPage, elIdx);
        break;
      case 'copy':
        clipboardRef.current = { ...el };
        break;
      case 'duplicate':
        duplicateElementAt(currentPage, elIdx);
        break;
      case 'delete':
        removeElement(currentPage, elIdx);
        break;
      case 'reset-crop':
        updateElement(currentPage, elIdx, {
          cropX: 50,
          cropY: 50,
          fitMode: 'cover',
          styleJson: { ...el.styleJson, imageZoom: 1 },
        });
        break;
      case 'swap-image':
        setSelectedElement(elIdx);
        setRightTab('image');
        setShowImageLibrary(true);
        break;
      case 'bring-forward':
        layerElement(currentPage, elIdx, 'up');
        break;
      case 'send-backward':
        layerElement(currentPage, elIdx, 'down');
        break;
      case 'fit-cover':
        updateElement(currentPage, elIdx, { fitMode: 'cover' });
        break;
      case 'fit-contain':
        updateElement(currentPage, elIdx, { fitMode: 'contain' });
        break;
      case 'edit-text':
        setSelectedElement(elIdx);
        setRightTab('text');
        break;
      default:
        if (typeof action === 'object' && action.type === 'shape') {
          updateElement(currentPage, elIdx, { frameType: action.frameType });
        } else if (typeof action === 'object' && action.type === 'text-font') {
          updateElement(currentPage, elIdx, {
            styleJson: { ...el.styleJson, fontFamily: action.fontFamily },
          });
        } else if (typeof action === 'object' && action.type === 'text-size') {
          updateElement(currentPage, elIdx, {
            styleJson: { ...el.styleJson, fontSizePx: action.fontSizePx },
          });
        } else if (typeof action === 'object' && action.type === 'text-color') {
          updateElement(currentPage, elIdx, {
            styleJson: { ...el.styleJson, color: action.color },
          });
        } else if (typeof action === 'object' && action.type === 'text-align') {
          updateElement(currentPage, elIdx, {
            styleJson: { ...el.styleJson, align: action.align },
          });
        } else if (typeof action === 'object' && action.type === 'box-size') {
          updateElement(currentPage, elIdx, {
            width: action.width,
            height: action.height,
          });
        } else if (typeof action === 'object' && action.type === 'inner-zoom') {
          updateElement(currentPage, elIdx, {
            styleJson: { ...el.styleJson, imageZoom: action.zoom },
          });
        }
        break;
    }
  };

  const handleElementContextLivePatch = (patch: FlipbookLivePatch) => {
    if (contextMenu == null) return;
    const elIdx = contextMenu.elIdx;
    const el = pages[currentPage]?.elements[elIdx];
    if (!el) return;
    updateElement(currentPage, elIdx, {
      ...(patch.width != null ? { width: patch.width } : {}),
      ...(patch.height != null ? { height: patch.height } : {}),
      ...(patch.styleJson
        ? { styleJson: { ...el.styleJson, ...patch.styleJson } }
        : {}),
    });
  };

  const handleElementContextMenu = (elIdx: number, event: React.MouseEvent) => {
    setSelectedElement(elIdx);
    setContextMenu({ x: event.clientX, y: event.clientY, elIdx });
  };

  /* ── image swap ── */
  const handleImageSwap = (imageId: number) => {
    if (selectedElement === null) return;
    const el = pages[currentPage].elements[selectedElement];
    if (el?.elementType === 'image') updateElement(currentPage, selectedElement, { albumImageId: imageId });
    setShowImageLibrary(false);
  };

  /* ── text editing ── */
  const handleTextDoubleClick = (elIdx: number) => {
    const el = pages[currentPage].elements[elIdx];
    if (el?.elementType !== 'text') return;
    setSelectedElement(elIdx);
    setRightTab('text');
  };

  const makeTextCtx = (pg: GeneratedPage, pageIdx: number): TextContext => ({
    albumTitle,
    pageNumber: pageIdx + 1,
    pageType: pg.pageType,
    eventType,
  });

  /* ── text management ── */
  const handleAddText = () => {
    const pg = pages[currentPage];
    if (!pg) return;
    const textCount = pg.elements.filter(e => e.elementType === 'text').length;
    const newEl = createFreeTextElement(
      getTheme(theme),
      makeTextCtx(pg, currentPage),
      textCount
    );
    let newIdx = 0;
    setPages(prev => prev.map((p, i) => {
      if (i !== currentPage) return p;
      newIdx = p.elements.length;
      return { ...p, elements: [...p.elements, newEl] };
    }));
    setSelectedElement(newIdx);
    setRightTab('text');
  };

  const handleAutoFillText = () => {
    setPages(prev => prev.map((p, i) => {
      if (i !== currentPage) return p;
      return autoFillPageText(p, makeTextCtx(p, i), getTheme(theme));
    }));
  };

  /* ── page management ── */
  const handleAddPageWithLayout = (layoutType: LayoutType) => {
    const tmpl = getTemplate(layoutType);
    const blank: GeneratedPage = {
      pageNumber: pages.length + 1, pageType: tmpl.pageType, layoutType,
      backgroundType: tmpl.background.type, backgroundValue: tmpl.background.value,
      themeVariant: theme, elements: [],
    };
    const newPage = applyLayoutToPage(blank, layoutType, albumImages, theme, makeTextCtx(blank, pages.length));
    setPages(prev => [...prev, newPage]);
    setCurrentPage(pages.length);
    setShowLayoutPicker(false);
    setSelectedElement(null);
  };

  const handleDuplicatePage = () => {
    const src = pages[currentPage];
    if (!src) return;
    const dup: GeneratedPage = { ...src, pageNumber: pages.length + 1, elements: src.elements.map(e => ({ ...e })) };
    setPages(prev => [...prev, dup]);
    setCurrentPage(pages.length);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== currentPage).map((p, i) => ({ ...p, pageNumber: i + 1 })));
    setCurrentPage(prev => Math.min(prev, pages.length - 2));
    setSelectedElement(null);
  };

  const handleMovePage = (dir: -1 | 1) => {
    const newIdx = currentPage + dir;
    if (newIdx < 0 || newIdx >= pages.length) return;
    setPages(prev => {
      const arr = [...prev];
      [arr[currentPage], arr[newIdx]] = [arr[newIdx], arr[currentPage]];
      return arr.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    });
    setCurrentPage(newIdx);
  };

  /* ── apply layout to current page ── */
  const handleLayoutChange = (layoutType: LayoutType) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== currentPage) return p;
      return applyLayoutToPage(p, layoutType, albumImages, theme, makeTextCtx(p, i));
    }));
    setSelectedElement(null);
  };

  const handleRegenerate = () => {
    if (!window.confirm('Regenerate all pages? Customizations will be lost.')) return;
    const imgs = albumImages.map(i => ({ id: Number(i.id), imageUrl: canvasImageUrl(i), thumbnailUrl: thumbImageUrl(i) }));
    const draft = previewGenerateFromAlbumImages(albumId, albumTitle, eventType, imgs, { theme });
    setPages(draft.pages);
    setCurrentPage(0);
    setSelectedElement(null);
  };

  /* ── derived ── */
  const page = pages[currentPage];
  const selectedEl = selectedElement !== null ? page?.elements[selectedElement] : null;

  /* ── render ── */
  if (loading) return (
    <div className="studio-flipbook-loading"><FaSpinner className="animate-spin" size={32} /><p>Loading studio flipbook…</p></div>
  );
  if (error) return (
    <div className="studio-flipbook-error"><p>{error}</p><button type="button" onClick={() => navigate('/studio/albums')}>Back to Albums</button></div>
  );

  return (
    <div className="studio-flipbook-builder">
      {/* ── top bar ── */}
      <header className="studio-flipbook-topbar" style={{ height: BUILDER_LAYOUT.topBarHeight }}>
        <button type="button" className="studio-flipbook-back" onClick={() => navigate('/studio/albums')}>
          <FaArrowLeft /> Back
        </button>
        <h1 className="studio-flipbook-title">{albumTitle}</h1>
        <div className="studio-flipbook-topbar-actions">
          <span className="studio-flipbook-save-status">
            {saveStatus === 'saved'
              ? '✓ Saved'
              : saveStatus === 'error'
                ? '✗ Save failed (kept local draft)'
                : flipbookId
                  ? `Ready · #${flipbookId}`
                  : 'Ready · unsaved'}
          </span>
          <button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Save
          </button>
          <button type="button" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>+</button>
          <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>−</button>
          <button type="button" onClick={() => setShowPreview(true)}><FaEye /> Flipbook</button>
          <button type="button" onClick={() => void handleDownloadPdf()} disabled={exporting}>
            {exporting ? <FaSpinner className="animate-spin" /> : <FaDownload />} PDF
          </button>
        </div>
      </header>

      <div className="studio-flipbook-body">
        {/* ── left: page thumbnails ── */}
        <aside className="studio-flipbook-left" style={{ width: BUILDER_LAYOUT.leftPanelWidth }}>
          <div className="studio-flipbook-panel-header">
            Pages
            <button type="button" className="studio-flipbook-icon-btn" onClick={() => setShowLayoutPicker(true)} title="Add page with layout"><FaPlus /></button>
          </div>
          <div className="studio-flipbook-thumbnails">
            {pages.map((p, i) => (
              <div key={p.pageNumber} className={`studio-flipbook-thumb-wrapper ${i === currentPage ? 'selected' : ''}`}>
                <button type="button" className="studio-flipbook-thumb" onClick={() => { setCurrentPage(i); setSelectedElement(null); }}>
                  <StudioFlipbookPageCanvas page={p} imageUrlById={imageUrlById} themeId={theme}
                    selectedIndex={null} onSelect={() => {}} onElementChange={() => {}} />
                  <span className="studio-flipbook-thumb-label">
                    {p.pageType === 'cover' ? 'Cover' : p.pageType === 'closing' ? 'End' : i + 1}
                  </span>
                </button>
                <div className="studio-flipbook-thumb-actions">
                  <button type="button" onClick={() => handleMovePage(-1)} disabled={i === 0} title="Move up"><FaArrowUp /></button>
                  <button type="button" onClick={() => handleMovePage(1)} disabled={i === pages.length - 1} title="Move down"><FaArrowDown /></button>
                  <button type="button" onClick={handleDuplicatePage} title="Duplicate"><FaCopy /></button>
                  <button type="button" onClick={handleDeletePage} disabled={pages.length <= 1} title="Delete"><FaTrash /></button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── center: canvas ── */}
        <main className="studio-flipbook-center">
          <div className="studio-flipbook-canvas-wrap">
            <button type="button" className="studio-flipbook-nav" disabled={currentPage <= 0} onClick={() => { setCurrentPage(p => p - 1); setSelectedElement(null); }}>
              <FaChevronLeft />
            </button>
            <div className="studio-flipbook-canvas" style={{ transform: `scale(${zoom})` }}>
              {page && (
                <StudioFlipbookPageCanvas page={page} imageUrlById={imageUrlById} themeId={theme}
                  interactive fillParent selectedIndex={selectedElement} onSelect={setSelectedElement}
                  onElementChange={handleCanvasElementChange} onTextDoubleClick={handleTextDoubleClick}
                  onElementContextMenu={handleElementContextMenu}
                />
              )}
            </div>
            <button type="button" className="studio-flipbook-nav" disabled={currentPage >= pages.length - 1} onClick={() => { setCurrentPage(p => p + 1); setSelectedElement(null); }}>
              <FaChevronRight />
            </button>
          </div>
          <p className="studio-flipbook-page-indicator">
            Page {currentPage + 1} of {pages.length} · Right-click box for options · Drag edges to move · Center drag crops
          </p>
        </main>

        {/* ── right: properties panel ── */}
        <aside className="studio-flipbook-right" style={{ width: BUILDER_LAYOUT.rightPanelWidth }}>
          <div className="studio-flipbook-tabs">
            {(['template', 'image', 'text', 'page'] as const).map(tab => (
              <button key={tab} type="button" className={`studio-flipbook-tab ${rightTab === tab ? 'active' : ''}`} onClick={() => setRightTab(tab)}>
                {tab === 'template' && <><FaLayerGroup /> Template</>}
                {tab === 'image' && <><FaImage /> Image</>}
                {tab === 'text' && <><FaFont /> Text</>}
                {tab === 'page' && <><FaPalette /> Page</>}
              </button>
            ))}
          </div>

          {rightTab === 'template' && (
            <>
              <section className="studio-flipbook-section">
                <h3>Event Type</h3>
                <select value={eventType} onChange={e => setEventType(e.target.value as EventType)}>
                  {EVENT_TYPES.map(et => <option key={et.id} value={et.id}>{et.label}</option>)}
                </select>
              </section>
              <section className="studio-flipbook-section">
                <h3>Theme</h3>
                <select value={theme} onChange={e => setTheme(e.target.value as ThemeId)}>
                  {Object.values(STUDIO_THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </section>
              <section className="studio-flipbook-section">
                <h3>Page Layout</h3>
                <p className="studio-flipbook-hint" style={{ fontSize: 11, marginBottom: 6 }}>Change layout — fills with images & text automatically</p>
                <select value={page?.layoutType ?? ''} onChange={e => handleLayoutChange(e.target.value as LayoutType)}>
                  {ALL_LAYOUT_TYPES.map(id => <option key={id} value={id}>{getTemplate(id).name}</option>)}
                </select>
              </section>
              <section className="studio-flipbook-section">
                <button type="button" className="studio-flipbook-regenerate" onClick={handleRegenerate}>↻ Regenerate All Pages</button>
              </section>
            </>
          )}

          {rightTab === 'image' && (
            <>
              {selectedEl?.elementType === 'image' ? (
                <>
                  <section className="studio-flipbook-section">
                    <h3>Selected Image</h3>
                    <button type="button" className="studio-flipbook-swap-btn" onClick={() => setShowImageLibrary(true)}>
                      <FaRandom /> Swap Image
                    </button>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Frame Style</h3>
                    <select value={selectedEl.frameType ?? 'none'} onChange={e => updateElement(currentPage, selectedElement!, { frameType: e.target.value as FrameType })}>
                      {FRAME_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Size &amp; Position</h3>
                    <label className="studio-flipbook-range-label">Width %</label>
                    <input type="range" min={5} max={100} step={0.5} value={selectedEl.width}
                      onChange={e => updateElement(currentPage, selectedElement!, { width: Number(e.target.value) })} />
                    <span className="studio-flipbook-range-val">{selectedEl.width.toFixed(1)}%</span>
                    <label className="studio-flipbook-range-label">Height %</label>
                    <input type="range" min={5} max={100} step={0.5} value={selectedEl.height}
                      onChange={e => updateElement(currentPage, selectedElement!, { height: Number(e.target.value) })} />
                    <span className="studio-flipbook-range-val">{selectedEl.height.toFixed(1)}%</span>
                    <label className="studio-flipbook-range-label">Left %</label>
                    <input type="range" min={0} max={100 - selectedEl.width} step={0.5} value={selectedEl.x}
                      onChange={e => updateElement(currentPage, selectedElement!, { x: Number(e.target.value) })} />
                    <span className="studio-flipbook-range-val">{selectedEl.x.toFixed(1)}%</span>
                    <label className="studio-flipbook-range-label">Top %</label>
                    <input type="range" min={0} max={100 - selectedEl.height} step={0.5} value={selectedEl.y}
                      onChange={e => updateElement(currentPage, selectedElement!, { y: Number(e.target.value) })} />
                    <span className="studio-flipbook-range-val">{selectedEl.y.toFixed(1)}%</span>
                    <label className="studio-flipbook-range-label">Rotation</label>
                    <input type="range" min={-180} max={180} step={1} value={selectedEl.rotation ?? 0}
                      onChange={e => updateElement(currentPage, selectedElement!, { rotation: Number(e.target.value) })} />
                    <span className="studio-flipbook-range-val">{selectedEl.rotation ?? 0}°</span>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Fit Mode</h3>
                    <p className="studio-flipbook-hint" style={{ marginBottom: 6 }}>
                      Cover = fills frame (may crop) · Contain = full image visible · Fill = stretch
                    </p>
                    <select value={selectedEl.fitMode ?? 'cover'} onChange={e => updateElement(currentPage, selectedElement!, { fitMode: e.target.value as FitMode })}>
                      {FIT_MODES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Image Position (inside frame)</h3>
                    <p className="studio-flipbook-hint" style={{ marginBottom: 6 }}>
                      Drag center to crop · drag edges/top bar to move frame · hold Space to move anywhere
                    </p>
                    <label className="studio-flipbook-range-label">Horizontal</label>
                    <input type="range" min={0} max={100} step={1} value={selectedEl.cropX ?? 50}
                      onChange={e => updateElement(currentPage, selectedElement!, { cropX: Number(e.target.value) })} />
                    <span className="studio-flipbook-range-val">{selectedEl.cropX ?? 50}%</span>
                    <label className="studio-flipbook-range-label">Vertical</label>
                    <input type="range" min={0} max={100} step={1} value={selectedEl.cropY ?? 50}
                      onChange={e => updateElement(currentPage, selectedElement!, { cropY: Number(e.target.value) })} />
                    <span className="studio-flipbook-range-val">{selectedEl.cropY ?? 50}%</span>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Zoom Inside Frame</h3>
                    <input type="range" min={1} max={2.5} step={0.05}
                      value={(selectedEl.styleJson?.imageZoom as number) ?? 1}
                      onChange={e => updateElement(currentPage, selectedElement!, {
                        styleJson: { ...selectedEl.styleJson, imageZoom: Number(e.target.value) },
                      })} />
                    <span className="studio-flipbook-range-val">{Math.round(((selectedEl.styleJson?.imageZoom as number) ?? 1) * 100)}%</span>
                    <button type="button" className="studio-flipbook-reset-btn"
                      onClick={() => updateElement(currentPage, selectedElement!, {
                        cropX: 50, cropY: 50, fitMode: 'cover',
                        styleJson: { ...selectedEl.styleJson, imageZoom: 1 },
                      })}>
                      Reset image position
                    </button>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Opacity</h3>
                    <input type="range" min={0} max={1} step={0.05} value={selectedEl.opacity ?? 1}
                      onChange={e => updateElement(currentPage, selectedElement!, { opacity: Number(e.target.value) })} />
                  </section>
                </>
              ) : (
                <section className="studio-flipbook-section"><p className="studio-flipbook-hint">Select an image on the canvas, or click a slot below:</p></section>
              )}
              <section className="studio-flipbook-section">
                <h3>Image Slots</h3>
                <div className="studio-flipbook-slot-list">
                  {page?.elements.filter(el => el.elementType === 'image').map((el, idx) => {
                    const realIdx = page.elements.indexOf(el);
                    return (
                      <button key={idx} type="button" className={`studio-flipbook-slot-btn ${selectedElement === realIdx ? 'selected' : ''}`}
                        onClick={() => { setSelectedElement(realIdx); setRightTab('image'); }}>
                        {el.albumImageId && (thumbUrlById[el.albumImageId] || imageUrlById[el.albumImageId]) ? (
                          <img src={thumbUrlById[el.albumImageId] || imageUrlById[el.albumImageId]} alt="" loading="lazy" decoding="async" />
                        ) : <span className="studio-flipbook-slot-empty">Empty</span>}
                        <span className="studio-flipbook-slot-label">{(el.styleJson?.role as string) ?? 'image'}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {rightTab === 'text' && (
            <>
              <section className="studio-flipbook-section">
                <h3>Text on Page</h3>
                <div className="studio-flipbook-page-actions">
                  <button type="button" onClick={handleAddText}><FaPlus /> Add Text</button>
                  <button type="button" onClick={handleAutoFillText}>↻ Auto-fill Text Slots</button>
                </div>
              </section>
              <section className="studio-flipbook-section">
                <h3>Text Elements</h3>
                <div className="studio-flipbook-slot-list">
                  {page?.elements.filter(el => el.elementType === 'text').map((el, idx) => {
                    const realIdx = page.elements.indexOf(el);
                    return (
                      <button key={idx} type="button" className={`studio-flipbook-slot-btn ${selectedElement === realIdx ? 'selected' : ''}`}
                        onClick={() => { setSelectedElement(realIdx); setRightTab('text'); }}>
                        <span className="studio-flipbook-text-slot-preview" style={{ color: (el.styleJson?.color as string) ?? '#374151' }}>
                          {(el.content || 'Empty text').slice(0, 40)}
                        </span>
                        <span className="studio-flipbook-slot-label">{(el.styleJson?.role as string) ?? 'text'}</span>
                      </button>
                    );
                  })}
                  {!page?.elements.some(e => e.elementType === 'text') && (
                    <p className="studio-flipbook-hint">No text yet — click Add Text or Auto-fill.</p>
                  )}
                </div>
              </section>
              {selectedEl?.elementType === 'text' ? (
                <>
                  <section className="studio-flipbook-section">
                    <h3>Text Content</h3>
                    <textarea className="studio-flipbook-textarea" rows={3} value={selectedEl.content ?? ''}
                      onChange={e => updateElement(currentPage, selectedElement!, { content: e.target.value })} />
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Font Family</h3>
                    <select value={(selectedEl.styleJson?.fontFamily as string) ?? ''}
                      onChange={e => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, fontFamily: e.target.value } })}>
                      {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Font Size</h3>
                    <input type="range" min={12} max={96} step={1} value={(selectedEl.styleJson?.fontSizePx as number) ?? 32}
                      onChange={e => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, fontSizePx: Number(e.target.value) } })} />
                    <span className="studio-flipbook-range-val">{(selectedEl.styleJson?.fontSizePx as number) ?? 32}px</span>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Color</h3>
                    <input type="color" value={(selectedEl.styleJson?.color as string) ?? '#ffffff'}
                      onChange={e => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, color: e.target.value } })} />
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Alignment</h3>
                    <div className="studio-flipbook-align-btns">
                      {(['left', 'center', 'right'] as const).map(a => (
                        <button key={a} type="button" className={selectedEl.styleJson?.align === a ? 'active' : ''}
                          onClick={() => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, align: a } })}>{a}</button>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <section className="studio-flipbook-section"><p className="studio-flipbook-hint">Select a text block on the canvas or list above to edit.</p></section>
              )}
            </>
          )}

          {rightTab === 'page' && (
            <>
              <section className="studio-flipbook-section">
                <h3>Page Type</h3>
                <select value={page?.pageType ?? 'inner'}
                  onChange={e => setPages(prev => prev.map((p, i) => i === currentPage ? { ...p, pageType: e.target.value as GeneratedPage['pageType'] } : p))}>
                  <option value="cover">Cover</option><option value="inner">Inner</option><option value="closing">Closing</option>
                </select>
              </section>
              <section className="studio-flipbook-section">
                <h3>Background</h3>
                <input type="color" value={page?.backgroundValue ?? getTheme(theme).backgroundColor}
                  onChange={e => setPages(prev => prev.map((p, i) => i === currentPage ? { ...p, backgroundValue: e.target.value } : p))} />
              </section>
              <section className="studio-flipbook-section">
                <h3>Actions</h3>
                <div className="studio-flipbook-page-actions">
                  <button type="button" onClick={() => setShowLayoutPicker(true)}><FaPlus /> Add Page with Layout</button>
                  <button type="button" onClick={handleDuplicatePage}><FaCopy /> Duplicate</button>
                  <button type="button" onClick={handleDeletePage} disabled={pages.length <= 1}><FaTrash /> Delete</button>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>

      <ChooseImageModal
        open={showImageLibrary}
        albumId={albumId}
        images={albumImages}
        onClose={() => setShowImageLibrary(false)}
        onSelect={handleImageSwap}
      />

      <FlipbookElementContextMenu
        open={contextMenu != null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        elementType={
          contextMenu != null ? pages[currentPage]?.elements[contextMenu.elIdx]?.elementType : undefined
        }
        currentFrameType={
          contextMenu != null
            ? pages[currentPage]?.elements[contextMenu.elIdx]?.frameType
            : undefined
        }
        currentTextStyle={
          contextMenu != null
            ? (() => {
                const el = pages[currentPage]?.elements[contextMenu.elIdx];
                if (el?.elementType !== 'text') return undefined;
                return {
                  fontFamily: el.styleJson?.fontFamily as string | undefined,
                  fontSizePx: el.styleJson?.fontSizePx as number | undefined,
                  color: el.styleJson?.color as string | undefined,
                  align: el.styleJson?.align as string | undefined,
                };
              })()
            : undefined
        }
        currentBoxSize={
          contextMenu != null
            ? (() => {
                const el = pages[currentPage]?.elements[contextMenu.elIdx];
                if (!el || (el.elementType !== 'image' && el.elementType !== 'text')) {
                  return undefined;
                }
                return {
                  width: el.width,
                  height: el.height,
                  imageZoom:
                    el.elementType === 'image'
                      ? ((el.styleJson?.imageZoom as number) ?? 1)
                      : undefined,
                };
              })()
            : undefined
        }
        onAction={handleElementContextAction}
        onLivePatch={handleElementContextLivePatch}
        onClose={() => setContextMenu(null)}
      />

      {/* ── layout picker modal ── */}
      <LayoutPickerModal
        open={showLayoutPicker}
        onClose={() => setShowLayoutPicker(false)}
        onSelect={handleAddPageWithLayout}
        eventType={eventType}
      />

      {/* ── 3D flipbook preview ── */}
      {showPreview && (
        <StudioFlipbookPreview
          pages={pages}
          imageUrlById={imageUrlById}
          themeId={theme}
          albumTitle={albumTitle}
          onClose={() => setShowPreview(false)}
          onDownloadPdf={() => { setShowPreview(false); void handleDownloadPdf(); }}
        />
      )}
    </div>
  );
};

export default StudioFlipbookBuilderPage;
