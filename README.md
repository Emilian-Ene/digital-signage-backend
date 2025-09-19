# Digital Signage Backend (Express + MongoDB)

## Overview
Provides REST APIs for players, media, folders, playlists, and logs. Used by the React frontend and APK.

## Key Models
- Player: device pairing, assigned content
- Media: uploaded files with metadata (type, size, duration)
- Folder: groups media; preserves manual order
- Playlist: name, orientation ('Landscape' | 'Portrait' | 'Custom'), items [{ media, duration, displayMode }]

## Notable Endpoints
- GET /api/playlists — list (populated with media); adds itemsCount/totalDuration/totalSize; ensures each item has displayMode ('contain' default)
- GET /api/playlists/:id — details (populated); ensures each item has displayMode ('contain' default)
- POST /api/playlists — { name, orientation } → creates playlist
- PUT /api/playlists/:id — dynamic update of:
  - name?: string
  - items?: array of { media, duration, displayMode }
  - orientation?: 'Landscape' | 'Portrait' | 'Custom'
- DELETE /api/playlists/:id — delete and unassign from all players

- Folders
  - GET /api/folders — list
  - GET /api/folders/:id — { folderDetails, mediaFiles } (ordered if mediaOrder exists)
  - PUT /api/folders/:id/reorder — save order of media in folder

- Media
  - POST /api/media/upload — multipart upload
  - PUT /api/media/:id/move — change folder
  - PUT /api/media/:id/rename — rename
  - DELETE /api/media/:id — delete

## APK Heartbeat (/api/devices/heartbeat)
- Request: { deviceId, pairingCode? }
- Responses:
  - { status: 'unpaired', playlist: null }
  - { status: 'paired_waiting', playlist: null }
  - { status: 'playing', playlist: { orientation, items: [{ type, url, duration, displayMode }] } }
- Behavior:
  - Populates playlist items with media, builds absolute URLs (BASE_URL or request host)
  - Always includes orientation ('Landscape' default for single-media assignment)
  - Defaults displayMode to 'contain' if missing

## Recent Changes (2025-09-19)
- Playlists: items now support `displayMode` ('contain'|'cover'|'fill')
- Playlist PUT accepts `orientation` and `items[]` with `displayMode`
- GET playlist endpoints coerce missing `displayMode` to 'contain' for compatibility
- Heartbeat payload includes `orientation` and per-item `displayMode`

## Setup
- Node 18+, MongoDB
- env:
  - MONGO_URI=mongodb://localhost:27017/digital-signage
  - FRONTEND_ORIGIN=http://localhost:5173
  - PORT=3000
  - BASE_URL=http://localhost:3000 (for absolute media URLs)

## Dev
- npm install
- npm run dev (nodemon)
- Serves static uploads at /uploads

## Notes
- CORS restricts origins to local dev by default; configure FRONTEND_ORIGIN for others.
- Use SYNC_INDEXES=true once to sync indexes after schema changes.
