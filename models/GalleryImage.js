// models/GalleryImage.js
const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  projectDate: {
    type: Date
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
galleryImageSchema.index({ category: 1, createdAt: -1 });
galleryImageSchema.index({ isFeatured: 1 });

module.exports = mongoose.model('GalleryImage', galleryImageSchema);