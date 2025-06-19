const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const mysql = require('mysql2/promise');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Create MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'teC572213+',
  database: 'appv1_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Handle get-purchase-orders request
ipcMain.handle('get-purchase-orders', async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    return { success: true, data: rows };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return { success: false, error: error.message };
  }
});

// Handle add-purchase-order request
ipcMain.handle('add-purchase-order', async (event, orderData) => {
  try {
    // Validate required fields
    const requiredFields = ['articulo', 'cantidad', 'precio_por_unidad', 'proveedor', 'fecha_de_orden'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate data types
    if (isNaN(orderData.cantidad) || orderData.cantidad <= 0) {
      throw new Error('Cantidad must be a positive number');
    }
    if (isNaN(orderData.precio_por_unidad) || orderData.precio_por_unidad <= 0) {
      throw new Error('Precio por unidad must be a positive number');
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

    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('Error adding purchase order:', error);
    return { success: false, error: error.message };
  }
});

// Handle update-purchase-order-status request
ipcMain.handle('update-purchase-order-status', async (event, orderId, newStatus) => {
  try {
    // Validate inputs
    if (!orderId || isNaN(orderId)) {
      throw new Error('Invalid order ID');
    }

    const validStatuses = ['Pendiente', 'Aprobado', 'Rechazado', 'Ordenado', 'Recibido'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status value');
    }

    // Update the order status and updated_at timestamp
    const [result] = await pool.query(
      'UPDATE purchase_orders SET estado = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, orderId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Order not found or no changes made');
    }

    return { success: true, affectedRows: result.affectedRows };
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    return { success: false, error: error.message };
  }
});

// Handle get-current-user-role request
ipcMain.handle('get-current-user-role', async () => {
  try {
    // For development purposes, return 'user' as default to test user permissions
    // Role permissions:
    // - 'admin': Full access (create orders, approve/reject, change status, edit/delete)
    // - 'user': Limited access (create orders, view only - no approve/reject, no status changes, no edit/delete)
    return { success: true, role: 'user' };
  } catch (error) {
    console.error('Error getting user role:', error);
    return { success: false, error: error.message, role: 'user' }; // Default to 'user' on error
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
