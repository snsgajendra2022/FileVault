# Photo Theme Album Builder — Spec & Upgrade Plan

## 1. What Is Completed (Current State)

### Core functionality
- **Album flow**: Cover → inner pages → last page; 6–18 pages; template by category (wedding, anniversary, birthday, etc.).
- **Page editor**: Step-by-step editor with current page index, prev/next, keyboard nav (←/→).
- **Layouts**: Single Photo, Two Up, Three Grid, Four Grid, Hero + Two, Cinematic Spread, Collage; per-page layout selection.
- **Images**: Per-page/slot image pick (FileVault + local); crop/position (DraggableCropImage); slot captions for inner pages.
- **Cover/Last**: Editable via separate Cover Editor route; cover/last state synced (effectiveCover, effectiveLast).
- **Save/Load**: Photobook API (create/update photobook, bulk pages, covers); recovery by category; session/local storage for studio album IDs and cover/last.
- **Preview**: Flip book (react-pageflip), single-page view, slideshow, zoom; landscape/portrait.
- **Export**: PDF with correct crop, gradients, text overlay, captions, logo.
- **Themes**: Wedding background themes, anniversary color themes; applied in preview and PDF.
- **Studio album**: Support for pre-selected album image IDs and album name when coming from studio.

### UI pieces (to be upgraded)
- Progress bar (filled/total).
- Horizontal stepper: thumbnail strip (small thumbnails per page; C/L/number for empty).
- Page header: “Cover” / “Back” / “Page N” badge + “step / total”.
- **Layout picker**: Inline list of PAGE_LAYOUT_OPTIONS with static mini layout thumbnails (hardcoded indigo blocks); selected = ring + label.
- Page preview: 4:3 aspect ratio, paper-like shadow.
- Slot previews + “Pick Photo(s)” + remove slot; captions for inner pages; cover/last hint with link to Cover Editor.
- Bottom nav: Previous / Next + keyboard hints.

---

## 2. Upgrade Goals (Modern Marriage / Photo Book UI)

### Design direction
- **Professional, premium**: Feels like a high-end wedding/anniversary photo book tool, not a toy.
- **Refined typography**: Clear hierarchy, readable labels, optional serif accent for headings.
- **Calm color system**: Muted neutrals (slate/stone), soft gold/rose accents for wedding, subtle borders and shadows.
- **Consistent spacing and rhythm**: Clear sections (progress → stepper → header → layout picker → preview → controls).
- **Accessibility**: Focus states, aria-labels, keyboard support already present; keep and reinforce.

### Areas to upgrade

| Area | Current | Target |
|------|--------|--------|
| **Progress** | Thin gradient bar + small text | Refined bar (rounded, subtle fill), optional step dots; clear “X of Y pages” and “Z% complete”. |
| **Stepper (thumbnail strip)** | Small 44×34 buttons, basic borders | Slightly larger thumbs, soft shadow when active, smooth scroll-into-view for current page, optional page numbers under thumb. |
| **Page header** | Small badges (Cover/Back/Page N) + step text | Clear section title; optional subtitle; badge style aligned with theme (e.g. wedding = soft gold/cream). |
| **Layout picker** | Inline hardcoded mini layouts, tiny labels | **Dynamic** layout picker: same `PAGE_LAYOUT_OPTIONS` but **render mini preview from current page images** when possible (e.g. 1–4 slots filled with actual thumbs); fallback to abstract icon/silhouette. Selected state: border + light background. Labels: short, readable (Single, Two Up, Grid 3, Grid 4, Hero, Cinema). |
| **Layout thumbnails** | Static colored divs (indigo) | Per-option: prefer **current page slot images** in that layout’s arrangement; if no image, show layout silhouette (SVG or CSS). Same layout options, dynamic content. |
| **Preview card** | 4:3, single shadow | Slightly refined shadow (layered, subtle), optional thin border; keep 4:3 or configurable. |
| **Slots + Pick** | Functional but plain | Clear “Photo slots” section; slot cells with hover state; primary “Add photos” button; keep existing behavior. |
| **Captions** | Simple inputs | Same behavior; optional placeholder and subtle styling to match theme. |
| **Cover/Last hint** | Amber box + link | Softer styling (e.g. cream/gold for wedding); keep link to Cover Editor. |
| **Navigation** | Basic buttons | Clear Prev/Next with icons; keyboard hints in a compact, non-intrusive way. |

---

## 3. Dynamic Layout Picker (Detailed)

### Requirement
- **Same options**: `PAGE_LAYOUT_OPTIONS` (Single Photo, Hero + Two, Two Up, Three Grid, Four Grid, Cinematic Spread).
- **Dynamic preview**: For the **current page** only, each option’s thumbnail should:
  - If the current page has images (1–4 slots): show **actual thumbnails** in that layout’s arrangement (e.g. Two Up = two small images side by side; Four Grid = four in 2×2).
  - If no image for a slot: show a neutral placeholder (e.g. outline or icon) so the layout structure is still clear.
- **Selection state**: One option is “current layout” for the page; highlight with ring/border + background.
- **Interaction**: Click to set page layout (existing `setPageLayouts` + `setPageImages` layout field); no change in logic, only presentation.
- **Labels**: Short, consistent (e.g. “Single”, “Two Up”, “Grid 3”, “Grid 4”, “Hero”, “Cinema”).

### Data
- Current page index: `page.index`.
- Current page state: `pageImages[page.index]` → `imageDataUrls` / `imageDataUrl` / `imageIds`.
- Current layout: `getPageLayoutLabel(page.index, page.layoutName)`.
- Slot count per layout: reuse `MULTI_IMAGE_SLOT_COUNT` and 1 for Single/Cinematic.

### Implementation approach
- Extract a small **LayoutOptionThumb** (or inline) that, given layout id/name and array of image URLs (e.g. up to 4), renders:
  - **Single**: one image or placeholder.
  - **Two Up**: two slots (left/right).
  - **Three Grid**: one tall left, two right.
  - **Four Grid**: 2×2.
  - **Hero + Two**: one large top, two bottom.
  - **Cinematic**: one wide strip (e.g. 2.35:1) with black bar.
- Use **current page** `urls[]` (and placeholders for missing slots) so the picker reflects “this is how your page would look in this layout”.
- Keep `miniLayout`-style fallback when we want abstract silhouettes (e.g. SVG icons per layout) for empty state.

---

## 4. Production-Ready Checklist

### Code quality
- [ ] Remove or gate `console.log`/`console.warn` in this page (or use a logger).
- [ ] Replace `any` with proper types (e.g. flip book event, API responses) where used in this file.
- [ ] Ensure no duplicate or unused layout definitions; single source of truth for `PAGE_LAYOUT_OPTIONS` and slot counts.

### UI/UX
- [ ] Layout picker: dynamic thumbnails from current page images; clear selected state; accessible labels.
- [ ] Stepper: scroll active page into view; clear active and “has image” states.
- [ ] Progress: clear “X / Y pages” and optional “Z% complete”.
- [ ] Responsive: layout picker scrolls horizontally on small screens; stepper scrolls; buttons don’t overflow.
- [ ] Focus and keyboard: keep and test arrow keys, Tab, Enter/Space on buttons.

### Performance
- [ ] Avoid re-creating large objects in render (e.g. `miniLayout` object); memoize or derive from a config array.
- [ ] Image thumbnails in stepper and layout picker: reasonable size (e.g. thumb-sized); no full-res in picker.

### Accessibility
- [ ] Aria-labels on icon-only or compact buttons (e.g. “Previous page”, “Next page”, “Layout: Two Up”).
- [ ] Current page and current layout announced (e.g. aria-current, or live region if needed).

### Testing
- [ ] Change layout for a page and confirm preview and save match.
- [ ] Add/remove images and confirm layout picker thumbnails update.
- [ ] Cover / last page: confirm link to Cover Editor and that returning keeps data.
- [ ] PDF export: all layouts and themes render correctly.

---

## 5. Implementation Order

1. **Spec & doc** (this file) — done.
2. **Layout picker data/config**  
   - Define a single config array for layout id, name, short label, slot count, and “arrangement” (e.g. grid template or slots).  
   - Use it for both `PAGE_LAYOUT_OPTIONS` and the picker UI.
3. **Dynamic layout thumbnails**  
   - Implement LayoutOptionThumb (or equivalent) that takes layout + current page urls[] and renders mini preview (images or placeholders).  
   - Replace current static `miniLayout` block with this.
4. **Stepper and progress**  
   - Refine styles (size, shadow, scroll-into-view).  
   - Optional step indicator (e.g. dots) and “X of Y” / “Z%”.
5. **Page header and sectioning**  
   - Clear section title and optional subtitle; align badge style with theme.
6. **Preview card and controls**  
   - Subtle shadow/border; slot and caption styling.
7. **Polish**  
   - Typography, spacing, focus states, aria where needed; remove console; tighten types.

---

## 6. Summary

- **Completed**: Full album flow, layouts, images, crop, captions, cover/last, save/load, flip book, single-page view, PDF, themes, studio album.
- **Upgrade focus**: Professional marriage/photo book UI; **dynamic layout picker** (current page images in each layout’s arrangement); refined progress, stepper, and page header; production-ready code and accessibility.
- **Deliverable**: Same behavior, better UX and visual design, with layout picker that shows “your photos in this layout” for the current page.

---

## 7. Implemented (Current Code)

- **Layout config**: `PAGE_LAYOUT_CONFIG` — single source of truth for layout id, shortLabel, slotCount; `PAGE_LAYOUT_OPTIONS` derived from it.
- **Dynamic layout picker**: `LayoutOptionThumb` component renders each layout with **current page images** in that layout's arrangement; empty slots show a placeholder icon. Picker uses `PAGE_LAYOUT_CONFIG` and highlights selected layout with amber ring and label.
- **Progress**: Taller bar (h-2), stone/slate gradient when incomplete, emerald when 100%; "X / Y" and "Z%" displayed.
- **Stepper**: Larger thumbs (52×40), rounded-xl; active = amber border + shadow + scale; scroll-into-view for active page via `stepperRef` and `useEffect`; aria-label and aria-current for accessibility.
- **Page header**: "Front Cover" / "Back Cover" / "Page N" with neutral/amber/stone badges; "X of Y" step indicator.
- **Preview card**: Refined shadow and border (rounded-2xl, border-slate-200/80).
- **Photos section**: "Photos" label; slot borders amber when filled, dashed slate when empty; "Add photo(s)" button = stone-800 primary style.
- **Cover/Last hint**: Stone-toned box and link to Cover Editor.
- **Navigation**: Prev/Next with aria-labels; stone primary for Next; keyboard hints unchanged.
