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
  duration: { // <-- THIS IS THE MISSING FIELD
    type: Number,
    default: 0 // Default of 0 means "loop forever" for images
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;