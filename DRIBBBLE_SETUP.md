# Design Inspiration Setup Guide 🎨

> **Note**: While originally intended for Dribbble, the current system integrates **Unsplash**, **Pinterest**, and **Behance** to provide a rich feed of design inspiration without the limitations of the legacy Dribbble API.

This guide explains how to configure the backend to fetch inspiration from these sources.

## 1. Environment Variables

Add the following keys to your `backend/.env` file:

```bash
# Unsplash (Images)
UNSPLASH_ACCESS_KEY=your_unsplash_client_id

# Pinterest (Visual Discovery)
PINTEREST_TOKEN=your_pinterest_bearer_token
PINTEREST_BOARD_ID=your_pinterest_board_id_to_fetch_from

# Behance (Portfolio)
# No API Key required! Uses Public RSS Feeds.
```

---

## 2. Unsplash Setup 📸

1.  Go to the [Unsplash Developers](https://unsplash.com/developers).
2.  Click **Your Apps** -> **New Application**.
3.  Accept terms and clear the checklist.
4.  Copy the **Access Key** (Client ID).
5.  Paste it as `UNSPLASH_ACCESS_KEY`.

---

## 3. Pinterest Setup 📌

Pinterest API v5 is used to fetch pins from a specific board (e.g., a "UI Patterns" board you curate).

1.  **Create App**: Go to [Pinterest Developers](https://developers.pinterest.com/apps/) and create an app.
2.  **Generate Token**: Use the API Explorer or basic POST request to generate a User Access Token with `boards:read` and `pins:read` scopes.
    *   *Pro Tip*: For personal aggregation, a long-lived user token is easiest.
3.  **Get Board ID**:
    *   Go to your Pinterest Board and look at the URL: `pinterest.com/username/board-slug/`.
    *   Use the Pinterest API or Page Source to find the numeric `board_id` (or just use the API to list your boards).
4.  Set `PINTEREST_TOKEN` and `PINTEREST_BOARD_ID`.

---

## 4. Behance Setup 🖼️

The system uses Behance's public RSS feeds to avoid complex OAuth for read-only data.

*   **Endpoint**: `https://www.behance.net/feeds/projects`
*   **Tags**: `web design` + User Query.
*   **Configuration**: None required. It works out of the box!

---

## Troubleshooting

### "No Inspiration Found"
*   **Behance**: Check if their RSS feed is down or rate-limited.
*   **Unsplash**: Check if your Application is in "Demo" mode (limited to 50 requests/hr).
*   **Pinterest**: Tokens expire. If images vanish, generate a new Access Token.

### API Response Format
The internal API (`/api/design/search`) normalizes all three sources into a single schema:

```json
{
  "id": "source_uniqueid",
  "source": "unsplash|pinterest|behance",
  "title": "Project Title",
  "image": "https://url.to/image.jpg",
  "link": "https://original.source.url",
  "creator": "Artist Name"
}
```
