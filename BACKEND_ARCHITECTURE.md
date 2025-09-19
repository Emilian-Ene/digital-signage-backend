# Digital Signage Backend — Architecture, API, and Operations

This document describes the structure, core logic, and public API of the backend service powering PixelFlow CMS. It also lists important tools, environment variables, and conventions.

## 1) Tech Stack
- Node.js + Express (HTTP server and routing)
- MongoDB + Mongoose (data modeling and persistence)
- Multer (file uploads to local disk)
- CORS (cross‑origin access for the frontend)

Optional/Recommended:
- Helmet (security headers)
- Express-rate-limit (basic rate limiting)
- Morgan/Winston (logging)

## 2) Project Structure
```
 digital-signage-backend/
  ├─ .env
  ├─ package.json
  ├─ server.js
  ├─ models/
  │   ├─ Folder.js
  │   ├─ Media.js
  │   ├─ Player.js
  │   ├─ Playlist.js
  │   ├─ ProofOfPlayLog.js
  │   └─ Schedule.js
  ├─ routes/
  │   ├─ devices.js
  │   ├─ folders.js
  │   ├─ logs.js
  │   ├─ media.js
  │   ├─ players.js
  │   ├─ playlists.js
  │   └─ schedules.js
  └─ uploads/  (static files written by Multer)
```

## 3) Environment
Create `.env` with at least:
- `PORT=3000` — HTTP port
- `MONGO_URI=mongodb://localhost:27017/pixelflow`
- `CORS_ORIGIN=http://localhost:5173` — frontend origin (comma-separated allowed origins supported with custom logic)

## 4) Server (server.js)
- Connects to MongoDB via `MONGO_URI`.
- Configures CORS, JSON body parsing, and static serving for `/uploads`.
- Mounts route modules under `/api/...` or `/` depending on current code (adjust frontend base URL accordingly).
- Global error handling middleware recommended (returns `{ message, details? }`).

## 5) Data Models (Mongoose)
### 5.1 Folder
Key fields:
- `name: String` (required)
- `description: String`
- `mediaOrder: ObjectId[]` (NEW) — order of `Media` inside the folder
- Timestamps (`createdAt`, `updatedAt`)

Indexes:
- `{ createdAt: -1 }`
- `{ name: 1 }`

### 5.2 Media
Key fields (partial):
- `friendlyName: String`
- `fileName: String` (disk name under `/uploads`)
- `fileUrl: String` (public URL path, e.g. `/uploads/xyz.png`)
- `mediaType: 'image' | 'video'`
- `folder: ObjectId | null` (ref Folder)
- `duration: Number` (seconds, images default to 10)
- `width, height, fileSize`
- Timestamps

### 5.3 Player, Playlist, Schedule, ProofOfPlayLog
Represent devices, playlist definitions, content scheduling, and proof-of-play events. Each has timestamps; playlists store item arrays with media refs.

## 6) Core Flows
### 6.1 File Upload (Multer)
- Endpoint: `POST /media/upload`
- Accepts a single file field `mediaFile` and additional metadata: `friendlyName`, `folder`, `duration`, `width`, `height`, `fileSize`.
- Writes the physical file to `uploads/` and persists a `Media` document.
- If uploaded with a `folder`, the new media id is appended to that folder’s `mediaOrder` (via `$addToSet`).

### 6.2 Move Media Between Folders
- Endpoint: `PUT /media/:id/move` with body `{ folder: ObjectId | null }`.
- Validates folder exists.
- Updates `Media.folder` and keeps folder ordering consistent:
  - `$pull` the id from previous folder’s `mediaOrder` (if any)
  - `$addToSet` to the new folder’s `mediaOrder` (if provided)

### 6.3 Reorder Items Inside a Folder (NEW)
- Endpoint: `PUT /folders/:id/reorder`
- Body: `{ order: string[] }` where each id is a `Media._id` belonging to that folder.
- On success saves `folder.mediaOrder` = `order` (deduplicated, validated) and returns `{ folderId, order }`.
- `GET /folders/:id` returns media sorted by `mediaOrder` (missing ids appear at the end by `createdAt` desc).

### 6.4 Delete Media / Folder
- Deleting media also removes its file and pulls its id from any `mediaOrder`.
- Deleting a folder removes all contained media and their physical files.

## 7) API Overview
Note: Paths may be mounted under `/api`. Adjust accordingly.

### Folders
- `GET /folders` — list folders with preview and stats (size, duration, count)
- `GET /folders/:id` — folder details + ordered `mediaFiles`
- `GET /folders/:id/preview` — most recent media for preview
- `POST /folders` — create folder `{ name, description? }` (409 on duplicate name, case-insensitive)
- `PUT /folders/:id` — update `{ name, description }`
- `PUT /folders/:id/rename` — rename
- `PUT /folders/:id/reorder` — save `{ order: string[] }` (NEW)
- `DELETE /folders/:id` — delete folder + contained media

### Media
- `GET /media` — list all media (with folder populated)
- `GET /media/by-folder/:folderId` — list media for a folder (basic)
- `POST /media/upload` — upload file (multer)
- `PUT /media/:id/rename` — rename media `friendlyName`
- `PUT /media/:id/move` — move media to folder (or root)
- `DELETE /media/:id` — delete media + file (also pulls from `mediaOrder`)

### Players
- `GET /players` — list players
- `GET /players/:id` — player details (lastHeartbeat used to compute online/offline)
- `POST /players/pair` — pair a device (pairing code flow)
- `PUT /players/:id` — update player (e.g., name)
- `PUT /players/:id/assign` — assign content `{ contentType, contentId }`

### Playlists
- `GET /playlists` — list playlists
- `GET /playlists/:id` — playlist details
- `POST /playlists` — create
- `PUT /playlists/:id` — update items `{ items: [{ media, duration }] }` or name
- `DELETE /playlists/:id` — remove

### Schedules / Logs
- `GET /schedules`, `POST /schedules`, etc.
- `GET /logs` (proof-of-play)/other logging routes.

## 8) Response & Error Conventions
- Success: 2xx JSON payloads (objects or lists).
- Errors: `{ message: string, error?: string }` with appropriate status (400, 404, 409, 500).
- Validation: prefer early returns with clear messages.

## 9) Static Files & URLs
- Uploaded files are available under `/uploads/<fileName>` (Express static).
- The frontend composes absolute URLs using its configured API base (e.g., `http://localhost:3000/uploads/...`).

## 10) Security & Ops
- CORS: restrict to known origins via `CORS_ORIGIN`.
- Helmet: add standard security headers.
- Rate limiting: protect write endpoints.
- Payload limits: size limits on `express.json()` and multer file size if necessary.
- Logging: add morgan or winston with request ids for traceability.

## 11) Performance & Pagination
- For large libraries, paginate `GET /media` (e.g., `?page=&limit=`) and optionally provide search (`?q=`) and folder filters.
- Add indexes for frequent queries: `Media.folder`, `Media.createdAt`, `Player.lastHeartbeat`, etc.

## 12) Realtime (Roadmap)
- SSE or WebSocket channel for player status and now-playing synchronization.
- Event types: `playerHeartbeat`, `assignmentChanged`, `playlistProgress`.

## 13) Testing
- Unit tests for controllers and model hooks (Jest).
- Integration tests for upload/move/reorder flows (supertest + in-memory MongoDB).

## 14) Migrations / Backfills
- When adding `mediaOrder`, existing folders have `undefined` field; `GET /folders/:id` falls back to `createdAt` order.
- Optional backfill:
  - For each folder, set `mediaOrder` to current `Media.find({ folder }).sort({ createdAt: -1 })` ids.

## 15) Deployment Notes
- Serve uploads from a durable volume.
- Backup strategy for DB and uploads.
- Environment per stage (dev/staging/prod) with distinct DBs and origins.

## 16) Recent updates (2025-09-19)

Folder ordering (mediaOrder)
- models/Folder.js now includes:
  - `mediaOrder: [ObjectId]` — explicit order of media within a folder
- routes/folders.js:
  - `PUT /folders/:id/reorder` saves `{ order: string[] }` (media ids). Validates that all ids belong to the folder; saves a de‑duplicated sequence.
  - `GET /folders` preview uses the first id from `mediaOrder` if present (fallback to latest uploaded).
  - `GET /folders/:id` returns `mediaFiles` sorted by `mediaOrder`; any missing docs appended by `createdAt` desc.
- routes/media.js keeps `mediaOrder` in sync:
  - `POST /media/upload` with `folder` appends the new id to that folder’s `mediaOrder`.
  - `PUT /media/:id/move` pulls id from previous folder `mediaOrder` and `$addToSet`s it to the destination.
  - `DELETE /media/:id` pulls the id from its folder `mediaOrder` before removing the document and file.

Example: Reorder items inside a folder
```
PUT /folders/64fae.../reorder
Content-Type: application/json
{
  "order": ["6501a...", "6501b...", "6501c..."]
}
```
Response
```
200 OK
{
  "folderId": "64fae...",
  "order": ["6501a...", "6501b...", "6501c..."]
}
```

Example: Folder list with preview
```
GET /folders
[
  {
    "_id": "64fae...",
    "name": "Images",
    "previewItem": { "_id": "6501a...", "fileUrl": "/uploads/a.png", ... },
    "itemsCount": 12,
    "totalSize": 9348576,
    "totalDuration": 120
  }
]
```

Migration / Backfill notes
- Existing folders without `mediaOrder` will still work:
  - `GET /folders/:id` sorts by `mediaOrder` when present; otherwise the `createdAt` fallback ensures stable ordering.
- Optional backfill script (one-time):
  - For each folder, set `mediaOrder` to current media ids sorted by `createdAt` (or any desired default).

Client behavior (reference)
- The frontend calls `PUT /folders/:id/reorder` after drag‑and‑drop inside a folder.
- Folder cards in the UI show a preview from the first `mediaOrder` item.
- When moving or deleting items, the order remains consistent due to the server‑side updates listed above.

---
If you need OpenAPI/Swagger generation, we can add a `/docs` endpoint using `swagger-ui-express` and a YAML/JSON spec derived from the routes above.