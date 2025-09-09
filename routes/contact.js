// routes/contact.js
const express = require('express');
const { query, get, run } = require('../config/database');

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

    const result = await run(`
      INSERT INTO contact_messages (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `, [name, email, subject || null, message]);

    res.status(201).json({
      message: 'Contact message submitted successfully',
      id: result.id
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
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM contact_messages';
    let params = [];
    
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const messages = await query(sql, params);
    
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

    const validStatuses = ['unread', 'read', 'responded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const result = await run(
      'UPDATE contact_messages SET status = ? WHERE id = ?',
      [status, messageId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    res.json({ message: 'Contact message status updated successfully' });
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ error: 'Failed to update contact message' });
  }
});

module.exports = router;
