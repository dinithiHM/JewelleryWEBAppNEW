import express from "express";
import con from "../utils/db.js"; // Database connection
const router = express.Router();

// Get completed order items for store manager dashboard
router.get("/", (req, res) => {
  console.log('GET /orders/completed-items - Fetching completed order items');

  // Get query parameters
  const branchId = req.query.branch_id;
  let userRole = req.query.role;

  // Normalize the role to lowercase for consistent comparison
  userRole = userRole ? userRole.toLowerCase() : '';
  console.log(`DEBUG: Role after lowercase: '${userRole}'`);

  // Handle different role formats
  if (userRole.includes('store') && userRole.includes('manager')) {
    userRole = 'storemanager';
  } else if (userRole.includes('sales') && userRole.includes('associate')) {
    userRole = 'salesassociate';
  } else if (userRole.includes('admin')) {
    userRole = 'admin';
  } else if (userRole.includes('cashier')) {
    userRole = 'cashier';
  }

  console.log(`DEBUG: Normalized role: '${userRole}'`);
  const isStoreManager = userRole.includes('store') || userRole.includes('manager');
  console.log(`DEBUG: isStoreManager = ${isStoreManager}`);
  console.log(`Request params - Branch ID: ${branchId}, User Role: ${userRole}`);

  // First check if the order_items table exists
  con.query("SHOW TABLES LIKE 'order_items'", (tableErr, tableResults) => {
    if (tableErr) {
      console.error("Error checking for order_items table:", tableErr);
      return res.status(500).json({ message: "Database error", error: tableErr.message });
    }

    // If order_items table doesn't exist, create it
    if (tableResults.length === 0) {
      console.log("Order items table not found, creating it now");

      // Create the order_items table
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS order_items (
          order_item_id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          category VARCHAR(100) NOT NULL,
          quantity INT NOT NULL,
          offer_gold TINYINT(1) DEFAULT 0,
          selected_karats JSON,
          karat_values JSON,
          design_image LONGTEXT,
          status VARCHAR(50) DEFAULT 'pending',
          gold_price_per_gram DECIMAL(10,2) DEFAULT NULL,
          weight_in_grams DECIMAL(10,2) DEFAULT NULL,
          making_charges DECIMAL(10,2) DEFAULT NULL,
          additional_materials_charges DECIMAL(10,2) DEFAULT NULL,
          base_estimated_price DECIMAL(10,2) DEFAULT NULL,
          estimated_price DECIMAL(10,2) DEFAULT NULL,
          total_amount DECIMAL(10,2) DEFAULT NULL,
          selectedKarat VARCHAR(10) DEFAULT NULL,
          goldPurity DECIMAL(5,4) DEFAULT NULL,
          offered_gold_value DECIMAL(10,2) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
        )
      `;

      con.query(createTableSql, (createErr) => {
        if (createErr) {
          console.error("Error creating order_items table:", createErr);
          return res.status(500).json({
            message: "Failed to create order_items table",
            error: createErr.message
          });
        }

        console.log("order_items table created successfully");
        // Return empty array since the table was just created and has no data
        return res.json([]);
      });

      return; // Exit the function early
    }

    // Check if branch_id column exists in orders table
    con.query("SHOW COLUMNS FROM orders LIKE 'branch_id'", (columnErr, columnResults) => {
      if (columnErr) {
        console.error("Error checking for branch_id column:", columnErr);
        return res.status(500).json({ message: "Database error", error: columnErr.message });
      }

      const branchColumnExists = columnResults.length > 0;
      console.log(`Branch column exists: ${branchColumnExists}`);

      let sql;
      let queryParams = [];

      if (branchColumnExists) {
        if (userRole === 'admin' || userRole.includes('admin')) {
          // Admin can see all completed items
          sql = `
            SELECT oi.*, o.supplier_id, o.category, o.branch_id, b.branch_name, o.selected_karats, o.karat_values
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            LEFT JOIN branches b ON o.branch_id = b.branch_id
            WHERE oi.status = 'completed'
          `;
        } else if (userRole === 'storemanager' || isStoreManager || userRole === 'salesassociate' || userRole === 'cashier') {
          // Non-admin users can only see items from their branch
          sql = `
            SELECT oi.*, o.supplier_id, o.category, o.branch_id, b.branch_name, o.selected_karats, o.karat_values
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            LEFT JOIN branches b ON o.branch_id = b.branch_id
            WHERE oi.status = 'completed' AND o.branch_id = ?
          `;
          queryParams.push(branchId || 0);
        } else {
          // Unknown role - return empty result
          return res.json([]);
        }
      } else {
        // If branch_id column doesn't exist, use simplified query for admin only
        if (userRole === 'admin' || userRole.includes('admin')) {
          sql = `
            SELECT oi.*, o.supplier_id, o.category, o.selected_karats, o.karat_values
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE oi.status = 'completed'
          `;
        } else {
          // For non-admin, we can't verify branch access, so return empty array
          return res.json([]);
        }
      }

      console.log('Executing query with params:', queryParams);
      con.query(sql, queryParams, (err, results) => {
        if (err) {
          console.error("Error fetching completed order items:", err);
          // Return empty array instead of error to prevent frontend from breaking
          return res.json([]);
        }

        console.log(`Found ${results ? results.length : 0} completed order items`);

        // If no results, return empty array
        if (!results || results.length === 0) {
          return res.json([]);
        }

        // Process image URLs for all items
        const processedResults = results.map(item => {
          if (item.design_image) {
            // Assuming your server is running on the same port as your API
            const baseUrl = `${req.protocol}://${req.get('host')}`;

            // Make sure we don't duplicate the /uploads/ part
            const imagePath = item.design_image.startsWith('uploads/')
              ? item.design_image
              : `uploads/${item.design_image}`;

            item.design_image_url = `${baseUrl}/${imagePath}`;
          }
          return item;
        });

        // Group items by order_id for easier client-side processing
        const itemsByOrderId = {};
        processedResults.forEach(item => {
          if (!itemsByOrderId[item.order_id]) {
            itemsByOrderId[item.order_id] = [];
          }
          itemsByOrderId[item.order_id].push(item);
        });

        // Convert to array of orders with items
        const ordersWithItems = Object.keys(itemsByOrderId).map(orderId => {
          const items = itemsByOrderId[orderId];
          const firstItem = items[0]; // Use first item for order-level properties

          return {
            order_id: parseInt(orderId),
            supplier_id: firstItem.supplier_id,
            branch_id: firstItem.branch_id,
            branch_name: firstItem.branch_name,
            items: items,
            itemsCount: items.length
          };
        });

        res.json(ordersWithItems);
      });
    });
  });
});

export default router;
