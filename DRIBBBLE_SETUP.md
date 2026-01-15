# Design Inspiration Setup Guide 🎨

This guide covers the integration of **Dribbble**, **Unsplash**, **Pinterest**, and **Behance** into Zync.

## 1. Environment Variables

Ensure your `backend/.env` has the following:

```bash
# Unsplash (Images)
UNSPLASH_ACCESS_KEY=your_key

# Pinterest (Visual Discovery)
PINTEREST_TOKEN=your_token
PINTEREST_BOARD_ID=your_board_id

# Dribbble (OAuth 2.0)
DRIBBBLE_CLIENT_ID=your_client_id
DRIBBBLE_CLIENT_SECRET=your_client_secret
DRIBBBLE_REDIRECT_URI=http://localhost:5000/api/dribbble/callback
```

---

## 2. Dribbble Integration 🏀

**Status**: Active (OAuth 2.0)

Dribbble's API v2 requires User Authentication to access shots.
1.  **Connect**: User clicks "Connect" in **Settings > Integrations**.
2.  **Auth Flow**: Redirects to Dribbble -> Grants Access -> Redirects to Backend -> Redirects to Frontend with Token.
3.  **Search**: The Design View uses this user token to fetch **Your Shots** (public search is restricted in API v2).

---

## 3. Unsplash Setup 📸

1.  Get Access Key from [Unsplash Developers](https://unsplash.com/developers).
2.  Add to `.env`.

---

## 4. Pinterest Setup 📌

1.  Get User Access Token (v5) with `pins:read` scope.
2.  Get Board ID.
3.  Add to `.env`.

---

## 5. Behance Setup 🖼️

Uses public RSS feeds. No API key required.
