# Man for Hire Backend API

A comprehensive backend system for a contractor services website built with Node.js, Express, and SQLite.

## Features

- **Work Order Management**: Submit, track, and manage service requests
- **Service Catalog**: Manage available services with pricing
- **Contact System**: Handle customer inquiries
- **Photo Gallery**: Showcase completed work
- **Admin Dashboard**: Comprehensive management interface
- **File Uploads**: Support for images with work orders and gallery
- **Authentication**: JWT-based admin authentication
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Secure data handling

## Quick Start

### 1. Installation

```bash
# Clone or create the project directory
mkdir man-for-hire-backend
cd man-for-hire-backend

# Initialize and install dependencies
npm init -y
npm install express cors helmet express-rate-limit multer sqlite3 uuid dotenv bcryptjs jsonwebtoken nodemailer joi

# Install dev dependencies
npm install --save-dev nodemon jest supertest
```

### 2. Setup

```bash
# Create directory structure
mkdir -p uploads/gallery uploads/work-orders logs config routes middleware scripts

# Copy the provided files into their respective directories
# Run setup script
node scripts/setup.js

# Run database migrations
node scripts/migrate.js

# Seed initial data
node scripts/seed.js
```

### 3. Configuration

Update the `.env` file with your settings:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@manforhire.com
ADMIN_PASSWORD=YourSecurePassword123!
```

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Public Endpoints

#### Services
- `GET /api/services` - Get all active services
- `GET /api/services/categories` - Get service categories with stats
- `GET /api/services/:id` - Get specific service details

#### Work Orders
- `POST /api/work-orders` - Submit new work order

#### Contact
- `POST /api/contact` - Submit contact message

#### Gallery
- `GET /api/gallery` - Get gallery images
- `GET /api/gallery/:id` - Get specific gallery image

#### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - First-time admin registration

### Admin Endpoints (Require Authentication)

#### Dashboard
- `GET /api/admin/dashboard` - Get dashboard statistics

#### Work Order Management
- `GET /api/work-orders` - Get all work orders with filtering
- `GET /api/work-orders/:id` - Get specific work order
- `PUT /api/work-orders/:id` - Update work order status/notes
- `DELETE /api/work-orders/:id` - Delete work order

#### Service Management
- `POST /api/services` - Create new service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

#### Contact Management
- `GET /api/contact` - Get all contact messages
- `PUT /api/contact/:id` - Update message status

#### Gallery Management
- `POST /api/gallery` - Upload new gallery image
- `PUT /api/gallery/:id` - Update gallery image details
- `DELETE /api/gallery/:id` - Delete gallery image

#### User Management
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change password

## Data Models

### Work Order
```json
{
  "id": 1,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "555-0123",
  "customer_address": "123 Main St, City, State",
  "service_type": "plumbing",
  "description": "Fix leaky faucet in kitchen",
  "priority": "medium",
  "preferred_date": "2024-01-15",
  "preferred_time": "morning",
  "budget_range": "$100-200",
  "status": "pending",
  "notes": "Customer prefers morning appointments",
  "images": ["/uploads/work-orders/image1.jpg"],
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z"
}
```

### Service
```json
{
  "id": 1,
  "name": "Plumbing Repair",
  "description": "Fix leaks, unclog drains, repair fixtures",
  "category": "plumbing",
  "base_price": 75.00,
  "unit": "per hour",
  "is_active": true,
  "image_url": "/uploads/services/plumbing.jpg",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Contact Message
```json
{
  "id": 1,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "Question about services",
  "message": "Do you provide emergency plumbing services?",
  "status": "unread",
  "created_at": "2024-01-10T14:30:00Z"
}
```

### Gallery Image
```json
{
  "id": 1,
  "title": "Kitchen Renovation",
  "description": "Complete kitchen remodel with new cabinets",
  "image_url": "/uploads/gallery/kitchen1.jpg",
  "category": "renovation",
  "project_date": "2024-01-01",
  "is_featured": true,
  "created_at": "2024-01-10T12:00:00Z"
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Login Example
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'
```

## File Uploads

### Work Order Images
- Endpoint: `POST /api/work-orders`
- Field name: `images` (array, max 5 files)
- Max size: 5MB per file
- Allowed types: image/*

### Gallery Images
- Endpoint: `POST /api/gallery`
- Field name: `image` (single file)
- Max size: 10MB
- Allowed types: image/*

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "message": "Detailed error description (development only)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

## Database Schema

The system uses SQLite with the following tables:

- `services` - Available services and pricing
- `work_orders` - Customer service requests
- `contact_messages` - Customer inquiries
- `gallery_images` - Portfolio images
- `admin_users` - System administrators

## Security Features

- **JWT Authentication** - Secure admin access
- **Rate Limiting** - Prevents abuse
- **Input Validation** - Protects against injection attacks
- **File Upload Security** - Type and size restrictions
- **Password Hashing** - bcrypt with salt rounds
- **CORS Protection** - Configurable origin restrictions
- **Helmet.js** - Security headers

## Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Database Operations
```bash
# Run migrations
npm run migrate

# Seed data
npm run seed
```

## Deployment

### Environment Variables
Ensure these are set in production:
- `NODE_ENV=production`
- `JWT_SECRET` - Strong secret key
- `ADMIN_PASSWORD` - Secure admin password
- `ALLOWED_ORIGINS` - Your frontend domain(s)

### Production Considerations
- Use a reverse proxy (nginx)
- Set up SSL/TLS certificates
- Configure log rotation
- Set up database backups
- Monitor with tools like PM2

## Frontend Integration

This backend is designed to work with any frontend framework. Example fetch calls:

### Submit Work Order
```javascript
const formData = new FormData();
formData.append('customerName', 'John Doe');
formData.append('customerEmail', 'john@example.com');
formData.append('serviceType', 'plumbing');
formData.append('description', 'Fix leaky faucet');
// Add image files
formData.append('images', imageFile1);
formData.append('images', imageFile2);

const response = await fetch('/api/work-orders', {
  method: 'POST',
  body: formData
});
```

### Get Services
```javascript
const response = await fetch('/api/services');
const services = await response.json();
```

### Admin Operations
```javascript
const response = await fetch('/api/work-orders', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Support

For issues or questions:
1. Check the API documentation at `/api/docs`
2. Review error logs in the console
3. Verify environment configuration
4. Test endpoints with tools like Postman or curl
