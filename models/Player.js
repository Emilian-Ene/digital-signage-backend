// models/Player.js

const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    required: true,
    // --- CHANGED ---
    enum: ['Online', 'Offline', 'unpaired'],
    default: 'unpaired'
    // --- END CHANGE ---
  },
  pairingCode: {
    type: String,
    unique: true,
    sparse: true
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now
  },
  assignedContent: {
    contentType: {
      type: String,
      enum: ['Media', 'Playlist']
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'assignedContent.contentType'
    }
  },
  rotation: { type: Number, enum: [0, 90, 180, 270], default: 0 }
}, { timestamps: true });
 
module.exports = mongoose.model('Player', playerSchema);