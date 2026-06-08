import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FaArrowLeft, FaChevronLeft, FaChevronRight, FaEye, FaSave, FaSpinner,
  FaPlus, FaTrash, FaCopy, FaArrowUp, FaArrowDown, FaRandom,
  FaFont, FaPalette, FaImage, FaLayerGroup,
} from 'react-icons/fa';
import api from '../../../api/client/axiosInstance';
import { getStoredToken } from '../../../utils/authUtils';
import StudioFlipbookPageCanvas from './StudioFlipbookPageCanvas';
import {
  createFlipbookFromAlbum, dtoToGeneratedPages, getFlipbook,
  previewGenerateFromAlbumImages, publishFlipbook, saveFlipbookPages,
} from '../api/flipbookService';
import { STUDIO_THEMES, getTheme } from '../themes';
import { ALL_LAYOUT_TYPES, getTemplate } from '../templates';
import type { EventType, FitMode, FrameType, GeneratedPage, GeneratedPageElement, ThemeId } from '../types';
import { BUILDER_LAYOUT } from '../constants/canvas';
import '../studio-flipbook.css';

/* ─── helpers ─── */
function buildPreviewUrl(imageId: number): string {
  const base = (process.env.REACT_APP_API_URL || api.defaults.baseURL || window.location.origin)
    .toString().replace(/\/+$/, '');
  const token = getStoredToken();
  return token ? `${base}/api/images/${imageId}/preview?token=${encodeURIComponent(token)}` : `${base}/api/images/${imageId}/preview`;
}

const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: 'wedding', label: 'Wedding' }, { id: 'engagement', label: 'Engagement' },
  { id: 'anniversary', label: 'Anniversary' }, { id: 'birthday', label: 'Birthday' },
  { id: 'party', label: 'Party' }, { id: 'reception', label: 'Reception' },
  { id: 'baby_shower', label: 'Baby Shower' }, { id: 'family', label: 'Family' },
  { id: 'corporate', label: 'Corporate' }, { id: 'general', label: 'General' },
];

const FRAME_TYPES: { id: FrameType; label: string }[] = [
  { id: 'none', label: 'None' }, { id: 'rectangle', label: 'Rectangle' },
  { id: 'rounded', label: 'Rounded' }, { id: 'circle', label: 'Circle' },
  { id: 'oval', label: 'Oval' }, { id: 'polaroid', label: 'Polaroid' },
  { id: 'border', label: 'Border' }, { id: 'golden', label: 'Golden' },
  { id: 'soft_shadow', label: 'Soft Shadow' }, { id: 'full_bleed', label: 'Full Bleed' },
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

/* ─── component ─── */
const StudioFlipbookBuilderPage: React.FC = () => {
  const { albumId: albumIdParam } = useParams<{ albumId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const albumId = Number(albumIdParam);
  const flipbookIdParam = searchParams.get('flipbookId');

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = React.useState('');
  const [flipbookId, setFlipbookId] = React.useState<number | null>(flipbookIdParam ? Number(flipbookIdParam) : null);
  const [pages, setPages] = React.useState<GeneratedPage[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [selectedElement, setSelectedElement] = React.useState<number | null>(null);
  const [eventType, setEventType] = React.useState<EventType>('wedding');
  const [theme, setTheme] = React.useState<ThemeId>('wedding_modern');
  const [imageUrlById, setImageUrlById] = React.useState<Record<number, string>>({});
  const [allImages, setAllImages] = React.useState<Array<{ id: number; url: string }>>([]);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saved' | 'error'>('idle');
  const [zoom, setZoom] = React.useState(1);
  const [showImageLibrary, setShowImageLibrary] = React.useState(false);
  const [libraryTargetSlot, setLibraryTargetSlot] = React.useState<number | null>(null);
  const [rightTab, setRightTab] = React.useState<'template' | 'image' | 'text' | 'page'>('template');

  /* ── load ── */
  const loadAlbumAndFlipbook = React.useCallback(async () => {
    if (!Number.isFinite(albumId) || albumId <= 0) { setError('Invalid album'); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [albumRes, imagesRes] = await Promise.all([
        api.get(`/api/albums/${albumId}`),
        api.get(`/api/albums/${albumId}/images`, { params: { size: 200 } }),
      ]);
      const album = albumRes.data;
      setAlbumTitle(album?.name ?? 'Album');
      const raw = imagesRes.data?.images ?? imagesRes.data?.content ?? (Array.isArray(imagesRes.data) ? imagesRes.data : []);
      const imgs = (Array.isArray(raw) ? raw : []).map((img: Record<string, unknown>) => ({
        id: Number(img.id),
        url: String(img.previewUrl ?? img.url ?? img.imageUrl ?? ''),
        thumb: String(img.thumbnailUrl ?? img.previewUrl ?? ''),
        width: Number(img.width) || undefined,
        height: Number(img.height) || undefined,
        sortOrder: Number(img.sortOrder) || undefined,
      }));
      const urlMap: Record<number, string> = {};
      imgs.forEach((i: { id: number; url: string; thumb: string }) => { urlMap[i.id] = i.thumb || i.url || buildPreviewUrl(i.id); });
      setImageUrlById(urlMap);
      setAllImages(imgs.map((i: { id: number; url: string }) => ({ id: i.id, url: i.url })));

      if (flipbookId) {
        const fb = await getFlipbook(flipbookId);
        setEventType((fb.eventType as EventType) ?? 'wedding');
        setTheme((fb.theme as ThemeId) ?? 'wedding_modern');
        setPages(dtoToGeneratedPages(fb.pages ?? []));
      } else {
        const draft = previewGenerateFromAlbumImages(albumId, album?.name ?? 'Studio Album', 'wedding', imgs);
        setPages(draft.pages);
        setEventType(draft.eventType);
        setTheme(draft.theme);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load album');
    } finally { setLoading(false); }
  }, [albumId, flipbookId]);

  React.useEffect(() => { void loadAlbumAndFlipbook(); }, [loadAlbumAndFlipbook]);

  /* ── save / publish ── */
  const handleSave = async () => {
    setSaving(true); setSaveStatus('idle');
    try {
      let id = flipbookId;
      if (!id) {
        const created = await createFlipbookFromAlbum({ albumId, title: albumTitle, eventType, theme });
        id = created.id; setFlipbookId(id);
      }
      await saveFlipbookPages(id!, pages);
      setSaveStatus('saved');
    } catch { setSaveStatus('error'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => { await handleSave(); if (flipbookId) await publishFlipbook(flipbookId); };

  /* ── element mutation ── */
  const updateElement = (pageIdx: number, elIdx: number, patch: Partial<GeneratedPageElement>) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== pageIdx) return p;
      const elements = p.elements.map((el, j) => j === elIdx ? { ...el, ...patch } : el);
      return { ...p, elements };
    }));
  };

  const handleCanvasElementChange = (elIdx: number, patch: Partial<GeneratedPageElement>) => {
    updateElement(currentPage, elIdx, patch);
  };

  /* ── image swap ── */
  const handleImageSwap = (imageId: number) => {
    if (selectedElement === null) return;
    const el = pages[currentPage].elements[selectedElement];
    if (el?.elementType === 'image') {
      updateElement(currentPage, selectedElement, { albumImageId: imageId });
    }
    setShowImageLibrary(false);
  };

  /* ── open library for a slot ── */
  const handleOpenLibrary = (elIdx: number) => {
    setLibraryTargetSlot(elIdx);
    setShowImageLibrary(true);
    setSelectedElement(elIdx);
  };

  /* ── text editing ── */
  const handleTextDoubleClick = (elIdx: number) => {
    const el = pages[currentPage].elements[elIdx];
    if (el?.elementType !== 'text') return;
    setSelectedElement(elIdx);
    setRightTab('text');
  };

  /* ── page management ── */
  const handleAddPage = () => {
    const newPage: GeneratedPage = {
      pageNumber: pages.length + 1,
      pageType: 'inner',
      layoutType: 'three_image_collage',
      backgroundType: 'solid',
      backgroundValue: getTheme(theme).backgroundColor,
      themeVariant: theme,
      elements: [],
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPage(pages.length);
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

  const handleLayoutChange = (layoutType: GeneratedPage['layoutType']) => {
    setPages(prev => prev.map((p, i) => i === currentPage ? { ...p, layoutType } : p));
  };

  const handleRegenerate = () => {
    if (!window.confirm('Regenerate all pages? Customizations will be lost.')) return;
    const imgs = allImages.map(i => ({ id: i.id, imageUrl: i.url }));
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
    <div className="studio-flipbook-loading">
      <FaSpinner className="animate-spin" size={32} /><p>Loading studio flipbook…</p>
    </div>
  );

  if (error) return (
    <div className="studio-flipbook-error">
      <p>{error}</p>
      <button type="button" onClick={() => navigate('/studio/albums')}>Back to Albums</button>
    </div>
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
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Save failed' : 'Ready'}
          </span>
          <button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Save
          </button>
          <button type="button" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>+</button>
          <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>−</button>
          <button type="button"><FaEye /> Preview</button>
          <button type="button" className="studio-flipbook-publish" onClick={() => void handlePublish()}>Publish</button>
        </div>
      </header>

      <div className="studio-flipbook-body">
        {/* ── left: page thumbnails ── */}
        <aside className="studio-flipbook-left" style={{ width: BUILDER_LAYOUT.leftPanelWidth }}>
          <div className="studio-flipbook-panel-header">
            Pages
            <button type="button" className="studio-flipbook-icon-btn" onClick={handleAddPage} title="Add page"><FaPlus /></button>
          </div>
          <div className="studio-flipbook-thumbnails">
            {pages.map((p, i) => (
              <div key={p.pageNumber} className={`studio-flipbook-thumb-wrapper ${i === currentPage ? 'selected' : ''}`}>
                <button type="button" className="studio-flipbook-thumb" onClick={() => { setCurrentPage(i); setSelectedElement(null); }}>
                  <StudioFlipbookPageCanvas
                    page={p}
                    imageUrlById={imageUrlById}
                    themeId={theme}
                    selectedIndex={null}
                    onSelect={() => {}}
                    onElementChange={() => {}}
                  />
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
                <StudioFlipbookPageCanvas
                  page={page}
                  imageUrlById={imageUrlById}
                  themeId={theme}
                  interactive
                  selectedIndex={selectedElement}
                  onSelect={setSelectedElement}
                  onElementChange={handleCanvasElementChange}
                  onTextDoubleClick={handleTextDoubleClick}
                />
              )}
            </div>
            <button type="button" className="studio-flipbook-nav" disabled={currentPage >= pages.length - 1} onClick={() => { setCurrentPage(p => p + 1); setSelectedElement(null); }}>
              <FaChevronRight />
            </button>
          </div>
          <p className="studio-flipbook-page-indicator">Page {currentPage + 1} of {pages.length} · Click element to select · Drag to move · Corner handle to resize</p>
        </main>

        {/* ── right: properties panel ── */}
        <aside className="studio-flipbook-right" style={{ width: BUILDER_LAYOUT.rightPanelWidth }}>
          {/* tab bar */}
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

          {/* template tab */}
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
                <select value={page?.layoutType ?? ''} onChange={e => handleLayoutChange(e.target.value as GeneratedPage['layoutType'])}>
                  {ALL_LAYOUT_TYPES.map(id => <option key={id} value={id}>{getTemplate(id).name}</option>)}
                </select>
              </section>
              <section className="studio-flipbook-section">
                <button type="button" className="studio-flipbook-regenerate" onClick={handleRegenerate}>↻ Regenerate All Pages</button>
              </section>
            </>
          )}

          {/* image tab */}
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
                    <select
                      value={selectedEl.frameType ?? 'none'}
                      onChange={e => updateElement(currentPage, selectedElement!, { frameType: e.target.value as FrameType })}
                    >
                      {FRAME_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Fit Mode</h3>
                    <select
                      value={selectedEl.fitMode ?? 'cover'}
                      onChange={e => updateElement(currentPage, selectedElement!, { fitMode: e.target.value as FitMode })}
                    >
                      {FIT_MODES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Opacity</h3>
                    <input
                      type="range" min={0} max={1} step={0.05}
                      value={selectedEl.opacity ?? 1}
                      onChange={e => updateElement(currentPage, selectedElement!, { opacity: Number(e.target.value) })}
                    />
                  </section>
                </>
              ) : (
                <section className="studio-flipbook-section"><p className="studio-flipbook-hint">Select an image on the canvas to edit it, or click a slot below:</p></section>
              )}
              {/* quick slot buttons for current page image elements */}
              <section className="studio-flipbook-section">
                <h3>Image Slots on This Page</h3>
                <div className="studio-flipbook-slot-list">
                  {page?.elements.filter(el => el.elementType === 'image').map((el, idx) => {
                    const realIdx = page.elements.indexOf(el);
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`studio-flipbook-slot-btn ${selectedElement === realIdx ? 'selected' : ''}`}
                        onClick={() => { setSelectedElement(realIdx); setRightTab('image'); }}
                      >
                        {el.albumImageId && imageUrlById[el.albumImageId] ? (
                          <img src={imageUrlById[el.albumImageId]} alt="" />
                        ) : (
                          <span className="studio-flipbook-slot-empty">Empty</span>
                        )}
                        <span className="studio-flipbook-slot-label">{(el.styleJson?.role as string) ?? 'image'}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* text tab */}
          {rightTab === 'text' && (
            <>
              {selectedEl?.elementType === 'text' ? (
                <>
                  <section className="studio-flipbook-section">
                    <h3>Text Content</h3>
                    <textarea
                      className="studio-flipbook-textarea"
                      value={selectedEl.content ?? ''}
                      onChange={e => updateElement(currentPage, selectedElement!, { content: e.target.value })}
                      rows={3}
                    />
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Font Family</h3>
                    <select
                      value={(selectedEl.styleJson?.fontFamily as string) ?? ''}
                      onChange={e => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, fontFamily: e.target.value } })}
                    >
                      {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Font Size</h3>
                    <input
                      type="range" min={12} max={96} step={1}
                      value={(selectedEl.styleJson?.fontSizePx as number) ?? 32}
                      onChange={e => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, fontSizePx: Number(e.target.value) } })}
                    />
                    <span className="studio-flipbook-range-val">{(selectedEl.styleJson?.fontSizePx as number) ?? 32}px</span>
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Color</h3>
                    <input
                      type="color"
                      value={(selectedEl.styleJson?.color as string) ?? '#ffffff'}
                      onChange={e => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, color: e.target.value } })}
                    />
                  </section>
                  <section className="studio-flipbook-section">
                    <h3>Alignment</h3>
                    <div className="studio-flipbook-align-btns">
                      {(['left', 'center', 'right'] as const).map(a => (
                        <button key={a} type="button" className={selectedEl.styleJson?.align === a ? 'active' : ''}
                          onClick={() => updateElement(currentPage, selectedElement!, { styleJson: { ...selectedEl.styleJson, align: a } })}
                        >{a}</button>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <section className="studio-flipbook-section"><p className="studio-flipbook-hint">Select a text element on the canvas to edit it.</p></section>
              )}
            </>
          )}

          {/* page tab */}
          {rightTab === 'page' && (
            <>
              <section className="studio-flipbook-section">
                <h3>Page Type</h3>
                <select
                  value={page?.pageType ?? 'inner'}
                  onChange={e => setPages(prev => prev.map((p, i) => i === currentPage ? { ...p, pageType: e.target.value as GeneratedPage['pageType'] } : p))}
                >
                  <option value="cover">Cover</option>
                  <option value="inner">Inner</option>
                  <option value="closing">Closing</option>
                </select>
              </section>
              <section className="studio-flipbook-section">
                <h3>Background</h3>
                <input
                  type="color"
                  value={page?.backgroundValue ?? getTheme(theme).backgroundColor}
                  onChange={e => setPages(prev => prev.map((p, i) => i === currentPage ? { ...p, backgroundValue: e.target.value } : p))}
                />
              </section>
              <section className="studio-flipbook-section">
                <h3>Actions</h3>
                <div className="studio-flipbook-page-actions">
                  <button type="button" onClick={handleAddPage}><FaPlus /> Add Page</button>
                  <button type="button" onClick={handleDuplicatePage}><FaCopy /> Duplicate</button>
                  <button type="button" onClick={handleDeletePage} disabled={pages.length <= 1}><FaTrash /> Delete</button>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>

      {/* ── image library modal ── */}
      {showImageLibrary && (
        <div className="studio-flipbook-modal-overlay" onClick={() => setShowImageLibrary(false)}>
          <div className="studio-flipbook-modal" onClick={e => e.stopPropagation()}>
            <div className="studio-flipbook-modal-header">
              <h3>Choose Image</h3>
              <button type="button" onClick={() => setShowImageLibrary(false)}>✕</button>
            </div>
            <div className="studio-flipbook-modal-grid">
              {allImages.map(img => (
                <button key={img.id} type="button" className="studio-flipbook-modal-thumb" onClick={() => handleImageSwap(img.id)}>
                  <img src={img.url || buildPreviewUrl(img.id)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioFlipbookBuilderPage;
