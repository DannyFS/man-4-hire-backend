// models/WorkRequest.js
const mongoose = require('mongoose');

const workRequestSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerAddress: {
    type: String,
    required: true,
    trim: true
  },
  projectType: {
    type: String,
    required: true,
    trim: true
  },
  urgencyLevel: {
    type: String,
    required: true,
    enum: ['24hours', '1week', '1month', 'annual'],
    trim: true
  },
  servicePreference: {
    type: String,
    required: true,
    enum: ['licensed', 'general'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
workRequestSchema.index({ status: 1, createdAt: -1 });
workRequestSchema.index({ urgencyLevel: 1 });
workRequestSchema.index({ servicePreference: 1 });
workRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WorkRequest', workRequestSchema);