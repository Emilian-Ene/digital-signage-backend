// routes/logs.js

const express = require('express');
const router = express.Router();
const ProofOfPlayLog = require('../models/ProofOfPlayLog');

// Endpoint for the Player App to POST new logs
router.post('/', async (req, res) => {
  try {
    const { player, media, playlist, durationPlayed } = req.body;
    const newLog = new ProofOfPlayLog({
      player,
      media,
      playlist,
      durationPlayed
    });
    await newLog.save();
    res.status(201).json({ message: 'Log received.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save log.' });
  }
});

// Endpoint for the CMS Frontend to GET all logs
router.get('/', async (req, res) => {
  try {
    const logs = await ProofOfPlayLog.find()
      .populate('player', 'name') // Get player's name
      .populate('media', 'friendlyName') // Get media's name
      .populate('playlist', 'name') // Get playlist's name
      .sort({ playedAt: -1 }); // Show most recent first
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs.' });
  }
});

module.exports = router;