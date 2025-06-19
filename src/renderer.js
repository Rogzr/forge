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

  async function initializeApp() {
    try {
      // Fetch current user role
      const roleResponse = await window.api.getCurrentUserRole();
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
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    
    let titleText, messageText;
    
    if (newStatus === 'Aprobado') {
      titleText = 'Confirmar Aprobación';
      messageText = '¿Está seguro que desea aprobar esta orden de compra?';
    } else if (newStatus === 'Rechazado') {
      titleText = 'Confirmar Rechazo';
      messageText = '¿Está seguro que desea rechazar esta orden de compra? Una vez rechazada, la orden no podrá ser modificada.';
    } else {
      titleText = `Confirmar ${actionText}`;
      messageText = `¿Está seguro que desea ${actionText.toLowerCase()} esta orden de compra?`;
    }
    
    confirmTitle.textContent = titleText;
    confirmMessage.textContent = messageText;
    
    // Store the pending update
    pendingStatusUpdate = { orderId, newStatus };
    
    // Remove any existing event listeners and add new one
    const newConfirmBtn = confirmYesBtn.cloneNode(true);
    confirmYesBtn.parentNode.replaceChild(newConfirmBtn, confirmYesBtn);
    
    newConfirmBtn.addEventListener('click', async () => {
      await executeStatusUpdate();
    });
    
    statusConfirmModal.classList.add('show');
  };

  window.closeStatusConfirmModal = function() {
    statusConfirmModal.classList.remove('show');
    pendingStatusUpdate = null;
  };

  // Execute the status update
  async function executeStatusUpdate() {
    if (!pendingStatusUpdate) return;
    
    try {
      const { orderId, newStatus } = pendingStatusUpdate;
      const response = await window.api.updatePurchaseOrderStatus(orderId, newStatus);
      
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

  // Close modals when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeNewOrderModal();
    }
  });

  statusConfirmModal.addEventListener('click', (e) => {
    if (e.target === statusConfirmModal) {
      closeStatusConfirmModal();
    }
  });

  // User actions
  window.editUserData = function() {
    alert('Función de editar datos estará disponible próximamente.');
  };

  window.logout = function() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      alert('Cerrando sesión...');
      // Here you would implement actual logout functionality
    }
  };

  // Message display functionality
  function showMessage(message, isError = false) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.style.display = 'block';
    setTimeout(() => {
      messageDiv.style.display = 'none';
      messageDiv.className = 'message';
    }, 5000);
  }

  // Date formatting functions
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
      case 'pendiente':
        return 'status-pendiente';
      case 'aprobado':
        return 'status-aprobado';
      case 'rechazado':
        return 'status-rechazado';
      case 'ordenado':
        return 'status-ordenado';
      case 'recibido':
        return 'status-recibido';
      case 'en proceso':
        return 'status-en-proceso';
      case 'completado':
        return 'status-completado';
      default:
        return 'status-pendiente';
    }
  }

  // Load recent orders for dashboard
  async function loadRecentOrders() {
    try {
      const response = await window.api.getPurchaseOrders();
      
      if (!response.success) {
        throw new Error(response.error);
      }

      const recentOrdersContainer = document.getElementById('recent-orders');
      recentOrdersContainer.innerHTML = '';

      // Show only the 3 most recent orders
      const recentOrders = response.data.slice(0, 3);

      if (recentOrders.length === 0) {
        recentOrdersContainer.innerHTML = '<p>No hay órdenes recientes</p>';
        return;
      }

      recentOrders.forEach(order => {
        const total = order.cantidad * order.precio_por_unidad;
        const orderElement = document.createElement('div');
        orderElement.className = 'recent-order';
        orderElement.innerHTML = `
          <div class="order-info">
            <h4>${order.articulo}</h4>
            <div class="order-details">
              Proveedor: ${order.proveedor} • Fecha: ${formatDate(order.fecha_de_orden)}
            </div>
            <div class="order-details">ID: ${order.id}</div>
          </div>
          <div class="order-amount">
            <div class="status-badge ${getStatusBadgeClass(order.estado)}">${order.estado}</div>
            <div class="order-total">${formatCurrency(total)}</div>
            <div class="order-quantity">${formatCurrency(order.precio_por_unidad)} por unidad</div>
            <div class="order-quantity">Cantidad: ${order.cantidad} unid.</div>
          </div>
        `;
        recentOrdersContainer.appendChild(orderElement);
      });
    } catch (error) {
      console.error('Error loading recent orders:', error);
      const recentOrdersContainer = document.getElementById('recent-orders');
      recentOrdersContainer.innerHTML = '<p>Error al cargar las órdenes recientes</p>';
    }
  }

  // Generate status dropdown or badge based on order status
  function generateStatusColumn(order) {
    const status = order.estado.toLowerCase();
    
    // For non-admin users, always show read-only status badge
    if (currentUserRole !== 'admin') {
      return `
        <span class="status-badge ${getStatusBadgeClass(order.estado)}">${order.estado}</span>
        <small class="status-note">Solo lectura</small>
      `;
    }
    
    // Admin user logic (original implementation)
    if (status === 'pendiente') {
      // For Pendiente orders, show a status badge (non-editable)
      return `
        <span class="status-badge ${getStatusBadgeClass(order.estado)}">${order.estado}</span>
      `;
    } else if (status === 'rechazado') {
      // For Rechazado orders, show a disabled dropdown (final state)
      return `
        <span class="status-badge ${getStatusBadgeClass(order.estado)}">${order.estado}</span>
        <small class="status-note">Estado final</small>
      `;
    } else {
      // For other statuses, show enabled dropdown with allowed transitions only
      let allowedStatuses = [];
      
      // Define allowed transitions based on matrix
      switch (status) {
        case 'aprobado':
          allowedStatuses = ['Aprobado', 'Rechazado', 'Ordenado', 'Recibido'];
          break;
        case 'ordenado':
          allowedStatuses = ['Ordenado', 'Recibido'];
          break;
        case 'recibido':
          allowedStatuses = ['Recibido'];
          break;
        default:
          allowedStatuses = ['Pendiente', 'Aprobado', 'Rechazado', 'Ordenado', 'Recibido'];
      }
      
      let optionsHtml = '';
      allowedStatuses.forEach(statusOption => {
        const selected = statusOption === order.estado ? 'selected' : '';
        optionsHtml += `<option value="${statusOption}" ${selected}>${statusOption}</option>`;
      });
      
      return `
        <select class="status-dropdown" onchange="updateOrderStatus(${order.id}, this.value)">
          ${optionsHtml}
        </select>
      `;
    }
  }

  // Generate action buttons based on order status
  function generateActionButtons(order) {
    // For non-admin users, show no actions
    if (currentUserRole !== 'admin') {
      return `
        <span class="no-actions" title="Permisos insuficientes">
          <i class="fas fa-lock text-muted"></i>
        </span>
      `;
    }

    // Admin user logic (original implementation)
    const status = order.estado.toLowerCase();
    
    if (status === 'pendiente') {
      // For Pendiente orders, show Approve and Reject buttons
      return `
        <button class="action-btn action-approve" title="Aprobar orden" onclick="approveOrder(${order.id})">
          <i class="fas fa-check"></i>
        </button>
        <button class="action-btn action-reject" title="Rechazar orden" onclick="rejectOrder(${order.id})">
          <i class="fas fa-times"></i>
        </button>
      `;
    } else if (status === 'rechazado') {
      // For Rechazado orders, show no actions (final state)
      return `
        <span class="no-actions" title="Orden rechazada - Sin acciones disponibles">
          <i class="fas fa-ban text-muted"></i>
        </span>
      `;
    } else if (status === 'recibido') {
      // For Recibido orders, very limited actions (status is mostly final)
      return `
        <span class="no-actions" title="Orden recibida - Estado final">
          <i class="fas fa-check-circle text-muted"></i>
        </span>
      `;
    } else {
      // For Aprobado and Ordenado - show Edit button only
      return `
        <button class="action-btn action-edit" title="Editar orden" onclick="editOrder(${order.id})">
          <i class="fas fa-edit"></i>
        </button>
      `;
    }
  }

  // Load all orders for purchase orders view
  async function loadAllOrders() {
    try {
      const response = await window.api.getPurchaseOrders();
      
      if (!response.success) {
        throw new Error(response.error);
      }

      const tableBody = document.getElementById('orders-table-body');
      tableBody.innerHTML = '';

      if (response.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No hay órdenes disponibles</td></tr>';
        return;
      }

      response.data.forEach(order => {
        const total = order.cantidad * order.precio_por_unidad;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <strong>${order.articulo}</strong>
          </td>
          <td>${order.cantidad}</td>
          <td>
            <strong>${formatCurrency(total)}</strong><br>
            <small style="color: #6c757d;">${formatCurrency(order.precio_por_unidad)} por unidad</small>
          </td>
          <td>${order.proveedor}</td>
          <td>${formatDate(order.fecha_de_orden)}</td>
          <td>
            ${generateStatusColumn(order)}
          </td>
          <td class="actions-cell">
            ${generateActionButtons(order)}
          </td>
        `;
        tableBody.appendChild(row);
      });
    } catch (error) {
      showMessage(`Error al cargar las órdenes: ${error.message}`, true);
    }
  }

  // Action functions for status updates
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
      const response = await window.api.getPurchaseOrders();
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

      const updateResponse = await window.api.updatePurchaseOrderStatus(orderId, newStatus);
      
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
      const response = await window.api.addPurchaseOrder(formData);
      
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