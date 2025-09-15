// By Daniel and Shikhar
// config/database.js
const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hudsonconstruction';
    
    await mongoose.connect(mongoURI);

    console.log('📦 MongoDB connected successfully');
    
    // Seed default data if collections are empty
    await seedDefaultData();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Import models
const Service = require('../models/Service');
const WorkOrder = require('../models/WorkOrder');
const WorkRequest = require('../models/WorkRequest');
const ContactMessage = require('../models/ContactMessage');
const GalleryImage = require('../models/GalleryImage');
const AdminUser = require('../models/AdminUser');
const User = require('../models/User');

// Seed default services and admin user
const seedDefaultData = async () => {
  try {
    // Seed services
    const serviceCount = await Service.countDocuments();
    
    if (serviceCount === 0) {
      const defaultServices = [
        {
          name: 'Plumbing Repair',
          description: 'Fix leaks, unclog drains, repair fixtures',
          category: 'plumbing',
          basePrice: 75.00,
          unit: 'per hour',
          isActive: true
        },
        {
          name: 'Electrical Work',
          description: 'Wiring, outlet installation, lighting fixtures',
          category: 'electrical',
          basePrice: 85.00,
          unit: 'per hour',
          isActive: true
        },
        {
          name: 'Carpentry',
          description: 'Custom woodwork, repairs, installations',
          category: 'carpentry',
          basePrice: 65.00,
          unit: 'per hour',
          isActive: true
        },
        {
          name: 'Painting',
          description: 'Interior and exterior painting services',
          category: 'painting',
          basePrice: 45.00,
          unit: 'per hour',
          isActive: true
        },
        {
          name: 'Lawn Care',
          description: 'Mowing, trimming, landscaping',
          category: 'landscaping',
          basePrice: 40.00,
          unit: 'per hour',
          isActive: true
        },
        {
          name: 'Appliance Repair',
          description: 'Fix washers, dryers, refrigerators, dishwashers',
          category: 'appliance',
          basePrice: 80.00,
          unit: 'per service call',
          isActive: true
        },
        {
          name: 'Furniture Assembly',
          description: 'IKEA and other furniture assembly',
          category: 'assembly',
          basePrice: 50.00,
          unit: 'per item',
          isActive: true
        },
        {
          name: 'General Handyman',
          description: 'Various small repairs and odd jobs',
          category: 'general',
          basePrice: 55.00,
          unit: 'per hour',
          isActive: true
        }
      ];

      await Service.insertMany(defaultServices);
      console.log('✅ Default services seeded successfully');
    }

    // Seed admin user
    const adminCount = await AdminUser.countDocuments();
    
    if (adminCount === 0) {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@hudsonconstruction.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'ManForHire2024!';

      const adminUser = await AdminUser.create({
        username: adminUsername,
        email: adminEmail,
        passwordHash: adminPassword, // The model will hash this automatically
        role: 'admin'
      });

      console.log('✅ Default admin user created:');
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('*** PLEASE CHANGE THE DEFAULT PASSWORD AFTER FIRST LOGIN ***');
    }
  } catch (error) {
    console.error('Error seeding default data:', error);
  }
};

// Helper functions for backward compatibility
const dbHelpers = {
  // Generic query helper - adapted for MongoDB
  query: async (model, filter = {}, options = {}) => {
    try {
      return await model.find(filter, null, options);
    } catch (error) {
      throw error;
    }
  },

  // Get single record
  get: async (model, filter = {}) => {
    try {
      return await model.findOne(filter);
    } catch (error) {
      throw error;
    }
  },

  // Insert/Update/Delete
  run: async (model, operation, data, filter = {}) => {
    try {
      let result;
      switch (operation) {
        case 'create':
          result = await model.create(data);
          return { id: result._id, changes: 1 };
        case 'update':
          result = await model.updateOne(filter, data);
          return { id: filter._id, changes: result.modifiedCount };
        case 'delete':
          result = await model.deleteOne(filter);
          return { changes: result.deletedCount };
        default:
          throw new Error('Invalid operation');
      }
    } catch (error) {
      throw error;
    }
  }
};

// MongoDB-specific helper functions
const mongoHelpers = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const [
        pendingOrders,
        inProgressOrders,
        completedOrders,
        unreadMessages,
        galleryImages,
        activeServices,
        popularServices,
        weeklyActivity
      ] = await Promise.all([
        WorkOrder.countDocuments({ status: 'pending' }),
        WorkOrder.countDocuments({ status: 'in-progress' }),
        WorkOrder.countDocuments({ status: 'completed' }),
        ContactMessage.countDocuments({ status: 'unread' }),
        GalleryImage.countDocuments(),
        Service.countDocuments({ isActive: true }),
        WorkOrder.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: '$serviceType',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $project: {
              service_type: '$_id',
              count: 1,
              _id: 0
            }
          }
        ]),
        WorkOrder.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } },
          {
            $project: {
              date: '$_id',
              count: 1,
              _id: 0
            }
          }
        ])
      ]);

      return {
        pendingOrders,
        inProgressOrders,
        completedOrders,
        unreadMessages,
        galleryImages,
        activeServices,
        popularServices,
        weeklyActivity
      };
    } catch (error) {
      throw error;
    }
  }
};

module.exports = {
  connectDB,
  ...dbHelpers,
  ...mongoHelpers,
  // Export models for direct use
  Service,
  WorkOrder,
  WorkRequest,
  ContactMessage,
  GalleryImage,
  AdminUser,
  User
};
