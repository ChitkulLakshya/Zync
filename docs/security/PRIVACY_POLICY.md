# 🔐 Global Privacy Policy & Google API Compliance

**Effective Date: February 13, 2026**

This Privacy Policy describes how Zync ("we", "our", or "us") ingests, processes, and safeguards user information across our enterprise real-time collaboration web application and distributed backend services.

---

## 1. Information Collection & Scope

Zync operates on a principle of data minimization, collecting only data strictly required for collaborative document editing, team presence tracking, and workspace scheduling.

### A. Connected Google API Data (OAuth 2.0)
When users authorize the Google Calendar integration within their workspace settings, Zync requests read-only access to calendar data. Specifically, we ingest:
- **Event Summaries & Timestamps**: Meeting titles, start/end times, and attendee lists required to render the unified workspace schedule canvas.
- **Calendar Identifiers**: Primary calendar IDs selected explicitly by the user for workspace synchronization.

### B. Core Workspace Data
- **Identity Metadata**: Display names, email addresses, and profile avatars provided by authenticated identity providers (Firebase Auth, GitHub, LinkedIn).
- **Collaborative State**: Binary CRDT update payloads (`Yjs`) and unstructured canvas annotations stored in MongoDB.

---

## 2. Exclusive Use of Google API Data

Data acquired from Google Calendar is strictly ring-fenced. We utilize this data **exclusively** to:
1. **Render Workspace Agendas**: Populate the dashboard calendar widget with upcoming meetings.
2. **Calculate Team Overlaps**: Determine optimal collaboration windows across distributed timezones.
3. **Trigger In-App Reminders**: Deliver real-time meeting notifications via WebSockets.

**🚫 Strict Prohibitions**: Zync **never** sells, transfers, or shares Google Calendar data with third-party data brokers, advertising networks, or AI training pipelines.

---

## 3. Google API Limited Use Disclosure

Zync's ingestion, internal transfer, and processing of information received from Google APIs strictly adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the **Limited Use** requirements.

---

## 4. Data Storage, Encryption & Retention

### Encryption Standards
- **In Transit**: All frontend client-server interactions enforce TLS 1.3 encryption over HTTPS and WSS (WebSocket Secure).
- **At Rest**: Third-party OAuth refresh tokens and session credentials are encrypted prior to database persistence using AES-256-GCM.

### Lifecycle & Purging
- **Local Browser Caches**: Collaborative scratch buffers cached in browser `IndexedDB` are wiped upon explicit user sign-out or session expiration.
- **Account Revocation**: Users may revoke Zync's OAuth access at any time via [Google Account Security Settings](https://myaccount.google.com/permissions). Upon webhook notification or API revocation detection, Zync permanently purges associated cached calendar entries from MongoDB.

---

## 5. Contact & Data Protection Officer

For formal data subject access requests (DSAR) or compliance inquiries, contact:

**Zync Security & Compliance Engineering**  
Email: [privacy@zync.io](mailto:privacy@zync.io)  
GitHub Organization: [zync-meet](https://github.com/zync-meet)
