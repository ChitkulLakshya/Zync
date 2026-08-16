# 38 — File Upload Service

**NEW document** — Multer configuration, multipart handling, chat file attachments, image optimization, upload routes

---

## Feature Summary

The file upload service handles multipart/form-data uploads for chat attachments and profile photos. Uses Multer for file parsing with memory storage, Sharp for image optimization, and Cloudinary for persistent storage. Supports images, documents, and general file types with size limits.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  ChatInterface.tsx                                      │
│  ├─ File attach button → file input                     │
│  ├─ Drag-and-drop zone                                  │
│  ├─ Image preview before send                           │
│  └─ POST /api/upload (multipart/form-data)              │
│                                                         │
│  SettingsView.tsx → Avatar                              │
│  └─ POST /api/users/me/avatar (multipart)               │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  backend/routes/uploadRoutes.js                         │
│  ├─ POST /  → general file upload                       │
│  └─ POST /image → optimized image upload                │
│                                                         │
│  Middleware:                                            │
│  ├─ authMiddleware → verify JWT                         │
│  └─ multer → parse multipart, memory storage            │
│                                                         │
│  Image Pipeline:                                        │
│  1. Multer receives file → req.file.buffer              │
│  2. Sharp: resize, compress, format conversion          │
│  3. Cloudinary: uploadImageBuffer(optimized)            │
│  4. Return { url, publicId, fileName, fileSize }        │
│                                                         │
│  File Pipeline:                                         │
│  1. Multer receives file → req.file.buffer              │
│  2. Cloudinary: uploadImageBuffer(buffer, folder)       │
│  3. Return { url, publicId, fileName, fileSize }        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/uploadRoutes.js`

### Multer Configuration
```js
const multer = require('multer');
const storage = multer.memoryStorage(); // Store in memory, not disk
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
                     'application/pdf', 'text/plain', 'application/json'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});
```

### POST / (general upload)
- **Auth:** required
- **Middleware:** `upload.single('file')`
- **Logic:**
  1. File in `req.file.buffer` (memory storage)
  2. Upload to Cloudinary: `uploadImageBuffer(req.file.buffer, 'zync-uploads', publicId)`
  3. Return: `{ url, publicId, fileName: req.file.originalname, fileSize: req.file.size }`

### POST /image (optimized image upload)
- **Auth:** required
- **Middleware:** `upload.single('file')`
- **Logic:**
  1. File in `req.file.buffer`
  2. **Sharp optimization:**
     ```js
     const optimized = await sharp(req.file.buffer)
       .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
       .jpeg({ quality: 80, progressive: true })
       .toBuffer();
     ```
  3. Upload optimized buffer to Cloudinary
  4. Return: `{ url, publicId, fileName, fileSize: optimized.length }`

---

## File Type Support

| Type | MIME Types | Max Size | Optimization |
|---|---|---|---|
| Images | jpeg, png, gif, webp | 10MB | Sharp resize + compress |
| Documents | pdf, txt, json | 10MB | None (stored as-is) |
| Other | Rejected | — | — |

---

## Sharp Image Optimization

```
Input: any image format, any size
  ↓
Sharp pipeline:
  ├─ Resize: max 1920x1080 (fit: inside, no enlargement)
  ├─ Format: JPEG (quality 80, progressive)
  └─ Output: optimized buffer
  ↓
Cloudinary upload_stream
  ↓
Return: secure_url
```

- **Quality 80:** Good balance of visual quality and file size
- **Progressive JPEG:** Better perceived load time
- **Max 1920x1080:** Sufficient for most display contexts
- **withoutEnlargement:** Small images aren't upscaled

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| No file provided | 400 | `{ error: "No file provided" }` |
| File too large | 413 | `{ error: "File too large (max 10MB)" }` |
| File type not allowed | 400 | `{ error: "File type not allowed" }` |
| Cloudinary upload fails | 500 | `{ error: "Upload failed" }` |
| Sharp processing fails | 500 | `{ error: "Image processing failed" }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `MAX_FILE_SIZE_MB` | No | Default: 10 |

---

## Cross-References

- [32-cloudinary-upload-service.md](./32-cloudinary-upload-service.md) — Cloudinary service
- [23-instant-chat-system.md](./23-instant-chat-system.md) — Chat file attachments
- [09-user-profile-management.md](./09-user-profile-management.md) — Avatar upload
