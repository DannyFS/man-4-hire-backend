// config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'manforhire.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with tables
db.serialize(() => {
  // Services table
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      base_price DECIMAL(10,2),
      unit TEXT DEFAULT 'per hour',
      is_active BOOLEAN DEFAULT 1,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Work orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      service_type TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      preferred_date DATE,
      preferred_time TEXT,
      budget_range TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      images TEXT, -- JSON array of image paths
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Contact messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Gallery images table
  db.run(`
    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      image_url TEXT NOT NULL,
      category TEXT,
      project_date DATE,
      is_featured BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin users table (for future admin panel)
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default services
  const defaultServices = [
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

  defaultServices.forEach(service => {
    insertService.run(
      service.name,
      service.description,
      service.category,
      service.base_price,
      service.unit
    );
  });

  insertService.finalize();
});

// Helper functions
const dbHelpers = {
  // Generic query helper
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Get single record
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Insert/Update/Delete
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

module.exports = { db, ...dbHelpers };
