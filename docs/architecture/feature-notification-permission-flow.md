# Feature Architecture: Notification Permission Gate & Settings Toggle

## Overview
This document details the frontend notification permission flow, including the `NotificationPermissionGate` component for post-install permission prompting, and the push notification toggle added to both desktop and mobile settings views.

## 1. NotificationPermissionGate Component

**File**: `src/features/install-wall/components/NotificationPermissionGate.tsx`

### Purpose
A dedicated component that prompts users to enable push notifications after they've installed the PWA. It handles all three notification permission states with appropriate UI and actions.

### Permission States
| State | UI | Action |
|-------|-----|--------|
| `default` | Bell icon + "Allow Notifications" button | Calls `Notification.requestPermission()` |
| `granted` | Green checkmark + "Notifications enabled" | No action needed (success state) |
| `denied` | Muted BellOff icon + "Blocked" message | Instructs user to enable in browser settings |

### Component Flow
```
NotificationPermissionGate
  │
  ├── Check Notification.permission
  │     ├── "granted" → Show success state
  │     ├── "denied"  → Show blocked state with instructions
  │     └── "default" → Show "Allow Notifications" button
  │           └── onClick → Notification.requestPermission()
  │                 ├── "granted" → Update state, show success
  │                 └── "denied"  → Update state, show blocked
  │
  └── Re-check permission on mount (handles cases where
      user changed permission in browser settings)
```

### Key Implementation Details
- Uses `useState` for `notifPermission` and `isRequestingNotif` loading state.
- The `requestPermission()` call is wrapped in try/finally to ensure loading state resets.
- When permission is `denied`, the button is disabled with text "Blocked — Enable in Settings" since browsers don't allow re-prompting after denial.
- The component is exported from the `install-wall` feature index for easy import.

### Export
**File**: `src/features/install-wall/index.ts`
```typescript
export { default as NotificationPermissionGate } from "./components/NotificationPermissionGate";
```

## 2. Desktop Settings — Push Notifications Toggle

**File**: `src/components/views/SettingsView.tsx`

### Location
Added under the **Preferences** tab, below the Theme selector.

### UI Elements
- **Icon**: `Bell` (emerald, when granted) or `BellOff` (muted, when not granted) from `lucide-react`.
- **Label**: "Push Notifications"
- **Button**: 
  - When not granted: "Enable" (default variant, clickable)
  - When granted: "Enabled" (outline variant, disabled)
- **Toast feedback**:
  - On grant: "Notifications Enabled — You will receive push notifications for tasks and meetings."
  - On deny: "Notifications Blocked — Enable them in your browser settings to receive alerts."

### Button Handler
```typescript
onClick={async () => {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') return;
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    toast({ title: 'Notifications Enabled', description: '...' });
  } else {
    toast({ title: 'Notifications Blocked', description: '...', variant: 'destructive' });
  }
}}
```

### Safety Checks
- `typeof Notification !== 'undefined'` — Guards against SSR or non-browser environments.
- `Notification.permission === 'granted'` — Early return to prevent redundant prompts.
- Button is `disabled` when already granted.

## 3. Mobile Settings — Push Notifications Card

**File**: `src/components/views/mobile/MobileSettings.tsx`

### Location
Added as a new card between the Appearance (theme) card and the Sign Out button.

### UI Elements
- **Icon**: `Bell` (emerald, when granted) or `BellOff` (muted, when not granted).
- **Label**: "Push Notifications"
- **Description**: "Get alerts for task assignments and meeting invitations."
- **Button**: Same behavior as desktop toggle (Enable/Enabled states).

### Mobile-Specific Considerations
- Uses compact card layout with `pt-4 space-y-3` padding.
- Button uses `size="sm"` for mobile-appropriate touch target.
- Description text uses `text-xs text-muted-foreground` for mobile readability.
- Toast feedback identical to desktop version for consistency.

## 4. Permission Flow Architecture

```
User installs PWA (InstallPromptView)
  │
  ├── isStandalone becomes true
  │
  ├── InstallPromptView shows notification section
  │     └── User clicks "Allow Notifications"
  │           └── Notification.requestPermission()
  │                 ├── granted → usePushNotifications hook
  │                 │               registers FCM token with backend
  │                 └── denied  → User can retry from Settings
  │
  └── Later: User visits Settings (desktop or mobile)
        └── Push Notifications toggle shows current state
              └── If not granted, user can enable from here
```

## 5. Interaction with usePushNotifications Hook

The settings toggle and `NotificationPermissionGate` only request the **browser permission**. The actual FCM token registration is handled by the `usePushNotifications` hook:

1. User grants permission via any UI (gate, settings, install prompt).
2. `usePushNotifications` hook detects `Notification.permission === 'granted'` on next auth state change.
3. Hook calls `getToken()` to get the FCM token from Firebase.
4. Hook sends the token to `POST /api/users/fcm-token` on the backend.
5. Backend stores the token and uses it for push notification delivery.

This separation of concerns ensures:
- **UI components** only handle permission state and user interaction.
- **Hook** handles token lifecycle and backend communication.
- **Backend** handles token storage and notification dispatch.

## 6. Imports Added

### SettingsView.tsx (Desktop)
```typescript
import { Bell, BellOff } from 'lucide-react';  // Added to existing lucide import
```

### MobileSettings.tsx (Mobile)
```typescript
import { LogOut, Moon, Sun, Bell, BellOff } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
```

## Conclusion
The notification permission flow provides multiple touchpoints for users to enable push notifications — at install time via `NotificationPermissionGate`, and later via settings toggles on both desktop and mobile. The architecture cleanly separates permission management (UI) from token registration (hook) and notification delivery (backend), ensuring each layer can be modified independently.
