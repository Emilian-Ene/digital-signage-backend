// routes/folders.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // NEW
const Folder = require('../models/Folder');
const Media = require('../models/Media');
const fs = require('fs');
const path = require('path');

// --- GET: Retrieve all folders (with preview from first ordered item when available) ---
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.aggregate([
      // compute first ordered id
      { $addFields: { firstOrderedId: { $arrayElemAt: ['$mediaOrder', 0] } } },
      // preview by order
      { $lookup: {
          from: 'media',
          let: { foid: '$firstOrderedId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$foid'] } } },
            { $limit: 1 }
          ],
          as: 'orderedPreview'
      }},
      // fallback latest by upload time
      { $lookup: {
          from: 'media',
          localField: '_id',
          foreignField: 'folder',
          pipeline: [{ $sort: { uploadedAt: -1 } }, { $limit: 1 }],
          as: 'latestPreview'
      }},
      { $addFields: {
          previewItem: {
            $ifNull: [ { $arrayElemAt: ['$orderedPreview', 0] }, { $arrayElemAt: ['$latestPreview', 0] } ]
          }
      }},
      { $project: { orderedPreview: 0, latestPreview: 0, firstOrderedId: 0 } },
      // stats per folder
      { $lookup: {
          from: 'media',
          let: { folderId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$folder', '$$folderId'] } } },
            { $group: {
                _id: null,
                totalSize: { $sum: { $ifNull: ['$fileSize', 0] } },
                totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
                itemsCount: { $sum: 1 }
            }}
          ],
          as: 'stats'
      }},
      { $addFields: {
          totalSize: { $ifNull: [{ $arrayElemAt: ['$stats.totalSize', 0] }, 0] },
          totalDuration: { $ifNull: [{ $arrayElemAt: ['$stats.totalDuration', 0] }, 0] },
          itemsCount: { $ifNull: [{ $arrayElemAt: ['$stats.itemsCount', 0] }, 0] }
      }},
      { $project: { stats: 0 } },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- GET: Retrieve a single folder AND its media files (ordered by mediaOrder when present) ---
router.get('/:id', async (req, res) => {
  try {
    const folderDetails = await Folder.findById(req.params.id);
    if (!folderDetails) return res.status(404).json({ message: 'Folder not found.' });

    const mediaFiles = await Media.find({ folder: folderDetails._id });
    const order = (folderDetails.mediaOrder || []).map(id => id.toString());
    const pos = new Map(order.map((id, i) => [id, i]));
    const sorted = mediaFiles
      .map(m => ({ m, i: pos.has(m._id.toString()) ? pos.get(m._id.toString()) : Number.POSITIVE_INFINITY }))
      .sort((a, b) => a.i - b.i || (b.m.createdAt - a.m.createdAt))
      .map(x => x.m);

    const totals = await Media.aggregate([
      { $match: { folder: folderDetails._id } },
      { $group: {
          _id: null,
          totalSize: { $sum: { $ifNull: ['$fileSize', 0] } },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } }
      }}
    ]);

    res.json({
      folderDetails,
      mediaFiles: sorted,
      totalSize: totals[0]?.totalSize || 0,
      totalDuration: totals[0]?.totalDuration || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- GET: The single most recent media item for a folder preview ---
router.get('/:id/preview', async (req, res) => {
  try {
    const mostRecentFile = await Media.findOne({ folder: req.params.id })
      .sort({ uploadedAt: -1 });
    if (!mostRecentFile) {
      return res.status(200).json(null);
    }
    res.status(200).json(mostRecentFile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching preview item', error: error.message });
  }
});

// NEW: Save explicit order of media inside a folder
router.put('/:id/reorder', async (req, res) => {
  try {
    const { order } = req.body; // array of media ids
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: 'order must be a non-empty array of mediaIds' });
    }
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Folder not found.' });

    const ids = order.map(id => new mongoose.Types.ObjectId(id));
    const count = await Media.countDocuments({ _id: { $in: ids }, folder: folder._id });
    if (count !== order.length) {
      return res.status(400).json({ message: 'Order contains items not in this folder.' });
    }

    const seen = new Set();
    const cleaned = order.filter(id => (seen.has(id) ? false : (seen.add(id), true)));

    folder.mediaOrder = cleaned;
    await folder.save();
    res.json({ folderId: folder._id, order: cleaned });
  } catch (error) {
    res.status(500).json({ message: 'Error saving order', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required.' });
    }

    // --- ADD THIS CHECK ---
    // Look for an existing folder with the same name (case-insensitive)
    const existingFolder = await Folder.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });

    if (existingFolder) {
      // If found, send back a 409 Conflict error
      return res.status(409).json({ message: `A folder named '${name}' already exists.` });
    }
    // --- END OF CHECK ---

    const newFolder = new Folder({
      name: name,
      description: description || '',
    });

    const savedFolder = await newFolder.save();
    res.status(201).json(savedFolder);

  } catch (error) {
    console.error('!!! ERROR CREATING FOLDER !!!:', error);
    res.status(500).json({ message: 'Server error while creating folder.' });
  }
});

// --- PUT: Update a folder by its ID ---
router.put('/:id', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Folder name is required.' });
  }
  try {
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!updatedFolder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating folder', error: error.message });
  }
});

// --- RENAME: Rename a folder ---
router.put('/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'New name is required.' });
    }
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }
  folder.name = name;
  await folder.save();
  console.log(`Folder with ID ${req.params.id} renamed to '${name}'.`);
  res.json({ message: 'Folder renamed successfully', folder });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});


// --- DELETE: Delete a folder AND all media files inside it ---
router.delete('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }
    const mediaFiles = await Media.find({ folder: folderId });
    mediaFiles.forEach(media => {
      const filePath = path.join(__dirname, '..', 'uploads', media.fileName);
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting physical file: ${media.fileName}`, err);
      });
    });
    await Media.deleteMany({ folder: folderId });
    await Folder.findByIdAndDelete(folderId);
    res.status(200).json({ message: 'Folder and all its contents deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting folder', error: error.message });
  }
});

module.exports = router;