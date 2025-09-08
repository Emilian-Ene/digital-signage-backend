// models/Media.js

const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  friendlyName: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    required: true,
    enum: ['image', 'video']
  },
  duration: {
    type: Number,
    default: 0
  },


 folder: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Folder', // Link to Folder model
  required: false
},

  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;