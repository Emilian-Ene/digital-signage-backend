// models/Folder.js

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;