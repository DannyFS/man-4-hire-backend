// routes/gallery.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query, get, run } = require('../config/database');

const galleryRouter = express.Router();

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
galleryRouter.get('/', async (req, res) => {
  try {
    const { category, featured_only, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM gallery_images';
    let params = [];
    let conditions = [];
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    if (featured_only === 'true') {
      conditions.push('is_featured = 1');
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY is_featured DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const images = await query(sql, params);
    
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
galleryRouter.get('/:id', async (req, res) => {
  try {
    const image = await get('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
    
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
galleryRouter.post('/', galleryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const {
      title,
      description,
      category,
      project_date,
      is_featured = false
    } = req.body;

    const imageUrl = `/uploads/gallery/${req.file.filename}`;

    const result = await run(`
      INSERT INTO gallery_images (title, description, image_url, category, project_date, is_featured)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title || null,
      description || null,
      imageUrl,
      category || null,
      project_date || null,
      is_featured ? 1 : 0
    ]);

    const newImage = await get('SELECT * FROM gallery_images WHERE id = ?', [result.id]);

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
galleryRouter.put('/:id', async (req, res) => {
  try {
    const imageId = req.params.id;
    const {
      title,
      description,
      category,
      project_date,
      is_featured
    } = req.body;

    // Verify image exists
    const existingImage = await get('SELECT id FROM gallery_images WHERE id = ?', [imageId]);
    if (!existingImage) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }

    let updateFields = [];
    let updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }

    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }

    if (project_date !== undefined) {
      updateFields.push('project_date = ?');
      updateValues.push(project_date);
    }

    if (is_featured !== undefined) {
      updateFields.push('is_featured = ?');
      updateValues.push(is_featured ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(imageId);

    await run(
      `UPDATE gallery_images SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updatedImage = await get('SELECT * FROM gallery_images WHERE id = ?', [imageId]);

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
galleryRouter.delete('/:id', async (req, res) => {
  try {
    const imageId = req.params.id;
    
    const result = await run('DELETE FROM gallery_images WHERE id = ?', [imageId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }
    
    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
});

// Export both routers
module.exports = { contactRouter: router, galleryRouter
