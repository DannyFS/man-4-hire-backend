// models/WorkOrder.js
const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  claimedAt: {
    type: Date,
    default: null
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true
  },
  serviceType: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  preferredDate: {
    type: Date
  },
  preferredTime: {
    type: String,
    trim: true
  },
  budgetRange: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'claimed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
workOrderSchema.index({ status: 1, createdAt: -1 });
workOrderSchema.index({ customerEmail: 1 });
workOrderSchema.index({ serviceType: 1 });
workOrderSchema.index({ createdAt: -1 });
workOrderSchema.index({ userId: 1, createdAt: -1 });
workOrderSchema.index({ contractorId: 1, status: 1, createdAt: -1 });
workOrderSchema.index({ status: 1, contractorId: 1 });

module.exports = mongoose.model('WorkOrder', workOrderSchema);