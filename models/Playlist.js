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
    default: 10
  }
}, { _id: false });

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  
  // --- ADD THIS NEW FIELD ---
  orientation: {
    type: String,
    required: true,
    enum: ['Landscape', 'Portrait', 'Custom'],
    default: 'Landscape'
  },
  // --- END OF NEW FIELD ---

  items: [playlistItemSchema]
}, {
  timestamps: true
});

const Playlist = mongoose.model('Playlist', playlistSchema);
module.exports = Playlist;