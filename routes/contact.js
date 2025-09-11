// routes/contact.js
const express = require('express');
const { ContactMessage } = require('../config/database');
const mongoose = require('mongoose');

const router = express.Router();

// POST /api/contact - Submit contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, message'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject: subject || null,
      message
    });

    res.status(201).json({
      message: 'Contact message submitted successfully',
      id: contactMessage._id
    });
  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({ error: 'Failed to submit contact message' });
  }
});

// GET /api/contact - Get all contact messages (admin only)
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    res.json({
      messages,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

// PUT /api/contact/:id - Update contact message status (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const messageId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const validStatuses = ['unread', 'read', 'replied'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updatedMessage = await ContactMessage.findByIdAndUpdate(
      messageId,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    res.json({ message: 'Contact message status updated successfully' });
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ error: 'Failed to update contact message' });
  }
});

module.exports = router;
