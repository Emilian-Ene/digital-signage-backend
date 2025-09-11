// models/ProofOfPlayLog.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const proofOfPlayLogSchema = new Schema({
  player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  media: { type: Schema.Types.ObjectId, ref: 'Media', required: true },
  playlist: { type: Schema.Types.ObjectId, ref: 'Playlist', required: true },
  playedAt: { type: Date, default: Date.now },
  durationPlayed: { type: Number, required: true } // in seconds
});

module.exports = mongoose.model('ProofOfPlayLog', proofOfPlayLogSchema);