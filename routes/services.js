// routes/services.js
const express = require('express');
const { Service } = require('../config/database');

const router = express.Router();

// GET /api/services - Get all services
router.get('/', async (req, res) => {
  try {
    const { category, active_only = 'true' } = req.query;
    
    let filter = {};
    
    if (active_only === 'true') {
      filter.isActive = true;
    }
    
    if (category) {
      filter.category = category;
    }
    
    const services = await Service.find(filter).sort({ category: 1, name: 1 });
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET /api/services/categories - Get all service categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          service_count: { $sum: 1 },
          min_price: { $min: '$basePrice' },
          max_price: { $max: '$basePrice' }
        }
      },
      {
        $project: {
          category: '$_id',
          service_count: 1,
          min_price: 1,
          max_price: 1,
          _id: 0
        }
      },
      { $sort: { category: 1 } }
    ]);
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/services/:id - Get specific service
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// POST /api/services - Create new service (admin only)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      basePrice,
      unit = 'per hour',
      isActive = true,
      imageUrl
    } = req.body;

    // Validation
    if (!name || !category || !basePrice) {
      return res.status(400).json({
        error: 'Missing required fields: name, category, basePrice'
      });
    }

    if (isNaN(parseFloat(basePrice)) || parseFloat(basePrice) < 0) {
      return res.status(400).json({
        error: 'basePrice must be a positive number'
      });
    }

    const newService = await Service.create({
      name,
      description,
      category,
      basePrice: parseFloat(basePrice),
      unit,
      isActive,
      imageUrl
    });

    res.status(201).json({
      message: 'Service created successfully',
      service: newService
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PUT /api/services/:id - Update service (admin only)
router.put('/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const {
      name,
      description,
      category,
      basePrice,
      unit,
      isActive,
      imageUrl
    } = req.body;

    let updateData = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (unit) updateData.unit = unit;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    if (basePrice !== undefined) {
      if (isNaN(parseFloat(basePrice)) || parseFloat(basePrice) < 0) {
        return res.status(400).json({
          error: 'basePrice must be a positive number'
        });
      }
      updateData.basePrice = parseFloat(basePrice);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      message: 'Service updated successfully',
      service: updatedService
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE /api/services/:id - Delete service (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    
    const deletedService = await Service.findByIdAndDelete(serviceId);
    
    if (!deletedService) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
