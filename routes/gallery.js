// routes/gallery.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GalleryImage } = require('../config/database');
const mongoose = require('mongoose');

const router = express.Router();

// Configure multer for gallery uploads
const galleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/gallery/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for gallery images
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/gallery - Get all gallery images
router.get('/', async (req, res) => {
  try {
    const { category, featured_only, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (featured_only === 'true') {
      filter.isFeatured = true;
    }
    
    const images = await GalleryImage.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    res.json({
      images,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// GET /api/gallery/:id - Get specific gallery image
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid gallery image ID' });
    }

    const image = await GalleryImage.findById(req.params.id).lean();
    
    if (!image) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }
    
    res.json(image);
  } catch (error) {
    console.error('Error fetching gallery image:', error);
    res.status(500).json({ error: 'Failed to fetch gallery image' });
  }
});

// POST /api/gallery - Upload new gallery image (admin only)
router.post('/', galleryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const {
      title,
      description,
      category,
      projectDate,
      isFeatured = false
    } = req.body;

    const imageUrl = `/uploads/gallery/${req.file.filename}`;

    const newImage = await GalleryImage.create({
      title: title || null,
      description: description || null,
      imageUrl,
      category: category || null,
      projectDate: projectDate || null,
      isFeatured: isFeatured === 'true' || isFeatured === true
    });

    res.status(201).json({
      message: 'Gallery image uploaded successfully',
      image: newImage
    });
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    res.status(500).json({ error: 'Failed to upload gallery image' });
  }
});

// PUT /api/gallery/:id - Update gallery image (admin only)
router.put('/:id', async (req, res) => {
  try {
    const imageId = req.params.id;
    const {
      title,
      description,
      category,
      projectDate,
      isFeatured
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: 'Invalid gallery image ID' });
    }

    let updateData = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (projectDate !== undefined) {
      updateData.projectDate = projectDate;
    }

    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedImage = await GalleryImage.findByIdAndUpdate(
      imageId,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedImage) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }

    res.json({
      message: 'Gallery image updated successfully',
      image: updatedImage
    });
  } catch (error) {
    console.error('Error updating gallery image:', error);
    res.status(500).json({ error: 'Failed to update gallery image' });
  }
});

// DELETE /api/gallery/:id - Delete gallery image (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const imageId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: 'Invalid gallery image ID' });
    }
    
    const deletedImage = await GalleryImage.findByIdAndDelete(imageId);
    
    if (!deletedImage) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }
    
    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
});

module.exports = router;
