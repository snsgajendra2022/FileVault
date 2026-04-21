# 4-Layer Architecture Documentation

This project follows a clean 4-layer architecture for better maintainability, reusability, and scalability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UI LAYER                              │
│  (Presentation components, pages, layouts, forms)            │
│  Location: src/components/, src/pages/                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ uses
┌──────────────────────▼──────────────────────────────────────┐
│                      HOOKS LAYER                             │
│  (Custom hooks, reusable logic, component orchestration)     │
│  Location: src/hooks/                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ uses
┌──────────────────────▼──────────────────────────────────────┐
│                      STATE LAYER                             │
│  (Global state, context, stores, reducers)                   │
│  Location: src/state/                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ uses
┌──────────────────────▼──────────────────────────────────────┐
│                       API LAYER                              │
│  (HTTP clients, API services, backend communication)         │
│  Location: src/api/                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: UI Layer

**Purpose:** Pure presentation components with minimal logic

**Location:**
- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components

**Structure:**
```
src/components/
├── admin/          # Admin panel components
├── auth/           # Authentication forms
├── common/         # Shared UI components (LoadingSpinner, ErrorBoundary)
├── invitations/    # Invitation management UI
├── layout/         # App shell (Header, Sidebar, Navigation)
├── modals/         # Modal dialogs
└── PhotoBook/      # Photo book editor components

src/pages/
├── auth/           # Login, Register, ForgotPassword
├── billing/        # Plans, Checkout, Usage
├── dashboard/      # Admin & User dashboards
├── images/         # Image gallery, upload
├── invitations/    # Invitation pages
├── memories/       # Memories/events feature
├── PhoneBook/      # Phone book contacts
├── photo-book/     # Photo book builder
├── photo-studio/   # Photo studio feature
├── photo-themes/   # Photo themes
└── user/           # Profile, Settings, Services
```

**Rules:**
- ✅ Render UI based on props/state
- ✅ Handle user interactions (onClick, onChange)
- ✅ Use hooks from Hooks Layer
- ❌ No direct API calls
- ❌ No complex business logic
- ❌ Minimal local state (only UI-specific)

**Example:**
```tsx
// Good: UI component using hooks
import { useAuth } from '../../hooks';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  return <div>{user.name}</div>;
};
```

---

## Layer 2: Hooks Layer

**Purpose:** Reusable custom hooks for component logic

**Location:** `src/hooks/`

**Structure:**
```
src/hooks/
├── index.ts                # Barrel export
├── useAuth.ts              # Re-export from state layer
├── useMemories.ts          # Re-export from state layer
├── usePhotoBook.ts         # Re-export from state layer
└── usePhoneBookPrefs.ts    # Re-export from state layer
```

**Rules:**
- ✅ Encapsulate reusable logic
- ✅ Manage side effects (useEffect)
- ✅ Orchestrate component behavior
- ✅ Use state layer hooks
- ❌ No UI rendering
- ❌ No direct DOM manipulation

**Example:**
```tsx
// Good: Custom hook for image upload
export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  
  const upload = async (file: File) => {
    setUploading(true);
    try {
      await imageService.uploadImage(file);
    } finally {
      setUploading(false);
    }
  };
  
  return { upload, uploading };
};
```

---

## Layer 3: State Layer

**Purpose:** Global and feature-specific state management

**Location:** `src/state/`

**Structure:**
```
src/state/
├── context/
│   └── AuthContext.tsx         # Authentication context
├── stores/
│   ├── memoriesStore.ts        # Zustand store for memories
│   ├── photobookStore.ts       # Zustand store for photo book
│   └── phoneBookPrefsStore.ts  # Zustand store for phone book prefs
└── index.ts                    # Barrel export
```

**State Management:**
- **React Context:** `AuthContext` for authentication
- **Zustand:** Feature-specific stores (memories, photobook, phonebook)
- **React Query:** Server state caching (configured in App.tsx)

**Rules:**
- ✅ Centralized state management
- ✅ Provide hooks for components
- ✅ Handle state updates
- ❌ No UI code
- ❌ No direct API calls (use API layer)

**Example:**
```tsx
// Good: Zustand store
export const useMemoriesStore = create<MemoriesState>((set) => ({
  events: [],
  createEvent: (data) => set((state) => ({
    events: [...state.events, newEvent(data)]
  })),
}));
```

---

## Layer 4: API Layer

**Purpose:** All backend communication

**Location:** `src/api/`

**Structure:**
```
src/api/
├── client/
│   ├── axiosInstance.ts        # Axios instance with interceptors
│   └── httpClient.ts           # Fetch-based HTTP client
├── services/
│   ├── adminService.ts         # Admin operations
│   ├── imageService.ts         # Image upload/download
│   ├── invitationService.ts    # Invitations
│   ├── memoriesService.ts      # Memories/events
│   ├── memoriesShareService.ts # Memories sharing
│   ├── phoneBookService.ts     # Phone book contacts
│   ├── photobookTemplatesService.ts # Photo book templates
│   └── chunkedUploadService.ts # Chunked file uploads
└── index.ts                    # Barrel export
```

**HTTP Clients:**
- **axiosInstance.ts:** Primary HTTP client
  - Adds Bearer token from localStorage
  - Redirects to login on 401 (except public routes)
  - Base URL: `process.env.REACT_APP_API_URL`
  
- **httpClient.ts:** Alternative fetch-based client
  - Uses Token or X-API-KEY headers
  - Fallback to `/api` for local development

**Rules:**
- ✅ Centralize all API calls
- ✅ Handle request/response transformation
- ✅ Implement retry logic where needed
- ✅ Export typed interfaces
- ❌ No UI code
- ❌ No state management

**Example:**
```tsx
// Good: API service
class ImageService {
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/images/upload', formData);
    return response.data;
  }
}

export default new ImageService();
```

---

## Supporting Layers

### Features Layer
**Location:** `src/features/`

Contains feature-specific types, utilities, and constants:
```
src/features/
├── memories/
│   ├── eventTypes.ts   # Event type definitions
│   ├── types.ts        # TypeScript types
│   └── utils.ts        # Utility functions
└── phoneBook/          # (empty after store moved)
```

### Types Layer
**Location:** `src/types/`

Global TypeScript type definitions:
```
src/types/
├── auth.ts         # Authentication types
├── photobook.ts    # Photo book types
├── services.ts     # Service types
└── user.ts         # User types
```

### Utils Layer
**Location:** `src/utils/`

Pure utility functions:
```
src/utils/
├── authUtils.ts            # Token/user data storage
├── encryption.ts           # XOR encryption
├── navigation.ts           # Route validation
├── photobookDb.ts          # IndexedDB operations
├── photobookDownload.ts    # PDF/ZIP export
├── videoTrim.ts            # Video trimming
└── blockInspect.ts         # Developer tools blocking
```

---

## Backward Compatibility

To avoid breaking existing imports, **re-export barrel files** are maintained in old locations:

### Old → New Mappings

**Services:**
```
src/services/api.ts → src/api/client/axiosInstance.ts
src/services/adminService.ts → src/api/services/adminService.ts
src/services/imageService.ts → src/api/services/imageService.ts
```

**State:**
```
src/context/AuthContext.tsx → src/state/context/AuthContext.tsx
src/store/photobookStore.ts → src/state/stores/photobookStore.ts
src/features/memories/memoriesStore.ts → src/state/stores/memoriesStore.ts
```

**Example re-export:**
```tsx
// src/services/api.ts (backward-compat)
export { default } from '../api/client/axiosInstance';
```

---

## Import Best Practices

### ✅ Recommended Imports

```tsx
// Use barrel exports from layers
import { useAuth, useMemories } from '../../hooks';
import { api, adminService, imageService } from '../../api';
import { useMemoriesStore, usePhotoBookStore } from '../../state';

// Use specific component imports
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FaUser } from 'react-icons/fa';
```

### ❌ Avoid

```tsx
// Don't import from deep nested paths
import { useAuth } from '../../state/context/AuthContext';

// Don't import from old paths (use new paths)
import api from '../../services/api'; // Use: import { api } from '../../api';
```

---

## Migration Checklist

When adding new features:

1. **API calls** → Add to `src/api/services/`
2. **Global state** → Add to `src/state/stores/` or `src/state/context/`
3. **Reusable logic** → Add to `src/hooks/`
4. **UI components** → Add to `src/components/` or `src/pages/`
5. **Types** → Add to `src/types/` or `src/features/{feature}/types.ts`
6. **Utils** → Add to `src/utils/`

---

## Key Benefits

✅ **Separation of Concerns:** Each layer has a single responsibility  
✅ **Reusability:** Hooks and services can be shared across components  
✅ **Testability:** Each layer can be tested independently  
✅ **Scalability:** Easy to add new features without affecting existing code  
✅ **Maintainability:** Clear structure makes code easier to understand  
✅ **Type Safety:** TypeScript types are centralized and reusable  

---

## Technology Stack

- **React 19.1.1** - UI library
- **React Router 7.8.2** - Routing
- **Zustand 5.0.10** - State management
- **React Query 5.85.5** - Server state caching
- **Axios 1.11.0** - HTTP client
- **i18next 23.16.4** - Internationalization
- **Tailwind CSS 3.4.17** - Styling
- **React Hot Toast 2.6.0** - Notifications

---

## Questions?

For questions or clarifications about the architecture, refer to:
- Layer-specific README files (if added)
- Code comments in barrel exports (`index.ts` files)
- This document

**Last Updated:** April 21, 2026
