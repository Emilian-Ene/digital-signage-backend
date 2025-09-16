// routes/media.js


const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');



const mongoose = require('mongoose');
const { isValidObjectId } = mongoose;
const Folder = require('../models/Folder');




// --- RENAME: Rename a media file ---
router.put('/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'New name is required.' });
    }
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media file not found.' });
    }
  media.friendlyName = name;
  await media.save();
  console.log(`Media file with ID ${req.params.id} renamed to '${name}'.`);
  res.json({ message: 'Media file renamed successfully', media });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|mp4|mov|avi)$/i)) {
      return cb(new Error('Only image and video files are allowed!'), false);
    }
    cb(null, true);
  }
});

// --- READ: Get all media files ---
router.get('/', async (req, res) => {
  try {
    const mediaFiles = await Media.find().populate('folder');
    res.json(mediaFiles);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- READ: Get media files by folder ---
router.get('/by-folder/:folderId', async (req, res) => {
  try {
    const mediaFiles = await Media.find({ folder: req.params.folderId });
    res.json(mediaFiles);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- CREATE: Upload a new media file (UPDATED LOGIC) ---
// In your routes/media.js file

// --- CREATE: Upload a new media file (UPDATED WITH DEBUG LOGS) ---
router.post('/upload', upload.single('mediaFile'), async (req, res) => {
  try {
    console.log("✅ 1. Upload route started. File received:", req.file?.filename);

    const {
      friendlyName, folder, duration, width, height, fileSize
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const newMedia = new Media({
      friendlyName: friendlyName || req.file.originalname,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      mediaType: req.file.mimetype.startsWith('image') ? 'image' : 'video',
      folder: folder || null,
      duration: duration || 0,
      width: width || 0,
      height: height || 0,
      fileSize: fileSize || 0
    });

    console.log("✅ 2. New media object created. Preparing to save to database...");

    await newMedia.save();

    // If you see this log, the save was successful.
    console.log("✅ 3. Save successful! Sending response to browser.");

    res.status(201).json(newMedia);

  } catch (error) {
    // If there's an error, we'll see this log.
    console.error("❌ ERROR during upload:", error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// --- MOVE: Move a media file to a folder ---
router.put('/:id/move', async (req, res) => {
  try {
    const { folder } = req.body; // ObjectId string or null
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media file not found' });
    }

    if (folder) {
      if (!isValidObjectId(folder)) {
        return res.status(400).json({ message: 'Invalid folder id' });
      }
      const folderDoc = await Folder.findById(folder);
      if (!folderDoc) {
        return res.status(400).json({ message: 'Folder not found' });
      }
      media.folder = folder;
    } else {
      media.folder = null; // unassign from any folder
    }

    await media.save();
    return res.json({ message: 'Media file moved successfully', media });
  } catch (error) {
    console.error('Move media error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
});

// --- RENAME: Rename a media file ---
router.put('/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'New name is required.' });
    }
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media file not found.' });
    }
    media.friendlyName = name;
    await media.save();
    res.json({ message: 'Media file renamed successfully', media });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});


// --- DELETE: Delete a media file ---
router.delete('/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media file not found' });
    }
    const filePath = path.join(__dirname, '..', 'uploads', media.fileName);
    fs.unlink(filePath, async (err) => {
      if (err) console.error('Error deleting physical file:', err);
      await Media.findByIdAndDelete(req.params.id);
      res.json({ message: 'Media file deleted successfully' });
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;