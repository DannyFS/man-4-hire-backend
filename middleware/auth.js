// middleware/auth.js
const jwt = require('jsonwebtoken');
const { AdminUser } = require('../config/database');
const mongoose = require('mongoose');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    const user = await AdminUser.findById(decoded.userId).lean();
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = { authenticateToken, requireAdmin };

