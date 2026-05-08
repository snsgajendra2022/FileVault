# FileVault / Our Memories — Complete Project Understanding

> **Stack:** React 19 + TypeScript, React Router v7, TanStack Query v5, Zustand v5, Axios, Tailwind CSS, i18next, Recharts, react-hot-toast

---

## 1. Project Entry Point — App Boot Sequence

```
public/index.html
  └── src/index.tsx          ← ReactDOM.createRoot, loads i18n config, renders <App>
        └── src/App.tsx       ← QueryClientProvider > AuthProvider > Router > AppRoutes
```

**`src/index.tsx`**
- Imports `src/i18n/config.ts` (i18next setup) before anything else
- Renders `<App>` inside `React.StrictMode`

**`src/App.tsx`** — Brain of the app
- Wraps everything in `<ErrorBoundary>` → `<QueryClientProvider>` → `<AuthProvider>` → `<Router>`
- Defines ALL routes via `<AppRoutes>` component
- Two special route guards:
  - `<ProtectedRoute>` — redirects to `/memories` if not logged in; redirects to `/studio/dashboard` if not admin
  - `<PublicShareRoute>` — only renders if URL has `?sid=`, `?q=`, or `?token=` params
- On mount: calls `clearNavigationState()` and `enableInspectBlock()` (blocks DevTools inspect if env var set)

---

## 2. Environment Config (`.env`)

| Variable | Purpose |
|---|---|
| `REACT_APP_API_URL` | Base URL for all API calls (e.g. `https://backendstudio.mytiny.us`) |
| `REACT_APP_BLOCK_INSPECT` | If `true`, blocks browser DevTools |
| `REACT_APP_OPENCLAW_ENABLED` | Enables AI assistant feature |
| `REACT_APP_OPENCLAW_*_PATH` | API paths for AI chat/voice/image/session |

---

## 3. Authentication System

### Flow
```
User enters credentials
  → LoginPage.tsx
    → AuthContext.login()
      → POST /api/auth/login
        → Response: { apiToken, user }
          → localStorage.setItem('token', apiToken)
          → localStorage.setItem('userData', JSON.stringify(user))
          → api.defaults.headers.Authorization = `Bearer ${token}`
          → setUser(userData) in React state
```

### Files Involved

**`src/context/AuthContext.tsx`** — Central auth state
- Provides: `user`, `isAuthenticated`, `isAdmin`, `isLoading`
- Methods: `login`, `register`, `logout`, `forgotPassword`, `requestLoginOtp`, `verifyLoginOtp`, `updateUser`
- On app load: reads `token` + `userData` from localStorage → restores session
- If only token found (no userData): calls `GET /api/auth/me` to validate
- `isAdmin` = `user.accountType === 'ADMIN'`
- On logout: clears localStorage, removes axios header, clears React Query cache

**`src/utils/authUtils.ts`** — localStorage helpers
- `getStoredToken()` / `setStoredToken()` → key: `'token'`
- `getStoredUserData()` / `setStoredUserData()` → key: `'userData'`
- `clearStoredAuth()` → removes both keys

**`src/types/auth.ts`** — `LoginCredentials`, `RegistrationData`, `AuthResponse`
**`src/types/user.ts`** — Full `User` interface with permissions, account types, family relationships

### Auth API Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Username + password login |
| POST | `/api/auth/register` | New user registration |
| GET | `/api/auth/me` | Validate existing token |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/login/otp/send` | Send OTP via email/SMS |
| POST | `/api/auth/login/otp/verify` | Verify OTP and get token |
| PUT | `/api/auth/admin/users/:id/verify` | Auto-verify after registration |

---

## 4. HTTP / API Layer

### `src/services/api.ts` — Main Axios instance
- `baseURL` = `process.env.REACT_APP_API_URL`
- `timeout` = 10 seconds
- **Request interceptor**: reads `token` from localStorage, adds `Authorization: Bearer <token>` header
- **Response interceptor**: on 401 → clears token + redirects to `/login` (except public routes like `/memories`, `/public/*`)

### `src/services/http.ts` — Fetch-based helper
- Used by `invitationService.ts`
- Sends both `Authorization: Token <token>` AND `X-API-KEY: <token>` headers
- `apiRequest<T>(endpoint, method, body)` — generic typed fetch wrapper

---

## 5. Service Layer (src/services/)

### `imageService.ts`
- Class-based singleton (`new ImageService()`)
- Upload: `POST /api/images/upload` (multipart/form-data) — 3 retries on network errors
- Supports `targetUserId` for uploading to another user's account
- `getUserImages()` → `GET /api/images/user?page=&limit=`
- `deleteImage()` → `DELETE /api/images/:id`
- `getFamilyImages()` → `GET /api/images/family/:memberId`
- `uploadToFamilyMember()` → `POST /api/images/upload-family`

### `adminService.ts`
- Class-based singleton
- User CRUD: `GET/POST/PUT/DELETE /api/admin/users`
- User actions: verify, suspend, activate, upgrade → `PUT /api/admin/users/:id/[action]`
- Stats: `GET /api/admin/users/statistics`, `GET /api/admin/system/health`
- Plans: `GET/POST/PUT/DELETE /api/plans`
- Feature flags: `GET/POST/PUT /api/flags`
- Service configs: `GET /api/admin/services/configurations`

### `memoriesService.ts`
- All "Our Memories" event API calls
- `listMemoriesEvents()` → `GET /api/memories/events`
- `getMemoriesEventById()` → `GET /api/memories/events/:id`
- `createMemoriesEvent()` → `POST /api/memories/events`
- `updateMemoriesEvent()` → `PUT /api/memories/events/:id`
- `deleteMemoriesEvent()` → `DELETE /api/memories/events/:id`
- `addImagesToMemoriesEvent()` → `POST /api/memories/events/:id/images`
- `likeMemoriesEventImage()` → `POST /api/memories/events/:eventId/images/:imageId/likes`
- `addMemoriesEventImageComment()` → `POST .../comments`
- `guestUploadToMemoriesEvent()` — uploads file via imageService then links to event
- `mapEvent()` — normalizes API response to `MemoriesEvent` type (handles many field name variants)

### `invitationService.ts`
- Uses `http.ts` (fetch-based, not axios)
- `generateInvitationCode()` → `POST /api/invitation/generate`
- `sendInvitation()` → `POST /api/invitation/send`
- `getInvitations()` → `GET /api/invitations`
- `acceptInvitation()` → `POST /api/invitation/accept`
- `rejectInvitation()` → `POST /api/invitation/reject`

### `phoneBookService.ts`
- `listPhoneBookContacts()` → `GET /api/public-share/contacts`
- `createPhoneBookContact()` → `POST /api/public-share/contacts`
- `updatePhoneBookContact()` → `PUT /api/public-share/contacts/:id`
- `deletePhoneBookContact()` → `DELETE /api/public-share/contacts/:id`
- Special: metadata (contactType, tags, whatsapp, etc.) is packed/unpacked into the `notes` field as JSON with prefix `FV_PHONEBOOK_META:`

### `memoriesShareService.ts` — Share link generation for memories events
### `chunkedUploadService.ts` — Large file chunked upload support
### `photobookTemplatesService.ts` — Photobook template API calls

---

## 6. State Management

### React Query (TanStack Query)
- Used for server state (API data)
- Config: `retry: 1`, `refetchOnWindowFocus: false`
- Used in: `PhotoGallery.tsx` (infinite scroll with `useInfiniteQuery`)
- Cache cleared on logout via `queryClient.clear()`

### Zustand Stores

**`src/store/photobookStore.ts`** — `usePhotoBookStore`
- Persisted to localStorage key `photobook_state_v2` (only `album` + `photoIndex`, NOT photo bytes)
- Photo bytes stored in IndexedDB via `src/utils/photobookDb.ts`
- State: `album`, `photos`, `photoIndex`, `selectedPhotoId`, `selectedSpreadIndex`
- Actions: `startNewAlbum`, `addPhotos`, `assignPhotoToSlot`, `setSpreadLayout`, `exportJson`, `importJson`, `resetAll`

**`src/features/memories/memoriesStore.ts`** — `useMemoriesStore`
- Persisted to localStorage key `filevault_memories_v1`
- Local-only store (backup/offline) — actual data comes from API via `memoriesService.ts`
- Actions: `createEvent`, `updateEvent`, `deleteEvent`, `toggleLike`, `addComment`, `incrementViews`

**`src/features/phoneBook/phoneBookPrefsStore.ts`** — Phone book UI preferences

---

## 7. Routing Structure

### Public Routes (no auth needed)
| Path | Component | Purpose |
|---|---|---|
| `/memories` | `MemoriesLandingPage` | Our Memories public landing |
| `/memories/e/:eventSlug` | `MemoriesPublicGalleryPage` | Guest event gallery |
| `/login` | `LoginPage` | Login form |
| `/register` | `RegisterPage` | Registration |
| `/forgot-password` | `ForgotPasswordPage` | Password reset request |
| `/reset-password` | `ResetPasswordPage` | Password reset form |
| `/accept-invitation` | `AcceptInvitationPage` | Accept family invite |
| `/public/selection` | `PublicSelectionPage` | Client photo selection (needs `?sid/q/token`) |
| `/public/checkout` | `PublicCheckoutPage` | Client checkout (needs share param) |
| `/public/images-display` | `PublicImagesDisplayPage` | Public image display |
| `/view` | `ViewImagePage` | Single image viewer |
| `/privacy-policy` | `PrivacyPolicyPage` | Privacy policy |
| `/studio` | `StudioLanding` | Photo Studio landing page |
| `/studio/auth` | `StudioAuthPage` | Studio login |
| `/client/:clientId` | `ClientPortal` | Client-facing portal |

### Protected Routes (inside `<Layout>` — requires login)
| Path | Component | Purpose |
|---|---|---|
| `/studio/dashboard` | `StudioDashboard` | Main dashboard with charts |
| `/studio/clients` | `ClientManagement` | View/manage clients |
| `/studio/gallery` | `PhotoGallery` | Photo/video gallery with infinite scroll |
| `/studio/albums` | `PhotoStudioAlbum` | Album management |
| `/studio/shared-albums` | `SharedAlbums` | Albums shared with user |
| `/studio/barcodes` | `BarcodeSystem` | QR/barcode generation |
| `/studio/payments` | `StudioCheckout` | Payment/checkout |
| `/studio/payment-management` | `PaymentManagement` | Payment records |
| `/studio/settings` | `StudioSettings` | Studio settings |
| `/upload` | `UploadPage` | File upload |
| `/upload-family-images` | `UploadFamilyImagesPage` | Upload to family member |
| `/client-images` | `ClientImagesPage` | View client images |
| `/invitations` | `InvitationsPage` | Manage invitations |
| `/connections` | `ConnectionsPage` | Connected accounts |
| `/family-tree` | `FamilyTree` | Family tree visualization (D3) |
| `/memories/events` | `MemoriesEventsListPage` | List all events |
| `/memories/events/new` | `MemoriesCreateEventPage` | Create event |
| `/memories/events/:id` | `MemoriesEventManagePage` | Manage event |
| `/memories/shared` | `MemoriesSharedWithMePage` | Events shared with me |
| `/phonebook` | `PhoneBookListPage` | Contacts list |
| `/phonebook/new` | `PhoneBookCreatePage` | Add contact |
| `/phonebook/:id` | `PhoneBookDetailPage` | Contact detail |
| `/photo-themes` | `PhotoThemesPage` | Photo theme categories |
| `/photo-book` | `PhotoBook` | Photobook editor |
| `/services` | `ServicesPage` | Cloud storage services |
| `/plans` | `PlansPage` | Subscription plans |
| `/billing` | `BillingPage` | Billing history |
| `/profile` | `ProfilePage` | User profile |
| `/admin` | `AdminPage` | Admin panel (ADMIN only) |

---

## 8. Layout System

```
Layout.tsx
  ├── <Sidebar />          ← Desktop only (lg:flex), fixed left, 64px wide
  ├── <Header />           ← Top bar with hamburger (mobile), user info
  ├── <Navigation />       ← Mobile drawer (lg:hidden)
  └── <Outlet />           ← Page content renders here
```

**`src/components/layout/navConfig.tsx`** — Single source of truth for nav items
- `regularNavigation` — old nav (currently `active: false`)
- `studioNavigation` — main nav for FREE/studio users (`active: true`)
- `adminNavigation` — admin-only nav
- Each item has: `labelKey` (i18n key), `href`, `icon`, `enabled`

**`src/components/layout/Sidebar.tsx`**
- Reads `isAdmin` from `useAuth()`
- Supports runtime menu flags via `window.__MENU_FLAGS__` or `localStorage('MENU_FLAGS')`
- Shows studio nav for non-admin, admin nav for ADMIN users

---

## 9. Key Feature Modules

### PhotoStudio (src/pages/PhotoStudio/)

| File | Purpose | Key APIs |
|---|---|---|
| `StudioDashboard.tsx` | Main dashboard with stats + charts | `GET /api/dashboard/summary`, `GET /api/albums`, `GET /api/images/user/all`, `GET /api/simple-invitations/family-relationships` |
| `PhotoGallery.tsx` | Infinite scroll media gallery | `GET /api/images/user/all` (paginated via TanStack Query `useInfiniteQuery`) |
| `ClientManagement.tsx` | List/view clients | `GET /api/simple-invitations/family-relationships` (filters `relation === "Client"`) |
| `PhotoStudioAlbum.tsx` | Album CRUD | `GET/POST/PUT/DELETE /api/albums` |
| `BarcodeSystem.tsx` | QR code generation | Local generation with `react-qr-code` |
| `StudioSettings.tsx` | Studio preferences | Various settings APIs |
| `StudioCheckout.tsx` | Payment flow | Payment APIs |
| `ClientPortal.tsx` | Client-facing view | Public client portal |
| `PublicSelectionPage.tsx` | Client selects photos | Share link APIs |
| `PublicImagesDisplayPage.tsx` | Display shared images | Share APIs |
| `SharedAlbums.tsx` | Albums shared with user | Album share APIs |
| `ViewImages.tsx` | Full-screen image viewer | — |

### Our Memories (src/pages/memories/)

| File | Purpose |
|---|---|
| `MemoriesLandingPage.tsx` | Public landing — no auth needed |
| `MemoriesPublicGalleryPage.tsx` | Guest gallery — reads `?t=` token from URL |
| `MemoriesDashboardPage.tsx` | Authenticated memories dashboard |
| `MemoriesEventsListPage.tsx` | List all events (calls `listMemoriesEvents()`) |
| `MemoriesCreateEventPage.tsx` | Create/edit event form |
| `MemoriesEventManagePage.tsx` | Manage event, upload images, share |
| `MemoriesSharedWithMePage.tsx` | Events shared with current user |

**Components** (`src/pages/memories/components/`):
- `MemoriesLightbox.tsx` — Full-screen image viewer with likes/comments
- `MemoriesPhotobookSettingsModal.tsx` — Photobook settings for event
- `MemoriesSkeletonGrid.tsx` — Loading skeleton
- `GuestMemoriesIntro.tsx` — Guest welcome screen

### PhotoBook (src/pages/PhotoBook/ + src/components/PhotoBook/)

| File | Purpose |
|---|---|
| `src/pages/PhotoBook.tsx` | Entry point — routes to editor/preview/gallery |
| `src/pages/PhotoBook/TemplateGalleryPage.tsx` | Choose template |
| `src/pages/PhotoBook/EditorPage.tsx` | Drag-and-drop editor |
| `src/pages/PhotoBook/PreviewPage.tsx` | Preview with page-flip animation |
| `src/store/photobookStore.ts` | All editor state (Zustand + IndexedDB) |
| `src/templates/photobookTemplates.ts` | Template definitions (layouts, slots) |
| `src/components/PhotoBook/SpreadCanvas.tsx` | Single spread editor canvas |
| `src/components/PhotoBook/DraggablePhoto.tsx` | Draggable photo with @dnd-kit |
| `src/components/PhotoBook/FileVaultImagePicker.tsx` | Pick images from user's FileVault |
| `src/components/PhotoBook/PhotoTray.tsx` | Photo tray panel |
| `src/components/PhotoBook/Decorations.tsx` | Decorative elements |

### Phone Book (src/pages/PhoneBook/)

| File | Purpose |
|---|---|
| `PhoneBookListPage.tsx` | Contact list with search |
| `PhoneBookCreatePage.tsx` | Add new contact |
| `PhoneBookDetailPage.tsx` | View contact details |
| `PhoneBookEditPage.tsx` | Edit contact |
| `components/PhoneBookContactForm.tsx` | Shared form component |
| `components/InviteContactsModal.tsx` | Invite contacts to events |

### Admin Panel (src/pages/AdminPage.tsx + src/components/admin/)

| Component | Purpose | API |
|---|---|---|
| `UserManagement.tsx` | List/search/edit users | `GET /api/admin/users` |
| `CreateUserModal.tsx` | Create new user | `POST /api/admin/users` |
| `PlanManagement.tsx` | CRUD subscription plans | `GET/POST/PUT/DELETE /api/plans` |
| `ServiceManagement.tsx` | View service configs | `GET /api/admin/services/configurations` |
| `UsageAnalytics.tsx` | Storage/usage charts | `GET /api/admin/usage/statistics` |
| `SystemHealth.tsx` | System health metrics | `GET /api/admin/system/health` |
| `PaymentManagement.tsx` | Payment records | Payment APIs |
| `FlagManagement.tsx` | Feature flags toggle | `GET/POST/PUT /api/flags` |

### Invitations / Family System (src/components/invitations/)

| File | Purpose | API |
|---|---|---|
| `CreateInvitationForm.tsx` | Send invitation to new user | `POST /api/invitation/send` |
| `InviteExistingUserForm.tsx` | Invite existing user | Invitation APIs |
| `InvitationCodeGenerator.tsx` | Generate invite code | `POST /api/invitation/generate` |
| `InvitationHistory.tsx` | View sent invitations | `GET /api/invitations` |
| `InvitationsList.tsx` | List all invitations | Invitation APIs |
| `FamilyTree.tsx` | D3-based family tree visualization | `GET /api/simple-invitations/family-relationships` |
| `ConnectedAccountsList.tsx` | Show connected accounts | Connection APIs |
| `SharedImages.tsx` | Images shared with family | Image APIs |
| `CreateClient.tsx` | Create client invitation | Invitation APIs |

---

## 10. Types (src/types/)

| File | Exports |
|---|---|
| `auth.ts` | `LoginCredentials`, `RegistrationData`, `AuthResponse`, `User` (basic) |
| `user.ts` | `User` (full), `FamilyRelationship`, `UpdateProfileData`, `ChangePasswordData` |
| `services.ts` | `ServiceType`, `ServiceForm`, `ServiceSubscription`, `S3Configuration`, `B2Configuration`, `GoogleDriveConfiguration` |
| `photobook.ts` | `PhotoBookAlbum`, `PhotoBookSpread`, `PhotoBookPhoto`, `PhotoBookSlot` |

---

## 11. Utilities (src/utils/)

| File | Purpose |
|---|---|
| `authUtils.ts` | localStorage read/write for token + userData |
| `blockInspect.ts` | Disables browser DevTools (F12, right-click) when `REACT_APP_BLOCK_INSPECT=true` |
| `navigation.ts` | `clearNavigationState()` — clears problematic history state on app start |
| `encryption.ts` | Client-side encryption helpers |
| `checkoutUrlEncoding.ts` | Encode/decode checkout URL params |
| `memoriesGuestShareQuery.ts` | Parse guest share query params from URL |
| `photobookDb.ts` | IndexedDB CRUD for photobook photo bytes (via `idb-keyval`) |
| `photobookDownload.ts` | Export photobook as PDF (jsPDF + html2canvas) |
| `photobookId.ts` | Generate unique IDs for photobook entities |
| `videoTrim.ts` | Video trimming via `@ffmpeg/ffmpeg` (WebAssembly) |

---

## 12. i18n (Internationalization)

**`src/i18n/config.ts`** — i18next setup
- Languages: English (`en`) and Hindi (`hi`)
- Translation files: `src/locales/en.json`, `src/locales/hi.json`
- Used via `useTranslation()` hook throughout all components
- Nav labels use keys like `nav.studio.dashboard`, `nav.admin.userManagement`
- Brand names: `brand.ourMemories`, `brand.adminPanel`

---

## 13. Common Components (src/components/common/)

| Component | Purpose |
|---|---|
| `DashboardLoading.tsx` | Animated loading screen with icon + features list |
| `LoadingSpinner.tsx` | Simple spinner |
| `ErrorBoundary.tsx` | Catches React render errors, shows fallback UI |

---

## 14. Data Flow — Complete Picture

```
User Action (click/form submit)
  │
  ▼
Page/Component (e.g. StudioDashboard.tsx)
  │  calls
  ▼
Service Layer (e.g. adminService.ts / memoriesService.ts)
  │  uses
  ▼
api.ts (Axios instance)
  │  adds Bearer token from localStorage
  ▼
Backend API (https://backendstudio.mytiny.us)
  │  returns JSON
  ▼
Service normalizes response (e.g. mapEvent() in memoriesService)
  │
  ▼
Component setState() / React Query cache
  │
  ▼
React re-renders UI
```

### Special Data Flows

**Image Upload Flow:**
```
User selects file
  → imageService.uploadImage(file)
    → POST /api/images/upload (multipart)
      → Response: { id, image: { id, ... }, cloudUploads: { s3: { ... } } }
        → If memories event: addImagesToMemoriesEvent(eventId, [imageId])
          → POST /api/memories/events/:id/images
```

**PhotoBook Data Flow:**
```
User adds photo to photobook
  → photobookStore.addPhotos(files)
    → readAsDataUrl(file)
      → photobookDbSetPhoto(id, { dataUrl }) [IndexedDB]
        → store.photoIndex updated [localStorage via Zustand persist]
          → store.photos updated [in-memory only]
```

**Auth Token Flow:**
```
Login → token saved to localStorage('token')
  → api.ts interceptor reads it on every request
  → AuthContext sets api.defaults.headers.Authorization
  → On 401 response → localStorage cleared → redirect to /login
```

---

## 15. External Libraries — Key Usage

| Library | Used For |
|---|---|
| `axios` | All API calls via `src/services/api.ts` |
| `@tanstack/react-query` | Server state, infinite scroll in PhotoGallery |
| `zustand` | Client state (photobook editor, memories store, phonebook prefs) |
| `react-router-dom v7` | All routing, `<Outlet>` for nested layouts |
| `react-hot-toast` | Toast notifications throughout app |
| `react-i18next` | EN/HI translations |
| `recharts` | Dashboard charts (Bar, Line, Pie) |
| `@dnd-kit/*` | Drag-and-drop in photobook editor |
| `react-qr-code` | QR code generation in BarcodeSystem + PhotoGallery |
| `react-pageflip` | Page-flip animation in photobook preview |
| `d3` | Family tree visualization |
| `jspdf` + `html2canvas` | Export photobook as PDF |
| `@ffmpeg/ffmpeg` | Client-side video trimming (WebAssembly) |
| `idb-keyval` | IndexedDB for photobook photo storage |
| `jszip` | ZIP download of multiple images |
| `swiper` | Image carousel/slider |
| `react-dropzone` | Drag-and-drop file upload zones |
| `react-hook-form` | Form handling |

---

## 16. File/Folder Summary Map

```
src/
├── App.tsx                    ← All routes defined here
├── index.tsx                  ← App entry point
├── context/
│   └── AuthContext.tsx         ← Auth state + login/logout/register
├── services/
│   ├── api.ts                  ← Axios instance (base URL + interceptors)
│   ├── http.ts                 ← Fetch-based helper (used by invitations)
│   ├── imageService.ts         ← Image upload/download/delete APIs
│   ├── adminService.ts         ← Admin panel APIs
│   ├── memoriesService.ts      ← Our Memories event APIs
│   ├── invitationService.ts    ← Invitation system APIs
│   ├── phoneBookService.ts     ← Contacts/phonebook APIs
│   ├── memoriesShareService.ts ← Share link APIs
│   ├── chunkedUploadService.ts ← Large file upload
│   └── photobookTemplatesService.ts ← Photobook template APIs
├── store/
│   └── photobookStore.ts       ← Zustand store for photobook editor
├── features/
│   ├── memories/
│   │   ├── types.ts            ← MemoriesEvent, MemoriesImage types
│   │   ├── memoriesStore.ts    ← Zustand store (local backup)
│   │   └── utils.ts            ← slugify, randomToken, etc.
│   └── phoneBook/
│       └── phoneBookPrefsStore.ts ← UI prefs store
├── types/
│   ├── auth.ts                 ← Login/register types
│   ├── user.ts                 ← User + FamilyRelationship types
│   ├── services.ts             ← Cloud service config types
│   └── photobook.ts            ← Photobook data types
├── utils/
│   ├── authUtils.ts            ← localStorage token helpers
│   ├── blockInspect.ts         ← DevTools blocker
│   ├── photobookDb.ts          ← IndexedDB for photo bytes
│   ├── photobookDownload.ts    ← PDF export
│   └── videoTrim.ts            ← FFmpeg video trim
├── components/
│   ├── layout/
│   │   ├── Layout.tsx          ← Shell: Sidebar + Header + Outlet
│   │   ├── Sidebar.tsx         ← Desktop nav (fixed left)
│   │   ├── Navigation.tsx      ← Mobile nav drawer
│   │   ├── Header.tsx          ← Top bar
│   │   └── navConfig.tsx       ← Nav items config (single source of truth)
│   ├── common/
│   │   ├── DashboardLoading.tsx ← Loading screen component
│   │   ├── ErrorBoundary.tsx   ← React error boundary
│   │   └── LoadingSpinner.tsx  ← Simple spinner
│   ├── admin/                  ← Admin panel tab components
│   ├── invitations/            ← Invitation + family tree components
│   ├── PhotoBook/              ← Photobook editor sub-components
│   └── modals/                 ← Share modals
├── pages/
│   ├── PhotoStudio/            ← Main app feature (studio dashboard, gallery, etc.)
│   ├── memories/               ← Our Memories feature
│   ├── PhoneBook/              ← Contacts feature
│   ├── PhotoBook/              ← Photobook editor pages
│   ├── UploadFamilyImages/     ← Upload to family member
│   ├── AdminPage.tsx           ← Admin panel (tab-based)
│   ├── LoginPage.tsx           ← Login form
│   ├── RegisterPage.tsx        ← Registration form
│   └── ... (other pages)
├── i18n/
│   └── config.ts               ← i18next setup
├── locales/
│   ├── en.json                 ← English translations
│   └── hi.json                 ← Hindi translations
├── templates/
│   └── photobookTemplates.ts   ← Photobook layout templates
└── data/
    └── services.json           ← Static cloud service definitions
```

---

## 17. Account Types & Access Control

| Account Type | Access |
|---|---|
| `ADMIN` | Full admin panel + all features |
| `FREE` | Studio dashboard + all studio features |
| `CLIENT` | Client portal only (`/client/:clientId`) |
| `BASIC/PREMIUM/ENTERPRISE` | Extended storage/features |

Route guard logic:
- Not logged in → redirect to `/memories` (public landing)
- Logged in + ADMIN → default redirect to `/admin`
- Logged in + non-ADMIN → default redirect to `/studio/dashboard`
