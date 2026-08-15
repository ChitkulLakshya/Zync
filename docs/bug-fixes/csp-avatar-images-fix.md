# Fix: GitHub Avatar Image CSP Error

## Problem Description
In the production deployment (hosted on Vercel), the application encountered a Content Security Policy (CSP) violation when rendering the contributor avatars in the `ContributorTicket` component on the landing page.

The exact error was:
`Loading the image 'https://github.com/...' violates the following Content Security Policy directive: "img-src 'self' data: blob: https://avatars.githubusercontent.com ...". The action has been blocked.`

This happened because the `vercel.json` defines a strict `Content-Security-Policy` header. The `img-src` directive whitelists `https://avatars.githubusercontent.com` but does not include `https://github.com`. Because the image `src` was set to `https://github.com/<username>.png`, the browser blocked the request before it could redirect to the valid `githubusercontent.com` origin.

This issue didn't occur on localhost because the local development server (via `vite.config.ts`) does not enforce an `img-src` directive in its CSP, thereby falling back to allowing all images.

## Resolution
Instead of relaxing the Vercel CSP to broadly allow `https://github.com` (which would violate the principle of least privilege), the image source URLs in `src/components/landing/ContributorTicket.tsx` were updated to directly point to their final resolution URLs. 

### Changes Made:

**1. `src/components/landing/ContributorTicket.tsx`**
- Replaced `https://github.com/<username>.png` with `https://avatars.githubusercontent.com/<username>?s=48`
- Added `?s=48` size parameter (2x retina for 24px display) — reduces payload from 346KB to ~19KB total (94% reduction)
- Added `width={24}` and `height={24}` attributes to prevent layout shift
- Added `loading="lazy"` for deferred off-screen image loading

**2. `src/components/landing/DesktopPreview.tsx`**
- Replaced 7 mock avatar URLs from `api.dicebear.com` and `i.pravatar.cc` with `ui-avatars.com` (already in CSP `img-src` whitelist)
- These URLs would have caused the same CSP violation in production on the landing page

**3. `.gitignore`**
- Added `.gradle/` to prevent Gradle build cache files from being committed

**4. Removed stray file**
- `app-clients/android-kotlin/.gradle/8.9/gc 3.properties` (empty Gradle cache file)

### Benefits:
1. **Security**: Keeps the Content Security Policy strict and secure — no new domains added to CSP.
2. **Performance**: Bypasses the 302 HTTP redirect from `github.com` to `avatars.githubusercontent.com`, plus reduces avatar payload by 94% via size parameter.
3. **UX**: `loading="lazy"` and `width`/`height` prevent layout shift and unnecessary loading.
4. **Completeness**: Fixes the same class of CSP bug in `DesktopPreview.tsx` that was on the landing page.
