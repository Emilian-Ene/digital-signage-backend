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
    const { folderId } = req.params;
    if (!isValidObjectId(folderId)) {
      return res.status(400).json({ message: 'Invalid folder id' });
    }
    const mediaFiles = await Media.find({ folder: folderId });
    res.json(mediaFiles);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Storage cap from env (default 5GB)
const MAX_STORAGE_BYTES = Number(process.env.MAX_STORAGE_BYTES || 5 * 1024 * 1024 * 1024);

// --- READ: Storage usage ---
router.get('/storage-usage', async (req, res) => {
  try {
    const agg = await Media.aggregate([
      { $group: { _id: null, used: { $sum: { $ifNull: ['$fileSize', 0] } } } }
    ]);
    const used = agg[0]?.used || 0;
    res.json({ usedBytes: used, totalBytes: MAX_STORAGE_BYTES });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- CREATE: Upload a new media file (UPDATED WITH CAP CHECK) ---
router.post('/upload', upload.single('mediaFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Calculate current used storage
    const agg = await Media.aggregate([{ $group: { _id: null, used: { $sum: { $ifNull: ['$fileSize', 0] } } } }]);
    const used = agg[0]?.used || 0;
    const incoming = req.file.size || Number(req.body.fileSize) || 0;

    if (used + incoming > MAX_STORAGE_BYTES) {
      // Remove just-uploaded file to avoid filling disk
      const fp = path.join(__dirname, '..', 'uploads', req.file.filename);
      fs.unlink(fp, () => {});
      return res.status(413).json({ message: 'Storage limit reached. Cannot upload more media.' });
    }

    const { friendlyName, folder, duration, width, height, fileSize } = req.body;

    const newMedia = new Media({
      friendlyName: friendlyName || req.file.originalname,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      mediaType: req.file.mimetype.startsWith('image') ? 'image' : 'video',
      folder: folder || null,
      duration: Number(duration) || 0,
      width: Number(width) || 0,
      height: Number(height) || 0,
      fileSize: Number(fileSize) || req.file.size || 0
    });

    await newMedia.save();

    // If uploaded inside a specific folder, append to the end of that folder's order
    if (newMedia.folder) {
      await Folder.updateOne({ _id: newMedia.folder }, { $addToSet: { mediaOrder: newMedia._id } });
    }

    res.status(201).json(newMedia);
  } catch (error) {
    console.error('❌ ERROR during upload:', error);
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

    const prevFolderId = media.folder ? media.folder.toString() : null;

    if (folder) {
      if (!isValidObjectId(folder)) {
        return res.status(400).json({ message: 'Invalid folder id' });
      }
      const folderDoc = await Folder.findById(folder);
      if (!folderDoc) {
        return res.status(400).json({ message: 'Folder not found' });
      }

      // If changing folders, remove from previous order list
      if (prevFolderId && prevFolderId !== folderDoc._id.toString()) {
        await Folder.updateOne({ _id: prevFolderId }, { $pull: { mediaOrder: media._id } });
      }

      media.folder = folderDoc._id;
      await media.save();

      // Append to end (avoid duplicates)
      await Folder.updateOne({ _id: folderDoc._id }, { $addToSet: { mediaOrder: media._id } });

    } else {
      // unassign from any folder: remove from order list
      if (prevFolderId) {
        await Folder.updateOne({ _id: prevFolderId }, { $pull: { mediaOrder: media._id } });
      }
      media.folder = null; // unassign from any folder
      await media.save();
    }

    return res.json({ message: 'Media file moved successfully', media });
  } catch (error) {
    console.error('Move media error:', error);
    return res.status(500).json({ message: 'Server Error' });
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
      // Also remove from any folder order
      if (media.folder) {
        await Folder.updateOne({ _id: media.folder }, { $pull: { mediaOrder: media._id } });
      }
      await Media.findByIdAndDelete(req.params.id);
      res.json({ message: 'Media file deleted successfully' });
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;