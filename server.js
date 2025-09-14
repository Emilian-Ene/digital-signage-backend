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
// const logRoutes = require('./routes/logs');

// Create an Express App
const app = express();

// ✅ START: DEV-FRIENDLY CORS CONFIGURATION
// Allow both dev servers (5173 and 5174). In production you should
// restrict this to your deployed frontend origin.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174'
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like curl or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: This origin is not allowed: ' + origin));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// ✅ END: DEV-FRIENDLY CORS CONFIGURATION

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Define Port
const PORT = process.env.PORT || 3000;

// Connect to MongoDB and Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Connection error', error.message);
  });

// Use the API Routes
app.use('/api/players', playerRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/folders', folderRoutes);
// app.use('/api/logs', logRoutes);

// Schedule Cron Job to check for offline players
cron.schedule('*/30 * * * * *', async () => {
  console.log('Cron job: Checking for offline players...');
  const thirtySecondsAgo = new Date(Date.now() - 30000);

  try {
    // Update offline status
    const result = await Player.updateMany(
      { status: 'Online', lastHeartbeat: { $lt: thirtySecondsAgo } },
      { $set: { status: 'Offline' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Cron job: ${result.modifiedCount} player(s) set as Offline.`);
    }

    // Count online and offline players
    const onlineCount = await Player.countDocuments({ status: 'Online' });
    const offlineCount = await Player.countDocuments({ status: 'Offline' });
    console.log(`Players Online: ${onlineCount}, Players Offline: ${offlineCount}`);
  } catch (error) {
    console.error('Error running cron job:', error);
  }
});