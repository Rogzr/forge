# Enhanced Hybrid Status Update System for Purchase Orders

This document explains the enhanced hybrid logic for updating purchase order statuses in the Electron application, including the new immutable 'Rechazado' status rule.

## Status Values
The system supports 5 status values:
- **Pendiente** (Pending) - Initial state for all new orders
- **Aprobado** (Approved) - Order has been approved and can be further processed
- **Rechazado** (Rejected) - **FINAL STATE** - Order is rejected and becomes immutable
- **Ordenado** (Ordered) - Order has been placed with supplier
- **Recibido** (Received) - Order has been received and completed

## Enhanced Logic Flow

### 1. New Order Creation
- **Enforcement**: All new orders are automatically set to 'Pendiente' status
- **UI**: The status dropdown in the "Nueva orden de compra" modal is disabled with informational message
- **Backend**: The `main.js` add-purchase-order handler enforces 'Pendiente' status as a security measure

### 2. Updating from 'Pendiente' Status
When an order has **'Pendiente'** status:

**Status Column:**
- Shows a yellow status badge (not a dropdown)
- Status cannot be changed via dropdown

**Actions Column:**
- Displays two action buttons:
  - ✓ **Approve** button (green checkmark)
  - ✗ **Reject** button (red X)

**Approval Process:**
1. User clicks "Approve" button
2. Custom confirmation modal: "¿Está seguro que desea aprobar esta orden de compra? Podrá cambiar el estado posteriormente."
3. If "Sí": Status updates to 'Aprobado'
4. If "No": Modal closes, no change

**Rejection Process:**
1. User clicks "Reject" button  
2. **Warning confirmation modal**: "¿Está seguro que desea rechazar esta orden de compra? Una vez rechazada, la orden no podrá ser modificada."
3. If "Sí": Status updates to 'Rechazado' (becomes **FINAL**)
4. If "No": Modal closes, no change

### 3. Updating from 'Aprobado', 'Ordenado', or 'Recibido' Status
When an order has **'Aprobado'**, **'Ordenado'**, or **'Recibido'** status:

**Status Column:**
- Shows an enabled dropdown with limited status options based on transition rules
- **From Aprobado**: Can change to Rechazado, Ordenado, or Recibido (cannot go back to Pendiente)
- **From Ordenado**: Can only change to Recibido (forward progression only)
- **From Recibido**: Cannot change status (final completion state)

**Actions Column:**
- **Aprobado/Ordenado**: Shows Edit button for future functionality
- **Recibido**: Shows completion icon (no actions available)

**Update Process:**
1. User selects new status from limited dropdown options
2. Status updates immediately (no confirmation required)
3. Table refreshes to show new status and update UI accordingly
4. **Note**: Only forward progression allowed, except Aprobado can go to Rechazado

### 4. **NEW**: 'Rechazado' Status (Final State)
When an order has **'Rechazado'** status:

**Status Column:**
- Shows a red status badge with "Estado final" note
- **No dropdown available** - status cannot be changed
- Visual indicator that this is an immutable state

**Actions Column:**
- **No action buttons available**
- Shows a disabled ban icon (🚫) with tooltip: "Orden rechazada - Sin acciones disponibles"
- No edit, delete, or other modification options

**Immutability:**
- Once an order reaches 'Rechazado' status, it cannot be modified
- This represents a final business decision that should not be reversible
- Provides audit trail and prevents accidental changes to rejected orders

## Visual Status Indicators

### Status Badges
- **Pendiente**: Yellow badge with warning styling
- **Aprobado**: Green badge with success styling  
- **Rechazado**: Red badge with danger styling + "Estado final" note
- **Ordenado**: Blue badge with info styling
- **Recibido**: Gray badge with neutral styling

### Action Buttons
- **Approve** (✓): Green with hover effects
- **Reject** (✗): Red with hover effects and warning tooltip
- **Edit** (✏️): Yellow/orange with hover effects
- **No Actions** (🚫): Muted gray, disabled state

## Technical Implementation

### Files Modified
- `src/index.html`: Enhanced CSS for status notes and no-actions styling
- `src/renderer.js`: Updated logic for Rechazado immutability
- `src/index.js`: Maintains existing enforcement (no changes needed)
- `src/preload.js`: No changes needed

### Key Functions Enhanced

#### `generateStatusColumn(order)`
- **Pendiente**: Returns status badge only
- **Rechazado**: Returns status badge + "Estado final" note
- **Others**: Returns enabled dropdown

#### `generateActionButtons(order)`
- **Pendiente**: Returns Approve + Reject buttons
- **Rechazado**: Returns disabled ban icon with tooltip
- **Others**: Returns Edit button only

#### `openStatusConfirmModal()`
- Enhanced with specific warnings for Rechazado finality
- Different messages for Approve vs Reject actions
- Clear indication of consequences

### Security & Business Logic
- **Immutable Rejections**: Prevents accidental restoration of rejected orders
- **Clear Warnings**: Users understand the finality of rejection before confirming
- **Audit Trail**: Rejected orders remain visible but clearly marked as final
- **Data Integrity**: No backend changes needed - front-end enforces immutability

## User Experience Benefits

### Clarity
- Clear visual distinction between editable and final states
- Status badges vs dropdowns provide immediate understanding
- "Estado final" note eliminates confusion

### Safety
- Strong warnings before irreversible actions
- Confirmation modals prevent accidental rejections
- Disabled actions prevent errors on final states

### Efficiency
- Direct dropdown changes for active orders
- Button-based approvals for pending orders
- No unnecessary confirmations for routine updates

### Compliance
- Immutable rejected orders support audit requirements
- Clear business process enforcement
- Prevention of unauthorized order restoration

## Status Transition Matrix

| From → To | Pendiente | Aprobado | Rechazado | Ordenado | Recibido |
|-----------|-----------|----------|-----------|----------|----------|
| **Pendiente** | ➖ | ✅ Button | ✅ Button | ❌ | ❌ |
| **Aprobado** | ❌ | ➖ | ✅ Dropdown | ✅ Dropdown | ✅ Dropdown |
| **Rechazado** | ❌ | ❌ | ➖ | ❌ | ❌ |
| **Ordenado** | ❌ | ❌ | ❌ | ➖ | ✅ Dropdown |
| **Recibido** | ❌ | ❌ | ❌ | ❌ | ➖ |

**Legend:**
- ✅ = Allowed transition
- ❌ = Blocked transition  
- ➖ = Same status
- Button = Requires confirmation modal
- Dropdown = Direct change, no confirmation 