const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is a teacher
const requireTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Only teachers can create announcements' });
  }
  next();
};

// GET /api/announcements - Get all announcements
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    
    const query = { isActive: true };
    if (type && type !== 'all') {
      query.type = type;
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      announcements: announcements.map(announcement => ({
        id: announcement._id,
        title: announcement.title,
        type: announcement.type,
        message: announcement.message,
        date: announcement.date,
        createdBy: announcement.createdBy,
        department: announcement.department,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
});

// POST /api/announcements - Create new announcement
router.post('/', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const { title, type, message, date } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be less than 200 characters'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be less than 2000 characters'
      });
    }

    const announcementData = {
      title: title.trim(),
      type: type || 'General',
      message: message.trim(),
      createdBy: req.user.id,
      department: 'CSE'
    };

    // If date is provided, use it; otherwise use current date
    if (date) {
      announcementData.date = new Date(date);
    }

    const announcement = new Announcement(announcementData);
    await announcement.save();

    // Populate the createdBy field for response
    await announcement.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement: {
        id: announcement._id,
        title: announcement.title,
        type: announcement.type,
        message: announcement.message,
        date: announcement.date,
        createdBy: announcement.createdBy,
        department: announcement.department,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement'
    });
  }
});

// GET /api/announcements/:id - Get specific announcement
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      announcement: {
        id: announcement._id,
        title: announcement.title,
        type: announcement.type,
        message: announcement.message,
        date: announcement.date,
        createdBy: announcement.createdBy,
        department: announcement.department,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement'
    });
  }
});

// PUT /api/announcements/:id - Update announcement
router.put('/:id', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const { title, type, message, date } = req.body;
    
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if the user is the creator of the announcement
    if (announcement.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own announcements'
      });
    }

    // Update fields if provided
    if (title) announcement.title = title.trim();
    if (type) announcement.type = type;
    if (message) announcement.message = message.trim();
    if (date) announcement.date = new Date(date);

    await announcement.save();
    await announcement.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: {
        id: announcement._id,
        title: announcement.title,
        type: announcement.type,
        message: announcement.message,
        date: announcement.date,
        createdBy: announcement.createdBy,
        department: announcement.department,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement'
    });
  }
});

// DELETE /api/announcements/:id - Delete announcement (soft delete)
router.delete('/:id', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if the user is the creator of the announcement
    if (announcement.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own announcements'
      });
    }

    // Soft delete by setting isActive to false
    announcement.isActive = false;
    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
});

module.exports = router;