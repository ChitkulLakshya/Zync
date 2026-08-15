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
- **Modified File**: `src/components/landing/ContributorTicket.tsx`
- **Updates**:
  - Replaced `https://github.com/prem22k.png` with `https://avatars.githubusercontent.com/prem22k`
  - Replaced `https://github.com/chitkullakshya.png` with `https://avatars.githubusercontent.com/chitkullakshya`
  - Replaced `https://github.com/eesha264.png` with `https://avatars.githubusercontent.com/eesha264`
  - Replaced `https://github.com/thanmayeereddykotha.png` with `https://avatars.githubusercontent.com/thanmayeereddykotha`

### Benefits:
1. **Security**: Keeps the Content Security Policy strict and secure.
2. **Performance**: Bypasses the 302 HTTP redirect from `github.com` to `avatars.githubusercontent.com`, resulting in slightly faster image loading.
