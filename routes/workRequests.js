// routes/workRequests.js
const express = require('express');
const mongoose = require('mongoose');
const WorkRequest = require('../models/WorkRequest');

const router = express.Router();

// GET /api/work-requests - Get all work requests (admin only)
router.get('/', async (req, res) => {
  try {
    const { status, urgencyLevel, servicePreference, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (status) {
      filter.status = status;
    }
    if (urgencyLevel) {
      filter.urgencyLevel = urgencyLevel;
    }
    if (servicePreference) {
      filter.servicePreference = servicePreference;
    }

    const workRequests = await WorkRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalCount = await WorkRequest.countDocuments(filter);

    res.json({
      workRequests,
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching work requests:', error);
    res.status(500).json({ error: 'Failed to fetch work requests' });
  }
});

// GET /api/work-requests/:id - Get specific work request
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid work request ID' });
    }

    const workRequest = await WorkRequest.findById(req.params.id).lean();

    if (!workRequest) {
      return res.status(404).json({ error: 'Work request not found' });
    }

    res.json(workRequest);
  } catch (error) {
    console.error('Error fetching work request:', error);
    res.status(500).json({ error: 'Failed to fetch work request' });
  }
});

// POST /api/work-requests - Submit new work request
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerAddress,
      projectType,
      urgencyLevel,
      servicePreference
    } = req.body;

    // Validation
    if (!customerName || !customerAddress || !projectType || !urgencyLevel || !servicePreference) {
      return res.status(400).json({
        error: 'Missing required fields: customerName, customerAddress, projectType, urgencyLevel, servicePreference'
      });
    }

    // Validate enum values
    const validUrgencyLevels = ['24hours', '1week', '1month', 'annual'];
    const validServicePreferences = ['licensed', 'general'];

    if (!validUrgencyLevels.includes(urgencyLevel)) {
      return res.status(400).json({ error: 'Invalid urgency level' });
    }

    if (!validServicePreferences.includes(servicePreference)) {
      return res.status(400).json({ error: 'Invalid service preference' });
    }

    const newWorkRequest = await WorkRequest.create({
      customerName,
      customerAddress,
      projectType,
      urgencyLevel,
      servicePreference,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Work request submitted successfully',
      workRequest: newWorkRequest
    });
  } catch (error) {
    console.error('Error creating work request:', error);
    res.status(500).json({ error: 'Failed to submit work request' });
  }
});

// PUT /api/work-requests/:id - Update work request (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { status, notes, assignedTo } = req.body;
    const workRequestId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(workRequestId)) {
      return res.status(400).json({ error: 'Invalid work request ID' });
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

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedRequest = await WorkRequest.findByIdAndUpdate(
      workRequestId,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Work request not found' });
    }

    res.json({
      message: 'Work request updated successfully',
      workRequest: updatedRequest
    });
  } catch (error) {
    console.error('Error updating work request:', error);
    res.status(500).json({ error: 'Failed to update work request' });
  }
});

// DELETE /api/work-requests/:id - Delete work request (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const workRequestId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(workRequestId)) {
      return res.status(400).json({ error: 'Invalid work request ID' });
    }

    const deletedRequest = await WorkRequest.findByIdAndDelete(workRequestId);

    if (!deletedRequest) {
      return res.status(404).json({ error: 'Work request not found' });
    }

    res.json({ message: 'Work request deleted successfully' });
  } catch (error) {
    console.error('Error deleting work request:', error);
    res.status(500).json({ error: 'Failed to delete work request' });
  }
});

// GET /api/work-requests/stats/summary - Get summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await WorkRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const urgencyStats = await WorkRequest.aggregate([
      {
        $group: {
          _id: '$urgencyLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    const serviceStats = await WorkRequest.aggregate([
      {
        $group: {
          _id: '$servicePreference',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await WorkRequest.countDocuments();

    res.json({
      total,
      byStatus: stats,
      byUrgency: urgencyStats,
      byServiceType: serviceStats
    });
  } catch (error) {
    console.error('Error fetching work request stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;