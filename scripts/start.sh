// scripts/start.sh (bash script for easy startup)
const startScript = `#!/bin/bash

echo "Starting Man for Hire Backend Setup..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Run setup script
echo "Running setup..."
node scripts/setup.js

# Run migrations
echo "Running database migrations..."
node scripts/migrate.js

# Run seeding
echo "Seeding database..."
node scripts/seed.js

echo "Setup complete! Starting server..."
npm start
`;

// Write the start script
fs.writeFileSync(path.join(__dirname, '..', 'start.sh'), startScript);
fs.chmodSync(path.join(__dirname, '..', 'start.sh'), '755');

console.log('Start script created: start.sh');
