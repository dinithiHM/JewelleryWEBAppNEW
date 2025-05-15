import express from 'express';
import con from '../utils/db.js';

const router = express.Router();

// Check for low stock items and create notifications
router.get('/check', async (req, res) => {
  console.log('GET /low-stock-notifications/check - Checking for low stock items');

  // Get the threshold from query params or use default (10)
  const threshold = parseInt(req.query.threshold) || 10;

  // Get items with stock below threshold
  const sql = `
    SELECT
      item_id,
      product_title,
      category,
      in_stock,
      branch_id
    FROM
      jewellery_items
    WHERE
      in_stock <= ?
  `;

  con.query(sql, [threshold], async (err, results) => {
    if (err) {
      console.error('Error checking for low stock items:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Found ${results.length} items with low stock`);

    // Create notifications for each low stock item
    const notificationPromises = results.map(item => {
      return new Promise((resolve, reject) => {
        console.log(`Creating low stock notification for item ${item.item_id}...`);

        // Calculate expiration date (5 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 5);

        // Create notification for Admin, Store Manager, and Sales Associate
        const title = 'Low Stock Alert';
        const message = `${item.product_title} is running low on stock. Current stock: ${item.in_stock}`;
        // Include all possible role formats to ensure compatibility
        // Make sure to include all variations of role names to ensure proper filtering
        const targetRoles = JSON.stringify([
          "admin", "Admin", "administrator", "Administrator",
          "store manager", "Store Manager", "storemanager", "StoreManager",
          "sales associate", "Sales Associate", "salesassociate", "SalesAssociate"
        ]);

        const notificationSql = `
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

        const notificationParams = [
          title,
          message,
          'low_stock',
          targetRoles,
          expiresAt,
          item.branch_id || 1, // Default to branch 1 if not set
          item.item_id,
          'item'
        ];

        con.query(notificationSql, notificationParams, (notificationErr, notificationResult) => {
          if (notificationErr) {
            console.error(`Error creating low stock notification for item ${item.item_id}:`, notificationErr);
            reject(notificationErr);
          } else {
            console.log(`Created low stock notification for item ${item.item_id} with ID: ${notificationResult.insertId}`);
            resolve({ notification_id: notificationResult.insertId });
          }
        });
      });
    });

    try {
      // Wait for all notifications to be created
      const notificationResults = await Promise.allSettled(notificationPromises);

      // Count successful and failed notifications
      const successful = notificationResults.filter(result => result.status === 'fulfilled').length;
      const failed = notificationResults.filter(result => result.status === 'rejected').length;

      return res.json({
        success: true,
        message: `Checked ${results.length} items, created ${successful} notifications, ${failed} failed`,
        low_stock_items: results
      });
    } catch (error) {
      console.error('Error creating low stock notifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating notifications',
        error: error.message,
        low_stock_items: results
      });
    }
  });
});

// Schedule a daily check for low stock items
router.get('/schedule', (req, res) => {
  console.log('GET /low-stock-notifications/schedule - Scheduling low stock check');

  // This endpoint would set up a scheduled task
  // For now, we'll just return instructions
  return res.json({
    success: true,
    message: 'To schedule automatic low stock checks, set up a cron job or scheduled task that calls the /low-stock-notifications/check endpoint daily'
  });
});

export { router as lowStockNotificationsRouter };
