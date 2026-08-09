# Feature Architecture: PWA Install Wall Enforcement

## Overview
This document details the implementation of mandatory Progressive Web App (PWA) installation enforcement on mobile browsers in Zync. Mobile users are blocked from accessing the app in a browser tab and must install the PWA to their home screen before proceeding. The install prompt UI was redesigned with a theme-aware Zync logo and a direct install button.

## 1. Install Detection Hook (`useAppInstallStatus`)

**File**: `src/features/install-wall/hooks/useAppInstallStatus.ts`

The hook determines whether the app is running in standalone (installed PWA) mode or a regular browser tab.

### Detection Methods
- **`window.matchMedia("(display-mode: standalone)")`** — Standard PWA detection for Chrome/Edge/Samsung.
- **`window.navigator.standalone`** — iOS Safari-specific non-standard property for PWA detection.
- The hook returns `isStandalone: true` if either check passes.

### Return Values
| Flag | Type | Description |
|------|------|-------------|
| `isMobileDevice` | `boolean` | True if user agent matches Android/iPhone/iPad/iPod |
| `isIOS` | `boolean` | True if user agent matches iPhone/iPad/iPod |
| `isAndroid` | `boolean` | True if user agent matches Android |
| `isStandalone` | `boolean` | True if running in PWA standalone mode |
| `requiresInstallWall` | `boolean` | True if mobile device AND not standalone |
| `hasCheckedStatus` | `boolean` | True after initial mount check completes |

### Install Wall Logic
```typescript
requiresInstallWall = isMobileDevice && !isStandalone
```
When `requiresInstallWall` is true, the install wall is shown instead of the app content.

## 2. Install Wall on Mobile Login

**File**: `src/mobile/pages/LoginMobile.tsx`

- The `useAppInstallStatus` hook is called at the top of `LoginMobile`.
- If `requiresInstallWall` is true, `<InstallPromptView>` is rendered instead of the login form.
- This ensures users cannot even reach the login screen without installing the PWA first.

## 3. Install Wall on Mobile Dashboard

**File**: `src/components/layout/MobileLayout.tsx`

- The `useAppInstallStatus` hook is called in `MobileLayout`.
- If `requiresInstallWall` is true, `<InstallPromptView>` is rendered as a full-screen overlay.
- This acts as a secondary gate — even if a user somehow bypasses the login wall, the dashboard is still blocked.

## 4. InstallPromptView Component

**File**: `src/features/install-wall/components/InstallPromptView.tsx`

### UI Layout
1. **Zync Logo** — Theme-aware using dual `<img>` tags:
   - `/zync-white.webp` with `block dark:hidden` (light mode)
   - `/zync-dark.webp` with `hidden dark:block` (dark mode)
2. **Title & Description** — "Install Zync" with a short subtitle.
3. **Install App Button** — Full-width button visible on all platforms:
   - **Android/Chrome**: Triggers the native `beforeinstallprompt` dialog via the captured `deferredPrompt` event.
   - **iOS/Safari**: Button is visible but tapping it does nothing (iOS has no install API). Manual instructions were removed per design decision.
   - **Fallback text**: "If nothing happens, open your browser menu and tap Install app" — shown for non-iOS browsers without `beforeinstallprompt` support.
4. **Notification Permission Section** — Only rendered when `isStandalone` is true (after the app is installed).

### `beforeinstallprompt` Event Handling
```typescript
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();           // Prevent browser's mini-infobar
  setDeferredPrompt(event);         // Store for later use
});
```
When the user clicks "Install App", the stored event's `prompt()` method is called to show the native install dialog.

### Notification Permission Gating
The notification permission UI is wrapped in `{isStandalone && (...)}` — it only appears after the app is installed as a PWA. This prevents confusing users with notification prompts before they've installed the app.

## 5. Theme-Aware Logo Pattern

The codebase uses a consistent dual-image pattern for theme-aware logos (no JavaScript needed):
```tsx
<img src="/zync-white.webp" className="... block dark:hidden" />
<img src="/zync-dark.webp" className="... hidden dark:block" />
```
This leverages Tailwind CSS's `dark:` variant, which toggles based on the `.dark` class on the `<html>` element (managed by `next-themes`).

## Conclusion
The PWA install wall ensures mobile users get a native app-like experience with proper push notification support, home screen icon, and standalone display mode. The enforcement is applied at both the login and dashboard layers as a defense-in-depth strategy.
