// routes/playlists.js

const express = require("express");
const router = express.Router();
const Playlist = require("../models/Playlist");
const Media = require("../models/Media"); // We need to reference the Media model

// --- CREATE: Create a new playlist ---
router.post("/", async (req, res) => {
  const { name, orientation } = req.body;
  if (!name || !orientation) {
    return res.status(400).json({ message: "Playlist name and orientation are required" });
  }
  try {
    const newPlaylist = new Playlist({ name, orientation, items: [] });
    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A playlist with that name already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// --- GET: Get all playlists with enriched data ---
router.get('/', async (req, res) => {
  try {
    const playlists = await Playlist.find().populate({ path: 'items.media', model: 'Media' });
    const enriched = playlists.map(p => {
      const obj = p.toObject();
      const items = obj.items || [];
      obj.itemsCount = items.length;
      obj.totalDuration = items.reduce((a, it) => a + (it?.duration || 0), 0);
      obj.totalSize = items.reduce((a, it) => a + (it?.media?.fileSize || 0), 0);
      return obj;
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/playlists/:id
router.get('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate({ path: 'items.media', model: 'Media' });
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    const obj = playlist.toObject();
    const items = obj.items || [];
    obj.itemsCount = items.length;
    obj.totalDuration = items.reduce((a, it) => a + (it?.duration || 0), 0);
    obj.totalSize = items.reduce((a, it) => a + (it?.media?.fileSize || 0), 0);
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});


// --- UPDATE: Update a playlist's name and/or items (NEW LOGIC) ---
router.put("/:id", async (req, res) => {
  // 1. Destructure both name and items from the request body
  const { name, items } = req.body;

  // 2. Build the update object dynamically
  const updateData = {};
  if (name) {
    updateData.name = name;
  }
  if (items) {
    // Also validate that 'items' is an array if it's provided
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }
    updateData.items = items;
  }

  // 3. Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "No update data provided" });
  }

  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      updateData, // 4. Use the dynamic update object here
      { new: true, runValidators: true } // runValidators ensures the name isn't duplicated
    ).populate({
        path: 'items.media',
        model: 'Media'
    });
    
    if (!updatedPlaylist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    if (name) {
      console.log(`Playlist with ID ${req.params.id} renamed to '${name}'.`);
    }
    res.json(updatedPlaylist);
  } catch (error) {
     if (error.code === 11000) {
      return res.status(400).json({ message: "A playlist with that name already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// --- DELETE: Delete a playlist ---
router.delete("/:id", async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndDelete(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Remove playlist assignment from all players
    const Player = require('../models/Player');
    await Player.updateMany(
      {
        'assignedContent.contentType': 'Playlist',
        'assignedContent.contentId': req.params.id
      },
      {
        $set: { assignedContent: {} }
      }
    );

    res.json({ message: "Playlist deleted successfully and removed from all players" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
