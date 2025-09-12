// routes/contractorOrders.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { WorkOrder } = require('../config/database');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// Middleware to check contractor authentication
const requireContractor = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'contractor') {
      return res.status(403).json({ error: 'Contractor access required' });
    }

    req.contractor = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET /api/contractor-orders/available - Get available work orders (not yet claimed)
router.get('/available', requireContractor, async (req, res) => {
  try {
    const { page = 1, limit = 20, serviceType, priority } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = { 
      status: 'pending',
      contractorId: null 
    };
    
    if (serviceType) {
      filter.serviceType = serviceType;
    }
    
    if (priority) {
      filter.priority = priority;
    }
    
    const workOrders = await WorkOrder.find(filter)
      .sort({ priority: -1, createdAt: -1 }) // High priority first, then newest
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
    console.error('Error fetching available work orders:', error);
    res.status(500).json({ error: 'Failed to fetch available work orders' });
  }
});

// GET /api/contractor-orders/my-orders - Get contractor's claimed orders
router.get('/my-orders', requireContractor, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = { contractorId: req.contractor.userId };
    
    if (status) {
      filter.status = status;
    }
    
    const workOrders = await WorkOrder.find(filter)
      .sort({ claimedAt: -1 })
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
    console.error('Error fetching contractor orders:', error);
    res.status(500).json({ error: 'Failed to fetch contractor orders' });
  }
});

// POST /api/contractor-orders/:id/claim - Claim a work order
router.post('/:id/claim', requireContractor, async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(workOrderId)) {
      return res.status(400).json({ error: 'Invalid work order ID' });
    }

    // Use atomic operation to prevent race conditions
    const workOrder = await WorkOrder.findOneAndUpdate(
      { 
        _id: workOrderId,
        status: 'pending',
        contractorId: null // Ensure it's not already claimed
      },
      { 
        contractorId: req.contractor.userId,
        status: 'claimed',
        claimedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!workOrder) {
      return res.status(404).json({ 
        error: 'Work order not found or already claimed' 
      });
    }

    // Update contractor's total jobs count
    await User.findByIdAndUpdate(
      req.contractor.userId,
      { $inc: { totalJobs: 1 } }
    );

    res.json({
      message: 'Work order claimed successfully',
      workOrder
    });
  } catch (error) {
    console.error('Error claiming work order:', error);
    res.status(500).json({ error: 'Failed to claim work order' });
  }
});

// PUT /api/contractor-orders/:id/status - Update work order status
router.put('/:id/status', requireContractor, async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { status, notes } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(workOrderId)) {
      return res.status(400).json({ error: 'Invalid work order ID' });
    }

    // Valid status transitions for contractors
    const validStatuses = ['claimed', 'in-progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Contractors can only set: claimed, in-progress, completed' 
      });
    }

    // Find work order and verify contractor ownership
    const workOrder = await WorkOrder.findOne({
      _id: workOrderId,
      contractorId: req.contractor.userId
    });

    if (!workOrder) {
      return res.status(404).json({ 
        error: 'Work order not found or not assigned to you' 
      });
    }

    // Update the work order
    let updateData = { status };
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updatedOrder = await WorkOrder.findByIdAndUpdate(
      workOrderId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Work order status updated successfully',
      workOrder: updatedOrder
    });
  } catch (error) {
    console.error('Error updating work order status:', error);
    res.status(500).json({ error: 'Failed to update work order status' });
  }
});

// POST /api/contractor-orders/:id/unclaim - Unclaim a work order (return to available)
router.post('/:id/unclaim', requireContractor, async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(workOrderId)) {
      return res.status(400).json({ error: 'Invalid work order ID' });
    }

    // Find work order and verify contractor ownership and status
    const workOrder = await WorkOrder.findOne({
      _id: workOrderId,
      contractorId: req.contractor.userId,
      status: { $in: ['claimed', 'in-progress'] } // Can only unclaim if not completed
    });

    if (!workOrder) {
      return res.status(404).json({ 
        error: 'Work order not found, not assigned to you, or cannot be unclaimed' 
      });
    }

    // Update work order to make it available again
    const updatedOrder = await WorkOrder.findByIdAndUpdate(
      workOrderId,
      { 
        contractorId: null,
        status: 'pending',
        claimedAt: null
      },
      { new: true, runValidators: true }
    );

    // Decrement contractor's total jobs count
    await User.findByIdAndUpdate(
      req.contractor.userId,
      { $inc: { totalJobs: -1 } }
    );

    res.json({
      message: 'Work order unclaimed successfully',
      workOrder: updatedOrder
    });
  } catch (error) {
    console.error('Error unclaiming work order:', error);
    res.status(500).json({ error: 'Failed to unclaim work order' });
  }
});

module.exports = router;