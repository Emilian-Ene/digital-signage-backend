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
    trim: true,
    default: ''
  }
}, {
  timestamps: true // adds createdAt, updatedAt
});

// Helpful indexes
folderSchema.index({ createdAt: -1 });
folderSchema.index({ name: 1 }); // speeds lookups in POST duplicate check

// If you want case-insensitive unique names later (be careful with existing data):
// folderSchema.index(
//   { name: 1 },
//   { unique: true, collation: { locale: 'en', strength: 2 } }
// );

module.exports = mongoose.model('Folder', folderSchema);