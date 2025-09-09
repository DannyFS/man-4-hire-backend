// scripts/seed.js
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '..', 'manforhire.db');
const db = new sqlite3.Database(dbPath);

console.log('Seeding database with initial data...');

db.serialize(async () => {
  // Seed services
  const services = [
    {
      name: 'Plumbing Repair',
      description: 'Fix leaks, unclog drains, repair fixtures',
      category: 'plumbing',
      base_price: 75.00,
      unit: 'per hour'
    },
    {
      name: 'Electrical Work',
      description: 'Wiring, outlet installation, lighting fixtures',
      category: 'electrical',
      base_price: 85.00,
      unit: 'per hour'
    },
    {
      name: 'Carpentry',
      description: 'Custom woodwork, repairs, installations',
      category: 'carpentry',
      base_price: 65.00,
      unit: 'per hour'
    },
    {
      name: 'Painting',
      description: 'Interior and exterior painting services',
      category: 'painting',
      base_price: 45.00,
      unit: 'per hour'
    },
    {
      name: 'Lawn Care',
      description: 'Mowing, trimming, landscaping',
      category: 'landscaping',
      base_price: 40.00,
      unit: 'per hour'
    },
    {
      name: 'Appliance Repair',
      description: 'Fix washers, dryers, refrigerators, dishwashers',
      category: 'appliance',
      base_price: 80.00,
      unit: 'per service call'
    },
    {
      name: 'Furniture Assembly',
      description: 'IKEA and other furniture assembly',
      category: 'assembly',
      base_price: 50.00,
      unit: 'per item'
    },
    {
      name: 'General Handyman',
      description: 'Various small repairs and odd jobs',
      category: 'general',
      base_price: 55.00,
      unit: 'per hour'
    }
  ];

  const insertService = db.prepare(`
    INSERT OR IGNORE INTO services (name, description, category, base_price, unit)
    VALUES (?, ?, ?, ?, ?)
  `);

  services.forEach(service => {
    insertService.run(
      service.name,
      service.description,
      service.category,
      service.base_price,
      service.unit
    );
  });

  insertService.finalize();

  // Create default admin user if none exists
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@manforhire.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ManForHire2024!';

  const checkAdmin = db.prepare('SELECT COUNT(*) as count FROM admin_users');
  checkAdmin.get((err, row) => {
    if (err) {
      console.error('Error checking admin users:', err);
      return;
    }

    if (row.count === 0) {
      const saltRounds = 12;
      bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          return;
        }

        const insertAdmin = db.prepare(`
          INSERT INTO admin_users (username, email, password_hash, role)
          VALUES (?, ?, ?, 'admin')
        `);

        insertAdmin.run(adminUsername, adminEmail, hash, (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Default admin user created:');
            console.log(`Username: ${adminUsername}`);
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: ${adminPassword}`);
            console.log('*** PLEASE CHANGE THE DEFAULT PASSWORD AFTER FIRST LOGIN ***');
          }
        });

        insertAdmin.finalize();
      });
    } else {
      console.log('Admin user already exists, skipping creation.');
    }
  });

  checkAdmin.finalize();
});

setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database seeding completed!');
    }
  });
}, 2000);
