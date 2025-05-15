import express from 'express';
import con from '../utils/db.js';
import verifyToken from '../Middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * Get notifications for the current user based on their role and branch
 * Filters out expired notifications
 */
router.get('/', (req, res) => {
  console.log('GET /notifications - Fetching notifications for user');

  // Get user info from the token
  const { role, branch_id } = req.user;

  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'User role is required'
    });
  }

  console.log(`Fetching notifications for role: ${role}, branch: ${branch_id || 'all'}`);

  // Normalize the role for comparison
  let normalizedRole = role.toLowerCase();

  // Handle different role formats
  if (normalizedRole.includes('store') && normalizedRole.includes('manager')) {
    normalizedRole = 'store manager';
  } else if (normalizedRole.includes('sales') && normalizedRole.includes('associate')) {
    normalizedRole = 'sales associate';
  } else if (normalizedRole.includes('admin')) {
    normalizedRole = 'admin';
  } else if (normalizedRole.includes('cashier')) {
    normalizedRole = 'cashier';
  }

  console.log(`Normalized role: ${normalizedRole}`);

  // Create additional role variations for better matching
  const roleVariations = [
    role,                   // Original role
    role.toLowerCase(),     // Lowercase
    role.toUpperCase(),     // Uppercase
    normalizedRole,         // Normalized role
    normalizedRole.replace(/\s+/g, ''), // Remove spaces
    role.replace(/\s+/g, '') // Remove spaces from original
  ];

  console.log('Role variations for matching:', roleVariations);

  // Build the query - use multiple LIKE conditions to handle different role formats
  // Create a dynamic query with placeholders for each role variation
  const likeClauses = roleVariations.map(() => 'target_roles LIKE ?').join(' OR ');

  let sql = `
    SELECT * FROM notifications
    WHERE
      (
        ${likeClauses}
      )
      AND (expires_at IS NULL OR expires_at > NOW())
  `;

  // Use LIKE with % wildcards to find the role in the JSON array with different capitalizations
  const params = roleVariations.map(r => `%${r}%`);

  console.log('SQL query:', sql);
  console.log('Query parameters:', params);

  // If user is not admin, filter by branch
  if (!normalizedRole.includes('admin') && branch_id) {
    sql += ` AND (branch_id = ? OR branch_id IS NULL)`;
    params.push(branch_id);
  }

  // Order by creation date (newest first)
  sql += ` ORDER BY created_at DESC`;

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Found ${results.length} notifications for ${role}`);
    return res.json({
      success: true,
      data: results
    });
  });
});

/**
 * Create a new notification
 */
router.post('/', (req, res) => {
  console.log('POST /notifications - Creating new notification');

  const {
    title,
    message,
    type,
    target_roles,
    branch_id,
    related_id,
    related_type
  } = req.body;

  // Validate required fields
  if (!title || !message || !type || !target_roles) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Calculate expiration date (5 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 5);

  // Convert target_roles to JSON string if it's an array
  const targetRolesJson = typeof target_roles === 'string'
    ? target_roles
    : JSON.stringify(target_roles);

  const sql = `
    INSERT INTO notifications (
      title,
      message,
      type,
      target_roles,
      expires_at,
      branch_id,
      related_id,
      related_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title,
    message,
    type,
    targetRolesJson,
    expiresAt,
    branch_id || null,
    related_id || null,
    related_type || null
  ];

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error creating notification:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Created notification with ID: ${result.insertId}`);
    return res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification_id: result.insertId }
    });
  });
});

/**
 * Mark a notification as read
 */
router.patch('/:id/read', (req, res) => {
  console.log(`PATCH /notifications/${req.params.id}/read - Marking notification as read`);

  const notificationId = req.params.id;

  const sql = `
    UPDATE notifications
    SET is_read = TRUE
    WHERE notification_id = ?
  `;

  con.query(sql, [notificationId], (err, result) => {
    if (err) {
      console.error('Error marking notification as read:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    console.log(`Marked notification ${notificationId} as read`);
    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  });
});

/**
 * Delete a notification
 */
router.delete('/:id', (req, res) => {
  console.log(`DELETE /notifications/${req.params.id} - Deleting notification`);

  const notificationId = req.params.id;

  const sql = `
    DELETE FROM notifications
    WHERE notification_id = ?
  `;

  con.query(sql, [notificationId], (err, result) => {
    if (err) {
      console.error('Error deleting notification:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    console.log(`Deleted notification ${notificationId}`);
    return res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  });
});

/**
 * Delete all expired notifications (maintenance endpoint)
 */
router.delete('/maintenance/expired', (req, res) => {
  console.log('DELETE /notifications/maintenance/expired - Deleting expired notifications');

  // Only allow admins to access this endpoint
  if (req.user.role.toLowerCase() !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admins can perform this action'
    });
  }

  const sql = `
    DELETE FROM notifications
    WHERE expires_at < NOW()
  `;

  con.query(sql, (err, result) => {
    if (err) {
      console.error('Error deleting expired notifications:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Deleted ${result.affectedRows} expired notifications`);
    return res.json({
      success: true,
      message: `Deleted ${result.affectedRows} expired notifications`
    });
  });
});

/**
 * Create a sales notification
 * This endpoint is called when a sale is made
 */
router.post('/sales', (req, res) => {
  console.log('POST /notifications/sales - Creating sales notification');

  const { sale_id, amount, branch_id, item_name } = req.body;

  if (!sale_id || !amount || !branch_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Create notification for Admin, Store Manager, and Cashier
  const title = 'New Sale';
  const itemInfo = item_name ? ` of ${item_name}` : '';
  const message = `A new sale${itemInfo} has been made for LKR ${amount.toFixed(2)}`;
  // Include all possible role formats to ensure proper filtering
  const targetRoles = JSON.stringify([
    "admin", "Admin", "administrator", "Administrator",
    "store manager", "Store Manager", "storemanager", "StoreManager",
    "cashier", "Cashier"
  ]);

  // Calculate expiration date (5 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 5);

  const sql = `
    INSERT INTO notifications (
      title,
      message,
      type,
      target_roles,
      expires_at,
      branch_id,
      related_id,
      related_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title,
    message,
    'sales',
    targetRoles,
    expiresAt,
    branch_id,
    sale_id,
    'sale'
  ];

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error creating sales notification:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Created sales notification with ID: ${result.insertId}`);
    return res.status(201).json({
      success: true,
      message: 'Sales notification created successfully',
      data: { notification_id: result.insertId }
    });
  });
});

/**
 * Create an inventory order notification
 * This endpoint is called when an inventory order is made
 */
router.post('/inventory-order', (req, res) => {
  console.log('POST /notifications/inventory-order - Creating inventory order notification');

  const { order_id, supplier_name, category, branch_id } = req.body;

  if (!order_id || !supplier_name || !branch_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Create notification for Admin and Store Manager
  const title = 'New Inventory Order';
  const categoryInfo = category ? ` for ${category}` : '';
  const message = `A new inventory order${categoryInfo} has been placed with ${supplier_name}`;
  // Include all possible role formats to ensure proper filtering
  const targetRoles = JSON.stringify([
    "admin", "Admin", "administrator", "Administrator",
    "store manager", "Store Manager", "storemanager", "StoreManager"
  ]);

  // Calculate expiration date (5 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 5);

  const sql = `
    INSERT INTO notifications (
      title,
      message,
      type,
      target_roles,
      expires_at,
      branch_id,
      related_id,
      related_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title,
    message,
    'inventory_order',
    targetRoles,
    expiresAt,
    branch_id,
    order_id,
    'order'
  ];

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error creating inventory order notification:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Created inventory order notification with ID: ${result.insertId}`);
    return res.status(201).json({
      success: true,
      message: 'Inventory order notification created successfully',
      data: { notification_id: result.insertId }
    });
  });
});

/**
 * Create a low stock notification
 * This endpoint is called when stock levels are low
 */
router.post('/low-stock', (req, res) => {
  console.log('POST /notifications/low-stock - Creating low stock notification');

  const { item_id, item_name, current_stock, branch_id } = req.body;

  if (!item_id || !item_name || current_stock === undefined || !branch_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Create notification for Admin, Store Manager, and Sales Associate
  const title = 'Low Stock Alert';
  const message = `${item_name} is running low on stock. Current stock: ${current_stock}`;
  // Include all possible role formats to ensure proper filtering
  const targetRoles = JSON.stringify([
    "admin", "Admin", "administrator", "Administrator",
    "store manager", "Store Manager", "storemanager", "StoreManager",
    "sales associate", "Sales Associate", "salesassociate", "SalesAssociate"
  ]);

  // Calculate expiration date (5 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 5);

  const sql = `
    INSERT INTO notifications (
      title,
      message,
      type,
      target_roles,
      expires_at,
      branch_id,
      related_id,
      related_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title,
    message,
    'low_stock',
    targetRoles,
    expiresAt,
    branch_id,
    item_id,
    'item'
  ];

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error creating low stock notification:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Created low stock notification with ID: ${result.insertId}`);
    return res.status(201).json({
      success: true,
      message: 'Low stock notification created successfully',
      data: { notification_id: result.insertId }
    });
  });
});

export { router as notificationsRouter };
