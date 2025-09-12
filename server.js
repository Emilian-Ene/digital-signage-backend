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

// ✅ START: NEW CORS CONFIGURATION
const corsOptions = {
  origin: 'http://localhost:5173', // Explicitly allow your frontend origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// ✅ END: NEW CORS CONFIGURATION

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
cron.schedule('*/10 * * * * *', async () => {
  console.log('Running cron job: Checking for offline players...');
  
  const thirtySecondsAgo = new Date(Date.now() - 30000);
  const tenSecondsAgo = new Date(Date.now() - 10000);

  try {
    const result = await Player.updateMany(
  { status: 'Online', lastHeartbeat: { $lt: tenSecondsAgo } },
      { $set: { status: 'Offline' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Cron job: Marked ${result.modifiedCount} player(s) as Offline.`);
    }
  } catch (error) {
    console.error('Error running cron job:', error);
  }
});