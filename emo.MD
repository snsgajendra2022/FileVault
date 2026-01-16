# FileVault Project – Simple Explanation

This project is a **React web app**. It is made for storing photos/files, sharing them, and managing clients. It also has a **PhotoStudio Pro** area for photo studios and a full **Admin panel** for admins.

I read the files in `src/` and wrote this in very easy words.

## 1) What the app is
- Think of this as a **safe photo vault** + **client management** tool.
- Normal users can upload and view files.
- Photo studios can manage clients, albums, and share galleries with QR codes.
- Admin users can manage plans, services, and users.

## 2) How the app starts
- `src/index.tsx` is the start file. It renders `App`.
- `src/App.tsx` sets up routing (pages) with React Router.
- It wraps everything with:
  - **AuthProvider** (login state)
  - **QueryClientProvider** (React Query for API data)
  - **Toaster** (toast messages)

## 3) Login and user state
- `src/context/AuthContext.tsx` keeps the logged-in user in memory.
- It reads token and user data from **localStorage**.
- If token exists, it validates with `/api/auth/me`.
- Admin is checked by `accountType === 'ADMIN'`.
- When user logs out, it clears local data and React Query cache.

## 4) Main routes (pages)
All main routes are defined in `src/App.tsx`.

### Public pages
- `/login` and `/register` – user sign in/up.
- `/accept-invitation` – user accepts invite and creates account.
- `/view` – public image view by URL (shared image).
- `/public/selection` – public album/selection screen.
- `/public/checkout` – public checkout screen.

### Protected pages (login required)
- `/dashboard` – main dashboard with stats and activity.
- `/upload` – upload files (supports large uploads).
- `/images` – view/download/delete your files.
- `/services` – connect cloud services (Google Drive, S3, etc).
- `/plans` and `/plans/:planId` – view plans.
- `/checkout/:planId` – pay for a plan.
- `/usage`, `/billing`, `/settings` – usage, billing and settings.
- `/profile`, `/change-password` – profile and password.
- `/analytics` – analytics view.
- `/invitations` – invitation system for clients.
- `/services/config/:serviceId` – configure a service.
- `/admin` – admin panel (admin only).

### PhotoStudio Pro pages
- `/studio` – landing page for PhotoStudio Pro.
- `/studio/auth` – studio login/register (UI demo).
- `/studio/dashboard` – studio dashboard.
- `/studio/clients` – client management.
- `/studio/gallery` – photo gallery.
- `/studio/barcodes` – barcode/QR system.
- `/studio/settings` – studio settings.
- `/studio/payments` – studio checkout.
- `/studio/albums` – studio albums.
- `/studio/shared-albums` – shared albums.
- `/client/:clientId` – client portal.

## 5) Uploading files
Main upload code is in `src/pages/UploadPage.tsx`.
- Drag and drop upload.
- Supports **bulk upload** and **very large files**.
- Uses chunked upload if supported (`src/services/chunkedUploadService.ts`).
- Can upload to **your account** or a **client account**.
- Can add uploaded files to an album.

## 6) Viewing files
`src/pages/ImagesPage.tsx`
- Shows your files with preview, download, delete.
- You can also switch to **invited user** files (family/client).
- Free users may be blocked from download/delete.

## 7) Albums and sharing
- Albums are used in upload and public pages.
- Public selection uses encrypted image IDs (`src/utils/encryption.ts`).
- `src/pages/PhotoStudio/PhotoGallery.tsx` can make QR codes and share links.
- `src/pages/ViewImagePage.tsx` is a simple public image view screen.

## 8) Invitations and clients
- `src/pages/InvitationsPage.tsx` lets you send client invites.
- `src/pages/AcceptInvitationPage.tsx` accepts the invite and creates user.
- PhotoStudio client list is in `src/pages/PhotoStudio/ClientManagement.tsx`.
- Client data is pulled from `/api/simple-invitations/family-relationships`.

## 9) Admin area (admin only)
- `src/pages/AdminPage.tsx` has tabs for:
  - Users
  - Services
  - Plans
  - Usage analytics
  - System health
- Admin APIs are in `src/services/adminService.ts`.

## 10) Cloud services
- `src/pages/ServicesPage.tsx` lets users connect services.
- Uses `/api/services/available` for service setup fields.
- Tests connections and toggles services on/off.

## 11) PhotoStudio Pro (studio tools)
Key pages:
- **StudioLanding** – marketing/landing page.
- **StudioDashboard** – overview for studio (clients, albums, uploads).
- **ClientManagement** – show studio clients.
- **PhotoGallery** – gallery view, filtering, QR share.
- **ClientPortal** – for client view (route `/client/:clientId`).
- **PublicSelection/PublicCheckout** – public selection & checkout flow.

## 12) Small helper files
- `src/services/api.ts` – Axios setup with base URL.
- `src/utils/navigation.ts` – clears bad navigation state.
- `src/utils/authUtils.ts` – localStorage helpers.
- `src/types/*` – TypeScript types.
- `src/components/layout/*` – Header/Sidebar/Navigation layout.

## 13) Tech used
- React + TypeScript
- React Router
- React Query
- Axios
- Tailwind CSS + custom CSS
- React Icons
- React Hot Toast
- React Dropzone
- QR code tools

## 14) Simple summary
This is a **big web app** that does:
- Safe file upload and storage
- Albums and sharing
- Invitations for clients/family
- Admin system for plans and users
- PhotoStudio Pro tools (clients, gallery, QR sharing)

## 15) Demo overview for Studio Sidebar pages (easy words)
Below is a **demo script** in simple words for the studio menu items shown in `src/components/layout/Sidebar.tsx`.

### 1) Studio Dashboard (`/studio/dashboard`)
- This is the **home screen** for studio owners.
- It shows total clients, total photos, albums, and recent activity.
- Demo idea: “Here you can see a quick health check of your studio.”

### 2) Upload (`/upload`)
- This is where you **add new photos/files**.
- You can drag & drop or click to upload.
- Demo idea: “I can upload many files at once, even large files.”

### 3) My Images (`/client-images`)
- This page shows **all uploaded images**.
- You can view, download, and delete if allowed.
- Demo idea: “This is the main library of my files.”

### 4) Album (`/studio/albums`)
- This page is for **organizing photos into albums**.
- Albums help keep work separated by client or event.
- Demo idea: “I can open an album and see all images in one place.”

### 5) Shared Albums (`/studio/shared-albums`)
- This is for **albums shared with clients**.
- You can see what is shared and what is public.
- Demo idea: “Clients can access only what I share with them.”

### 6) Select & Pay (`/studio/payments`)
- This is where clients can **select photos and pay**.
- It is used at the end of the client flow.
- Demo idea: “After selection, the client completes payment here.”

### 7) Clients Tree (`/client-tree`)
- This shows a **tree view** of clients and relations.
- It helps studios see client structure easily.
- Demo idea: “This visual tree helps manage client relationships.”

### 8) Create Client (`/invitations`)
- This is for **sending invitations** to new clients.
- Studio enters client details and sends invite.
- Demo idea: “I invite a client, and they get access to their photos.”

### 9) Clients (`/studio/clients`)
- This is a **list of all clients**.
- You can search and open a client profile.
- Demo idea: “I can quickly find and view any client.”

### 10) Services (`/services`)
- This is for **connecting cloud services** like S3, Google Drive, etc.
- You can configure, test, and enable services.
- Demo idea: “I connect storage services to keep files safe.”

## 16) One-line demo story (easy)
“I open the dashboard, upload photos, organize into albums, share with clients, and take payment, all in one place.”

If you want a smaller demo summary or a client-facing script, tell me and I will write it.
