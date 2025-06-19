document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addPurchaseOrderForm');
  const messageDiv = document.getElementById('message');
  const modal = document.getElementById('new-order-modal');
  const statusConfirmModal = document.getElementById('status-confirm-modal');
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  // Global variables for status update confirmation and user role
  let pendingStatusUpdate = null;
  let currentUserRole = 'user'; // Default to 'user' until fetched

  // Initialize user role and app
  initializeApp();

  // API Base URL - change this if your backend is running on a different port
  const API_BASE = '/api';

  // API wrapper functions to replace Electron IPC calls
  const api = {
    async getPurchaseOrders() {
      try {
        const response = await fetch(`${API_BASE}/purchase-orders`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return { success: false, error: error.message };
      }
    },

    async addPurchaseOrder(orderData) {
      try {
        const response = await fetch(`${API_BASE}/purchase-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData)
        });
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error adding purchase order:', error);
        return { success: false, error: error.message };
      }
    },

    async updatePurchaseOrderStatus(orderId, newStatus) {
      try {
        const response = await fetch(`${API_BASE}/purchase-orders/${orderId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newStatus })
        });
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error updating purchase order status:', error);
        return { success: false, error: error.message };
      }
    },

    async getCurrentUserRole() {
      try {
        const response = await fetch(`${API_BASE}/user-role`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error getting user role:', error);
        return { success: false, error: error.message, role: 'user' };
      }
    }
  };

  async function initializeApp() {
    try {
      // Fetch current user role
      const roleResponse = await api.getCurrentUserRole();
      if (roleResponse.success) {
        currentUserRole = roleResponse.role;
        console.log('User role loaded:', currentUserRole);
      } else {
        console.warn('Failed to fetch user role, defaulting to user');
        currentUserRole = 'user';
      }

      // Update UI based on user role
      updateUIForUserRole();

      // Load initial data for dashboard
      loadRecentOrders();
    } catch (error) {
      console.error('Error initializing app:', error);
      currentUserRole = 'user'; // Default to safe role on error
      updateUIForUserRole();
      loadRecentOrders();
    }
  }

  function updateUIForUserRole() {
    // Update user role display in sidebar
    const userInfo = document.querySelector('.user-info h4');
    if (userInfo) {
      userInfo.textContent = currentUserRole === 'admin' ? 'Admin User' : 'Standard User';
    }

    const userRole = document.querySelector('.user-info p');
    if (userRole) {
      userRole.textContent = currentUserRole === 'admin' ? 'Administrador' : 'Usuario';
    }

    // Update Nueva orden button visibility
    const newOrderButton = document.querySelector('.btn-primary[onclick="openNewOrderModal()"]');
    if (newOrderButton) {
      if (currentUserRole === 'admin' || currentUserRole === 'user') {
        newOrderButton.style.display = 'flex';
        newOrderButton.title = 'Crear nueva orden de compra';
      } else {
        newOrderButton.style.display = 'none';
      }
    }

    // Update table header if needed (could add role indicator)
    const tableContainer = document.querySelector('.po-table-container');
    if (tableContainer && currentUserRole === 'user') {
      // Add a notice for limited permissions mode
      let readOnlyNotice = document.querySelector('.read-only-notice');
      if (!readOnlyNotice) {
        readOnlyNotice = document.createElement('div');
        readOnlyNotice.className = 'read-only-notice';
        readOnlyNotice.style.cssText = `
          background-color: #fff3cd;
          color: #856404;
          padding: 12px 16px;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
        `;
        readOnlyNotice.innerHTML = `
          <i class="fas fa-info-circle"></i>
          Permisos limitados - Puede crear órdenes pero no puede aprobar, rechazar o modificar órdenes existentes
        `;
        tableContainer.parentNode.insertBefore(readOnlyNotice, tableContainer);
      }
    }

    // Additional UI updates can be added here based on role
    if (currentUserRole === 'user') {
      console.log('User role restrictions applied');
    }
  }

  // Navigation functionality
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewName = item.getAttribute('data-view');
      switchView(viewName);
      
      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Switch between views
  function switchView(viewName) {
    views.forEach(view => view.classList.remove('active'));
    
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Update header based on view
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    switch(viewName) {
      case 'dashboard':
        pageTitle.textContent = 'Gestión de órdenes de compra';
        pageSubtitle.textContent = 'Panel de control para gestión de órdenes de compra';
        loadRecentOrders();
        break;
      case 'purchase-orders':
        pageTitle.textContent = 'Gestión de órdenes de compra';
        pageSubtitle.textContent = 'Panel de control para gestión de órdenes de compra';
        loadAllOrders();
        // Update UI for user role when switching to purchase orders
        setTimeout(() => updateUIForUserRole(), 100);
        break;
      case 'expenses':
        pageTitle.textContent = 'Gastos';
        pageSubtitle.textContent = 'Gestión de gastos y presupuestos';
        break;
      case 'admin':
        pageTitle.textContent = 'Panel de Administración';
        pageSubtitle.textContent = 'Configuración y administración del sistema';
        break;
    }
  }

  // Make switchView globally available
  window.switchView = switchView;

  // Modal functionality
  window.openNewOrderModal = function() {
    // Allow both admin and user roles to create orders
    if (currentUserRole !== 'admin' && currentUserRole !== 'user') {
      showMessage('No tiene permisos para crear nuevas órdenes', true);
      return;
    }
    modal.classList.add('show');
    // Set today's date as default
    document.getElementById('fecha_de_orden').value = new Date().toISOString().split('T')[0];
    // Ensure status is set to 'Pendiente' as default
    document.getElementById('estado').value = 'Pendiente';
    // Reset total display
    updateCalculatedTotal();
  };

  window.closeNewOrderModal = function() {
    modal.classList.remove('show');
    form.reset();
    // Reset status to 'Pendiente' after reset
    document.getElementById('estado').value = 'Pendiente';
    // Hide total display
    document.getElementById('total-display').style.display = 'none';
  };

  // Calculate and update the total amount display
  function updateCalculatedTotal() {
    const cantidadInput = document.getElementById('cantidad');
    const precioInput = document.getElementById('precio_por_unidad');
    const totalDisplay = document.getElementById('calculated-total');
    const totalContainer = document.getElementById('total-display');

    const cantidad = parseFloat(cantidadInput.value) || 0;
    const precio = parseFloat(precioInput.value) || 0;
    const total = cantidad * precio;

    if (cantidad > 0 && precio > 0) {
      totalDisplay.textContent = formatCurrency(total);
      totalContainer.style.display = 'block';
    } else {
      totalDisplay.textContent = '$0.00 MXN';
      totalContainer.style.display = 'none';
    }
  }

  // Add event listeners for dynamic total calculation
  document.getElementById('cantidad').addEventListener('input', updateCalculatedTotal);
  document.getElementById('precio_por_unidad').addEventListener('input', updateCalculatedTotal);

  // Status confirmation modal functionality
  window.openStatusConfirmModal = function(orderId, newStatus, actionText) {
    const confirmTitle = document.getElementById('confirm-title');
    const confirmText = document.getElementById('confirm-text');
    const confirmBtn = document.getElementById('confirm-action-btn');

    confirmTitle.textContent = `Confirmar ${actionText}`;
    confirmText.textContent = `¿Está seguro que desea ${actionText.toLowerCase()} esta orden de compra?`;
    
    if (newStatus === 'Rechazado') {
      confirmText.textContent += ' Esta acción es irreversible.';
      confirmBtn.className = 'btn btn-danger';
      confirmBtn.textContent = 'Rechazar Orden';
    } else {
      confirmBtn.className = 'btn btn-success';
      confirmBtn.textContent = `${actionText} Orden`;
    }

    // Store the pending update
    pendingStatusUpdate = { orderId, newStatus };
    statusConfirmModal.classList.add('show');
  };

  window.closeStatusConfirmModal = function() {
    statusConfirmModal.classList.remove('show');
    pendingStatusUpdate = null;
  };

  // Execute the status update after confirmation
  async function executeStatusUpdate() {
    if (!pendingStatusUpdate) return;

    const { orderId, newStatus } = pendingStatusUpdate;
    
    try {
      const response = await api.updatePurchaseOrderStatus(orderId, newStatus);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      showMessage(`Estado actualizado a "${newStatus}" correctamente`);
      closeStatusConfirmModal();
      
      // Refresh data based on current view
      const activeView = document.querySelector('.view.active');
      if (activeView && activeView.id === 'dashboard-view') {
        loadRecentOrders();
      } else if (activeView && activeView.id === 'purchase-orders-view') {
        loadAllOrders();
      }
    } catch (error) {
      showMessage(`Error al actualizar el estado: ${error.message}`, true);
      closeStatusConfirmModal();
    }
  }

  // Make executeStatusUpdate globally available
  window.executeStatusUpdate = executeStatusUpdate;

  // Show message function
  function showMessage(message, isError = false) {
    messageDiv.textContent = message;
    messageDiv.className = isError ? 'message error show' : 'message success show';
    
    setTimeout(() => {
      messageDiv.classList.remove('show');
    }, 5000);
  }

  // Utility functions
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  function getStatusBadgeClass(status) {
    const statusClasses = {
      'Pendiente': 'status-pendiente',
      'Aprobado': 'status-aprobado',
      'Rechazado': 'status-rechazado',
      'Ordenado': 'status-ordenado',
      'Recibido': 'status-recibido'
    };
    
    return statusClasses[status] || 'status-pendiente';
  }

  // Load recent orders for dashboard
  async function loadRecentOrders() {
    try {
      const response = await api.getPurchaseOrders();
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      const orders = response.data.slice(0, 10); // Show only 10 most recent
      const tableBody = document.getElementById('dashboard-table-body');
      
      if (orders.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 30px; color: #6c757d;">
              <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
              No hay órdenes de compra registradas
            </td>
          </tr>
        `;
        return;
      }
      
      tableBody.innerHTML = orders.map(order => `
        <tr>
          <td>${order.id}</td>
          <td>${order.articulo}</td>
          <td>${order.cantidad}</td>
          <td>${formatCurrency(order.precio_por_unidad)}</td>
          <td>${formatCurrency(order.cantidad * order.precio_por_unidad)}</td>
          <td>${order.proveedor}</td>
          <td>${formatDate(order.fecha_de_orden)}</td>
          <td>${generateStatusColumn(order)}</td>
          <td>${generateActionButtons(order)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error loading recent orders:', error);
      const tableBody = document.getElementById('dashboard-table-body');
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            Error al cargar las órdenes: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  function generateStatusColumn(order) {
    if (currentUserRole === 'admin' && order.estado !== 'Rechazado') {
      // Admin can change status via dropdown (except for rejected orders)
      const validTransitions = getValidTransitions(order.estado);
      
      return `
        <select class="status-dropdown" onchange="updateOrderStatus(${order.id}, this.value)" data-original="${order.estado}">
          ${validTransitions.map(status => 
            `<option value="${status}" ${status === order.estado ? 'selected' : ''}>${status}</option>`
          ).join('')}
        </select>
      `;
    } else {
      // Non-admin or rejected orders show badge only
      return `<span class="status-badge ${getStatusBadgeClass(order.estado)}">${order.estado}</span>`;
    }
  }

  function getValidTransitions(currentStatus) {
    const transitionMatrix = {
      'Pendiente': ['Pendiente', 'Aprobado', 'Rechazado'],
      'Aprobado': ['Aprobado', 'Rechazado', 'Ordenado', 'Recibido'],
      'Rechazado': ['Rechazado'], // Immutable
      'Ordenado': ['Ordenado', 'Recibido'],
      'Recibido': ['Recibido'] // Only stay in same status
    };

    return transitionMatrix[currentStatus] || [currentStatus];
  }

  function generateActionButtons(order) {
    if (currentUserRole !== 'admin') {
      return '<span style="color: #6c757d; font-size: 12px;">Solo lectura</span>';
    }

    let buttons = [];

    // Approve/Reject buttons for Pendiente orders
    if (order.estado === 'Pendiente') {
      buttons.push(`
        <button class="btn-sm btn-success" onclick="approveOrder(${order.id})" title="Aprobar orden">
          <i class="fas fa-check"></i>
        </button>
      `);
      buttons.push(`
        <button class="btn-sm btn-danger" onclick="rejectOrder(${order.id})" title="Rechazar orden">
          <i class="fas fa-times"></i>
        </button>
      `);
    }

    // Edit button (for future implementation)
    if (order.estado !== 'Rechazado' && order.estado !== 'Recibido') {
      buttons.push(`
        <button class="btn-sm btn-warning" onclick="editOrder(${order.id})" title="Editar orden">
          <i class="fas fa-edit"></i>
        </button>
      `);
    }

    // Complete button for Ordenado orders
    if (order.estado === 'Ordenado') {
      buttons.push(`
        <button class="btn-sm btn-info" onclick="completeOrder(${order.id})" title="Marcar como recibido">
          <i class="fas fa-check-circle"></i>
        </button>
      `);
    }

    // Delete button (for future implementation)
    if (order.estado === 'Pendiente' || order.estado === 'Rechazado') {
      buttons.push(`
        <button class="btn-sm btn-secondary" onclick="deleteOrder(${order.id})" title="Eliminar orden">
          <i class="fas fa-trash"></i>
        </button>
      `);
    }

    return `<div class="action-buttons">${buttons.join('')}</div>`;
  }

  // Load all orders for purchase orders view
  async function loadAllOrders() {
    try {
      const response = await api.getPurchaseOrders();
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      const orders = response.data;
      const tableBody = document.getElementById('purchase-orders-table-body');
      
      if (orders.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 30px; color: #6c757d;">
              <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
              No hay órdenes de compra registradas
            </td>
          </tr>
        `;
        return;
      }
      
      tableBody.innerHTML = orders.map(order => `
        <tr>
          <td>${order.id}</td>
          <td>${order.articulo}</td>
          <td>${order.cantidad}</td>
          <td>${formatCurrency(order.precio_por_unidad)}</td>
          <td>${formatCurrency(order.cantidad * order.precio_por_unidad)}</td>
          <td>${order.proveedor}</td>
          <td>${formatDate(order.fecha_de_orden)}</td>
          <td>${generateStatusColumn(order)}</td>
          <td>${generateActionButtons(order)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error loading all orders:', error);
      const tableBody = document.getElementById('purchase-orders-table-body');
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: #dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            Error al cargar las órdenes: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  // Action button functions
  window.approveOrder = function(orderId) {
    if (currentUserRole !== 'admin') {
      showMessage('No tiene permisos para realizar esta acción', true);
      return;
    }
    openStatusConfirmModal(orderId, 'Aprobado', 'Aprobar');
  };

  window.rejectOrder = function(orderId) {
    if (currentUserRole !== 'admin') {
      showMessage('No tiene permisos para realizar esta acción', true);
      return;
    }
    openStatusConfirmModal(orderId, 'Rechazado', 'Rechazar');
  };

  // Other action functions (placeholders)
  window.editOrder = function(orderId) {
    if (currentUserRole !== 'admin') {
      showMessage('No tiene permisos para realizar esta acción', true);
      return;
    }
    alert(`Editar orden ID: ${orderId}\nEsta función estará disponible próximamente.`);
  };

  window.completeOrder = function(orderId) {
    if (currentUserRole !== 'admin') {
      showMessage('No tiene permisos para realizar esta acción', true);
      return;
    }
    if (confirm('¿Marcar esta orden como completada?')) {
      alert(`Orden ID: ${orderId} marcada como completada.\nEsta función estará disponible próximamente.`);
    }
  };

  window.deleteOrder = function(orderId) {
    if (currentUserRole !== 'admin') {
      showMessage('No tiene permisos para realizar esta acción', true);
      return;
    }
    if (confirm('¿Está seguro que desea eliminar esta orden?\nEsta acción no se puede deshacer.')) {
      alert(`Orden ID: ${orderId} eliminada.\nEsta función estará disponible próximamente.`);
    }
  };

  // Status update function for dropdown changes
  window.updateOrderStatus = async function(orderId, newStatus) {
    if (currentUserRole !== 'admin') {
      showMessage('No tiene permisos para cambiar el estado de las órdenes', true);
      return;
    }

    try {
      // Get the current order to validate transition
      const response = await api.getPurchaseOrders();
      if (!response.success) {
        throw new Error('Unable to fetch current order data');
      }
      
      const currentOrder = response.data.find(order => order.id === orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }
      
      // Validate transition according to matrix rules
      const isValidTransition = validateStatusTransition(currentOrder.estado, newStatus);
      if (!isValidTransition) {
        showMessage(`Transición no permitida: de "${currentOrder.estado}" a "${newStatus}"`, true);
        // Reload the table to reset the dropdown
        loadAllOrders();
        return;
      }

      // Special confirmation for Rechazado status (immutable)
      if (newStatus === 'Rechazado' && currentOrder.estado !== 'Rechazado') {
        openStatusConfirmModal(orderId, newStatus, 'Rechazar');
        return; // Let the modal handle the actual update
      }

      const updateResponse = await api.updatePurchaseOrderStatus(orderId, newStatus);
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.error);
      }
      
      showMessage(`Estado actualizado a "${newStatus}" correctamente`);
      
      // Refresh data based on current view
      const activeView = document.querySelector('.view.active');
      if (activeView && activeView.id === 'dashboard-view') {
        loadRecentOrders();
      } else if (activeView && activeView.id === 'purchase-orders-view') {
        loadAllOrders();
      }
    } catch (error) {
      showMessage(`Error al actualizar el estado: ${error.message}`, true);
      // Reload the table to reset the dropdown to original state
      loadAllOrders();
    }
  };

  // Validate status transitions according to the matrix
  function validateStatusTransition(currentStatus, newStatus) {
    const transitionMatrix = {
      'Pendiente': ['Aprobado', 'Rechazado'], // Only via buttons, not dropdown
      'Aprobado': ['Aprobado', 'Rechazado', 'Ordenado', 'Recibido'],
      'Rechazado': [], // Immutable - no transitions allowed
      'Ordenado': ['Ordenado', 'Recibido'],
      'Recibido': ['Recibido'] // Only stay in same status
    };

    const allowedTransitions = transitionMatrix[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  // Form submission handling
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Check user permissions - allow both admin and user to create orders
    if (currentUserRole !== 'admin' && currentUserRole !== 'user') {
      showMessage('No tiene permisos para crear órdenes de compra', true);
      return;
    }

    // Validate form data
    const formData = {
      articulo: document.getElementById('articulo').value.trim(),
      cantidad: parseInt(document.getElementById('cantidad').value),
      precio_por_unidad: parseFloat(document.getElementById('precio_por_unidad').value),
      proveedor: document.getElementById('proveedor').value.trim(),
      fecha_de_orden: document.getElementById('fecha_de_orden').value,
      estado: 'Pendiente' // Always force 'Pendiente' for new orders
    };

    // Client-side validation
    if (!formData.articulo) {
      showMessage('El artículo es requerido', true);
      return;
    }

    if (!formData.proveedor) {
      showMessage('El proveedor es requerido', true);
      return;
    }

    if (isNaN(formData.cantidad) || formData.cantidad <= 0) {
      showMessage('La cantidad debe ser un número positivo', true);
      return;
    }

    if (isNaN(formData.precio_por_unidad) || formData.precio_por_unidad <= 0) {
      showMessage('El precio por unidad debe ser un número positivo', true);
      return;
    }

    if (!formData.fecha_de_orden) {
      showMessage('La fecha de orden es requerida', true);
      return;
    }

    try {
      const response = await api.addPurchaseOrder(formData);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      showMessage('Orden de compra creada exitosamente');
      closeNewOrderModal();
      
      // Refresh data based on current view
      const activeView = document.querySelector('.view.active');
      if (activeView && activeView.id === 'dashboard-view') {
        loadRecentOrders();
      } else if (activeView && activeView.id === 'purchase-orders-view') {
        loadAllOrders();
      }
    } catch (error) {
      showMessage(`Error al crear la orden: ${error.message}`, true);
    }
  });

  // Development function to test role switching (remove in production)
  window.switchUserRole = function() {
    currentUserRole = currentUserRole === 'admin' ? 'user' : 'admin';
    console.log('Switched to role:', currentUserRole);
    updateUIForUserRole();
    
    // Refresh current view
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'purchase-orders-view') {
      loadAllOrders();
    } else if (activeView && activeView.id === 'dashboard-view') {
      loadRecentOrders();
    }
    
    showMessage(`Rol cambiado a: ${currentUserRole}`, false);
  };
}); 