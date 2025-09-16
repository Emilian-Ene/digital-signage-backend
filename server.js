// server.js

const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const cors = require('cors');
require('dotenv').config();

// Import Routes and Models
const playerRoutes = require('./routes/players');
const mediaRoutes = require('./routes/media');
const playlistRoutes = require('./routes/playlists');
const deviceRoutes = require('./routes/devices');
const folderRoutes = require('./routes/folders');
const Player = require('./models/Player');
const logRoutes = require('./routes/logs');

// Create an Express App
const app = express();

// CORS (keep your existing config) with optional env-configured origins
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const extraOrigins = FRONTEND_ORIGIN
  ? FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', ...extraOrigins];
const corsOptions = {
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS policy: This origin is not allowed: ' + origin));
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Lightweight health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Port
const PORT = process.env.PORT || 3000;

// Mongoose index behavior
const isProd = process.env.NODE_ENV === 'production';
mongoose.set('autoIndex', !isProd); // auto-create indexes only in dev

// Mount API routes
app.use('/api/players', playerRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/logs', logRoutes);

// Bootstrap: connect DB, optional sync indexes, then start server
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Successfully connected to MongoDB!');

    if (process.env.SYNC_INDEXES === 'true') {
      // Sync schema-defined indexes once (controlled via env)
      const Media = require('./models/Media');
      const Folder = require('./models/Folder');
      const Playlist = require('./models/Playlist');
      await Promise.all([
        Media.syncIndexes(),
        Folder.syncIndexes(),
        Playlist.syncIndexes()
      ]);
      console.log('Mongoose indexes synced.');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Connection error', error.message);
    process.exit(1);
  }
})();

// Cron job remains the same
cron.schedule('*/30 * * * * *', async () => {
  console.log('Cron job: Checking for offline players...');
  const thirtySecondsAgo = new Date(Date.now() - 30000);
  try {
    const result = await Player.updateMany(
      { status: 'Online', lastHeartbeat: { $lt: thirtySecondsAgo } },
      { $set: { status: 'Offline' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Cron job: ${result.modifiedCount} player(s) set as Offline.`);
    }
    const onlineCount = await Player.countDocuments({ status: 'Online' });
    const offlineCount = await Player.countDocuments({ status: 'Offline' });
    console.log(`Players Online: ${onlineCount}, Players Offline: ${offlineCount}`);
  } catch (error) {
    console.error('Error running cron job:', error);
  }
});