// models/Playlist.js
const mongoose = require('mongoose');

const playlistItemSchema = new mongoose.Schema({
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    required: true
  },
  duration: {
    type: Number, // The duration in seconds for this item
    required: true,
    default: 10 // A sensible default duration for images
  }
}, { _id: false }); // _id: false prevents sub-documents from getting their own IDs

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  items: [playlistItemSchema] // <-- THIS IS THE CHANGE
}, {
  timestamps: true
});

const Playlist = mongoose.model('Playlist', playlistSchema);
module.exports = Playlist;