// routes/devices.js

const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// Helper to build absolute URL
const resolveUrl = (fileUrl, baseUrl) => {
  if (!fileUrl) return null;
  return fileUrl.startsWith('/uploads/') ? `${baseUrl}${fileUrl}` : fileUrl;
};

// Helper function to build the final JSON for the player
const buildPlaylistForPlayer = (content, baseUrl) => {
  // Single media assigned directly
  if (content.mediaType) {
    return {
      orientation: 'Landscape', // default when not using a playlist
      items: [{
        type: content.mediaType,
        url: resolveUrl(content.fileUrl, baseUrl),
        duration: content.mediaType === 'video' ? 0 : content.duration,
        displayMode: 'contain', // default for single media
      }]
    };
  }

  // Playlist assignment
  const validItems = (content.items || []).filter(item => !!item.media);
  return {
    orientation: content.orientation, // Landscape | Portrait | Custom
    items: validItems.map(item => ({
      type: item.media.mediaType,
      url: resolveUrl(item.media.fileUrl, baseUrl),
      duration: item.media.mediaType === 'video' ? 0 : item.duration,
      displayMode: item.displayMode || 'contain'
    }))
  };
};

// --- The Single Endpoint for the Android App ---
router.post('/heartbeat', async (req, res) => {
  const { deviceId, pairingCode } = req.body;
  if (!deviceId) {
    return res.status(400).json({ message: 'deviceId is required' });
  }

  try {
    // Compute base URL for absolute media URLs
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    // Find the player first, regardless of the request type.
    let player = await Player.findOne({ deviceId: deviceId });

    // Case 1: The device is sending a pairing code (it thinks it's unpaired).
    if (pairingCode && pairingCode !== "") {
      if (!player) {
        player = new Player({ deviceId, pairingCode, status: 'unpaired' });
        await player.save();
        return res.json({ status: 'unpaired', playlist: null });
      }
      if (player.status === 'Offline' || player.status === 'Online') {
        return res.json({ status: 'paired_waiting', playlist: null });
      }
      player.pairingCode = pairingCode;
      player.lastHeartbeat = Date.now();
      await player.save();
      return res.json({ status: 'unpaired', playlist: null });
    }

    // Case 2: The device is NOT sending a pairing code (it thinks it's paired).
    if (!player) {
      return res.json({ status: 'unpaired', playlist: null });
    }

    player.lastHeartbeat = Date.now();
    player.status = 'Online';
    await player.save();

    // Populate assigned content and nested media for playlists
    await player.populate({
      path: 'assignedContent.contentId',
      populate: { path: 'items.media' }
    });

    if (player.assignedContent && player.assignedContent.contentId) {
      const playlistForPlayer = buildPlaylistForPlayer(player.assignedContent.contentId, baseUrl);
      return res.json({ status: 'playing', playlist: playlistForPlayer });
    } else {
      return res.json({ status: 'paired_waiting', playlist: null });
    }

  } catch (error) {
    console.error("Heartbeat Error:", error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;