# DashboardLoading

Full-screen loading overlay for Filevault pages that fetch data before showing the main UI. StudioPro “Initializing” layout: grain, floating orbs, glass card, pulse rings, shimmer bar, feature chips, and brand footnote. **Light and dark** follow `html.dark` from `filevault-theme` (same as the rest of the app).

## Files

| File | Role |
|------|------|
| `src/components/common/DashboardLoading.tsx` | React component and props |
| `src/components/common/DashboardLoading.css` | Layout, motion, responsive rules |
| `src/components/common/DashboardLoading.examples.md` | Short copy-paste examples |

## When to use

Use `DashboardLoading` when a **whole page** (or route) is blocked until async work finishes — for example loading the studio dashboard, album list, or client list.

Do **not** use it for:

- Inline section spinners (use a small spinner or skeleton instead)
- Button-level loading
- Partial content that can render progressively

Return it as the **only** child of the page while `loading` is true (early return pattern).

## Visual design

```
┌─────────────────────────────────────────────┐
│  Full viewport (light #f8f9ff / dark #0a0a0c) │
│                                             │
│     ┌─────────────────────────────┐         │
│     │  Glass card (blur, border)  │         │
│     │  ┌─────┐                    │         │
│     │  │ Icon│  + pulse rings     │         │
│     │  └─────┘                    │         │
│     │  Title                      │         │
│     │  Subtitle                   │         │
│     │  [══════ progress ══════]   │         │
│     │  • • •                      │         │
│     │  [Clients] [Photos] [Albums]│         │
│     └─────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

| Layer | Description |
|-------|-------------|
| Background | Fixed `inset: 0`, `z-index: 9999`, theme-aware base + film grain |
| Orbs | Three blurred violet/fuchsia/indigo circles (float keyframes) |
| Card | Frosted panel (`backdrop-filter: blur(24px)`), `2rem` radius, fade-in-up |
| Icon | Center ring with `FaCamera` (or custom icon), four pulse rings |
| Progress | Shimmer bar + three theme-colored bouncing dots |
| Features | Pill chips with icon + label (staggered fade-in) |
| Brand | Optional uppercase footnote under the card |

**Themes:** CSS variables on `.dashboard-loading-modern`. Light when `html` has no `dark` class; dark when `applyDocumentTheme('dark')` adds `html.dark` (header toggle / `filevault-theme` in `localStorage`).

**Palette:** Primary `#4648d4`, accents wedding `#8b5cf6` and birthday `#ec4899`. Title uses Playfair Display (already loaded in `index.css`).

**Motion:** CSS-only. `prefers-reduced-motion: reduce` disables orbs, rings, shimmer sweep, and bounce; panel and chips stay visible.

## Props API

```tsx
interface LoadingFeature {
  icon: React.ComponentType<IconBaseProps>;
  label: string;
}

interface DashboardLoadingProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<IconBaseProps>;
  features?: LoadingFeature[];
  showFeatures?: boolean;
  showProgress?: boolean;
  brandLine?: string;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Initializing Studio Pro"` | Main heading (Playfair) |
| `subtitle` | `string` | `"Preparing your creative workspace..."` | Supporting line |
| `brandLine` | `string` | `"StudioPro Creative Engine v4.0"` | Footer under card; pass `""` to hide |
| `icon` | `React.ComponentType<IconBaseProps>` | `FaCamera` | Center icon (react-icons) |
| `features` | `LoadingFeature[]` | See below | Bottom chips: icon + label each |
| `showFeatures` | `boolean` | `true` | Show or hide the feature chips row |
| `showProgress` | `boolean` | `true` | Show or hide progress bar and dots |

### Default features

If `features` is omitted and `showFeatures` is `true`:

| Label | Icon |
|-------|------|
| Clients | `FaUsers` |
| Photos | `FaImages` |
| Albums | `FaFolder` |

## Accessibility

The root element sets:

- `role="status"`
- `aria-live="polite"`
- `aria-busy="true"`

Screen readers announce updates when the loading view mounts. Pair with meaningful `title` / `subtitle` text (avoid generic “Loading” only when you can be specific).

## Basic usage

```tsx
import DashboardLoading from '../../components/common/DashboardLoading';

function MyPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardLoading />;
  }

  return <main>{/* page content */}</main>;
}
```

## Examples in this repo

### Photo Studio dashboard

```tsx
<DashboardLoading
  title={t('dashboard.loadingTitle')}
  subtitle={t('dashboard.loadingSubtitle')}
  icon={FaCamera}
/>
```

`src/pages/photo-studio/StudioDashboard.tsx`

### Client management

```tsx
<DashboardLoading
  title={t('photoStudioClients.loadingTitle')}
  subtitle={t('photoStudioClients.loadingSubtitle')}
  icon={FaUsers}
  features={[
    { icon: FaUsers, label: t('photoStudioClients.featureClients') },
    { icon: FaFolder, label: t('photoStudioClients.featureAlbums') },
    { icon: FaImages, label: t('photoStudioClients.featurePhotos') },
  ]}
/>
```

`src/pages/photo-studio/ClientManagement.tsx`

### Photo Studio album (auth + list)

```tsx
// Session / user bootstrap
<DashboardLoading
  title={t('photoStudioAlbumPage.loadingUserInfo')}
  subtitle={t('photoStudioAlbumPage.authenticatingSession')}
  icon={FaUserFriends}
  showFeatures={false}
/>

// Album list fetch
<DashboardLoading
  title={t('photoStudioAlbumPage.loading')}
  subtitle={t('photoStudioAlbumPage.preparingAlbums')}
  icon={FaFolder}
  showFeatures={false}
/>
```

`src/pages/photo-studio/PhotoStudioAlbum.tsx`

### Minimal (progress only, no feature chips)

```tsx
<DashboardLoading
  title="Preparing upload"
  subtitle="Setting up your session..."
  icon={FaCloudUploadAlt}
  showFeatures={false}
/>
```

### Minimal (no progress bar)

```tsx
<DashboardLoading
  title="Loading settings"
  subtitle="Fetching your preferences..."
  icon={FaCog}
  showProgress={false}
/>
```

### Custom feature chips

```tsx
import { FaChartLine, FaUsers, FaImages, FaDollarSign } from 'react-icons/fa';

<DashboardLoading
  title="Loading analytics"
  subtitle="Calculating statistics..."
  icon={FaChartLine}
  features={[
    { icon: FaUsers, label: 'Users' },
    { icon: FaImages, label: 'Images' },
    { icon: FaDollarSign, label: 'Revenue' },
  ]}
/>
```

## i18n

Pass translated strings via props. Do not hardcode user-facing copy inside `DashboardLoading.tsx` — each page owns its `title`, `subtitle`, and `features[].label` (often via `useTranslation`).

## Styling notes

- Styles live in **`DashboardLoading.css`** only; the component has no Tailwind classes.
- The overlay is **`position: fixed`** and covers the full viewport (`z-index: 9999`). It sits above the app layout while loading.
- **Mobile:** Card padding and icon size shrink at `768px` and `480px`; feature chips stack vertically on very small screens.

To tweak brand colors, edit gradient and `.progress-fill` values in `DashboardLoading.css`.

## Checklist for new pages

1. Import `DashboardLoading` from `components/common/DashboardLoading`.
2. Early-return when `loading === true`.
3. Set a **specific** `title` and `subtitle` for the page context.
4. Pick an `icon` that matches the page (camera, folder, users, etc.).
5. Set `showFeatures={false}` if feature chips do not add value.
6. Add translation keys in `en.json` / `hi.json` if the page is localized.

## Related

- `src/components/common/skeletons/` — inline skeletons, not full-page overlays
- Photo Studio pages: `StudioDashboard`, `PhotoStudioAlbum`, `ClientManagement`, `SharedAlbums`, `ProfilePage`, `PlansPage`, `UsagePage`
