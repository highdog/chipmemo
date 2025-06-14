const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Schedule = require('../models/Schedule');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/schedules
// @desc    Get schedules for user
// @access  Private
router.get('/', [
  query('date').optional().isString().withMessage('Date must be a string'),
  query('startDate').optional().isString().withMessage('Start date must be a string'),
  query('endDate').optional().isString().withMessage('End date must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, startDate, endDate } = req.query;
    let query = { userId: req.user._id };

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const schedules = await Schedule.find(query)
      .sort({ date: 1, time: 1 })
      .lean();

    // 按日期分组
    const schedulesByDate = {};
    schedules.forEach(schedule => {
      if (!schedulesByDate[schedule.date]) {
        schedulesByDate[schedule.date] = [];
      }
      schedulesByDate[schedule.date].push({
        id: schedule._id.toString(),
        title: schedule.title,
        time: schedule.time,
        description: schedule.description,
        type: schedule.type
      });
    });

    res.json({
      success: true,
      data: schedulesByDate
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Server error while fetching schedules' });
  }
});

// @route   POST /api/schedules
// @desc    Create a new schedule
// @access  Private
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('time')
    .trim()
    .notEmpty()
    .withMessage('Time is required'),
  body('date')
    .trim()
    .notEmpty()
    .withMessage('Date is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isIn(['event', 'meeting', 'reminder', 'task'])
    .withMessage('Type must be one of: event, meeting, reminder, task')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, time, date, description, type } = req.body;

    const schedule = new Schedule({
      title,
      time,
      date,
      description,
      type: type || 'event',
      userId: req.user._id
    });

    await schedule.save();

    res.status(201).json({
      success: true,
      data: {
        id: schedule._id.toString(),
        title: schedule.title,
        time: schedule.time,
        date: schedule.date,
        description: schedule.description,
        type: schedule.type
      }
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Server error while creating schedule' });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Update a schedule
// @access  Private
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid schedule ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('time')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Time cannot be empty'),
  body('date')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Date cannot be empty'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isIn(['event', 'meeting', 'reminder', 'task'])
    .withMessage('Type must be one of: event, meeting, reminder, task')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    const schedule = await Schedule.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({
      success: true,
      data: {
        id: schedule._id.toString(),
        title: schedule.title,
        time: schedule.time,
        date: schedule.date,
        description: schedule.description,
        type: schedule.type
      }
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Server error while updating schedule' });
  }
});

// @route   DELETE /api/schedules/:id
// @desc    Delete a schedule
// @access  Private
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid schedule ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const schedule = await Schedule.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Server error while deleting schedule' });
  }
});

module.exports = router;