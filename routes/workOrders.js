// routes/workOrders.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query, get, run } = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/work-orders/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/work-orders - Get all work orders (admin only)
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM work_orders';
    let params = [];
    
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const workOrders = await query(sql, params);
    
    // Parse images JSON for each work order
    const formattedOrders = workOrders.map(order => ({
      ...order,
      images: order.images ? JSON.parse(order.images) : []
    }));
    
    res.json({
      workOrders: formattedOrders,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /api/work-orders/:id - Get specific work order
router.get('/:id', async (req, res) => {
  try {
    const workOrder = await get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Parse images JSON
    workOrder.images = workOrder.images ? JSON.parse(workOrder.images) : [];
    
    res.json(workOrder);
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
});

// POST /api/work-orders - Submit new work order
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      serviceType,
      description,
      priority = 'medium',
      preferredDate,
      preferredTime,
      budgetRange,
      notes
    } = req.body;

    // Validation
    if (!customerName || !customerEmail || !serviceType || !description) {
      return res.status(400).json({
        error: 'Missing required fields: customerName, customerEmail, serviceType, description'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Process uploaded images
    const imagePaths = req.files ? req.files.map(file => `/uploads/work-orders/${file.filename}`) : [];

    const result = await run(`
      INSERT INTO work_orders (
        customer_name, customer_email, customer_phone, customer_address,
        service_type, description, priority, preferred_date, preferred_time,
        budget_range, notes, images, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      customerName,
      customerEmail,
      customerPhone || null,
      customerAddress || null,
      serviceType,
      description,
      priority,
      preferredDate || null,
      preferredTime || null,
      budgetRange || null,
      notes || null,
      JSON.stringify(imagePaths)
    ]);

    const newWorkOrder = await get('SELECT * FROM work_orders WHERE id = ?', [result.id]);
    newWorkOrder.images = JSON.parse(newWorkOrder.images || '[]');

    res.status(201).json({
      message: 'Work order submitted successfully',
      workOrder: newWorkOrder
    });
  } catch (error) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Failed to submit work order' });
  }
});

// PUT /api/work-orders/:id - Update work order (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const workOrderId = req.params.id;

    // Verify work order exists
    const existingOrder = await get('SELECT id FROM work_orders WHERE id = ?', [workOrderId]);
    if (!existingOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Valid status values
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    let updateFields = [];
    let updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (notes) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(workOrderId);

    await run(
      `UPDATE work_orders SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updatedOrder = await get('SELECT * FROM work_orders WHERE id = ?', [workOrderId]);
    updatedOrder.images = JSON.parse(updatedOrder.images || '[]');

    res.json({
      message: 'Work order updated successfully',
      workOrder: updatedOrder
    });
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// DELETE /api/work-orders/:id - Delete work order (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    const result = await run('DELETE FROM work_orders WHERE id = ?', [workOrderId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    res.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

module.exports = router;
