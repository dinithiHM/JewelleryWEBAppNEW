import express from "express";
import con from "../utils/db.js"; // Database connection
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to save base64 image
const saveBase64Image = (base64String, orderId) => {
  // Skip if no image data
  if (!base64String) return null;

  // Extract image data and type
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    console.error('Invalid base64 string format');
    return null;
  }

  // Get image type and data
  const imageType = matches[1];
  const imageData = matches[2];
  const extension = imageType.split('/')[1];
  const fileName = `order_${orderId}_${Date.now()}.${extension}`;

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '..', 'Public', 'uploads', 'images');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Save the file
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, imageData, 'base64');

  // Return just the relative path to the file (without domain)
  return `images/${fileName}`;
};

// Get all orders with branch filtering
router.get("/", (req, res) => {
  console.log('GET /orders - Fetching orders');

  // Get query parameters
  const branchId = req.query.branch_id;
  let userRole = req.query.role;
  const statusFilter = req.query.status;

  // Normalize the role to lowercase for consistent comparison
  userRole = userRole ? userRole.toLowerCase() : '';

  // Log the exact role for debugging
  console.log(`DEBUG: Role after lowercase: '${userRole}'`);
  console.log(`DEBUG: Status filter: '${statusFilter}'`);

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

  console.log(`Request params - Branch ID: ${branchId}, User Role: ${userRole}`);
  console.log('Full query parameters:', req.query);

  // EMERGENCY FIX: If the role is 'store manager' (with space), treat it as storemanager
  const isStoreManager = userRole.includes('store') || userRole.includes('manager');
  console.log(`DEBUG: isStoreManager = ${isStoreManager}`);

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
      // Different queries based on user role
      if (userRole === 'admin' || userRole.includes('admin')) {
        // Admin sees all orders with branch info
        console.log('Fetching all orders with branch info (admin view)');
        sql = `
          SELECT o.*, b.branch_name
          FROM orders o
          LEFT JOIN branches b ON o.branch_id = b.branch_id
        `;

        // Add status filter if provided
        if (statusFilter) {
          sql += ` WHERE o.status = ?`;
          queryParams.push(statusFilter);
          console.log(`Adding status filter: ${statusFilter}`);
        }

        console.log('SQL for admin:', sql);
      } else if (userRole === 'storemanager' || isStoreManager || userRole === 'salesassociate' || userRole === 'cashier') {
        // Non-admin users (store manager, sales associate, cashier) only see orders from their branch
        console.log(`Fetching orders for branch ${branchId} (${userRole} view)`);
        sql = `
          SELECT o.*, b.branch_name
          FROM orders o
          LEFT JOIN branches b ON o.branch_id = b.branch_id
          WHERE o.branch_id = ?
        `;
        queryParams = [branchId || 0]; // Use 0 as fallback to prevent seeing all orders

        // Add status filter if provided
        if (statusFilter) {
          sql += ` AND o.status = ?`;
          queryParams.push(statusFilter);
          console.log(`Adding status filter: ${statusFilter}`);
        }

        console.log('SQL for non-admin:', sql);
        console.log('Query params:', queryParams);
      } else {
        // Unknown role - return empty result
        console.log(`Unknown role: ${userRole}, returning empty result`);
        sql = `SELECT o.*, b.branch_name FROM orders o LEFT JOIN branches b ON o.branch_id = b.branch_id WHERE 1=0`;
        console.log('SQL for unknown role:', sql);
      }
    } else {
      // If branch_id column doesn't exist yet, still apply role-based filtering
      if (userRole === 'admin' || userRole.includes('admin')) {
        console.log('Branch column not found, showing all orders for admin');
        sql = "SELECT * FROM orders";

        // Add status filter if provided
        if (statusFilter) {
          sql += " WHERE status = ?";
          queryParams.push(statusFilter);
          console.log(`Adding status filter: ${statusFilter}`);
        }
      } else if (userRole === 'storemanager' || isStoreManager || userRole === 'salesassociate' || userRole === 'cashier') {
        console.log('Branch column not found, but restricting non-admin users');
        // Return empty result for non-admin users if branch filtering is not possible
        sql = "SELECT * FROM orders WHERE 1=0";
      } else {
        console.log(`Unknown role: ${userRole}, returning empty result`);
        sql = "SELECT * FROM orders WHERE 1=0";
      }
    }

    console.log('Executing query with params:', queryParams);
    con.query(sql, queryParams, (err, results) => {
      if (err) {
        console.error("Error fetching orders:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      console.log(`Found ${results.length} orders`);
      if (results.length > 0) {
        console.log('Sample order:', results[0]);
      }

      // Process image URLs for all orders
      const processedResults = (results || []).map(order => {
        if (order.design_image) {
          // Assuming your server is running on the same port as your API
          const baseUrl = `${req.protocol}://${req.get('host')}`;

          // Make sure we don't duplicate the /uploads/ part
          const imagePath = order.design_image.startsWith('uploads/')
            ? order.design_image
            : `uploads/${order.design_image}`;

          order.design_image_url = `${baseUrl}/${imagePath}`;
        }
        return order;
      });

      res.json(processedResults);
    });
  });
});

// Get order by ID with branch-based access control
router.get("/:id", (req, res) => {
  const orderId = req.params.id;
  const branchId = req.query.branch_id;
  let userRole = req.query.role;

  // Normalize the role to lowercase for consistent comparison
  userRole = userRole ? userRole.toLowerCase() : '';

  // Log the exact role for debugging
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

  // EMERGENCY FIX: If the role is 'store manager' (with space), treat it as storemanager
  const isStoreManager = userRole.includes('store') || userRole.includes('manager');
  console.log(`DEBUG: isStoreManager = ${isStoreManager}`);

  console.log(`GET /orders/${orderId} - Fetching order by ID`);
  console.log(`Request params - Branch ID: ${branchId}, User Role: ${userRole}`);

  // Check if branch_id column exists in orders table
  con.query("SHOW COLUMNS FROM orders LIKE 'branch_id'", (columnErr, columnResults) => {
    if (columnErr) {
      console.error("Error checking for branch_id column:", columnErr);
      return res.status(500).json({ message: "Database error", error: columnErr.message });
    }

    const branchColumnExists = columnResults.length > 0;
    console.log(`Branch column exists: ${branchColumnExists}`);

    let sql;
    let queryParams = [orderId];

    if (branchColumnExists) {
      if (userRole === 'admin' || userRole.includes('admin')) {
        // Admin can see any order with branch info
        sql = `
          SELECT o.*, b.branch_name
          FROM orders o
          LEFT JOIN branches b ON o.branch_id = b.branch_id
          WHERE o.order_id = ?
        `;
      } else if (userRole === 'storemanager' || isStoreManager || userRole === 'salesassociate' || userRole === 'cashier') {
        // Non-admin users can only see orders from their branch
        sql = `
          SELECT o.*, b.branch_name
          FROM orders o
          LEFT JOIN branches b ON o.branch_id = b.branch_id
          WHERE o.order_id = ? AND o.branch_id = ?
        `;
        queryParams.push(branchId || 0);
      } else {
        // Unknown role - return empty result
        return res.status(403).json({ message: "Access denied: Unknown user role" });
      }
    } else {
      // If branch_id column doesn't exist, use original query for admin only
      if (userRole === 'admin' || userRole.includes('admin')) {
        sql = "SELECT * FROM orders WHERE order_id = ?";
      } else if (userRole === 'storemanager' || isStoreManager || userRole === 'salesassociate' || userRole === 'cashier') {
        // For non-admin, we can't verify branch access, so deny access
        return res.status(403).json({ message: "Access denied: Branch-based filtering not available" });
      } else {
        // Unknown role
        return res.status(403).json({ message: "Access denied: Unknown user role" });
      }
    }

    con.query(sql, queryParams, (err, results) => {
      if (err) {
        console.error("Error fetching order:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Order not found or access denied" });
      }

      const order = results[0];

      // If there's an image path, convert it to a full URL
      if (order.design_image) {
        // Assuming your server is running on the same port as your API
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Make sure we don't duplicate the /uploads/ part
        const imagePath = order.design_image.startsWith('uploads/')
          ? order.design_image
          : `uploads/${order.design_image}`;

        order.design_image_url = `${baseUrl}/${imagePath}`;
        console.log(`Image URL: ${order.design_image_url}`);
      }

      res.json(order);
    });
  });
});

// Create new order
router.post("/create", (req, res) => {
  const {
    category,
    supplier,
    quantity,
    offerGold,
    selectedKarats,
    karatValues,
    image,
    branch_id // Add branch_id to the request body
  } = req.body;

  console.log('POST /orders/create - Creating new order');
  console.log(`Order details - Category: ${category}, Supplier: ${supplier}, Branch ID: ${branch_id}`);

  // Basic validation
  if (!category || !supplier || !quantity) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Convert arrays and objects to JSON strings for storage
  let karatsJson;
  let karatValuesJson;

  try {
    // Check if selectedKarats is already a string
    if (typeof selectedKarats === 'string') {
      // Try to parse it to make sure it's valid JSON
      JSON.parse(selectedKarats);
      karatsJson = selectedKarats;
    } else {
      // Convert to JSON string
      karatsJson = JSON.stringify(selectedKarats || {});
    }

    // Check if karatValues is already a string
    if (typeof karatValues === 'string') {
      // Try to parse it to make sure it's valid JSON
      JSON.parse(karatValues);
      karatValuesJson = karatValues;
    } else {
      // Convert to JSON string
      karatValuesJson = JSON.stringify(karatValues || {});
    }

    console.log('Processed JSON data:');
    console.log('karatsJson:', karatsJson);
    console.log('karatValuesJson:', karatValuesJson);
  } catch (jsonError) {
    console.error('Error processing JSON data:', jsonError);
    return res.status(400).json({ message: "Invalid JSON data", error: jsonError.message });
  }

  // Check if required columns exist in orders table
  con.query("SHOW COLUMNS FROM orders LIKE 'branch_id'", (columnErr, columnResults) => {
    if (columnErr) {
      console.error("Error checking for branch_id column:", columnErr);
      return res.status(500).json({ message: "Database error", error: columnErr.message });
    }

    const branchColumnExists = columnResults.length > 0;
    console.log(`Branch column exists: ${branchColumnExists}`);

    // Check if price calculation columns exist
    con.query("SHOW COLUMNS FROM orders LIKE 'estimated_price'", (priceColumnErr, priceColumnResults) => {
      if (priceColumnErr) {
        console.error("Error checking for price columns:", priceColumnErr);
        return res.status(500).json({ message: "Database error", error: priceColumnErr.message });
      }

      const priceColumnsExist = priceColumnResults.length > 0;
      console.log(`Price columns exist: ${priceColumnsExist}`);

      // If price columns don't exist, add them
      if (!priceColumnsExist) {
        const alterTableSql = `
          ALTER TABLE orders
          ADD COLUMN gold_price_per_gram DECIMAL(10,2) NULL,
          ADD COLUMN weight_in_grams DECIMAL(10,2) NULL,
          ADD COLUMN making_charges DECIMAL(10,2) NULL,
          ADD COLUMN additional_materials_charges DECIMAL(10,2) NULL,
          ADD COLUMN base_estimated_price DECIMAL(10,2) NULL,
          ADD COLUMN estimated_price DECIMAL(10,2) NULL,
          ADD COLUMN total_amount DECIMAL(10,2) NULL
        `;

        con.query(alterTableSql, (alterErr) => {
          if (alterErr) {
            console.error("Error adding price columns to orders table:", alterErr);
            // Continue with order creation even if column addition fails
            console.log("Continuing with order creation without price columns");
          } else {
            console.log("Added price columns to orders table");
          }
        });
      } else {
        // Check if additional materials charges column exists
        con.query("SHOW COLUMNS FROM orders LIKE 'additional_materials_charges'", (additionalColumnErr, additionalColumnResults) => {
          if (additionalColumnErr) {
            console.error("Error checking for additional materials charges column:", additionalColumnErr);
          } else if (additionalColumnResults.length === 0) {
            // Add the additional columns if they don't exist
            const alterTableSql = `
              ALTER TABLE orders
              ADD COLUMN additional_materials_charges DECIMAL(10,2) NULL,
              ADD COLUMN base_estimated_price DECIMAL(10,2) NULL
            `;

            con.query(alterTableSql, (alterErr) => {
              if (alterErr) {
                console.error("Error adding additional materials charges column:", alterErr);
              } else {
                console.log("Added additional materials charges column to orders table");
              }
            });
          }
        });

        // Check if offered_gold_value column exists
        con.query("SHOW COLUMNS FROM orders LIKE 'offered_gold_value'", (offeredGoldColumnErr, offeredGoldColumnResults) => {
          if (offeredGoldColumnErr) {
            console.error("Error checking for offered_gold_value column:", offeredGoldColumnErr);
          } else if (offeredGoldColumnResults.length === 0) {
            // Add the offered_gold_value column if it doesn't exist
            const alterTableSql = `
              ALTER TABLE orders
              ADD COLUMN offered_gold_value DECIMAL(10,2) DEFAULT 0 COMMENT 'Value of offered gold material deducted from total price'
            `;

            con.query(alterTableSql, (alterErr) => {
              if (alterErr) {
                console.error("Error adding offered_gold_value column:", alterErr);
              } else {
                console.log("Added offered_gold_value column to orders table");
              }
            });
          }
        });

        // Check if selectedKarat and goldPurity columns exist
        con.query("SHOW COLUMNS FROM orders LIKE 'selectedKarat'", (karatColumnErr, karatColumnResults) => {
          if (karatColumnErr) {
            console.error("Error checking for selectedKarat column:", karatColumnErr);
          } else if (karatColumnResults.length === 0) {
            // Add the karat and purity columns if they don't exist
            const alterTableSql = `
              ALTER TABLE orders
              ADD COLUMN selectedKarat VARCHAR(10) NULL,
              ADD COLUMN goldPurity DECIMAL(5,4) NULL
            `;

            con.query(alterTableSql, (alterErr) => {
              if (alterErr) {
                console.error("Error adding karat and purity columns:", alterErr);
              } else {
                console.log("Added selectedKarat and goldPurity columns to orders table");
              }
            });
          }
        });
      }

      // First insert the order without the image
      let sql;
      let values;

      // Extract price calculation fields from request
      const goldPricePerGram = req.body.goldPricePerGram || null;
      const weightInGrams = req.body.weightInGrams || null;
      const makingCharges = req.body.makingCharges || null;
      const additionalMaterialsCharges = req.body.additionalMaterialsCharges || null;
      const baseEstimatedPrice = req.body.baseEstimatedPrice || null; // Base gold price (gold * weight)
      const estimatedPrice = req.body.estimatedPrice || null; // Total estimate with all charges
      const totalAmount = req.body.totalAmount || null;
      const offeredGoldValue = req.body.offeredGoldValue || 0; // Value of offered gold material

      // Extract gold karat and purity information
      const selectedKarat = req.body.selectedKarat_db || req.body.selectedKarat || null;
      const goldPurity = req.body.goldPurity_db || req.body.goldPurity || null;

      // Extract payment fields from request
      const advancePaymentAmount = req.body.advance_payment_amount || null;
      const totalPaymentAmount = req.body.total_payment_amount || totalAmount;
      const paymentStatus = req.body.payment_status || 'Pending';

      if (priceColumnsExist) {
        // Include price calculation fields if the columns exist
        if (branchColumnExists && branch_id) {
          // Include branch_id and price fields
          sql = `
            INSERT INTO orders (
              category,
              supplier_id,
              quantity,
              offer_gold,
              selected_karats,
              karat_values,
              design_image,
              status,
              branch_id,
              gold_price_per_gram,
              weight_in_grams,
              making_charges,
              additional_materials_charges,
              base_estimated_price,
              estimated_price,
              total_amount,
              advance_payment_amount,
              total_payment_amount,
              payment_status,
              selectedKarat,
              goldPurity,
              offered_gold_value,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          values = [
            category,
            supplier,
            quantity,
            offerGold === 'yes' ? 1 : 0,
            karatsJson,
            karatValuesJson,
            null, // Initially set image to null
            'pending', // Default status
            branch_id,
            goldPricePerGram,
            weightInGrams,
            makingCharges,
            additionalMaterialsCharges,
            baseEstimatedPrice,
            estimatedPrice,
            totalAmount,
            advancePaymentAmount,
            totalPaymentAmount,
            paymentStatus,
            selectedKarat,
            goldPurity,
            offeredGoldValue
          ];
      } else {
          // Include price fields without branch_id
          sql = `
            INSERT INTO orders (
              category,
              supplier_id,
              quantity,
              offer_gold,
              selected_karats,
              karat_values,
              design_image,
              status,
              gold_price_per_gram,
              weight_in_grams,
              making_charges,
              additional_materials_charges,
              base_estimated_price,
              estimated_price,
              total_amount,
              advance_payment_amount,
              total_payment_amount,
              payment_status,
              selectedKarat,
              goldPurity,
              offered_gold_value,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          values = [
            category,
            supplier,
            quantity,
            offerGold === 'yes' ? 1 : 0,
            karatsJson,
            karatValuesJson,
            null, // Initially set image to null
            'pending', // Default status
            goldPricePerGram,
            weightInGrams,
            makingCharges,
            additionalMaterialsCharges,
            baseEstimatedPrice,
            estimatedPrice,
            totalAmount,
            advancePaymentAmount,
            totalPaymentAmount,
            paymentStatus,
            selectedKarat,
            goldPurity,
            offeredGoldValue
          ];
      }
      } else {
        // Use the original queries without price fields
        if (branchColumnExists && branch_id) {
          // Include branch_id in the query if the column exists and branch_id is provided
          sql = `
            INSERT INTO orders (
              category,
              supplier_id,
              quantity,
              offer_gold,
              selected_karats,
              karat_values,
              design_image,
              status,
              branch_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          values = [
            category,
            supplier,
            quantity,
            offerGold === 'yes' ? 1 : 0,
            karatsJson,
            karatValuesJson,
            null, // Initially set image to null
            'pending', // Default status
            branch_id
          ];
      } else {
          // Use the original query if branch_id column doesn't exist or branch_id is not provided
          sql = `
            INSERT INTO orders (
              category,
              supplier_id,
              quantity,
              offer_gold,
              selected_karats,
              karat_values,
              design_image,
              status,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          values = [
            category,
            supplier,
            quantity,
            offerGold === 'yes' ? 1 : 0,
            karatsJson,
            karatValuesJson,
            null, // Initially set image to null
            'pending' // Default status
          ];
        }
      }

      // Start a transaction to ensure atomicity
      con.beginTransaction(async (transErr) => {
        if (transErr) {
          console.error("Error starting transaction:", transErr);
          return res.status(500).json({ message: "Database error", error: transErr.message });
        }

        try {
          // First, check if there's enough gold stock if offering gold
          if (offerGold === 'yes') {
            const goldStockDeduction = req.body.gold_stock_deduction;

            if (goldStockDeduction && Array.isArray(goldStockDeduction) && goldStockDeduction.length > 0) {
              // Check each karat's availability
              for (const item of goldStockDeduction) {
                if (item.purity && item.quantity > 0) {
                  const checkSql = `SELECT quantity_in_grams FROM gold_stock WHERE purity = ?`;

                  // Use a promise to make the query awaitable
                  const checkResult = await new Promise((resolve, reject) => {
                    con.query(checkSql, [item.purity], (checkErr, checkResult) => {
                      if (checkErr) {
                        reject(checkErr);
                      } else {
                        resolve(checkResult);
                      }
                    });
                  });

                  if (checkResult.length === 0) {
                    throw new Error(`Gold stock for ${item.purity} not found`);
                  }

                  const availableQuantity = parseFloat(checkResult[0].quantity_in_grams);
                  const requestedQuantity = parseFloat(item.quantity);

                  if (availableQuantity < requestedQuantity) {
                    throw new Error(`Not enough gold stock for ${item.purity}. Available: ${availableQuantity}g, Requested: ${requestedQuantity}g`);
                  }
                }
              }
            }
          }

          // If we get here, there's enough gold stock, so create the order
          // Check if goldPurity is a valid number between 0 and 1
          if (goldPurity !== null && (isNaN(goldPurity) || goldPurity < 0 || goldPurity > 1)) {
            // Fix goldPurity to be a valid value
            if (selectedKarat === '24K') {
              values[values.length - 1] = 0.999; // 24K is 99.9% pure
            } else if (selectedKarat === '22K') {
              values[values.length - 1] = 0.916; // 22K is 91.6% pure
            } else if (selectedKarat === '21K') {
              values[values.length - 1] = 0.875; // 21K is 87.5% pure
            } else if (selectedKarat === '18K') {
              values[values.length - 1] = 0.750; // 18K is 75.0% pure
            } else if (selectedKarat === '16K') {
              values[values.length - 1] = 0.667; // 16K is 66.7% pure
            } else {
              values[values.length - 1] = 0.5; // Default to 50% if unknown
            }
            console.log(`Fixed goldPurity to ${values[values.length - 1]}`);
          }

          const orderResult = await new Promise((resolve, reject) => {
            con.query(sql, values, (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          });

          const orderId = orderResult.insertId;
          console.log(`Order created with ID: ${orderId}`);

          // Commit the transaction
          con.commit((commitErr) => {
            if (commitErr) {
              console.error("Error committing transaction:", commitErr);
              return con.rollback(() => {
                return res.status(500).json({ message: "Database error", error: commitErr.message });
              });
            }

            // Continue with the rest of the function

            // Update gold stock if gold is offered
            if (offerGold === 'yes') {
              console.log('Updating gold stock for order:', orderId);
              console.log('Selected karats JSON:', karatsJson);
              console.log('Karat values JSON:', karatValuesJson);

          // Check if we have gold_stock_deduction data from the frontend
          const goldStockDeduction = req.body.gold_stock_deduction;

          if (goldStockDeduction && Array.isArray(goldStockDeduction) && goldStockDeduction.length > 0) {
            console.log('Using gold_stock_deduction data from frontend:', goldStockDeduction);

            // Start a transaction to ensure atomicity
            con.beginTransaction(async (transErr) => {
              if (transErr) {
                console.error('Error starting transaction:', transErr);
                return;
              }

              try {
                // First, get the current gold stock for logging
                const goldStockPromises = goldStockDeduction.map(item => {
                  return new Promise((resolve, reject) => {
                    if (item.purity && item.quantity > 0) {
                      const selectSql = `SELECT * FROM gold_stock WHERE purity = ?`;
                      con.query(selectSql, [item.purity], (selectErr, selectResult) => {
                        if (selectErr) {
                          reject(selectErr);
                        } else {
                          if (selectResult.length > 0) {
                            resolve({
                              purity: item.purity,
                              before: selectResult[0].quantity_in_grams,
                              deduction: item.quantity,
                              after: selectResult[0].quantity_in_grams - item.quantity
                            });
                          } else {
                            resolve(null);
                          }
                        }
                      });
                    } else {
                      resolve(null);
                    }
                  });
                });

                // Get all current gold stock values
                const goldStockBefore = await Promise.all(goldStockPromises);
                console.log('Gold stock before deduction:', goldStockBefore);

                // Process each karat directly from the frontend data
                const deductionPromises = goldStockDeduction.map(item => {
                  return new Promise((resolve, reject) => {
                    if (item.purity && item.quantity > 0) {
                      // Use a direct value assignment instead of subtraction to avoid race conditions
                      // First, get the current value for logging and validation
                      const selectSql = `SELECT quantity_in_grams FROM gold_stock WHERE purity = ?`;
                      con.query(selectSql, [item.purity], (selectErr, selectResult) => {
                        if (selectErr) {
                          console.error(`Error getting current gold stock for ${item.purity}:`, selectErr);
                          return reject(selectErr);
                        }

                        if (selectResult.length === 0) {
                          return reject(new Error(`Gold stock for ${item.purity} not found`));
                        }

                        const currentQuantity = parseFloat(selectResult[0].quantity_in_grams);
                        const deductionAmount = parseFloat(item.quantity);
                        const expectedAfter = currentQuantity - deductionAmount;

                        console.log(`
                          ============================================
                          GOLD STOCK DEDUCTION FOR ${item.purity}
                          --------------------------------------------
                          Current quantity: ${currentQuantity}g
                          Deducting: ${deductionAmount}g
                          Expected after: ${expectedAfter}g
                          ============================================
                        `);

                        // Store these values for verification later
                        item.originalQuantity = currentQuantity;
                        item.deductionAmount = deductionAmount;
                        item.expectedAfter = expectedAfter;

                        // Validate that we have enough stock before updating
                        if (expectedAfter < 0) {
                          return reject(new Error(`Not enough gold stock for ${item.purity}. Available: ${currentQuantity}g, Requested: ${deductionAmount}g`));
                        }

                        // Proceed with the update
                        const updateSql = `
                          UPDATE gold_stock
                          SET quantity_in_grams = quantity_in_grams - ?
                          WHERE purity = ? AND quantity_in_grams >= ?
                        `;

                        console.log(`Updating gold stock for ${item.purity} by ${item.quantity} grams`);
                        con.query(updateSql, [item.quantity, item.purity, item.quantity], (updateErr, updateResult) => {
                          if (updateErr) {
                            console.error(`Error updating gold stock for ${item.purity}:`, updateErr);
                            reject(updateErr);
                          } else if (updateResult.affectedRows === 0) {
                            // No rows were updated, which means the quantity check failed
                            reject(new Error(`Not enough gold stock for ${item.purity}. Available: ${currentQuantity}g, Requested: ${deductionAmount}g`));
                          } else {
                            console.log(`Gold stock for ${item.purity} updated successfully, reduced by ${item.quantity} grams`);
                            console.log('Update result:', updateResult);
                            resolve(updateResult);
                          }
                        });
                      });
                    } else {
                      resolve(null); // Skip invalid items
                    }
                  });
                });

                try {
                  // Wait for all updates to complete
                  await Promise.all(deductionPromises);

                  // Verify the updates by getting the current gold stock
                  const verifyPromises = goldStockDeduction.map(item => {
                    return new Promise((resolve, reject) => {
                      if (item.purity && item.quantity > 0) {
                        const selectSql = `SELECT * FROM gold_stock WHERE purity = ?`;
                        con.query(selectSql, [item.purity], (selectErr, selectResult) => {
                          if (selectErr) {
                            reject(selectErr);
                          } else {
                            if (selectResult.length > 0) {
                              const actualAfter = parseFloat(selectResult[0].quantity_in_grams);

                              console.log(`
                                ============================================
                                GOLD STOCK VERIFICATION FOR ${item.purity}
                                --------------------------------------------
                                Original quantity: ${item.originalQuantity}g
                                Deducted: ${item.deductionAmount}g
                                Expected after: ${item.expectedAfter}g
                                Actual after: ${actualAfter}g
                                Difference: ${actualAfter - item.expectedAfter}g
                                ============================================
                              `);

                              resolve({
                                purity: item.purity,
                                original: item.originalQuantity,
                                deducted: item.deductionAmount,
                                expected: item.expectedAfter,
                                actual: actualAfter,
                                difference: actualAfter - item.expectedAfter
                              });
                            } else {
                              resolve(null);
                            }
                          }
                        });
                      } else {
                        resolve(null);
                      }
                    });
                  });

                  const goldStockAfter = await Promise.all(verifyPromises);
                  console.log('Gold stock verification complete:', goldStockAfter);

                  // Commit the transaction
                  con.commit((commitErr) => {
                    if (commitErr) {
                      console.error('Error committing transaction:', commitErr);
                      return con.rollback(() => {
                        console.error('Transaction rolled back due to commit error');
                        // Continue with the rest of the order creation process
                        // The gold stock update failed, but we'll still create the order
                        // This is a fallback in case the transaction fails
                        console.log('Continuing with order creation despite gold stock update failure');
                      });
                    }
                    console.log('All gold stock updates committed successfully');
                  });
                } catch (error) {
                  console.error('Error during gold stock updates:', error);

                  // Check if the error is related to insufficient gold stock
                  if (error.message && error.message.includes('Not enough gold stock')) {
                    return con.rollback(() => {
                      console.error('Transaction rolled back due to insufficient gold stock');
                      return res.status(400).json({
                        success: false,
                        message: 'Insufficient gold stock',
                        error: error.message
                      });
                    });
                  }

                  // For other errors, roll back but continue with order creation
                  return con.rollback(() => {
                    console.error('Transaction rolled back due to error');
                    console.log('Continuing with order creation despite gold stock update failure');
                  });
                }
              } catch (outerError) {
                console.error('Outer error in gold stock transaction:', outerError);
                return res.status(500).json({
                  success: false,
                  message: 'Server error during gold stock update',
                  error: outerError.message
                });
              }
            });
          } else {
            // Try the stored procedure first
            console.log('No gold_stock_deduction data, trying stored procedure...');
            console.log('Calling stored procedure update_gold_stock_from_order with order ID:', orderId);

            con.query('CALL update_gold_stock_from_order(?)', [orderId], (procErr, procResult) => {
              if (procErr) {
                console.error('Error calling stored procedure:', procErr);
                console.log('Falling back to direct updates...');

                // Fall back to direct updates if the stored procedure fails
                try {
                  const selectedKaratsObj = JSON.parse(karatsJson);
                  const karatValuesObj = JSON.parse(karatValuesJson);

                  console.log('Parsed selected karats:', selectedKaratsObj);
                  console.log('Parsed karat values:', karatValuesObj);

                  // Update gold stock for each selected karat
                  Object.keys(selectedKaratsObj).forEach(karat => {
                    if (selectedKaratsObj[karat] && karatValuesObj[karat] > 0) {
                      const updateSql = `
                        UPDATE gold_stock
                        SET quantity_in_grams = quantity_in_grams - ?
                        WHERE purity = ?
                      `;

                      console.log(`Updating gold stock for ${karat} by ${karatValuesObj[karat]} grams`);
                      con.query(updateSql, [karatValuesObj[karat], karat], (updateErr, updateResult) => {
                        if (updateErr) {
                          console.error(`Error updating gold stock for ${karat}:`, updateErr);
                        } else {
                          console.log(`Gold stock for ${karat} updated successfully, reduced by ${karatValuesObj[karat]} grams`);
                          console.log('Update result:', updateResult);
                        }
                      });
                    }
                  });
                } catch (parseError) {
                  console.error('Error parsing JSON data for gold stock update:', parseError);
                  console.log('Original JSON strings:', { karatsJson, karatValuesJson });
                }
              } else {
                console.log('Stored procedure executed successfully:', procResult);
              }
            });
          }
        }

        // If there's an image, save it and update the order
        if (image) {
          try {
            const imagePath = saveBase64Image(image, orderId);

            if (imagePath) {
              // Update the order with the image path
              const updateSql = "UPDATE orders SET design_image = ? WHERE order_id = ?";
              con.query(updateSql, [imagePath, orderId], (updateErr) => {
                if (updateErr) {
                  console.error("Error updating order with image:", updateErr);
                  // Still return success, just log the error
                }

                // Create a notification for the inventory order
                try {
                  console.log('Attempting to create inventory order notification...');

                  // Get the supplier name
                  con.query("SELECT name FROM suppliers WHERE supplier_id = ?", [supplier], (supplierErr, supplierResults) => {
                    if (supplierErr) {
                      console.error("Error fetching supplier name:", supplierErr);
                    } else {
                      const supplierName = supplierResults.length > 0 ? supplierResults[0].name : 'Unknown Supplier';

                      console.log('Inventory order notification data:', {
                        order_id: orderId,
                        supplier_name: supplierName,
                        category: category,
                        branch_id: branch_id
                      });

                      // Make a direct database insert instead of using fetch
                      // Calculate expiration date (5 days from now)
                      const expiresAt = new Date();
                      expiresAt.setDate(expiresAt.getDate() + 5);

                      // Create notification for Admin and Store Manager
                      const title = 'New Inventory Order';
                      const categoryInfo = category ? ` for ${category}` : '';
                      const message = `A new inventory order${categoryInfo} has been placed with ${supplierName}`;
                      // Include all possible role formats to ensure compatibility
                      const targetRoles = JSON.stringify(["admin", "Admin", "store manager", "Store Manager", "storemanager"]);

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
                        'inventory_order',
                        targetRoles,
                        expiresAt,
                        branch_id,
                        orderId,
                        'order'
                      ];

                      con.query(notificationSql, notificationParams, (notificationErr, notificationResult) => {
                        if (notificationErr) {
                          console.error('Error creating inventory order notification in database:', notificationErr);
                        } else {
                          console.log(`Inventory order notification created with ID: ${notificationResult.insertId}`);
                        }
                      });
                    }
                  });
                } catch (notificationError) {
                  console.error('Error creating inventory order notification:', notificationError);
                  // Continue anyway, notification failure shouldn't stop the order response
                }

                res.status(201).json({
                  success: true,
                  message: "Order created successfully with image",
                  orderId: orderId,
                  imagePath: imagePath
                });
              });
            } else {
              // Create a notification for the inventory order
              try {
                console.log('Attempting to create inventory order notification (no image)...');

                // Get the supplier name
                con.query("SELECT name FROM suppliers WHERE supplier_id = ?", [supplier], (supplierErr, supplierResults) => {
                  if (supplierErr) {
                    console.error("Error fetching supplier name:", supplierErr);
                  } else {
                    const supplierName = supplierResults.length > 0 ? supplierResults[0].name : 'Unknown Supplier';

                    console.log('Inventory order notification data (no image):', {
                      order_id: orderId,
                      supplier_name: supplierName,
                      category: category,
                      branch_id: branch_id
                    });

                    // Make a direct database insert instead of using fetch
                    // Calculate expiration date (5 days from now)
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 5);

                    // Create notification for Admin and Store Manager
                    const title = 'New Inventory Order';
                    const categoryInfo = category ? ` for ${category}` : '';
                    const message = `A new inventory order${categoryInfo} has been placed with ${supplierName}`;
                    // Include all possible role formats to ensure compatibility
                    const targetRoles = JSON.stringify(["admin", "Admin", "store manager", "Store Manager", "storemanager"]);

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
                      'inventory_order',
                      targetRoles,
                      expiresAt,
                      branch_id,
                      orderId,
                      'order'
                    ];

                    con.query(notificationSql, notificationParams, (notificationErr, notificationResult) => {
                      if (notificationErr) {
                        console.error('Error creating inventory order notification in database:', notificationErr);
                      } else {
                        console.log(`Inventory order notification created with ID: ${notificationResult.insertId}`);
                      }
                    });
                  }
                });
              } catch (notificationError) {
                console.error('Error creating inventory order notification:', notificationError);
                // Continue anyway, notification failure shouldn't stop the order response
              }

              // Return success even if image saving failed
              res.status(201).json({
                success: true,
                message: "Order created successfully, but image could not be saved",
                orderId: orderId
              });
            }
          } catch (imageErr) {
            console.error("Error saving image:", imageErr);
            res.status(201).json({
              success: true,
              message: "Order created successfully, but image could not be saved",
              orderId: orderId,
              imageError: imageErr.message
            });
          }
        } else {
          // No image to save
          res.status(201).json({
            success: true,
            message: "Order created successfully",
            orderId: orderId
          });
        }
      });
    } catch (error) {
      console.error("Error in order creation transaction:", error);

      // Roll back the transaction
      return con.rollback(() => {
        // Check if the error is related to insufficient gold stock
        if (error.message && error.message.includes('Not enough gold stock')) {
          return res.status(400).json({
            message: "Insufficient gold stock",
            error: error.message
          });
        }

        // For other errors
        return res.status(500).json({
          message: "Database error",
          error: error.message
        });
      });
    }
  });
});

// Update order status
router.put("/update-status/:id", (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  const sql = "UPDATE orders SET status = ? WHERE order_id = ?";

  con.query(sql, [status, orderId], (err, result) => {
    if (err) {
      console.error("Error updating order status:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated successfully" });
  });
});

// Delete order
router.delete("/delete/:id", (req, res) => {
  const orderId = req.params.id;

  const sql = "DELETE FROM orders WHERE order_id = ?";

  con.query(sql, [orderId], (err, result) => {
    if (err) {
      console.error("Error deleting order:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  });
});

// Debug endpoint to check user role and branch ID
router.get("/debug/user-info", (req, res) => {
  const branchId = req.query.branch_id;
  let userRole = req.query.role;

  // Normalize the role to lowercase for consistent comparison
  userRole = userRole ? userRole.toLowerCase() : '';

  // Log the exact role for debugging
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

  // EMERGENCY FIX: If the role is 'store manager' (with space), treat it as storemanager
  const isStoreManager = userRole.includes('store') || userRole.includes('manager');
  console.log(`DEBUG: isStoreManager = ${isStoreManager}`);

  res.json({
    originalRole: req.query.role,
    normalizedRole: userRole,
    branchId: branchId,
    isAdmin: userRole === 'admin' || userRole.includes('admin'),
    isStoreManager: userRole === 'storemanager' || isStoreManager,
    isSalesAssociate: userRole === 'salesassociate' || (userRole.includes('sales') && userRole.includes('associate')),
    isCashier: userRole === 'cashier' || userRole.includes('cashier'),
    roleIncludes: {
      store: userRole.includes('store'),
      manager: userRole.includes('manager'),
      sales: userRole.includes('sales'),
      associate: userRole.includes('associate'),
      admin: userRole.includes('admin'),
      cashier: userRole.includes('cashier')
    }
  });
});

// Debug endpoint to check gold stock values
router.get("/debug/gold-stock", (_req, res) => {
  console.log('DEBUG: Checking gold stock values');

  const sql = `
    SELECT * FROM gold_stock
    ORDER BY
      CASE
        WHEN purity = '24KT' THEN 1
        WHEN purity = '22KT' THEN 2
        WHEN purity = '21KT' THEN 3
        WHEN purity = '18KT' THEN 4
        WHEN purity = '16KT' THEN 5
        ELSE 6
      END
  `;

  con.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching gold stock for debug:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    return res.json({
      success: true,
      data: results
    });
  });
});

// Debug endpoint to check if there are any orders in the database
router.get("/debug/check-orders", (_req, res) => {
  console.log('DEBUG: Checking if there are any orders in the database');

  // Simple query to count orders
  const sql = "SELECT COUNT(*) as count FROM orders";

  con.query(sql, (err, results) => {
    if (err) {
      console.error("Error counting orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    const count = results[0].count;
    console.log(`DEBUG: Found ${count} orders in the database`);

    // If there are orders, get some sample data
    if (count > 0) {
      const sampleSql = "SELECT * FROM orders LIMIT 3";
      con.query(sampleSql, (sampleErr, sampleResults) => {
        if (sampleErr) {
          console.error("Error fetching sample orders:", sampleErr);
          return res.json({ count, hasSamples: false });
        }

        console.log('DEBUG: Sample orders:', sampleResults);
        res.json({
          count,
          hasSamples: true,
          samples: sampleResults
        });
      });
    } else {
      res.json({ count, hasSamples: false });
    }
  });
});

// Get supplier liabilities (for store manager dashboard)
router.get("/supplier-liabilities", (req, res) => {
  const { role, branch_id } = req.query;

  console.log('GET /orders/supplier-liabilities - Fetching supplier liabilities');
  console.log(`Query parameters: role=${role}, branch_id=${branch_id}`);

  // Build the query based on role and branch_id
  let sql = `
    SELECT
      s.supplier_id,
      s.name,
      COUNT(DISTINCT o.order_id) as order_count,
      SUM(o.total_amount) as total_amount,
      SUM(IFNULL(sp.amount_paid, 0)) as total_paid,
      SUM(o.total_amount) - SUM(IFNULL(sp.amount_paid, 0)) as total_debt,
      CASE
        WHEN SUM(o.total_amount) <= SUM(IFNULL(sp.amount_paid, 0)) THEN 'Completed'
        WHEN SUM(IFNULL(sp.amount_paid, 0)) > 0 THEN 'Partial'
        ELSE 'Pending'
      END as payment_status
    FROM
      orders o
    JOIN
      suppliers s ON o.supplier_id = s.supplier_id
    LEFT JOIN (
      SELECT
        order_id,
        SUM(amount_paid) as amount_paid
      FROM
        supplier_payments
      GROUP BY
        order_id
    ) sp ON o.order_id = sp.order_id
  `;

  const whereConditions = [];
  const params = [];

  // Add branch filter if applicable
  if (branch_id && role !== 'admin') {
    whereConditions.push('o.branch_id = ?');
    params.push(branch_id);
  }

  // Add WHERE clause if needed
  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Group by supplier
  sql += ' GROUP BY s.supplier_id, s.name';

  // Only show suppliers with debt
  sql += ' HAVING total_debt > 0';

  // Order by debt amount (highest first)
  sql += ' ORDER BY total_debt DESC';

  console.log('Executing SQL query:', sql);
  console.log('With parameters:', params);

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching supplier liabilities:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // For each supplier, get their orders
    const promises = results.map(supplier => {
      return new Promise((resolve, reject) => {
        const orderSql = `
          SELECT
            o.order_id,
            o.total_amount,
            IFNULL(SUM(sp.amount_paid), 0) as paid_amount,
            o.total_amount - IFNULL(SUM(sp.amount_paid), 0) as remaining
          FROM
            orders o
          LEFT JOIN
            supplier_payments sp ON o.order_id = sp.order_id
          WHERE
            o.supplier_id = ?
            ${branch_id && role !== 'admin' ? 'AND o.branch_id = ?' : ''}
          GROUP BY
            o.order_id
          HAVING
            remaining > 0
          ORDER BY
            o.created_at DESC
        `;

        const orderParams = [supplier.supplier_id];
        if (branch_id && role !== 'admin') {
          orderParams.push(branch_id);
        }

        con.query(orderSql, orderParams, (orderErr, orderResults) => {
          if (orderErr) {
            console.error(`Error fetching orders for supplier ${supplier.supplier_id}:`, orderErr);
            return reject(orderErr);
          }

          supplier.orders = orderResults;
          resolve(supplier);
        });
      });
    });

    Promise.all(promises)
      .then(suppliersWithOrders => {
        console.log(`Found ${suppliersWithOrders.length} suppliers with liabilities`);
        res.json(suppliersWithOrders);
      })
      .catch(error => {
        console.error("Error fetching supplier orders:", error);
        res.status(500).json({ message: "Database error", error: error.message });
      });
  });
});
}); // Close the missing brace from line 335
}); // Close another missing brace

export { router as orderRouter };
