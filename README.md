# Digital Signage Backend (Express + MongoDB)

## Overview
Provides REST APIs for players, media, folders, playlists, and logs. Used by the React frontend.

## Key Models
- Player: device pairing, assigned content
- Media: uploaded files with metadata (type, size, duration)
- Folder: groups media; preserves manual order
- Playlist: name, orientation ('Landscape' | 'Portrait' | 'Custom'), items [{ media, duration }]

## Notable Endpoints
- GET /api/playlists — list (populated with media); adds itemsCount/totalDuration/totalSize
- GET /api/playlists/:id — details (populated)
- POST /api/playlists — { name, orientation } → creates playlist
- PUT /api/playlists/:id — dynamic update of:
  - name?: string
  - items?: array (can be empty)
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

## Recent Changes (2025-09-19)
- Playlists: PUT now accepts `orientation`; validates values; still supports `name` and `items`.
- Folders: maintained `mediaOrder` and preview item logic.

## Setup
- Node 18+, MongoDB
- env:
  - MONGO_URI=mongodb://localhost:27017/digital-signage
  - FRONTEND_ORIGIN=http://localhost:5173
  - PORT=3000

## Dev
- npm install
- npm run dev (nodemon)
- Serves static uploads at /uploads

## Notes
- CORS restricts origins to local dev by default; configure FRONTEND_ORIGIN for others.
- Use SYNC_INDEXES=true once to sync indexes after schema changes.
