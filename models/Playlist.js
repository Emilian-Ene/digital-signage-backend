// models/Playlist.js
const mongoose = require('mongoose');

const playlistItemSchema = new mongoose.Schema({
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 10,
    min: 0
  },
  // Per-item display mode for rendering on players
  displayMode: {
    type: String,
    enum: ['contain', 'cover', 'fill'],
    default: 'contain'
  }
}, { _id: false });

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  orientation: {
    type: String,
    required: true,
    enum: ['Landscape', 'Portrait', 'Custom'],
    default: 'Landscape'
  },
  items: {
    type: [playlistItemSchema],
    default: []
  }
}, {
  timestamps: true
});

// Helpful indexes
playlistSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Playlist', playlistSchema);