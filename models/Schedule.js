// models/Schedule.js

const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  playlist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist',
    required: true
  },
  assignments: {
    players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }],
    groups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlayerGroup' // We'll need to create this model if we use it
    }]
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date // Not required. If this is empty, the schedule loops forever.
  }
}, {
  timestamps: true
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;