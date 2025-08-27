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
const Player = require('./models/Player');

// Create an Express App & Middleware
const app = express();
app.use(cors());
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

// Schedule Cron Job to check for offline players
cron.schedule('*/30 * * * * *', async () => { // <-- Change this to 30
  console.log('Running cron job: Checking for offline players...');
  
  const thirtySecondsAgo = new Date(Date.now() - 30000); // This is correct

  try {
    const result = await Player.updateMany(
      { status: 'Online', lastHeartbeat: { $lt: thirtySecondsAgo } }, // Use the 30s variable
      { $set: { status: 'Offline' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Cron job: Marked ${result.modifiedCount} player(s) as Offline.`);
    }
  } catch (error) {
    console.error('Error running cron job:', error);
  }
});