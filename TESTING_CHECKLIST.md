# Deployment & Testing Checklist

## ✅ Pre-Deployment

### Code Quality
- [ ] No TypeScript errors: `npm run build` succeeds
- [ ] No console warnings in dev mode
- [ ] All imports working correctly
- [ ] All files compile without issues

### File Creation Verification
- [ ] `src/types/permissions.ts` exists
- [ ] `src/utils/portalSettings.ts` exists
- [ ] `src/pages/user/PortalSettingsPage.tsx` exists
- [ ] `src/components/layout/PermissionGuard.tsx` exists
- [ ] `src/hooks/usePermissions.ts` exists
- [ ] `ROLE_PERMISSION_SYSTEM.md` exists
- [ ] `PERMISSION_QUICK_START.md` exists

### File Updates Verification
- [ ] `src/components/layout/Sidebar.tsx` updated with permission filtering
- [ ] `src/components/layout/Navigation.tsx` updated with permission filtering
- [ ] `src/App.tsx` imports PortalSettingsPage
- [ ] `src/App.tsx` has `/portal-settings` route

---

## 🧪 Testing Phase

### Admin Access Tests

#### Test 1: Access Settings Page
```
✓ Login as admin user
✓ Navigate to /portal-settings
✓ Page loads without errors
✓ All 8 tabs visible
✓ Role & Menu Permissions tab visible
```

#### Test 2: Role Selection
```
✓ Click Admin tab → Page loads
✓ Click Studio tab → Page loads
✓ Click Regular tab → Page loads
✓ Can switch between roles
✓ Displays different permissions for each role
```

#### Test 3: Search Functionality
```
✓ Type "dashboard" → Filters results
✓ Type "/phonebook" → Shows phonebook item
✓ Clear search → Shows all items
✓ Search is case-insensitive
```

#### Test 4: Permission Toggles
```
✓ Click "Enable" switch → Changes state
✓ Click "Show Options" → Advanced options appear
✓ Toggle individual permissions (view/create/edit/delete)
✓ All toggles work without errors
```

#### Test 5: Bulk Actions
```
✓ Select "Regular" role
✓ Click "Enable All" → All items enabled
✓ Click "Save Permissions" → Settings saved
✓ Refresh page → Settings persisted
✓ Select role again, click "Disable All" → All disabled
✓ Click "Reset to Defaults" → Restored to default state
```

#### Test 6: Risk Badges
```
✓ View Admin role permissions
✓ User Management shows "High Risk" badge
✓ Payment Management shows "High Risk" badge
✓ Feature Flags shows "High Risk" badge
✓ Admin Settings shows "High Risk" badge
✓ Regular items don't show risk badge
```

#### Test 7: Language Settings
```
✓ Click Language tab
✓ Click English button → UI in English
✓ Click हिंदी button → UI in Hindi
✓ Settings changes immediately
✓ Refresh page → Language persisted
```

#### Test 8: AI Tools Settings
```
✓ Click AI Tools tab
✓ Toggle "Enable AI Assistant" ON/OFF
✓ Toggle "Page Context" ON/OFF
✓ Change "Max Tokens" value → Accepts numbers
✓ Click "Save Settings" → Toast shows success
✓ Refresh page → Settings persisted
```

#### Test 9: Save/Reset Workflows
```
✓ Modify permissions for Studio role
✓ Don't click Save → Changes don't persist on refresh
✓ Modify again and click Save → Changes persist
✓ Click Reset to Defaults → Restored immediately
✓ Confirm reset is visible without needing to save again
```

### User Role Tests

#### Test 10: Regular User (Non-Admin)
```
✓ Login as regular user
✓ Sidebar shows only regular menu items
✓ Sidebar does NOT show admin items
✓ Mobile nav shows only regular items
✓ Navigate to /admin → Redirected to /studio/dashboard
✓ Direct URL to /admin?tab=users → Redirected
✓ Cannot access /portal-settings (admin section)
```

#### Test 11: Studio User (FREE Account)
```
✓ Login as studio user
✓ Sidebar shows studio items
✓ Sidebar shows some regular items
✓ Sidebar does NOT show admin items
✓ Can access studio-specific routes
✓ Cannot access admin routes directly
```

#### Test 12: Admin User
```
✓ Login as admin user
✓ Sidebar shows all items
✓ Sidebar shows admin section
✓ Can access all routes
✓ Can access /portal-settings
```

### Permission Enforcement Tests

#### Test 13: Disable Menu Item - Regular User
```
✓ Admin disables /phonebook for regular role
✓ Admin saves permissions
✓ Regular user logs in
✓ Phonebook NOT in sidebar/mobile nav
✓ Regular user tries direct URL /phonebook → Redirected
✓ Message/redirect indicates access denied
```

#### Test 14: Disable Menu Item - Studio User
```
✓ Admin disables /studio/payment-management for studio role
✓ Admin saves permissions
✓ Studio user logs in
✓ Payment Management NOT in sidebar
✓ Direct URL to /studio/payment-management → Redirected
```

#### Test 15: Re-enable Menu Item
```
✓ Regular user couldn't access phonebook
✓ Admin enables /phonebook for regular role
✓ Admin saves permissions
✓ Regular user refreshes page
✓ Phonebook now appears in sidebar
✓ Can access /phonebook
```

### Cross-Browser & Device Tests

#### Test 16: Desktop Sidebar
```
✓ Test in Chrome → Works
✓ Test in Firefox → Works
✓ Test in Safari → Works
✓ Permissions respected
✓ No console errors
```

#### Test 17: Mobile Navigation
```
✓ Open on iPhone/Android → Mobile nav works
✓ Click menu items → Navigate correctly
✓ Permissions filtered correctly
✓ Search works on mobile
✓ Responsive layout maintained
```

#### Test 18: Tablet View
```
✓ Medium screen size → Sidebar visible
✓ Scroll through menu → All items visible
✓ Settings page responsive
✓ Tab layout adjusts properly
```

### Edge Cases

#### Test 19: Empty State
```
✓ First time user → Defaults load
✓ localStorage cleared → Defaults load
✓ Permissions regenerated → All correct
```

#### Test 20: Multiple Tabs
```
✓ Open /portal-settings in two tabs
✓ Change permissions in Tab 1
✓ Save permissions in Tab 1
✓ Refresh Tab 2 → Shows updated permissions
```

#### Test 21: Rapid Filtering
```
✓ Type quickly in search → Filters respond
✓ No UI freezing
✓ All results accurate
```

### Data Persistence

#### Test 22: localStorage Verification
```
✓ Open browser DevTools → Application → localStorage
✓ Look for "portal_role_menu_permissions"
✓ Data structure is valid JSON
✓ Contains all 3 roles
✓ Each role has menu items with permissions
```

#### Test 23: Settings Persistence
```
✓ Save permissions → Check localStorage
✓ Change language → Check localStorage key "fv_language"
✓ Save AI settings → Check localStorage key "portal_ai_tool_settings"
✓ All settings persist across page refreshes
```

---

## 🚀 Post-Deployment

### Monitoring
- [ ] No errors in production console
- [ ] Settings page loads in < 2 seconds
- [ ] Permission checks don't slow navigation
- [ ] No memory leaks on long sessions

### User Communication
- [ ] Users informed about new settings page
- [ ] Documentation shared with admins
- [ ] Support team trained on permission management
- [ ] Help docs updated

### Rollback Plan
- [ ] Keep backup of original Sidebar.tsx and Navigation.tsx
- [ ] Document original behavior in case rollback needed
- [ ] Have clear deployment notes

---

## 📋 Sign-Off Checklist

### Quality Assurance
- [ ] All tests passed (show test results)
- [ ] No TypeScript errors
- [ ] No console errors/warnings in dev or prod
- [ ] Performance acceptable (no slowdowns)
- [ ] UI/UX acceptable (looks professional)

### Functionality
- [ ] Admins can manage permissions
- [ ] Users see only permitted menus
- [ ] Route-level access enforced
- [ ] Settings persist across sessions
- [ ] Multiple roles work correctly

### Documentation
- [ ] ROLE_PERMISSION_SYSTEM.md complete
- [ ] PERMISSION_QUICK_START.md complete
- [ ] Code comments present
- [ ] Constants documented (storage keys, defaults)

### Deployment Ready
- [ ] Approved by product owner
- [ ] Approved by tech lead
- [ ] Ready for production deployment
- [ ] Rollback plan in place
- [ ] Support team ready

---

## 📞 Support Resources

### For Questions
1. **Quick Reference**: See `PERMISSION_QUICK_START.md`
2. **Detailed Docs**: See `ROLE_PERMISSION_SYSTEM.md`
3. **API Reference**: See inline comments in:
   - `src/utils/portalSettings.ts`
   - `src/types/permissions.ts`
   - `src/hooks/usePermissions.ts`

### Common Issues & Solutions

**Issue**: "Portal settings page doesn't load"
- Verify: `/portal-settings` route exists in App.tsx
- Check: User is logged in and is admin
- Verify: PortalSettingsPage imported correctly

**Issue**: "Permissions not persisting"
- Verify: localStorage not disabled in browser
- Check: "Save Permissions" button was clicked
- Verify: localStorage keys correct (`portal_role_menu_permissions`)

**Issue**: "Menu items still showing after disable"
- Verify: Page was refreshed after saving
- Check: Correct role selected in admin panel
- Verify: No browser cache issues (hard refresh: Ctrl+Shift+R)

**Issue**: "TypeScript errors after deployment"
- Verify: All new files present
- Check: No import path typos
- Verify: react-icons/fa has icon (use existing icons)

---

## 🎉 Deployment Complete

When all tests pass and sign-off complete:
1. Create git commit with all changes
2. Tag version: `v-x.x.x-permissions` 
3. Deploy to production
4. Monitor for 24 hours
5. Update status page

**Expected Outcome**: Users can now log in, and admins can manage fine-grained role-based menu permissions with a professional UI!

✅ Ready to deploy! 🚀
