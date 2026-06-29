# Studio Dashboard UI

Mobile-first design system and layout reference for the Photo Studio dashboard (`StudioDashboard.tsx`).

## Files

| File | Role |
|------|------|
| `src/pages/photo-studio/StudioDashboard.tsx` | Page structure, data, charts, activity hub |
| `src/pages/photo-studio/StudioDashboard.css` | Mobile-first layout, panels, activity hub, bento |
| `src/pages/photo-studio/studioDashboardTheme.ts` | Shared `THEME` tokens (primary blue, text colors) |

## Design approach: mobile-first

Base styles target **phone screens first** (320–639px). Larger layouts are added with `min-width` media queries — never `max-width` for core grids.

| Breakpoint | Typical use |
|------------|-------------|
| Default | Single column, stacked hero, full-width buttons |
| `640px` (`sm`) | 2-column KPI grid, hero row layout, wider padding |
| `768px` (`md`) | Chart height increase, gallery hover states |
| `900px` | Activity hub: gallery + guests side-by-side |
| `1024px` (`lg`) | 4-column KPIs, 2-column analytics charts |

## Page structure (top → bottom)

```
┌─────────────────────────────────────┐
│ 1. Welcome hero                     │
│    stats chips + action buttons     │
├─────────────────────────────────────┤
│ 2. KPI stat cards (1→2→4 cols)      │
├─────────────────────────────────────┤
│ 3. Analytics (albums + uploads)     │
│    stacked mobile / 2-col desktop   │
├─────────────────────────────────────┤
│ 4. Activity hub (single section)    │
│    Gallery (3) + Guests (3)         │
├─────────────────────────────────────┤
│ 5. Quick access (people + bento)    │
└─────────────────────────────────────┘
```

## Theme & tokens

CSS variables in `StudioDashboard.css` (`:root` / `html.dark`):

| Token | Light | Usage |
|-------|-------|--------|
| `--sd-page-bg` | `#f1f5f9` | Page background |
| `--sd-card` | `#ffffff` | Panel inner surface |
| `--sd-text-primary` | `#0f172a` | Headings, values |
| `--sd-text-muted` | `#64748b` | Subtitles, meta |
| `--sd-border-light` | `#e2e8f0` | Dividers |

**Brand blue:** `#2563EB` / `#3B82F6` (matches sidebar and Filter Images).

**Root classes:** `studio-dashboard sd-page sd-dashboard-v2`

## Section reference

### Welcome hero (`.sd-hero-shell`)

- Mobile: column layout, `px-4 py-5`, full-width CTA buttons
- Desktop (`sm+`): row layout, inline buttons, decorative camera hidden on mobile
- Content: welcome title, summary, 3 stat chips, Upload / Create Album / Add Client

### KPI cards (`.sd-stat-grid`)

- Mobile: **1 column**
- `640px+`: **2 columns**
- `1024px+`: **4 columns**
- Each card: icon, sparkline, value, label, trend

### Analytics (`.sd-analytics-grid`)

- Mobile: charts **stacked**, height **200–220px**
- `768px+`: taller charts (260–280px)
- `1024px+`: **2 columns** side by side
- Album chart: horizontal bar chart (`layout="vertical"`) for readable album names
- Upload chart: 7-day line chart

### Activity hub (`.sd-activity-hub`) — merged Gallery + Guests

Single card containing both lists (not two separate panels).

**Limits (constants in TSX):**

```ts
const ACTIVITY_GALLERY_LIMIT = 3;
const ACTIVITY_GUESTS_LIMIT = 3;
```

**Mobile layout:**

- Header stacks: title on top, Live + Gallery/Guests links below (full width)
- Gallery list first, guests list below (border-top separator)
- Touch-friendly rows (`min-height: 3.25rem`), chevron always visible
- Guest email hidden on very small screens (`< 400px`)

**Desktop layout (`900px+`):**

- Two columns inside one panel (gallery left, guests right)
- Hover states on gallery rows; chevron on hover only

**Gallery row (`.sd-activity-gallery-item`):**

```
[thumb 48px]  Title                    →
              Published · 24 photos · 20 Apr 2026
```

**Guest row (`.sd-activity-guest-item`):**

```
[avatar]  Name          Active
          email@…       2h ago
```

### Quick access (`.sd-quick-hub-section`)

- Detected people strip (face API, max 3 visible + view more)
- Bento grid: People Frame hero + Gallery / Albums / Upload / Clients tiles
- Unchanged by mobile-first pass; uses existing bento breakpoints

## Data sources

| UI block | API / source |
|----------|----------------|
| KPIs | `/api/dashboard/summary`, admin stats (if admin) |
| Album chart | `/api/albums` (top 6 by image count) |
| Upload chart | User images `createdAt` / `uploadTime` (last 7 days) |
| Gallery rows | Recent user images (thumbnails via `resolveMediaUrl`) |
| Guests | `/api/simple-invitations/family-relationships` (clients) |
| People strip | `/api/face-recognition/users/{id}/persons` |

Face API failures are non-fatal (`retry: false`); dashboard still loads.

## CSS class map (activity hub)

| Class | Purpose |
|-------|---------|
| `.sd-activity-hub` | Outer gradient border wrapper |
| `.sd-activity-hub__inner` | White/dark card surface |
| `.sd-activity-hub__header` | Title + action links |
| `.sd-activity-hub__split` | 1-col mobile → 2-col desktop |
| `.sd-activity-col` | Gallery or guests column |
| `.sd-activity-gallery-list` | `<ul>` of gallery rows |
| `.sd-activity-gallery-item` | Single gallery link row |
| `.sd-activity-guest-list` | `<ul>` of guest rows |
| `.sd-activity-guest-item` | Single guest row |

## Responsive checklist

When changing the dashboard UI:

1. **Start mobile** — verify at 375px width first
2. **Use `min-width` queries** for tablet/desktop enhancements
3. **Keep touch targets** ≥ 44px row height for list items
4. **Limit activity lists** to 3 items unless product asks for more
5. **One title per row** — no duplicate gallery labels (badge + caption)
6. **Test dark mode** — `html.dark` toggles CSS variables
7. **Run build** — `npm run build` after CSS/TSX changes

## Related docs

- [DASHBOARD-LOADING.md](./DASHBOARD-LOADING.md) — full-screen loading state
- Filter Images page — same blue theme + face recognition APIs
