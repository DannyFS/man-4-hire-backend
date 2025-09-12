const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Handle preflight OPTIONS requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Contractor Registration
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      address,
      companyName,
      licenseNumber,
      specialties,
      yearsExperience
    } = req.body;

    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, firstName, lastName, companyName'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const newContractor = await User.create({
      email: email.toLowerCase(),
      passwordHash: password,
      firstName,
      lastName,
      phone: phone || null,
      address: address || null,
      role: 'contractor',
      companyName,
      licenseNumber: licenseNumber || null,
      specialties: Array.isArray(specialties) ? specialties : [],
      yearsExperience: parseInt(yearsExperience) || 0
    });

    const token = jwt.sign(
      { 
        userId: newContractor._id, 
        email: newContractor.email,
        role: newContractor.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Contractor registered successfully',
      token,
      user: newContractor
    });
  } catch (error) {
    console.error('Contractor registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Contractor Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const contractor = await User.findOne({ 
      email: email.toLowerCase(),
      role: 'contractor'
    });

    if (!contractor) {
      return res.status(401).json({ error: 'Invalid contractor credentials' });
    }

    if (!contractor.isActive) {
      return res.status(401).json({ error: 'Contractor account is disabled' });
    }

    const isMatch = await contractor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid contractor credentials' });
    }

    const token = jwt.sign(
      { 
        userId: contractor._id, 
        email: contractor.email,
        role: contractor.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: contractor
    });
  } catch (error) {
    console.error('Contractor login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get contractor profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'contractor') {
      return res.status(403).json({ error: 'Contractor access required' });
    }

    const contractor = await User.findById(decoded.userId);
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({ user: contractor });
  } catch (error) {
    console.error('Get contractor profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;