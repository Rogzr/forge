# Purchase Orders Management Web Application

A web-based application for managing purchase orders, converted from an Electron application to a standard web application using Node.js, Express, and MySQL.

## Features

- **Purchase Order Management**: Create, view, and manage purchase orders
- **Status Tracking**: Track orders through different states (Pendiente, Aprobado, Rechazado, Ordenado, Recibido)
- **Role-based Access**: Different permissions for admin and user roles
- **Real-time Updates**: Dynamic status updates and form validation
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Architecture**: RESTful API

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 14.0.0 or higher)
- **MySQL Server** (version 5.7 or higher)
- **npm** (comes with Node.js)

## Database Setup

1. **Create the database**:
   ```sql
   CREATE DATABASE appv1_db;
   USE appv1_db;
   ```

2. **Create the purchase_orders table**:
   ```sql
   CREATE TABLE purchase_orders (
     id INT AUTO_INCREMENT PRIMARY KEY,
     articulo VARCHAR(255) NOT NULL,
     cantidad INT NOT NULL,
     precio_por_unidad DECIMAL(10,2) NOT NULL,
     proveedor VARCHAR(255) NOT NULL,
     fecha_de_orden DATE NOT NULL,
     estado ENUM('Pendiente', 'Aprobado', 'Rechazado', 'Ordenado', 'Recibido') DEFAULT 'Pendiente',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   );
   ```

3. **Update database configuration** (if needed):
   Edit the database connection settings in `server.js`:
   ```javascript
   const pool = mysql.createPool({
     host: 'localhost',
     user: 'root',
     password: 'your_password_here',
     database: 'appv1_db',
     waitForConnections: true,
     connectionLimit: 10,
     queueLimit: 0
   });
   ```

## Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - For local development: The `local.env` file is already configured with local settings
   - For production: Copy `production.env` to `.env` and update Railway-specific values
   ```bash
   # For local development (already configured)
   cp local.env .env
   
   # For production deployment
   cp production.env .env
   # Then edit .env with your Railway-specific values
   ```

## Running the Application

### Local Development Mode (with environment variables)
```bash
npm run dev:env
```

### Standard Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Railway Production Mode
```bash
npm run start:railway
```

The application will be available at: `http://localhost:3000`

## Project Structure

```
project-root/
├── server.js              # Express server with API endpoints
├── package.json           # Project dependencies and scripts
├── README.md              # This file
├── public/                # Frontend files (served statically)
│   ├── index.html         # Main HTML file
│   └── renderer.js        # Frontend JavaScript logic
└── src/                   # Original Electron files (can be removed)
    ├── index.js           # Original Electron main process
    ├── renderer.js        # Original Electron renderer
    ├── preload.js         # Original Electron preload script
    ├── index.html         # Original Electron HTML
    └── index.css          # Original Electron CSS
```

## API Endpoints

The backend provides the following RESTful API endpoints:

- `GET /api/purchase-orders` - Fetch all purchase orders
- `POST /api/purchase-orders` - Create a new purchase order
- `PUT /api/purchase-orders/:id/status` - Update purchase order status
- `GET /api/user-role` - Get current user role

## User Roles

- **Admin**: Full access (create orders, approve/reject, change status, edit/delete)
- **User**: Limited access (create orders, view only - no approve/reject, no status changes, no edit/delete)

## Status Workflow

Purchase orders follow this status workflow:

1. **Pendiente** → Can be approved or rejected
2. **Aprobado** → Can be ordered or received
3. **Rechazado** → Final state (immutable)
4. **Ordenado** → Can be marked as received
5. **Recibido** → Final state

## Development Notes

### Converting from Electron

This application was converted from an Electron application with the following changes:

1. **Backend Separation**: Extracted all database logic from `src/index.js` into `server.js`
2. **API Conversion**: Converted IPC handlers to RESTful API endpoints
3. **Frontend Adaptation**: Replaced `window.api` calls with `fetch()` API calls
4. **Dependency Updates**: Removed Electron dependencies, added Express dependencies

### File Changes Made

- **New Files**:
  - `server.js` - Express backend server
  - `public/index.html` - Web version of the HTML file
  - `public/renderer.js` - Web version with fetch API

- **Modified Files**:
  - `package.json` - Updated dependencies and scripts

- **Removed Dependencies**:
  - All Electron-related packages (`electron`, `@electron-forge/*`, etc.)

### Security Considerations

- Database credentials are currently hardcoded in `server.js`
- Consider using environment variables for production:
  ```javascript
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'appv1_db'
  });
  ```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check if MySQL server is running
   - Verify database credentials in `server.js`
   - Ensure the database and table exist

2. **Port Already in Use**:
   - Change the port in `server.js`: `const PORT = process.env.PORT || 3001;`

3. **CORS Issues**:
   - The server includes CORS middleware to handle cross-origin requests

4. **Module Not Found**:
   - Run `npm install` to ensure all dependencies are installed

### Logs

Check the console output when running the server for:
- Database connection status
- API request logs
- Error messages

## Future Enhancements

- Add user authentication and session management
- Implement proper environment configuration
- Add data validation middleware
- Include unit tests
- Add logging system
- Implement file upload functionality for attachments
- Add email notifications for status changes

## License

MIT License - See LICENSE file for details 