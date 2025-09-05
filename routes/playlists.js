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

// --- READ ALL: Get all playlists (summary view) ---
router.get("/", async (req, res) => {
  try {
    const playlists = await Playlist.find().populate({
        path: 'items.media',
        model: 'Media'
    });
    res.json(playlists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// --- READ ONE: Get a single playlist by its ID (detailed view) ---
router.get('/:id', async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id)
            .populate({
                path: 'items.media',
                model: 'Media'
            });
        
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        res.json(playlist);
    } catch (error) {
        console.error(error);
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
    res.json({ message: "Playlist deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;