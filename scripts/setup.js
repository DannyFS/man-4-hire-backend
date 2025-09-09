// scripts/setup.js
const fs = require('fs');
const path = require('path');

console.log('Setting up Man for Hire backend...');

// Create necessary directories
const directories = [
  'uploads',
  'uploads/gallery',
  'uploads/work-orders',
  'logs',
  'config'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('Created .env file from .env.example');
  console.log('*** Please update the .env file with your configuration ***');
} else if (!fs.existsSync(envPath)) {
  console.log('No .env.example found. Please create .env file manually.');
} else {
  console.log('.env file already exists');
}

console.log('Setup completed!');
console.log('\nNext steps:');
console.log('1. Update .env file with your configuration');
console.log('2. Run: npm install');
console.log('3. Run: npm run migrate');
console.log('4. Run: npm run seed');
console.log('5. Run: npm start (or npm run dev for development)');

module.exports = { setupDirectories: () => directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
})};
