// routes/players.js

const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// Get all players for the CMS dashboard
router.get('/', async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Finalize pairing from the CMS dashboard
router.put('/pair', async (req, res) => {
  const { pairingCode, name, location } = req.body;
  if (!pairingCode || !name) {
    return res.status(400).json({ message: 'pairingCode and name are required' });
  }
  try {
    const player = await Player.findOneAndUpdate(
      // --- CHANGED ---
      { pairingCode: pairingCode, status: 'unpaired' },
      { $set: { name: name, location: location || '', status: 'Online' } },
      { new: true }
    );
    if (!player) {
      // --- CHANGED ---
      return res.status(404).json({ message: 'Unpaired player with this code not found.' });
    }
    res.json({ message: 'Player paired successfully', player });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update a player's assignedContent from the CMS dashboard
router.put('/:id/assign', async (req, res) => {
    const { contentType, contentId } = req.body;
     if (!contentType || !contentId) {
        return res.status(400).json({ message: 'contentType and contentId are required' });
    }
    try {
        const player = await Player.findByIdAndUpdate(
            req.params.id,
            { $set: { assignedContent: { contentType, contentId } } },
            { new: true }
        );
        if (!player) return res.status(404).json({ message: 'Player not found' });
        res.json(player);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// Delete a player from the CMS dashboard
router.delete('/:id', async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;