// routes/players.js

const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Playlist = require('../models/Playlist'); // For robust populate
const Media = require('../models/Media');       // For robust populate


// In your routes/players.js file

// Get all players for the CMS dashboard (UPDATED WITH SAFETY CHECK)
router.get('/', async (req, res) => {
  try {
    const players = await Player.find().populate({
      path: 'assignedContent.contentId',
      populate: {
        path: 'items.media',
        model: 'Media'
      }
    });

    // ✅ START SAFETY CHECK
    // This new section "cleans" the data before sending it.
    const safePlayers = players.map(player => {
      // Check if the player has an assigned playlist with items
      if (player.assignedContent && player.assignedContent.contentId && player.assignedContent.contentId.items) {
        
        // Filter out any broken items where the media is null
        const validItems = player.assignedContent.contentId.items.filter(item => !!item.media);
        
        // Convert to a plain object to safely modify it
        const safePlayerObject = player.toObject(); 
        safePlayerObject.assignedContent.contentId.items = validItems;
        
        return safePlayerObject;
      }
      
      // If no content is assigned, or it's already clean, return the player as is
      return player;
    });
    // ✅ END SAFETY CHECK

    res.json(safePlayers); // Send the cleaned and safe data to the browser

  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- NEW ROUTE #1: GET A SINGLE PLAYER BY ID ---
// Placed here to be found before the more generic '/pair'
router.get('/:id', async (req, res) => {
    try {
        const player = await Player.findById(req.params.id)
            .populate({
                path: 'assignedContent.contentId',
                model: 'Playlist',
                populate: {
                   path: 'items.media',
                   model: 'Media'
                }
            });
        if (!player) {
            return res.status(404).json({ message: 'Player not found' });
        }
        res.json(player);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// Finalize pairing from the CMS dashboard
router.put('/pair', async (req, res) => {
  const { pairingCode, name } = req.body;
  if (!pairingCode || !name) {
    return res.status(400).json({ message: 'pairingCode and name are required' });
  }
  try {
    const player = await Player.findOneAndUpdate(
      { pairingCode: pairingCode, status: 'unpaired' },
      { 
        $set: { 
          name: name,
          status: 'Online'
        },
        $unset: { pairingCode: "" } // This is the other critical piece
      },
      { new: true }
    );
    if (!player) {
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
    const assignment = contentId ? { contentType, contentId } : {};
    try {
        const player = await Player.findByIdAndUpdate(
            req.params.id,
            { $set: { assignedContent: assignment } },
            { new: true }
        );
        if (!player) return res.status(404).json({ message: 'Player not found' });
        if (contentType === 'Playlist' && contentId) {
          console.log(`Player with ID ${req.params.id} assigned to playlist ID ${contentId}.`);
        } else if (!contentId) {
          console.log(`Player with ID ${req.params.id} assignment cleared.`);
        }
        res.json(player);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update player (name, rotation, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { name, rotation } = req.body;
    const updateData = {};
    if (typeof name !== 'undefined') {
      if (typeof name !== 'string' || name.trim().length < 1) {
        return res.status(400).json({ message: 'Invalid name' });
      }
      updateData.name = name.trim();
    }
    if (typeof rotation !== 'undefined') {
      const r = Number(rotation);
      const allowed = [0, 90, 180, 270];
      if (!allowed.includes(r)) {
        return res.status(400).json({ message: 'Invalid rotation' });
      }
      updateData.rotation = r;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }

    const updated = await Player.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Player not found' });
    if (typeof updateData.name !== 'undefined') {
      console.log(`Player ${req.params.id} renamed to '${updateData.name}'.`);
    }
    if (typeof updateData.rotation !== 'undefined') {
      console.log(`Player ${req.params.id} rotation updated to ${updateData.rotation}°.`);
    }
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
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