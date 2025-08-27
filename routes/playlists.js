// routes/playlists.js

const express = require("express");
const router = express.Router();
const Playlist = require("../models/Playlist");

// --- CREATE: Create a new playlist ---
router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Playlist name is required" });
  }
  try {
    const newPlaylist = new Playlist({ name, items: [] });
    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A playlist with that name already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// --- READ: Get all playlists ---
router.get("/", async (req, res) => {
  try {
    const playlists = await Playlist.find().select("-items");
    res.json(playlists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// --- UPDATE: Update a playlist's items ---
router.put("/:id", async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res
      .status(400)
      .json({ message: "Items must be an array of media IDs" });
  }
  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { items: items },
      { new: true }
    );
    if (!updatedPlaylist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    res.json(updatedPlaylist);
  } catch (error) {
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