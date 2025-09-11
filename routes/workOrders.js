// routes/workOrders.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { WorkOrder } = require('../config/database');
const User = require('../models/User');
const mongoose = require('mongoose');

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
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    const workOrders = await WorkOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    res.json({
      workOrders,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /api/work-orders/my-orders - Get current user's work orders
router.get('/my-orders', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'user') {
      return res.status(403).json({ error: 'Access denied. User account required.' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = { userId: decoded.userId };
    
    if (status) {
      filter.status = status;
    }
    
    const workOrders = await WorkOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const totalCount = await WorkOrder.countDocuments(filter);
    
    res.json({
      workOrders,
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching user work orders:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /api/work-orders/:id - Get specific work order
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid work order ID' });
    }

    const workOrder = await WorkOrder.findById(req.params.id).lean();
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
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

    // Check for user authentication (optional)
    let userId = null;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'user') {
          userId = decoded.userId;
        }
      } catch (error) {
        // Token invalid or expired, continue as guest
      }
    }

    // Process uploaded images
    const imagePaths = req.files ? req.files.map(file => `/uploads/work-orders/${file.filename}`) : [];

    const newWorkOrder = await WorkOrder.create({
      userId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      customerAddress: customerAddress || null,
      serviceType,
      description,
      priority,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      budgetRange: budgetRange || null,
      notes: notes || null,
      images: imagePaths,
      status: 'pending'
    });

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

    if (!mongoose.Types.ObjectId.isValid(workOrderId)) {
      return res.status(400).json({ error: 'Invalid work order ID' });
    }

    // Valid status values
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    let updateData = {};

    if (status) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedOrder = await WorkOrder.findByIdAndUpdate(
      workOrderId,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

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
    
    if (!mongoose.Types.ObjectId.isValid(workOrderId)) {
      return res.status(400).json({ error: 'Invalid work order ID' });
    }
    
    const deletedOrder = await WorkOrder.findByIdAndDelete(workOrderId);
    
    if (!deletedOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    res.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

module.exports = router;
