// models/Service.js
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  basePrice: {
    type: Number,
    min: 0
  },
  unit: {
    type: String,
    default: 'per hour',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ name: 1 });

module.exports = mongoose.model('Service', serviceSchema);