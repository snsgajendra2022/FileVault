# Quick Start Guide - Role-Based Permission System

## 🚀 Getting Started

### Access the Settings Page

**For Admins Only:**
1. Navigate to `/portal-settings`
2. Click "Role & Menu Permissions" tab
3. Select a role (Admin, Studio, or Regular)
4. Manage permissions and save

### Accessing Settings
Route: `/portal-settings`

## 📋 Common Tasks

### Check if User Can Access a Menu Item

**Method 1: Using Hook (Recommended)**
```typescript
import { usePermissions } from './hooks/usePermissions';

function MyComponent() {
  const { canAccessMenu, role } = usePermissions();
  
  if (!canAccessMenu('/phonebook')) {
    return <div>You don't have access to PhoneBook</div>;
  }

  return <PhoneBook />;
}
```

**Method 2: Using Utility Function**
```typescript
import { getRoleFromAccountType, isMenuAllowed } from './utils/portalSettings';
import { useAuth } from './state/context/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  const role = getRoleFromAccountType(user?.accountType);
  
  if (!isMenuAllowed(role, '/phonebook')) {
    return <div>Access Denied</div>;
  }

  return <PhoneBook />;
}
```

### Protect a Route

```typescript
import PermissionGuard from './components/layout/PermissionGuard';

<Route 
  path="phonebook" 
  element={
    <PermissionGuard requiredPath="/phonebook">
      <PhoneBookPage />
    </PermissionGuard>
  } 
/>
```

### Check Path Access

```typescript
import { usePermissions } from './hooks/usePermissions';

function Router() {
  const { canAccessPath } = usePermissions();
  
  // Handles query strings properly
  const canAccess = canAccessPath('/admin?tab=users');
  
  if (!canAccess) {
    return <Navigate to="/studio/dashboard" />;
  }
}
```

### Use Conditional Rendering Based on Role

```typescript
import { usePermissions } from './hooks/usePermissions';

function Dashboard() {
  const { role, isAdmin, isStudio, isRegular } = usePermissions();

  return (
    <div>
      {isAdmin && <AdminPanel />}
      {isStudio && <StudioPanel />}
      {isRegular && <UserPanel />}
    </div>
  );
}
```

## 🔧 Admin Tasks

### Reset Permissions to Defaults

1. Go to `/portal-settings`
2. Select a role
3. Click "Reset to Defaults"
4. Confirm
5. Permissions restored to system defaults

### Bulk Enable/Disable All Menus for a Role

1. Select role
2. Click "Enable All" or "Disable All"
3. Click "Save Permissions"

### Search for Specific Menu Items

1. Use search box in Role & Menu Permissions
2. Type menu name or path
3. Results filter instantly

### Set Fine-Grained Permissions

1. Find menu item
2. Click "Show Options"
3. Toggle individual permissions:
   - View (required for menu access)
   - Create (for creating new items)
   - Edit (for modifying items)
   - Delete (for removing items)
   - Upload (for file uploads)
   - Download (for exports)
   - Share (for sharing items)
   - Manage (for administrative operations)

## 🎛️ Language Settings

1. Go to `/portal-settings`
2. Click "Language" tab
3. Select language (English/हिंदी)
4. Settings save automatically

## 🤖 AI Tools Settings

1. Go to `/portal-settings`
2. Click "AI Tools" tab
3. Toggle features on/off:
   - Enable AI Assistant (main toggle)
   - Page Context
   - Chat History
   - Voice Input/Output
   - Image Analysis
   - Debug options
4. Adjust advanced settings:
   - Max Tokens (256-32000)
   - Timeout (5000-120000 ms)
   - Primary/Fallback Models
5. Click "Save Settings"

## 📊 How Permissions Work

### Role Hierarchy

- **Admin**: Can access everything with all permissions
- **Studio**: Can access studio features and selected regular features
- **Regular**: Can access regular user features only

### Default Access Levels

| Feature | Admin | Studio | Regular |
|---------|-------|--------|---------|
| Dashboard | ✓ | ✓ | ✓ |
| Upload | ✓ | ✓ | ✓ |
| Photo Studio | ✓ | ✓ | ✗ |
| User Management | ✓ | ✗ | ✗ |
| Admin Panel | ✓ | ✗ | ✗ |
| Payment Management | ✓ | ✓ | ✗ |

## 🔐 Security Notes

- Permissions are stored locally in browser
- **Always validate on backend** - never trust client-side permissions alone
- Backend API should enforce the same restrictions
- High-risk operations should require additional confirmation

## 📝 Adding New Features to Permission System

### 1. Add Navigation Item
```typescript
// navConfig.tsx
{
  labelKey: 'nav.studio.newFeature',
  href: '/new-feature',
  icon: FaIcon,
  enabled: true
}
```

### 2. Add Translation
```json
// locales/en.json
{
  "nav": {
    "studio": {
      "newFeature": "My New Feature"
    }
  }
}
```

### 3. Protect Route
```typescript
<Route path="new-feature" element={
  <PermissionGuard requiredPath="/new-feature">
    <NewFeaturePage />
  </PermissionGuard>
} />
```

Done! Permissions automatically include the new feature.

## 🐛 Troubleshooting

### Menu isn't showing up

1. Check if enabled in admin permissions
2. Check if user has correct role
3. Refresh browser to clear cache
4. Check localStorage hasn't been cleared

```javascript
// Check in browser console:
Object.keys(localStorage)
// Look for 'portal_role_menu_permissions'
```

### User can't access disabled route

This is correct! They shouldn't be able to. Check permissions in admin panel to re-enable if needed.

### Permissions reverted after refresh

Ensure you click "Save Permissions" button. Changes only persist when saved.

### Language not changing

1. Make sure translation keys exist in en.json/hi.json
2. Check i18n config initialized properly
3. Try refreshing page after language change

## 💡 Tips & Best Practices

1. **Use the Hook**: `usePermissions` is cleaner than importing multiple utilities
2. **Check Early**: Validate permissions at route level, not component level
3. **Consistent Naming**: Keep labelKeys consistent across nav config and i18n
4. **Test All Roles**: Always test with admin, studio, and regular roles
5. **Backend Validation**: Client permissions are UI - always validate server-side
6. **Risk Assessment**: High-risk operations get visual indicators

## 📚 Reference Files

- **Types**: `src/types/permissions.ts`
- **Utilities**: `src/utils/portalSettings.ts`
- **Hook**: `src/hooks/usePermissions.ts`
- **Guard Component**: `src/components/layout/PermissionGuard.tsx`
- **Settings Page**: `src/pages/user/PortalSettingsPage.tsx`
- **Full Documentation**: `ROLE_PERMISSION_SYSTEM.md`

## ❓ FAQ

**Q: Can I have custom roles like "Manager" or "Editor"?**
A: Currently supports admin/studio/regular. To add custom roles, extend `RoleType` in `src/types/permissions.ts` and `buildDefaultRolePermissions()` in `portalSettings.ts`.

**Q: Are permissions synced across browser tabs?**
A: localStorage changes aren't automatically synced. Consider using `storage` event listener for multi-tab sync.

**Q: Can I give permissions to individual users?**
A: Currently it's role-based only. For user-specific overrides, you'd need to extend the permission structure.

**Q: What if permissions localStorage is corrupted?**
A: Clear localStorage and refresh - system will revert to defaults automatically.

**Q: Can backend control permissions?**
A: Yes! Replace localStorage calls in `portalSettings.ts` with API calls to your backend.

---

**Need help?** Check the main documentation in `ROLE_PERMISSION_SYSTEM.md`
