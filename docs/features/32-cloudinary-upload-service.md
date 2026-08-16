# 32 — Cloudinary Upload Service

**NEW document** — Avatar upload, image optimization, buffer streaming, public ID extraction, asset deletion

---

## Feature Summary

Cloudinary is used for profile photo uploads and image management. The service handles uploading from file paths or memory buffers, automatic face-cropping for avatars (400x400), extracting public IDs from URLs for deletion, and cleaning up old assets when users update their photos.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  SettingsView.tsx → Profile tab                         │
│  ├─ Avatar upload (file input)                          │
│  │   └─ POST /api/users/me/avatar (multipart/form-data) │
│  ├─ Image preview before upload                         │
│  └─ Old avatar deleted on new upload                    │
│                                                         │
│  Chat file attachments:                                 │
│  └─ POST /api/chat/upload (multipart)                   │
│      └─ Uses uploadImageBuffer for chat files           │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/services/cloudinaryService.js (227 lines)      │
│                                                         │
│  Functions:                                             │
│  ├─ uploadProfilePhoto(filePath, uid)                   │
│  │   ├─ Folder: zync-profiles                           │
│  │   ├─ Public ID: profile_{uid}_{timestamp}            │
│  │   ├─ Transform: 400x400, crop=fill, gravity=face     │
│  │   └─ Returns: { secure_url, public_id, ... }         │
│  │                                                      │
│  ├─ uploadImageBuffer(buffer, folder, publicId)         │
│  │   ├─ Uses upload_stream (no temp file needed)        │
│  │   ├─ overwrite: true                                 │
│  │   └─ Returns: { secure_url, public_id, ... }         │
│  │                                                      │
│  ├─ extractPublicId(url)                                │
│  │   ├─ Parses Cloudinary URL to get public_id          │
│  │   ├─ Handles version prefixes (v123456)              │
│  │   └─ Strips file extension                           │
│  │                                                      │
│  └─ deleteCloudinaryAsset(url)                           │
│      ├─ Extract public_id from URL                      │
│      └─ cloudinary.uploader.destroy(publicId)           │
│                                                         │
│  Callers:                                               │
│  ├─ userRoutes.js → /me/avatar (uploadProfilePhoto)     │
│  ├─ userRoutes.js → /me/avatar (deleteCloudinaryAsset)  │
│  └─ chatRoutes.js → /upload (uploadImageBuffer)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/services/cloudinaryService.js` (227 lines)

### Configuration (lines 86-93)
```js
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

### extractPublicId(url) (lines 101-140)
Parses a Cloudinary URL to extract the `public_id` needed for deletion.

**URL format:**
```
https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{ext}
```

**Algorithm:**
1. Validate URL contains `cloudinary.com`
2. Split URL by `/`
3. Find `upload` segment index
4. Skip version prefix if present (`v1234567890`)
5. Rejoin remaining parts (handles nested folders)
6. Strip file extension (last `.`)
7. Return `public_id`

**Example:**
```
Input:  https://res.cloudinary.com/zync/image/upload/v1700000000/zync-profiles/profile_abc123_1700000000.jpg
Output: zync-profiles/profile_abc123_1700000000
```

### deleteCloudinaryAsset(url) (lines 148-163)
```js
const deleteCloudinaryAsset = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return null;
  try {
    console.log(`Deleting Cloudinary asset: ${publicId}`);
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary deletion failed:', error);
    throw error;
  }
};
```
- **Used when:** User uploads new avatar → old avatar URL is deleted
- **Non-blocking:** If extraction fails (null), returns null (no crash)

### uploadProfilePhoto(filePath, uid) (lines 172-191)
```js
const uploadProfilePhoto = async (filePath, uid) => {
  const publicId = `profile_${uid}_${Date.now()}`;
  return await cloudinary.uploader.upload(filePath, {
    folder: 'zync-profiles',
    public_id: publicId,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    ],
  });
};
```
- **Unique public_id:** `profile_{uid}_{timestamp}` — prevents cache issues
- **Transformation:** 400x400, fill crop, face gravity (auto-centers on face)
- **Folder:** `zync-profiles` — organized in Cloudinary dashboard

### uploadImageBuffer(buffer, folder, publicId) (lines 200-218)
```js
const uploadImageBuffer = (buffer, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, overwrite: true },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};
```
- **Stream-based:** No temp file needed — uploads directly from buffer
- **overwrite: true:** If same public_id exists, replaces it
- **Used for:** Chat file attachments, optimized image uploads

---

## Avatar Upload Flow

```
1. User selects image file in Settings
2. Frontend: POST /api/users/me/avatar (multipart/form-data)
3. Backend (userRoutes.js):
   a. multer receives file → temp path
   b. uploadProfilePhoto(filePath, uid)
      → Cloudinary upload with face-crop transformation
      → Returns { secure_url, public_id }
   c. If user had old avatar:
      → deleteCloudinaryAsset(oldAvatarUrl)
      → Old image removed from Cloudinary
   d. Update User.photoURL = new secure_url
   e. Delete temp file (fs.unlink)
   f. Return { photoURL: new secure_url }
```

---

## Error Paths

| Scenario | Handling |
|---|---|
| Cloudinary not configured | Upload fails, error thrown to caller |
| Invalid URL (not Cloudinary) | `extractPublicId` returns `null` |
| Upload fails | Error thrown, caller returns 500 |
| Deletion fails | Error thrown, logged, non-blocking |
| Buffer upload stream error | Promise rejects, caller catches |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |

---

## Cross-References

- [09-user-profile-management.md](./09-user-profile-management.md) — Avatar upload endpoint
- [23-instant-chat-system.md](./23-instant-chat-system.md) — Chat file attachments
- [04-service-inventory.md](./04-service-inventory.md) — Cloudinary service listing
