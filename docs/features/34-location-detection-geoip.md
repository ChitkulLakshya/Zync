# 34 — Location Detection & Geo-IP

**NEW document** — IP-based geolocation, user location storage, timezone detection, privacy considerations

---

## Feature Summary

Zync detects user location from their IP address for profile enrichment and timezone-aware features. The backend uses a geo-IP API to convert the client IP to city/country/coordinates, stores it on the User model, and returns it to the frontend for display.

---

## Architecture Diagram

```
┌─────────────────── FRONTEND ───────────────────────────┐
│                                                         │
│  SettingsView.tsx → Profile tab                         │
│  ├─ Location display (city, country)                    │
│  ├─ "Detect my location" button                         │
│  │   └─ POST /api/users/detect-location                 │
│  └─ Manual location override                            │
│                                                         │
│  DashboardHome.tsx                                      │
│  └─ Shows user timezone for session scheduling          │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────── BACKEND ────────────────────────────┐
│                                                         │
│  userRoutes.js → POST /detect-location                  │
│                                                         │
│  1. Extract client IP from request:                     │
│     ├─ req.headers['x-forwarded-for'] (proxy)           │
│     └─ req.socket.remoteAddress (direct)                │
│                                                         │
│  2. Call geo-IP API:                                    │
│     ├─ GET https://ipapi.co/{ip}/json/                  │
│     │   Returns: { city, country, latitude, longitude,  │
│     │            timezone, ... }                         │
│     └─ Fallback: if API fails, use generic location     │
│                                                         │
│  3. Store on User model:                                │
│     ├─ User.location = { city, country, lat, lng }      │
│     ├─ User.timezone = timezone string                  │
│     └─ User.locationDetectedAt = new Date()             │
│                                                         │
│  4. Return location data to frontend                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/routes/userRoutes.js`

### POST /detect-location
- **Auth:** required
- **Logic:**
  1. **Extract client IP:**
     ```js
     const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() 
                || req.socket.remoteAddress;
     ```
     - Handles proxy headers (Render, Vercel, Cloudflare)
     - Falls back to direct socket address
  2. **Skip for localhost:**
     ```js
     if (ip === '::1' || ip === '127.0.0.1') {
       return res.json({ city: 'Local', country: 'Unknown', timezone: 'UTC' });
     }
     ```
  3. **Call geo-IP API:**
     ```js
     const response = await axios.get(`https://ipapi.co/${ip}/json/`);
     const { city, country_name, latitude, longitude, timezone } = response.data;
     ```
  4. **Store on User:**
     ```js
     await User.findOneAndUpdate(
       { uid: req.user.uid },
       {
         $set: {
           'location.city': city,
           'location.country': country_name,
           'location.lat': latitude,
           'location.lng': longitude,
           'location.timezone': timezone,
           'locationDetectedAt': new Date(),
         }
       }
     );
     ```
  5. **Return location:**
     ```js
     res.json({ city, country: country_name, lat: latitude, lng: longitude, timezone });
     ```

### Error Handling
- **Geo-IP API rate limited:** Return generic location, log warning
- **Geo-IP API down:** Return `{ city: 'Unknown', country: 'Unknown' }`
- **Invalid IP:** Return generic location
- **Network error:** Return 500 with error message

---

## Frontend Trace

### Location Detection Flow
1. User clicks "Detect my location" in Settings
2. Frontend calls `POST /api/users/detect-location`
3. Backend extracts IP, calls geo-IP API, stores result
4. Frontend receives location data
5. Updates `useMe` query (TanStack Query)
6. Displays: "San Francisco, United States (PST)"

### Manual Override
- User can manually enter their city/country
- Stored in `User.location` (same fields as detected)
- `User.locationDetectedAt` set to null for manual entries

---

## Database Layer

### User.location (Mongoose Mixed field)
```js
{
  city: String,
  country: String,
  lat: Number,
  lng: Number,
  timezone: String,  // e.g., "America/Los_Angeles"
  manual: Boolean    // true if user entered manually
}
```

### User.locationDetectedAt
- Date of last auto-detection
- Used to determine if location is stale (>30 days = re-detect)

---

## Privacy Considerations

- **IP stored temporarily:** Only used for geo-IP lookup, not persisted
- **Location is optional:** User can disable location detection
- **Manual override:** User can set any location regardless of IP
- **No tracking:** Location is detected once, not continuously tracked
- **Precision:** City-level only (no street-level tracking)

---

## Error Paths

| Scenario | HTTP Status | Response |
|---|---|---|
| No token | 401 | Unauthorized |
| Localhost IP | 200 | `{ city: 'Local', country: 'Unknown' }` |
| Geo-IP API fails | 200 | `{ city: 'Unknown', country: 'Unknown' }` |
| Server error | 500 | `{ error: error.message }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEO_IP_API_URL` | No | Default: `https://ipapi.co` |

---

## Cross-References

- [09-user-profile-management.md](./09-user-profile-management.md) — Profile update endpoint
- [05-database-schema-and-models.md](./05-database-schema-and-models.md) — User model location fields
