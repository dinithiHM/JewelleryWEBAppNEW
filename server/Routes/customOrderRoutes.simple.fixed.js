import express from 'express';
import con from '../utils/db.js';
import { generateOrderReference } from '../utils/referenceGenerator.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import email service directly
import * as emailService from '../utils/emailService.js';

// Get the email functions from the imported module
const { sendCustomOrderPaymentReminder, sendOrderStatusUpdate } = emailService;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const fileName = `custom_order_${orderId}_${Date.now()}.${extension}`;

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '..', 'Public', 'uploads', 'custom_orders');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Save the file
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, imageData, 'base64');

  // Return just the filename without any path prefix
  return fileName;
};

const router = express.Router();

// Create a new custom order without file upload
router.post("/create", async (req, res) => {
  console.log('POST /custom-orders/create - Creating new custom order');
  console.log('Request body:', req.body);

  // Log all request headers for debugging
  console.log('Request headers:');
  console.log(req.headers);

  // Get form data
  const {
    customer_name,
    customer_phone,
    customer_email,
    estimated_amount,
    profit_percentage,
    quantity,
    advance_amount,
    estimated_completion_date,
    category_id,
    supplier_id,
    description,
    special_requirements,
    created_by,
    branch_id,
    selectedFiles // Array of base64 image strings
  } = req.body;

  // Validate required fields
  if (!customer_name || !estimated_amount) {
    return res.status(400).json({ message: "Customer name and estimated amount are required" });
  }

  // Generate sequential order reference (CUST-YYYY-XXXX)
  const year = new Date().getFullYear();
  const referencePrefix = `CUST-${year}-`;

  // Get the next sequence number
  const sequenceQuery = `
    SELECT MAX(SUBSTRING_INDEX(order_reference, '-', -1)) as max_seq
    FROM custom_orders
    WHERE order_reference LIKE ?
  `;

  // Use a Promise to handle the async database query
  const getOrderReference = () => {
    return new Promise((resolve) => {
      con.query(sequenceQuery, [`${referencePrefix}%`], (err, results) => {
        if (err) {
          console.error("Error generating order reference:", err);
          // Fall back to random reference if query fails
          const fallbackReference = generateOrderReference('CUST');
          console.log('Failed to generate sequential reference, using fallback:', fallbackReference);
          resolve(fallbackReference);
          return;
        }

        let nextSeq = 1;
        if (results[0].max_seq) {
          nextSeq = parseInt(results[0].max_seq) + 1;
        }

        const order_reference = `${referencePrefix}${nextSeq.toString().padStart(4, '0')}`;
        console.log('Generated sequential order reference:', order_reference);
        resolve(order_reference);
      });
    });
  };

  // Get the order reference
  const order_reference = await getOrderReference();

  // Calculate total amount with profit
  const parsedEstimatedAmount = parseFloat(estimated_amount);
  const parsedProfitPercentage = profit_percentage ? Math.min(parseFloat(profit_percentage), 15) : 0;
  const parsedQuantity = quantity ? parseInt(quantity, 10) : 1;

  // Calculate profit amount
  const profitAmount = parsedEstimatedAmount * (parsedProfitPercentage / 100);

  // Calculate price per unit (estimated amount + profit)
  const pricePerUnit = parsedEstimatedAmount + profitAmount;

  // Calculate total amount (price per unit * quantity)
  const totalAmount = pricePerUnit * parsedQuantity;

  // Determine payment status based on total amount
  const parsedAdvanceAmount = parseFloat(advance_amount) || 0;
  const payment_status = parsedAdvanceAmount > 0
    ? (parsedAdvanceAmount >= totalAmount ? 'Fully Paid' : 'Partially Paid')
    : 'Not Paid';

  // Convert numeric fields to their proper types
  const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;

  // Simplified supplier_id parsing
  let parsedSupplierId = null;
  if (supplier_id) {
    if (typeof supplier_id === 'number') {
      parsedSupplierId = supplier_id;
    } else if (typeof supplier_id === 'string') {
      parsedSupplierId = parseInt(supplier_id, 10);
      if (isNaN(parsedSupplierId)) {
        const matches = supplier_id.match(/\d+/);
        if (matches && matches.length > 0) {
          parsedSupplierId = parseInt(matches[0], 10);
        }
      }
    }

    if (isNaN(parsedSupplierId) || parsedSupplierId <= 0) {
      parsedSupplierId = null;
    }
  }

  const parsedCreatedBy = created_by ? parseInt(created_by, 10) : null;
  const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;

  // First, verify the supplier exists if a supplier_id was provided
  if (parsedSupplierId !== null) {
    con.query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [parsedSupplierId], (err, results) => {
      if (err) {
        console.error('Error checking supplier existence:', err);
        proceedWithTransaction();
      } else if (results.length === 0) {
        console.error(`Supplier with ID ${parsedSupplierId} does not exist in database`);
        parsedSupplierId = null;
        proceedWithTransaction();
      } else {
        const verifiedSupplierId = results[0].supplier_id;
        parsedSupplierId = verifiedSupplierId;
        proceedWithTransaction();
      }
    });
  } else {
    proceedWithTransaction();
  }

  // Function to proceed with the transaction after supplier verification
  function proceedWithTransaction() {
    con.beginTransaction(err => {
      if (err) {
        console.error("Error starting transaction:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      // Process image if provided
      let imagePath = null;
      if (selectedFiles && selectedFiles.length > 0 && selectedFiles[0]) {
        // We'll save the first image with the order, and the rest will be saved after order creation
        imagePath = saveBase64Image(selectedFiles[0], 'temp'); // Temporary ID, will be updated
      }

      // Insert order
      const insertSql = `
        INSERT INTO custom_orders (
          order_reference,
          customer_name,
          customer_phone,
          customer_email,
          estimated_completion_date,
          estimated_amount,
          profit_percentage,
          quantity,
          advance_amount,
          order_status,
          payment_status,
          category_id,
          supplier_id,
          description,
          special_requirements,
          created_by,
          branch_id,
          images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Store the estimated amount per unit (not multiplied by quantity)
      const estimatedAmountPerUnit = parseFloat(estimated_amount);

      // Ensure profit percentage is within limits (max 15%)
      let finalProfitPercentage = null;
      if (profit_percentage !== undefined && profit_percentage !== '') {
        finalProfitPercentage = Math.min(parseFloat(profit_percentage), 15);
      }

      // Parse quantity (default to 1 if not provided)
      const finalQuantity = quantity ? parseInt(quantity, 10) : 1;

      const insertParams = [
        order_reference,
        customer_name,
        customer_phone || null,
        customer_email || null,
        estimated_completion_date || null,
        estimatedAmountPerUnit,
        finalProfitPercentage,
        finalQuantity,
        parseFloat(advance_amount) || 0,
        'Pending',
        payment_status,
        parsedCategoryId,
        parsedSupplierId,
        description || '',
        special_requirements || '',
        parsedCreatedBy,
        parsedBranchId,
        imagePath // Add image path
      ];

      // Try to execute the query
      con.query(insertSql, insertParams, (insertErr, insertResult) => {
        if (insertErr) {
          return con.rollback(() => {
            console.error("Error creating custom order:", insertErr);
            res.status(500).json({
              message: "Database error",
              error: insertErr.message
            });
          });
        }

        const orderId = insertResult.insertId;
        console.log('Order created with ID:', orderId);

        // If we have a temporary image path, update it with the actual order ID
        if (imagePath) {
          // Create a new filename with the actual order ID
          const updatedImagePath = imagePath.replace('temp', orderId);

          // Get the full file paths
          const oldFilePath = path.join(__dirname, '..', 'Public', 'uploads', 'custom_orders', imagePath);
          const newFilePath = path.join(__dirname, '..', 'Public', 'uploads', 'custom_orders', updatedImagePath);

          try {
            // Rename the file with the correct order ID
            fs.renameSync(oldFilePath, newFilePath);
            console.log(`Renamed image file from ${oldFilePath} to ${newFilePath}`);

            // Update the image path in the database - store just the filename
            const updateImageSql = "UPDATE custom_orders SET images = ? WHERE order_id = ?";
            con.query(updateImageSql, [updatedImagePath, orderId], (updateErr) => {
              if (updateErr) {
                console.error(`Error updating image path for order ${orderId}:`, updateErr);
              } else {
                console.log(`Updated image path in database to ${updatedImagePath} for order ${orderId}`);
              }
            });
          } catch (fsErr) {
            console.error(`Error renaming image file for order ${orderId}:`, fsErr);
          }
        }

        // Save additional images to custom_order_images table if provided
        if (selectedFiles && selectedFiles.length > 1) {
          // Skip the first image as it's already saved with the order
          const additionalImages = selectedFiles.slice(1);

          if (additionalImages.length > 0) {
            const saveImagePromises = additionalImages.map((imageData, index) => {
              return new Promise((resolve) => {
                const imagePath = saveBase64Image(imageData, orderId);
                if (imagePath) {
                  console.log(`Saved additional image ${index + 1} for order ${orderId}: ${imagePath}`);

                  // Store just the filename in the database
                  const insertImageSql = "INSERT INTO custom_order_images (order_id, image_path, image_type) VALUES (?, ?, ?)";
                  con.query(insertImageSql, [orderId, imagePath, 'Reference'], (imageErr) => {
                    if (imageErr) {
                      console.error(`Error saving additional image ${index + 1} for order ${orderId}:`, imageErr);
                    } else {
                      console.log(`Inserted image record in database for order ${orderId}: ${imagePath}`);
                    }
                    resolve();
                  });
                } else {
                  console.error(`Failed to save additional image ${index + 1} for order ${orderId}`);
                  resolve();
                }
              });
            });

            // Wait for all image saves to complete
            Promise.all(saveImagePromises).catch(error => {
              console.error('Error saving additional images:', error);
            });
          }
        }

        // If advance payment was made, record it
        if (parseFloat(advance_amount) > 0) {
          // First, insert into custom_order_payments
          const paymentSql = `
            INSERT INTO custom_order_payments (
              order_id,
              payment_amount,
              payment_method,
              notes
            ) VALUES (?, ?, ?, ?)
          `;

          const paymentParams = [
            orderId,
            parseFloat(advance_amount),
            'Cash', // Default payment method
            'Initial advance payment'
          ];

          con.query(paymentSql, paymentParams, (paymentErr) => {
            if (paymentErr) {
              return con.rollback(() => {
                console.error("Error recording payment:", paymentErr);
                res.status(500).json({ message: "Database error", error: paymentErr.message });
              });
            }

            // Now, also insert into advance_payments table
            // Generate a reference number for the advance payment
            const year = new Date().getFullYear();
            const referencePrefix = `ADV-${year}-`;

            // Find the next sequence number
            const sequenceQuery = `
              SELECT MAX(CAST(SUBSTRING_INDEX(payment_reference, '-', -1) AS UNSIGNED)) as max_seq
              FROM advance_payments
              WHERE payment_reference LIKE ?
            `;

            con.query(sequenceQuery, [`${referencePrefix}%`], (seqErr, seqResults) => {
              if (seqErr) {
                return con.rollback(() => {
                  console.error("Error generating payment reference:", seqErr);
                  res.status(500).json({ message: "Database error", error: seqErr.message });
                });
              }

              let nextSeq = 1;
              if (seqResults[0].max_seq) {
                nextSeq = parseInt(seqResults[0].max_seq) + 1;
              }

              const payment_reference = `${referencePrefix}${nextSeq.toString().padStart(4, '0')}`;

              // Calculate customer price with profit and quantity
              const profitAmount = estimatedAmountPerUnit * (finalProfitPercentage / 100);
              const pricePerUnit = estimatedAmountPerUnit + profitAmount;
              const customerPrice = pricePerUnit * finalQuantity;

              // Calculate balance amount
              const balance_amount = customerPrice - parseFloat(advance_amount);
              const payment_status = balance_amount <= 0 ? 'Completed' : 'Partially Paid';

              // Insert into advance_payments table
              const advancePaymentSql = `
                INSERT INTO advance_payments (
                  payment_reference,
                  customer_name,
                  payment_date,
                  total_amount,
                  advance_amount,
                  balance_amount,
                  payment_status,
                  payment_method,
                  notes,
                  created_by,
                  branch_id,
                  is_custom_order,
                  order_id
                ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

              con.query(advancePaymentSql, [
                payment_reference,
                customer_name,
                customerPrice,
                parseFloat(advance_amount),
                balance_amount,
                payment_status,
                'Cash',
                'Initial advance payment for custom order',
                parsedCreatedBy,
                parsedBranchId,
                1, // is_custom_order = true
                orderId
              ], (advPayErr) => {
                if (advPayErr) {
                  return con.rollback(() => {
                    console.error("Error creating advance payment:", advPayErr);
                    res.status(500).json({ message: "Database error", error: advPayErr.message });
                  });
                }

                // Commit transaction
                con.commit((commitErr) => {
                  if (commitErr) {
                    return con.rollback(() => {
                      console.error("Error committing transaction:", commitErr);
                      res.status(500).json({ message: "Database error", error: commitErr.message });
                    });
                  }

                  res.status(201).json({
                    message: "Custom order created successfully",
                    order_id: orderId,
                    order_reference
                  });
                });
              });
            });
          });
        } else {
          // No advance payment, commit transaction directly
          con.commit((commitErr) => {
            if (commitErr) {
              return con.rollback(() => {
                console.error("Error committing transaction:", commitErr);
                res.status(500).json({ message: "Database error", error: commitErr.message });
              });
            }

            res.status(201).json({
              message: "Custom order created successfully",
              order_id: orderId,
              order_reference
            });
          });
        }
      });
    });
  }
});

// Get completed custom orders for store manager dashboard
router.get("/completed-orders", (req, res) => {
  console.log('GET /custom-orders/completed-orders - Fetching completed custom orders');

  // Get branch_id from query parameters
  const branchId = req.query.branch_id;
  const includePickedUp = req.query.include_picked_up === 'true';

  if (!branchId) {
    return res.status(400).json({ message: "Branch ID is required" });
  }

  // SQL query to get completed custom orders for the specified branch
  // Include "Picked Up" status if requested
  const statusCondition = includePickedUp
    ? "co.order_status IN ('Completed', 'Picked Up')"
    : "co.order_status = 'Completed'";

  const sql = `
    SELECT
      co.*,
      c.category_name,
      b.branch_name
    FROM
      custom_orders co
    LEFT JOIN
      categories c ON co.category_id = c.category_id
    LEFT JOIN
      branches b ON co.branch_id = b.branch_id
    WHERE
      ${statusCondition}
      AND co.branch_id = ?
    ORDER BY
      co.order_date DESC
  `;

  con.query(sql, [branchId], (err, results) => {
    if (err) {
      console.error("Error fetching completed custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results || []);
  });
});

// Get all custom orders with payment information and branch-based filtering
router.get("/", (req, res) => {
  console.log('GET /custom-orders - Fetching custom orders');

  // Get branch_id and role from query parameters
  const branchId = req.query.branch_id;
  let userRole = req.query.role;

  // Normalize the role to lowercase for consistent comparison
  userRole = userRole ? userRole.toLowerCase() : '';

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

  // Base SQL query
  let sql = `
    SELECT co.*,
      (SELECT COUNT(*) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) as payment_count,
      (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) as total_paid,
      (SELECT MIN(balance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) as min_balance,
      (SELECT payment_status FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1 ORDER BY payment_id DESC LIMIT 1) as latest_payment_status,
      (SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id) as total_custom_payments,
      CASE
        WHEN (SELECT MIN(balance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) <= 0 THEN 'Fully Paid'
        WHEN (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) >= co.estimated_amount * COALESCE(co.quantity, 1) THEN 'Fully Paid'
        WHEN (SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id) >= co.estimated_amount * COALESCE(co.quantity, 1) THEN 'Fully Paid'
        WHEN (SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id) > 0 THEN 'Partially Paid'
        ELSE 'Not Paid'
      END as current_payment_status,
      (SELECT advance_amount FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1 ORDER BY payment_id DESC LIMIT 1) as latest_advance_amount,
      b.branch_name,
      CASE
        WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN
          co.estimated_amount * COALESCE(co.quantity, 1)
        ELSE
          (co.estimated_amount + (co.estimated_amount * (co.profit_percentage / 100))) * COALESCE(co.quantity, 1)
      END as total_amount_with_profit
    FROM custom_order_details co
    LEFT JOIN branches b ON co.branch_id = b.branch_id
  `;

  // Add WHERE clause for branch filtering based on filter parameter
  const queryParams = [];
  const filterByBranch = req.query.filter_branch === 'true';

  console.log('User role:', userRole);
  console.log('Branch ID:', branchId);
  console.log('Filter by branch:', filterByBranch);

  if (userRole === 'admin') {
    // Admin sees all orders by default, but can filter by branch if requested
    if (filterByBranch && branchId) {
      sql += ` WHERE co.branch_id = ?`;
      queryParams.push(branchId);
      console.log('Admin filtering by branch:', branchId);
    } else {
      console.log('Admin seeing all branches');
    }
  } else {
    // Non-admin users should only see their branch by default
    if (branchId) {
      sql += ` WHERE co.branch_id = ?`;
      queryParams.push(branchId);
      console.log('Non-admin filtering by branch:', branchId);
    } else {
      // Fallback to branch 1 if no branch ID is provided for non-admin
      sql += ` WHERE co.branch_id = 1`;
      console.log('Non-admin with no branch ID, defaulting to branch 1');
    }
  }

  // Add ORDER BY clause
  sql += ` ORDER BY co.order_date DESC`;

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Update the payment_status field with the current status from payments
    const updatedResults = results.map(order => ({
      ...order,
      payment_status: order.current_payment_status || order.payment_status
    }));

    // Update the database with the current payment status if it's different
    const updatePromises = results.map(order => {
      return new Promise((resolve) => {
        if (order.current_payment_status && order.current_payment_status !== order.payment_status) {
          // Update both payment_status and advance_amount if needed
          const updateSql = `UPDATE custom_orders SET payment_status = ?, advance_amount = ? WHERE order_id = ?`;
          const advanceAmount = order.total_paid || order.latest_advance_amount || order.advance_amount || 0;

          con.query(updateSql, [order.current_payment_status, advanceAmount, order.order_id], (updateErr) => {
            if (updateErr) {
              console.error(`Error updating payment status for order ${order.order_id}:`, updateErr);
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    });

    // Wait for all updates to complete
    Promise.all(updatePromises).then(() => {
      res.json(updatedResults);
    }).catch(error => {
      console.error('Error updating payment statuses:', error);
      res.json(updatedResults);
    });
  });
});

// Update custom order status
router.put("/:id/status", (req, res) => {
  const orderId = req.params.id;
  const { order_status, supplier_notes } = req.body;

  console.log(`PUT /custom-orders/${orderId}/status - Updating custom order status`);

  if (!order_status) {
    return res.status(400).json({ message: "Missing order status" });
  }

  // SQL query with optional supplier_notes
  const sql = supplier_notes
    ? `
      UPDATE custom_orders
      SET order_status = ?, supplier_notes = ?
      WHERE order_id = ?
    `
    : `
      UPDATE custom_orders
      SET order_status = ?
      WHERE order_id = ?
    `;

  // Parameters array based on whether supplier_notes is provided
  const params = supplier_notes
    ? [order_status, supplier_notes, orderId]
    : [order_status, orderId];

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating order status:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Custom order not found" });
    }

    res.json({
      message: "Order status updated successfully",
      order_id: orderId,
      order_status,
      supplier_notes: supplier_notes || null
    });
  });
});

// Mark a custom order as picked up
router.put("/:id/mark-as-picked-up", (req, res) => {
  const orderId = req.params.id;
  const { pickup_notes } = req.body;

  console.log(`PUT /custom-orders/${orderId}/mark-as-picked-up - Marking custom order as picked up`);

  // Begin transaction
  con.beginTransaction(err => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Update order status to "Picked Up"
    const updateOrderSql = `
      UPDATE custom_orders
      SET order_status = 'Picked Up',
          pickup_date = NOW(),
          pickup_notes = ?
      WHERE order_id = ?
    `;

    con.query(updateOrderSql, [pickup_notes || null, orderId], (updateErr, updateResult) => {
      if (updateErr) {
        return con.rollback(() => {
          console.error("Error updating order status:", updateErr);
          res.status(500).json({ message: "Database error", error: updateErr.message });
        });
      }

      if (updateResult.affectedRows === 0) {
        return con.rollback(() => {
          console.log(`No order found with ID ${orderId}`);
          res.status(404).json({ message: "Custom order not found" });
        });
      }

      // Commit the transaction
      con.commit(commitErr => {
        if (commitErr) {
          return con.rollback(() => {
            console.error("Error committing transaction:", commitErr);
            res.status(500).json({ message: "Database error", error: commitErr.message });
          });
        }

        console.log(`Successfully marked order ${orderId} as picked up`);
        res.json({
          success: true,
          message: "Order marked as picked up successfully",
          order_id: orderId
        });
      });
    });
  });
});

// Get custom order by ID with branch-based access control
router.get("/:id", (req, res) => {
  const orderId = req.params.id;
  const branchId = req.query.branch_id;
  let userRole = req.query.role;

  // Skip processing for special endpoints
  if (orderId === 'completed-orders') {
    return res.status(404).json({ message: "Invalid endpoint" });
  }

  // Normalize the role to lowercase for consistent comparison
  userRole = userRole ? userRole.toLowerCase() : '';

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

  // Prepare SQL query - all users can see any order details
  const orderSql = `
    SELECT * FROM custom_order_details
    WHERE order_id = ?
  `;
  const queryParams = [orderId];

  // We'll check if the order is from the user's branch after fetching it
  con.query(orderSql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching custom order:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Custom order not found" });
    }

    // Get materials
    const materialsSql = `
      SELECT * FROM custom_order_materials
      WHERE order_id = ?
    `;

    // Get payments
    const paymentsSql = `
      SELECT * FROM custom_order_payments
      WHERE order_id = ?
    `;

    // Get images
    const imagesSql = `
      SELECT * FROM custom_order_images
      WHERE order_id = ?
    `;

    // Execute all queries in parallel
    Promise.all([
      new Promise((resolve, reject) => {
        con.query(materialsSql, [orderId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        con.query(paymentsSql, [orderId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        con.query(imagesSql, [orderId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      })
    ])
      .then(([materialsResults, paymentsResults, imagesResults]) => {
        // Process image paths
        const processedImages = (imagesResults || []).map(image => {
          // Make sure the image path is relative to the server root
          if (image.image_path) {
            // Handle different path formats
            if (!image.image_path.startsWith('uploads/')) {
              // If it's a full path, extract just the filename
              if (image.image_path.includes('/')) {
                image.image_path = image.image_path.split('/').pop();
              }
            } else if (image.image_path.startsWith('uploads/')) {
              // Remove 'uploads/' prefix if it exists
              image.image_path = image.image_path.replace('uploads/', '');
            }
          }
          return image;
        });

        // Also process the images string in the main result
        if (results[0].images) {
          const imagesList = results[0].images.split(',').filter(img => img.trim());
          const processedImagesList = imagesList.map(imagePath => {
            if (imagePath) {
              // Clean up the path to just the filename or relative path
              if (imagePath.includes('/')) {
                return imagePath.split('/').pop();
              } else {
                return imagePath;
              }
            }
            return imagePath;
          });
          results[0].images = processedImagesList.join(',');

          // Log the processed images for debugging
          console.log('Processed main image path:', results[0].images);
        }

        // Check if order is from a different branch than the user's branch
        const orderBranchId = results[0].branch_id;
        const isFromOtherBranch = userRole !== 'admin' && branchId && orderBranchId !== parseInt(branchId);

        // Combine all data
        const orderData = {
          ...results[0],
          materials: materialsResults || [],
          payments: paymentsResults || [],
          imageDetails: processedImages || [],
          isFromOtherBranch: isFromOtherBranch
        };

        res.json(orderData);
      })
      .catch(err => {
        console.error("Error fetching related data:", err);
        res.status(500).json({ message: "Database error", error: err.message });
      });
  });
});

// Send payment reminder for a custom order
router.post("/:id/send-reminder", async (req, res) => {
  const orderId = req.params.id;

  // First, get the payment history to get the accurate total paid amount
  const historySql = `
    SELECT
      COALESCE(SUM(ap.advance_amount), 0) as total_advance_payments
    FROM
      advance_payments ap
    WHERE
      ap.order_id = ? AND ap.is_custom_order = 1
  `;

  con.query(historySql, [orderId], (historyErr, historyResults) => {
    if (historyErr) {
      console.error("Error fetching payment history:", historyErr);
      return res.status(500).json({ message: "Database error", error: historyErr.message });
    }

    const totalAdvancePayments = historyResults[0]?.total_advance_payments || 0;

    // Get the order details with customer email
    const sql = `
      SELECT co.*,
             co.customer_email as customer_email,
             co.order_id as order_id,
             co.customer_name as customer_name,
             co.estimated_amount as estimated_amount,
             co.profit_percentage as profit_percentage,
             co.quantity as quantity,
             co.order_date as order_date,
             co.estimated_completion_date as estimated_completion_date
      FROM custom_orders co
      WHERE co.order_id = ?
    `;

    con.query(sql, [orderId], async (err, results) => {
      if (err) {
        console.error("Error fetching custom order:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err.message
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Custom order not found"
        });
      }

      const order = results[0];

      // Update the order with the accurate advance payment amount from history
      order.advance_amount = totalAdvancePayments;

      // Check if customer email exists
      if (!order.customer_email) {
        console.log("No customer email found for order:", orderId);
        return res.status(400).json({
          success: false,
          message: "Customer email not available for this order"
        });
      }

      try {
        // Check if sendCustomOrderPaymentReminder is defined
        if (typeof sendCustomOrderPaymentReminder !== 'function') {
          console.error("sendCustomOrderPaymentReminder is not a function:", sendCustomOrderPaymentReminder);
          return res.status(500).json({
            success: false,
            message: "Email service not properly initialized"
          });
        }

        // Send the reminder email - use await since it's an async function
        const emailResult = await sendCustomOrderPaymentReminder(order, order.customer_email);

        if (emailResult && emailResult.success) {
          // Log the email sent in the database if email_logs table exists
          try {
            const logSql = `
              INSERT INTO email_logs (
                order_id,
                email_type,
                recipient_email,
                sent_at,
                status,
                message_id,
                error_message
              ) VALUES (?, ?, ?, NOW(), ?, ?, ?)
            `;

            // Check if this is a mock email
            const isMockEmail = emailResult.mockEmail === true;
            const status = isMockEmail ? 'mock_sent' : 'sent';
            const notes = isMockEmail ? 'Mock email (nodemailer not installed)' : null;

            con.query(logSql, [
              orderId,
              'payment_reminder',
              order.customer_email,
              status,
              emailResult.messageId || null,
              notes
            ], (logErr) => {
              if (logErr) {
                console.error("Error logging email:", logErr);
                // Continue anyway since the email was sent
              }
            });
          } catch (logError) {
            console.error("Error with email logging:", logError);
            // Continue anyway since the email was sent
          }

          // Check if this is a mock email
          const isMockEmail = emailResult.mockEmail === true;
          const message = isMockEmail
            ? "Mock payment reminder email generated successfully (nodemailer not installed)"
            : "Real payment reminder email sent successfully to " + order.customer_email;

          return res.status(200).json({
            success: true,
            message: message,
            messageId: emailResult.messageId,
            isMockEmail: isMockEmail
          });
        } else {
          console.error("Email sending failed:", emailResult ? emailResult.error : "Unknown error");
          return res.status(500).json({
            success: false,
            message: "Failed to send payment reminder email",
            error: emailResult ? emailResult.error : "Unknown error"
          });
        }
      } catch (error) {
        console.error("Error in send-reminder endpoint:", error);
        return res.status(500).json({
          success: false,
          message: "Server error while sending reminder",
          error: error.message
        });
      }
    });
  });
});

// Test endpoint for email service
router.post("/test-email", async (_req, res) => {
  console.log("Testing email service...");

  try {
    // Check if sendCustomOrderPaymentReminder is defined
    if (typeof sendCustomOrderPaymentReminder !== 'function') {
      console.error("sendCustomOrderPaymentReminder is not a function:", sendCustomOrderPaymentReminder);
      return res.status(500).json({
        success: false,
        message: "Email service not properly initialized"
      });
    }

    // Create a test order object
    const testOrder = {
      order_id: 999,
      customer_name: "Test Customer",
      customer_email: "test@example.com",
      estimated_amount: 100000,
      advance_amount: 25000,
      order_date: new Date().toISOString(),
      estimated_completion_date: new Date().toISOString()
    };

    // Send test email
    const emailResult = await sendCustomOrderPaymentReminder(testOrder, testOrder.customer_email);

    return res.status(200).json({
      success: true,
      message: "Test email sent",
      result: emailResult
    });
  } catch (error) {
    console.error("Error in test-email endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending test email",
      error: error.message
    });
  }
});

// Send order completion notification to customer
router.post("/:id/send-completion-notification", async (req, res) => {
  const orderId = req.params.id;
  const { pickup_location } = req.body;

  // First, get the payment history to get the accurate total paid amount
  const historySql = `
    SELECT
      COALESCE(SUM(ap.advance_amount), 0) as total_advance_payments
    FROM
      advance_payments ap
    WHERE
      ap.order_id = ? AND ap.is_custom_order = 1
  `;

  con.query(historySql, [orderId], (historyErr, historyResults) => {
    if (historyErr) {
      console.error("Error fetching payment history:", historyErr);
      return res.status(500).json({ message: "Database error", error: historyErr.message });
    }

    const totalAdvancePayments = historyResults[0]?.total_advance_payments || 0;

    // Get the order details with customer email
    const sql = `
      SELECT co.*,
             co.customer_email as customer_email,
             co.order_id as order_id,
             co.customer_name as customer_name,
             co.estimated_amount as estimated_amount,
             co.profit_percentage as profit_percentage,
             co.quantity as quantity,
             co.order_date as order_date,
             co.estimated_completion_date as estimated_completion_date,
             b.branch_name,
             b.location as branch_address,
             b.contact_number as branch_phone
      FROM custom_orders co
      LEFT JOIN branches b ON co.branch_id = b.branch_id
      WHERE co.order_id = ?
    `;

    con.query(sql, [orderId], async (err, results) => {
      if (err) {
        console.error("Error fetching custom order:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err.message
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Custom order not found"
        });
      }

      const order = results[0];

      // Update the order with the accurate advance payment amount from history
      order.advance_amount = totalAdvancePayments;

      // Check if customer email exists
      if (!order.customer_email) {
        console.log("No customer email found for order:", orderId);
        return res.status(400).json({
          success: false,
          message: "Customer email not available for this order"
        });
      }

      try {
        // Check if sendOrderStatusUpdate is defined
        if (typeof sendOrderStatusUpdate !== 'function') {
          console.error("sendOrderStatusUpdate is not a function:", sendOrderStatusUpdate);
          return res.status(500).json({
            success: false,
            message: "Email service not properly initialized"
          });
        }

        // Add pickup location to order object
        order.pickup_location = pickup_location || order.branch_name || 'our store';

        // Calculate remaining balance
        // Calculate total amount with profit and quantity
        const baseAmount = Number(order.estimated_amount) || 0;
        const profitPercentage = Number(order.profit_percentage) || 0;
        const quantity = Number(order.quantity) || 1;

        // Calculate total amount with profit and quantity
        const totalAmount = profitPercentage > 0
          ? (baseAmount * (1 + profitPercentage/100) * quantity)
          : (baseAmount * quantity);

        const paidAmount = Number(order.advance_amount) || 0;
        const remainingBalance = totalAmount - paidAmount;
        order.remaining_balance = remainingBalance;

        // Send the completion notification email
        const emailResult = await sendOrderStatusUpdate(order, order.customer_email, 'Completed');

        if (emailResult && emailResult.success) {
          // Log the email sent in the database if email_logs table exists
          try {
            const logSql = `
              INSERT INTO email_logs (
                order_id,
                email_type,
                recipient_email,
                sent_at,
                status,
                message_id,
                error_message
              ) VALUES (?, ?, ?, NOW(), ?, ?, ?)
            `;

            // Check if this is a mock email
            const isMockEmail = emailResult.mockEmail === true;
            const status = isMockEmail ? 'mock_sent' : 'sent';
            const notes = isMockEmail ? 'Mock email (nodemailer not installed)' : null;

            con.query(logSql, [
              orderId,
              'completion_notification',
              order.customer_email,
              status,
              emailResult.messageId || null,
              notes
            ], (logErr) => {
              if (logErr) {
                console.error("Error logging email:", logErr);
                // Continue anyway since the email was sent
              }
            });
          } catch (logError) {
            console.error("Error with email logging:", logError);
            // Continue anyway since the email was sent
          }

          // Check if this is a mock email
          const isMockEmail = emailResult.mockEmail === true;
          const message = isMockEmail
            ? "Mock completion notification email generated successfully (nodemailer not installed)"
            : "Real completion notification email sent successfully to " + order.customer_email;

          return res.status(200).json({
            success: true,
            message: message,
            messageId: emailResult.messageId,
            isMockEmail: isMockEmail
          });
        } else {
          console.error("Email sending failed:", emailResult ? emailResult.error : "Unknown error");
          return res.status(500).json({
            success: false,
            message: "Failed to send completion notification email",
            error: emailResult ? emailResult.error : "Unknown error"
          });
        }
      } catch (error) {
        console.error("Error in send-completion-notification endpoint:", error);
        return res.status(500).json({
          success: false,
          message: "Server error while sending notification",
          error: error.message
        });
      }
    });
  });
});

// Export the router
export { router as customOrderRouter };
