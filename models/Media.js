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

  // Duration in seconds (images typically use a fixed duration; videos can be 0 to auto-play full)
  duration: {
    type: Number,
    default: 0
  },

  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: false,
    default: null
  },

  // For preview and sorting
  uploadedAt: {
    type: Date,
    default: Date.now
  },

  // Extra properties (ensure numbers)
  fileSize: { type: Number, default: 0 }, // bytes
  width: { type: Number, default: 0 },    // px
  height: { type: Number, default: 0 }    // px
});

// Helpful indexes
mediaSchema.index({ folder: 1 });
mediaSchema.index({ uploadedAt: -1 });
// Optional:
// mediaSchema.index({ mediaType: 1 });
// mediaSchema.index({ friendlyName: 1 });

module.exports = mongoose.model('Media', mediaSchema);