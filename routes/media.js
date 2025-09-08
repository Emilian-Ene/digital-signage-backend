// routes/media.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');

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
  fileFilter: function(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|mp4|mov|avi)$/i)) {
      return cb(new Error('Only image and video files are allowed!'), false);
    }
    cb(null, true);
  }
});

// --- READ: Get all media files ---
router.get('/', async (req, res) =>  {
  try {
    // --- THIS IS THE CORRECTED LINE ---
    // .populate('folder') will replace the folder ID with the full folder object.
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

// --- CREATE: Upload a new media file ---
router.post('/upload', upload.single('mediaFile'), async (req, res) => {
  try {
    const { friendlyName, duration, folder } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const newMedia = new Media({
      friendlyName: friendlyName || req.file.originalname,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      mediaType: req.file.mimetype.startsWith('image') ? 'image' : 'video',
      duration: req.file.mimetype.startsWith('video') ? 0 : duration || 0,
      folder: folder || null
    });
    await newMedia.save();
    res.status(201).json(newMedia);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error uploading file' });
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