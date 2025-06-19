const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create MySQL connection pool (same configuration as Electron app)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'teC572213+',
  database: 'appv1_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Routes

// GET /api/purchase-orders - Fetch all purchase orders
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/purchase-orders - Add new purchase order
app.post('/api/purchase-orders', async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    const requiredFields = ['articulo', 'cantidad', 'precio_por_unidad', 'proveedor', 'fecha_de_orden'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }

    // Validate data types
    if (isNaN(orderData.cantidad) || orderData.cantidad <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad must be a positive number' });
    }
    if (isNaN(orderData.precio_por_unidad) || orderData.precio_por_unidad <= 0) {
      return res.status(400).json({ success: false, error: 'Precio por unidad must be a positive number' });
    }

    // Always set status to 'Pendiente' for new orders (security measure)
    const insertData = {
      articulo: orderData.articulo,
      cantidad: orderData.cantidad,
      precio_por_unidad: orderData.precio_por_unidad,
      proveedor: orderData.proveedor,
      fecha_de_orden: orderData.fecha_de_orden,
      estado: 'Pendiente' // Always 'Pendiente' for new orders
    };

    const [result] = await pool.query(
      'INSERT INTO purchase_orders (articulo, cantidad, precio_por_unidad, proveedor, fecha_de_orden, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [
        insertData.articulo,
        insertData.cantidad,
        insertData.precio_por_unidad,
        insertData.proveedor,
        insertData.fecha_de_orden,
        insertData.estado
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error adding purchase order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/purchase-orders/:id/status - Update purchase order status
app.put('/api/purchase-orders/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { newStatus } = req.body;

    // Validate inputs
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ success: false, error: 'Invalid order ID' });
    }

    const validStatuses = ['Pendiente', 'Aprobado', 'Rechazado', 'Ordenado', 'Recibido'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    // Update the order status and updated_at timestamp
    const [result] = await pool.query(
      'UPDATE purchase_orders SET estado = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Order not found or no changes made' });
    }

    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/user-role - Get current user role
app.get('/api/user-role', async (req, res) => {
  try {
    // For development purposes, return 'user' as default to test user permissions
    // In a real web app, this should check authentication tokens/sessions
    // Role permissions:
    // - 'admin': Full access (create orders, approve/reject, change status, edit/delete)
    // - 'user': Limited access (create orders, view only - no approve/reject, no status changes, no edit/delete)
    res.json({ success: true, role: 'user' });
  } catch (error) {
    console.error('Error getting user role:', error);
    res.status(500).json({ success: false, error: error.message, role: 'user' }); // Default to 'user' on error
  }
});

// Serve the frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await testConnection();
});

module.exports = app; 