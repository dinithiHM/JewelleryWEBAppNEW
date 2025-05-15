import express from "express";
import con from "../utils/db.js"; // Database connection

const router = express.Router();

// Add an endpoint to check the database structure
router.get("/check-table-structure", (req, res) => {
  con.query("DESCRIBE suppliers", (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
});

// Add an endpoint to check orders table structure
router.get("/check-orders-structure", (req, res) => {
  con.query("DESCRIBE orders", (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
});

// Add an endpoint to check orders data
router.get("/check-orders-data", (req, res) => {
  try {
    // First check if the orders table exists
    con.query("SHOW TABLES LIKE 'orders'", (tableErr, tableResults) => {
      if (tableErr) {
        console.error("Error checking for orders table:", tableErr);
        return res.status(500).json({ message: "Database error", error: tableErr.message });
      }

      // If orders table exists
      if (tableResults.length > 0) {
        // Get all orders
        con.query("SELECT * FROM orders LIMIT 100", (err, results) => {
          if (err) {
            console.error("Error fetching orders:", err);
            return res.status(500).json({ message: "Database error", error: err.message });
          }
          console.log(`Found ${results.length} orders in the database`);
          res.json(results);
        });
      } else {
        // If orders table doesn't exist, check for other order-related tables
        con.query("SHOW TABLES LIKE '%order%'", (orderTablesErr, orderTables) => {
          if (orderTablesErr) {
            console.error("Error checking for order tables:", orderTablesErr);
            return res.status(500).json({ message: "Database error", error: orderTablesErr.message });
          }

          console.log("Found order-related tables:", orderTables.map(t => Object.values(t)[0]).join(', '));

          // If we found some order-related tables, try to use the first one
          if (orderTables.length > 0) {
            const firstOrderTable = Object.values(orderTables[0])[0];
            con.query(`SELECT * FROM ${firstOrderTable} LIMIT 100`, (dataErr, orderData) => {
              if (dataErr) {
                console.error(`Error fetching data from ${firstOrderTable}:`, dataErr);
                return res.status(500).json({ message: "Database error", error: dataErr.message });
              }
              console.log(`Found ${orderData.length} records in ${firstOrderTable}`);
              res.json(orderData);
            });
          } else {
            // No order-related tables found
            console.log("No order-related tables found");
            return res.json([]);
          }
        });
      }
    });
  } catch (error) {
    console.error("Unexpected error in check-orders-data endpoint:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add a test endpoint to check if the database connection is working
router.get("/test-connection", (req, res) => {
  console.log('Testing database connection...');
  con.query("SELECT 1+1 as result", (err, results) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({ message: "Database connection error", error: err.message });
    }
    console.log('Database connection successful:', results);
    res.json({ message: "Database connection successful", results });
  });
});

// Add an endpoint to count the number of suppliers
router.get("/count", (req, res) => {
  console.log('Counting suppliers...');
  con.query("SELECT COUNT(*) as count FROM suppliers", (err, results) => {
    if (err) {
      console.error('Error counting suppliers:', err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    console.log('Supplier count:', results[0].count);
    res.json({ count: results[0].count });
  });
});

// ✅ GET All Suppliers
router.get("/", (req, res) => {
  console.log('GET /suppliers - Fetching all suppliers');
  try {
    const sql = "SELECT * FROM suppliers";

    con.query(sql, (err, results) => {
      if (err) {
        console.error('Database error when fetching suppliers:', err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      console.log(`Found ${results ? results.length : 0} suppliers`);
      if (results && results.length > 0) {
        console.log('First supplier:', results[0]);
      }

      // Make sure we have valid supplier names
      // Log each supplier's actual data
      if (results && results.length > 0) {
        results.forEach(supplier => {
          console.log(`Raw supplier data - ID: ${supplier.supplier_id}, Name: ${supplier.name || 'No name'}, SupplierName: ${supplier.supplier_name || 'No supplier_name'}`);
        });
      }

      // Return the actual data without adding "Supplier X" format
      const processedResults = (results || []);

      console.log(`Returning ${processedResults.length} processed suppliers`);
      res.json(processedResults);
    });
  } catch (error) {
    console.error('Unexpected error in GET /suppliers endpoint:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ GET Supplier by ID
router.get("/:id", (req, res) => {
  const supplierId = req.params.id;
  const sql = "SELECT * FROM suppliers WHERE supplier_id = ?";

  con.query(sql, [supplierId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json(results[0]);
  });
});

// ✅ CREATE Supplier
router.post("/create", (req, res) => {
  const { name, address, contact_no, manufacturing_items, category, username, password } = req.body;
  console.log('Creating supplier with data:', { name, address, contact_no, manufacturing_items, category, username });

  // Check if username already exists (if provided)
  if (username) {
    con.query("SELECT * FROM suppliers WHERE username = ?", [username], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Error checking username:', checkErr);
        return res.status(500).json({ message: "Database error", error: checkErr });
      }

      if (checkResults.length > 0) {
        return res.status(400).json({ message: "Username already exists. Please choose another username." });
      }

      // If username is unique, proceed with creating the supplier
      createSupplier();
    });
  } else {
    // If no username provided, just create the supplier
    createSupplier();
  }

  function createSupplier() {
    let sql, values;

    // If both username and password are provided
    if (username && password) {
      // In a real application, you would use bcrypt to hash the password
      // For simplicity, we're using a placeholder hash here
      const hashedPassword = `hashed_${password}`; // Replace with actual bcrypt hashing

      sql = `
        INSERT INTO suppliers (name, address, contact_no, manufacturing_items, category, username, password)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      values = [name, address, contact_no, manufacturing_items, category, username, hashedPassword];
    }
    // If only username is provided (no password)
    else if (username) {
      sql = `
        INSERT INTO suppliers (name, address, contact_no, manufacturing_items, category, username)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      values = [name, address, contact_no, manufacturing_items, category, username];
    }
    // If neither username nor password is provided
    else {
      sql = `
        INSERT INTO suppliers (name, address, contact_no, manufacturing_items, category)
        VALUES (?, ?, ?, ?, ?)
      `;

      values = [name, address, contact_no, manufacturing_items, category];
    }

    console.log('Executing SQL:', sql);
    console.log('With values:', values);

    con.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error creating supplier:', err);
        return res.status(500).json({ message: "Database error", error: err });
      }
      console.log('Supplier created successfully with ID:', result.insertId);
      res.status(201).json({ message: "Supplier created successfully", supplierId: result.insertId });
    });
  }
});

// ✅ UPDATE Supplier
router.put("/update/:id", (req, res) => {
  const supplierId = req.params.id;
  const { name, address, contact_no, manufacturing_items, category, username, password } = req.body;
  console.log('Updating supplier with data:', { supplierId, name, address, contact_no, manufacturing_items, category, username });

  // Check if username already exists and doesn't belong to this supplier
  if (username) {
    con.query(
      "SELECT * FROM suppliers WHERE username = ? AND supplier_id != ?",
      [username, supplierId],
      (checkErr, checkResults) => {
        if (checkErr) {
          console.error('Error checking username:', checkErr);
          return res.status(500).json({ message: "Database error", error: checkErr });
        }

        if (checkResults.length > 0) {
          return res.status(400).json({ message: "Username already exists. Please choose another username." });
        }

        // If username is unique or belongs to this supplier, proceed with update
        updateSupplier();
      }
    );
  } else {
    // If no username provided, just update the supplier
    updateSupplier();
  }

  function updateSupplier() {
    let sql, values;

    // If password is provided, update it too
    if (username && password) {
      // In a real application, you would use bcrypt to hash the password
      // For simplicity, we're using a placeholder hash here
      const hashedPassword = `hashed_${password}`; // Replace with actual bcrypt hashing

      sql = `
        UPDATE suppliers
        SET name=?, address=?, contact_no=?, manufacturing_items=?, category=?, username=?, password=?
        WHERE supplier_id=?
      `;

      values = [name, address, contact_no, manufacturing_items, category, username, hashedPassword, supplierId];
    }
    // If only username is provided (no password)
    else if (username) {
      sql = `
        UPDATE suppliers
        SET name=?, address=?, contact_no=?, manufacturing_items=?, category=?, username=?
        WHERE supplier_id=?
      `;

      values = [name, address, contact_no, manufacturing_items, category, username, supplierId];
    }
    // If neither username nor password is provided
    else {
      sql = `
        UPDATE suppliers
        SET name=?, address=?, contact_no=?, manufacturing_items=?, category=?
        WHERE supplier_id=?
      `;

      values = [name, address, contact_no, manufacturing_items, category, supplierId];
    }

    console.log('Executing SQL:', sql);
    console.log('With values:', values);

    con.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating supplier:', err);
        return res.status(500).json({ message: "Database error", error: err });
      }
      console.log('Supplier updated successfully');
      res.json({ message: "Supplier updated successfully" });
    });
  }
});

// ✅ DELETE Supplier - Simplified version
router.delete("/delete/:id", (req, res) => {
  try {
    const supplierId = req.params.id;
    console.log(`Attempting to delete Supplier with ID: ${supplierId}, type: ${typeof supplierId}`);

    // Validate the ID
    if (!supplierId) {
      console.error(`Missing supplier ID`);
      return res.status(400).json({ message: "Missing supplier ID" });
    }

    // Convert to number
    const numericId = Number(supplierId);
    if (isNaN(numericId) || numericId <= 0) {
      console.error(`Invalid supplier ID: ${supplierId}`);
      return res.status(400).json({ message: "Invalid supplier ID" });
    }

    console.log(`Converted ID to number: ${numericId}`);

    // Delete directly (simplified approach) - using supplier_id instead of id
    con.query("DELETE FROM suppliers WHERE supplier_id = ?", [numericId], (deleteErr, result) => {
      if (deleteErr) {
        console.error('Error deleting supplier from database:', deleteErr);
        return res.status(500).json({
          message: "Database error",
          error: deleteErr.message
        });
      }

      // Check if any rows were affected
      if (result.affectedRows === 0) {
        console.log(`No supplier found with ID ${numericId}`);
        return res.status(404).json({ message: "Supplier not found" });
      }

      console.log(`Successfully deleted Supplier with ID: ${numericId}`);
      res.json({
        message: "Supplier deleted successfully",
        id: numericId,
        affectedRows: result.affectedRows
      });
    });
  } catch (error) {
    console.error('Unexpected error in delete endpoint:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get supplier order statistics by category (with hardcoded data)
router.get("/order-stats/:category", (req, res) => {
  const category = req.params.category;
  console.log(`Fetching order stats for category: ${category}`);

  // Get all suppliers - using 'name' column instead of 'supplier_name'
  con.query("SELECT supplier_id, name FROM suppliers", (suppErr, suppliers) => {
    if (suppErr) {
      console.error("Error fetching suppliers:", suppErr);
      return res.status(500).json({ message: "Database error", error: suppErr.message });
    }

    // For testing, return hardcoded data with real supplier IDs and names
    const result = [];

    // Create a mapping of supplier IDs to random order counts
    const orderCounts = {};
    suppliers.forEach(supplier => {
      // Generate a random order count between 5 and 25
      orderCounts[supplier.supplier_id] = Math.floor(Math.random() * 20) + 5;
    });

    // Get categories
    const catQuery = category === 'All' ?
      "SELECT category_name FROM categories" :
      "SELECT category_name FROM categories WHERE category_name = ?";
    const catParams = category === 'All' ? [] : [category];

    con.query(catQuery, catParams, (catErr, categories) => {
      if (catErr) {
        console.error("Error fetching categories:", catErr);
        return res.status(500).json({ message: "Database error", error: catErr.message });
      }

      // Generate data with actual supplier and category names
      suppliers.forEach(supplier => {
        categories.forEach(cat => {
          result.push({
            supplier_id: supplier.supplier_id,
            name: supplier.name, // Using 'name' instead of 'supplier_name'
            category: cat.category_name,
            order_count: orderCounts[supplier.supplier_id]
          });
        });
      });

      // Sort by order count descending
      result.sort((a, b) => b.order_count - a.order_count);

      console.log(`Returning ${result.length} order stats records with hardcoded counts`);
      return res.json(result);
    });
  });
});

// Supplier Login Route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  // Find the supplier with the given username
  con.query("SELECT * FROM suppliers WHERE username = ?", [username], (err, results) => {
    if (err) {
      console.error("Database error during supplier login:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const supplier = results[0];

    // In a real application, you would use bcrypt.compare to check the password
    // For simplicity, we're using a placeholder check here
    const hashedPassword = `hashed_${password}`;

    if (supplier.password !== hashedPassword) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // If login is successful, return supplier info (excluding password)
    const { password: _, ...supplierInfo } = supplier;

    res.json({
      message: "Login successful",
      supplier: supplierInfo
    });
  });
});

// Get supplier orders
router.get("/my-orders/:supplierId", (req, res) => {
  const supplierId = req.params.supplierId;

  if (!supplierId) {
    return res.status(400).json({ message: "Supplier ID is required" });
  }

  // First, get regular orders for this supplier
  con.query(
    "SELECT *, 'regular' as order_type FROM orders WHERE supplier_id = ? ORDER BY created_at DESC",
    [supplierId],
    (err, regularOrders) => {
      if (err) {
        console.error("Database error fetching supplier regular orders:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      // Process image URLs for regular orders
      const processedRegularOrders = regularOrders.map(order => {
        if (order.design_image) {
          // Construct the full URL for the image
          const imagePath = order.design_image.startsWith('uploads/')
            ? order.design_image
            : `uploads/${order.design_image}`;

          order.design_image_url = `http://localhost:3002/${imagePath}`;
        }
        return order;
      });

      // Next, get custom orders for this supplier
      con.query(
        `SELECT
          co.*,
          'custom' as order_type,
          c.category_name as category
        FROM
          custom_orders co
        LEFT JOIN
          categories c ON co.category_id = c.category_id
        WHERE
          co.supplier_id = ?
        ORDER BY
          co.order_date DESC`,
        [supplierId],
        (customErr, customOrders) => {
          if (customErr) {
            console.error("Database error fetching supplier custom orders:", customErr);
            return res.status(500).json({ message: "Database error", error: customErr.message });
          }

          console.log(`Found ${customOrders.length} custom orders for supplier ${supplierId}`);

          // Combine both types of orders
          const allOrders = [...processedRegularOrders, ...customOrders];

          // Sort by date (newest first)
          allOrders.sort((a, b) => {
            const dateA = a.order_type === 'custom' ? new Date(a.order_date) : new Date(a.created_at);
            const dateB = b.order_type === 'custom' ? new Date(b.order_date) : new Date(b.created_at);
            return dateB - dateA;
          });

          res.json(allOrders);
        }
      );
    }
  );
});

// Update order status
router.put("/update-order-status/:orderId", (req, res) => {
  const orderId = req.params.orderId;
  const { status, supplier_notes } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ message: "Order ID and status are required" });
  }

  // Update the order status
  const sql = supplier_notes
    ? "UPDATE orders SET status = ?, supplier_notes = ?, updated_at = NOW() WHERE order_id = ?"
    : "UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?";

  const values = supplier_notes
    ? [status, supplier_notes, orderId]
    : [status, orderId];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.error("Database error updating order status:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated successfully" });
  });
});

// Get ACTUAL supplier order statistics by category (real data only)
router.get("/actual-orders/:category", (req, res) => {
  const category = req.params.category;
  console.log(`Fetching ACTUAL order stats for category: ${category}`);

  try {
    // Get all suppliers
    con.query("SELECT supplier_id, name FROM suppliers", (suppErr, suppliers) => {
      if (suppErr) {
        console.error("Error fetching suppliers:", suppErr);
        return res.status(500).json({ message: "Database error", error: suppErr.message });
      }

      // Get categories
      const catQuery = category === 'All' ?
        "SELECT category_id, category_name FROM categories" :
        "SELECT category_id, category_name FROM categories WHERE category_name = ?";
      const catParams = category === 'All' ? [] : [category];

      con.query(catQuery, catParams, (catErr, categories) => {
        if (catErr) {
          console.error("Error fetching categories:", catErr);
          return res.status(500).json({ message: "Database error", error: catErr.message });
        }

        // Create a map to store supplier order counts by category
        const supplierOrderCounts = {};

        // Initialize counts for all suppliers and categories
        suppliers.forEach(supplier => {
          supplierOrderCounts[supplier.supplier_id] = {};
          categories.forEach(cat => {
            supplierOrderCounts[supplier.supplier_id][cat.category_name] = 0;
          });
        });

        // Build the query to get actual order counts from custom_orders table
        // Note: Using custom_order_details table which is the actual table name
        const orderCountQuery = category === 'All' ?
          `SELECT supplier_id, c.category_name, COUNT(*) as order_count
           FROM custom_order_details co
           JOIN categories c ON co.category_id = c.category_id
           WHERE supplier_id IS NOT NULL
           GROUP BY supplier_id, c.category_name` :
          `SELECT supplier_id, c.category_name, COUNT(*) as order_count
           FROM custom_order_details co
           JOIN categories c ON co.category_id = c.category_id
           WHERE supplier_id IS NOT NULL AND c.category_name = ?
           GROUP BY supplier_id, c.category_name`;

        console.log("Executing SQL query:", orderCountQuery);
        console.log("With parameters:", category === 'All' ? [] : [category]);

        con.query(orderCountQuery, category === 'All' ? [] : [category], (countErr, orderCounts) => {
          if (countErr) {
            console.error("Error fetching order counts:", countErr);
            return res.status(500).json({ message: "Database error", error: countErr.message });
          }

          console.log("Order counts from database:", orderCounts);

          // Update the counts with actual data
          orderCounts.forEach(count => {
            if (supplierOrderCounts[count.supplier_id] &&
                supplierOrderCounts[count.supplier_id][count.category_name] !== undefined) {
              supplierOrderCounts[count.supplier_id][count.category_name] = count.order_count;
            }
          });

          // Generate the final result array
          const result = [];
          suppliers.forEach(supplier => {
            categories.forEach(cat => {
              const orderCount = supplierOrderCounts[supplier.supplier_id][cat.category_name] || 0;
              // Include all suppliers for the selected category
              result.push({
                supplier_id: supplier.supplier_id,
                name: supplier.name,
                category: cat.category_name,
                order_count: orderCount
              });
            });
          });

          // Sort by order count descending
          result.sort((a, b) => b.order_count - a.order_count);

          console.log(`Returning ${result.length} order stats records with ACTUAL counts`);
          return res.json(result);
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error in actual-orders endpoint:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

export { router as supplierRouter };
