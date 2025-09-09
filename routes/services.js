// routes/services.js
const express = require('express');
const { query, get, run } = require('../config/database');

const router = express.Router();

// GET /api/services - Get all services
router.get('/', async (req, res) => {
  try {
    const { category, active_only = 'true' } = req.query;
    
    let sql = 'SELECT * FROM services';
    let params = [];
    let conditions = [];
    
    if (active_only === 'true') {
      conditions.push('is_active = 1');
    }
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY category, name';
    
    const services = await query(sql, params);
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET /api/services/categories - Get all service categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await query(`
      SELECT 
        category,
        COUNT(*) as service_count,
        MIN(base_price) as min_price,
        MAX(base_price) as max_price
      FROM services 
      WHERE is_active = 1 
      GROUP BY category 
      ORDER BY category
    `);
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/services/:id - Get specific service
router.get('/:id', async (req, res) => {
  try {
    const service = await get('SELECT * FROM services WHERE id = ?', [req.params.id]);
    
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
      base_price,
      unit = 'per hour',
      is_active = true,
      image_url
    } = req.body;

    // Validation
    if (!name || !category || !base_price) {
      return res.status(400).json({
        error: 'Missing required fields: name, category, base_price'
      });
    }

    if (isNaN(parseFloat(base_price)) || parseFloat(base_price) < 0) {
      return res.status(400).json({
        error: 'base_price must be a positive number'
      });
    }

    const result = await run(`
      INSERT INTO services (name, description, category, base_price, unit, is_active, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || null,
      category,
      parseFloat(base_price),
      unit,
      is_active ? 1 : 0,
      image_url || null
    ]);

    const newService = await get('SELECT * FROM services WHERE id = ?', [result.id]);

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
      base_price,
      unit,
      is_active,
      image_url
    } = req.body;

    // Verify service exists
    const existingService = await get('SELECT id FROM services WHERE id = ?', [serviceId]);
    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    let updateFields = [];
    let updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }

    if (category) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }

    if (base_price !== undefined) {
      if (isNaN(parseFloat(base_price)) || parseFloat(base_price) < 0) {
        return res.status(400).json({
          error: 'base_price must be a positive number'
        });
      }
      updateFields.push('base_price = ?');
      updateValues.push(parseFloat(base_price));
    }

    if (unit) {
      updateFields.push('unit = ?');
      updateValues.push(unit);
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      updateValues.push(image_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(serviceId);

    await run(
      `UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updatedService = await get('SELECT * FROM services WHERE id = ?', [serviceId]);

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
    
    const result = await run('DELETE FROM services WHERE id = ?', [serviceId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
