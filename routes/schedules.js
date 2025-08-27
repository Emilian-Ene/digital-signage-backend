// routes/schedules.js

const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// --- CREATE: Create a new schedule ---
router.post('/', async (req, res) => {
  try {
    const newSchedule = new Schedule(req.body);
    await newSchedule.save();
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- READ: Get all schedules ---
router.get('/', async (req, res) => {
  try {
    // Populate the 'playlist' field to show the playlist name
    const schedules = await Schedule.find().populate('playlist', 'name');
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- DELETE: Delete a schedule ---
// @route   DELETE /api/schedules/:id
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;