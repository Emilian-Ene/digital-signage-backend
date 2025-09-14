
// routes/folders.js

const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Media = require('../models/Media');
const fs = require('fs');
const path = require('path');

// --- GET: Retrieve all folders (with the most recent file as a preview) ---
// THIS IS THE NEW, CORRECTED VERSION
router.get('/', async (req, res) => {
  try {
    const foldersWithPreviews = await Folder.aggregate([
      {
        // Step 1: Join the 'folders' collection with the 'media' collection.
        $lookup: {
          from: 'media', // The name of your media collection
          localField: '_id',
          foreignField: 'folder',
          // Use a sub-pipeline to sort media for each folder and get only the newest one
          pipeline: [
            { $sort: { uploadedAt: -1 } }, // Sort by most recent
            { $limit: 1 }                  // Take only the first one
          ],
          as: 'preview' // Name the temporary array 'preview'
        }
      },
      {
        // Step 2: The result of the lookup is an array. Get the first (and only) element.
        $addFields: {
          previewItem: { $arrayElemAt: ['$preview', 0] }
        }
      },
      {
        // Step 3: Clean up the temporary 'preview' field from the final result.
        $project: {
          preview: 0
        }
      },
      // Step 4: Sort the final list of folders by when they were created.
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.status(200).json(foldersWithPreviews);
  } catch (error) {
    console.error('Error fetching folders with previews:', error);
    res.status(500).json({ message: 'Error fetching folders', error: error.message });
  }
});

// --- GET: Retrieve a single folder AND its media files ---
router.get('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const folderDetails = await Folder.findById(folderId);
    if (!folderDetails) {
      return res.status(404).json({ message: 'Folder not found.' });
    }
    const mediaFiles = await Media.find({ folder: folderId }).sort({ createdAt: -1 });
    res.status(200).json({
      folderDetails,
      mediaFiles
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching folder contents', error: error.message });
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

// routes/folders.js

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