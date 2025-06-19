// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api',
  {
    getPurchaseOrders: () => ipcRenderer.invoke('get-purchase-orders'),
    addPurchaseOrder: (orderData) => ipcRenderer.invoke('add-purchase-order', orderData),
    updatePurchaseOrderStatus: (orderId, newStatus) => ipcRenderer.invoke('update-purchase-order-status', orderId, newStatus),
    getCurrentUserRole: () => ipcRenderer.invoke('get-current-user-role')
  }
);
