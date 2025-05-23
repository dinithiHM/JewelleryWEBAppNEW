import express from 'express';
import con from '../utils/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Determine which email service to use (real or mock)
let emailService;
try {
  // Force use of real email service since we know nodemailer is installed
  console.log("Using real email service");
  emailService = await import('../utils/emailService.js');
} catch (e) {
  console.error("Error importing email service:", e);

  // Fallback to mock service if there's an error
  try {
    console.log("Falling back to mock email service");
    emailService = await import('../utils/mockEmailService.js');
  } catch (mockError) {
    console.error("Error importing mock email service:", mockError);
    // If both fail, we'll get an error when trying to use sendCustomOrderPaymentReminder
  }
}

const {
  sendCustomOrderPaymentReminder,
  sendOrderStatusUpdate
} = emailService;

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../Public/uploads/custom_orders');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'custom-order-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error('Only image files are allowed!'));
  }
});

// Get all custom orders
router.get("/", (req, res) => {
  console.log('GET /custom-orders - Fetching all custom orders');

  // Get query parameters
  const status = req.query.status;
  const branchId = req.query.branch_id;

  let sql = `
    SELECT * FROM custom_order_details
  `;

  // Add WHERE clause if filters are provided
  const whereConditions = [];
  const queryParams = [];

  if (status && status !== 'all') {
    whereConditions.push('order_status = ?');
    queryParams.push(status);
  }

  if (branchId) {
    whereConditions.push('branch_id = ?');
    queryParams.push(branchId);
  }

  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Add ORDER BY clause
  sql += ' ORDER BY order_date DESC';

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results || []);
  });
});

// Get custom order by ID
router.get("/:id", (req, res) => {
  const orderId = req.params.id;

  const sql = `
    SELECT
      co.*,
      (
        COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0) +
        COALESCE((SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1), 0)
      ) as actual_advance_amount,
      (
        CASE
          WHEN co.profit_percentage IS NULL OR co.profit_percentage = 0 THEN
            CASE
              WHEN co.quantity IS NULL OR co.quantity = 0 THEN co.estimated_amount
              ELSE co.estimated_amount * co.quantity
            END
          ELSE (co.estimated_amount + (co.estimated_amount * (co.profit_percentage / 100))) * COALESCE(co.quantity, 1)
        END -
        (
          COALESCE((SELECT SUM(payment_amount) FROM custom_order_payments WHERE order_id = co.order_id), 0) +
          COALESCE((SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1), 0)
        )
      ) as actual_balance_amount,
      (SELECT COUNT(*) FROM custom_order_payments WHERE order_id = co.order_id) +
      (SELECT COUNT(*) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) as payment_count
    FROM
      custom_order_details co
    WHERE
      co.order_id = ?
  `;

  con.query(sql, [orderId], (err, results) => {
    if (err) {
      console.error("Error fetching custom order:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Custom order not found" });
    }

    // Get order materials
    const materialsSql = `
      SELECT * FROM custom_order_materials
      WHERE order_id = ?
    `;

    con.query(materialsSql, [orderId], (materialsErr, materialsResults) => {
      if (materialsErr) {
        console.error("Error fetching order materials:", materialsErr);
        return res.status(500).json({ message: "Database error", error: materialsErr.message });
      }

      // Get order payments
      const paymentsSql = `
        SELECT * FROM custom_order_payments
        WHERE order_id = ?
        ORDER BY payment_date DESC
      `;

      con.query(paymentsSql, [orderId], (paymentsErr, paymentsResults) => {
        if (paymentsErr) {
          console.error("Error fetching order payments:", paymentsErr);
          return res.status(500).json({ message: "Database error", error: paymentsErr.message });
        }

        // Get order images
        const imagesSql = `
          SELECT * FROM custom_order_images
          WHERE order_id = ?
        `;

        con.query(imagesSql, [orderId], (imagesErr, imagesResults) => {
          if (imagesErr) {
            console.error("Error fetching order images:", imagesErr);
            return res.status(500).json({ message: "Database error", error: imagesErr.message });
          }

          // Process image paths
          const processedImages = (imagesResults || []).map(image => {
            // Make sure the image path is relative to the server root
            if (image.image_path && !image.image_path.startsWith('uploads/')) {
              image.image_path = 'uploads/custom_orders/' + image.image_path.split('/').pop();
            }
            return image;
          });

          // Combine all data
          const orderData = {
            ...results[0],
            // Use the actual advance amount from the query
            advance_amount: results[0].actual_advance_amount,
            balance_amount: results[0].actual_balance_amount,
            materials: materialsResults || [],
            payments: paymentsResults || [],
            imageDetails: processedImages || []
          };

          // Get all payments from both tables
          const getPaymentsSql = `
            SELECT
              COALESCE(SUM(payment_amount), 0) as total_payments
            FROM
              custom_order_payments
            WHERE
              order_id = ?
          `;

          const getAdvancePaymentsSql = `
            SELECT
              COALESCE(SUM(advance_amount), 0) as total_advance_payments
            FROM
              advance_payments
            WHERE
              order_id = ? AND is_custom_order = 1
          `;

          // Execute both queries to get the total payments
          con.query(getPaymentsSql, [orderId], (paymentErr, paymentResults) => {
            if (paymentErr) {
              console.error("Error fetching payment totals:", paymentErr);
              // Continue with the data we have
            }

            con.query(getAdvancePaymentsSql, [orderId], (advanceErr, advanceResults) => {
              if (advanceErr) {
                console.error("Error fetching advance payment totals:", advanceErr);
                // Continue with the data we have
              }

              // Calculate the total payments from both tables
              const paymentsTotal = paymentErr ? 0 : (paymentResults[0]?.total_payments || 0);
              const advanceTotal = advanceErr ? 0 : (advanceResults[0]?.total_advance_payments || 0);
              const totalPayments = paymentsTotal + advanceTotal;

              console.log(`Total payments from custom_order_payments: ${paymentsTotal}`);
              console.log(`Total payments from advance_payments: ${advanceTotal}`);
              console.log(`Combined total payments: ${totalPayments}`);

              // Calculate other values
              const estimatedAmount = orderData.estimated_amount || 0;
              const profitPercentage = orderData.profit_percentage || 0;
              const quantity = orderData.quantity || 1;

              // Calculate total amount with profit and quantity
              let totalAmountWithProfit;
              if (profitPercentage > 0) {
                // Calculate profit amount
                const profitAmount = estimatedAmount * (profitPercentage / 100);
                // Calculate total amount with profit for a single unit
                const amountWithProfit = estimatedAmount + profitAmount;
                // Multiply by quantity to get the final total
                totalAmountWithProfit = amountWithProfit * quantity;
              } else {
                // Even if there's no profit, we still need to account for quantity
                totalAmountWithProfit = estimatedAmount * quantity;
              }

              console.log(`Calculated total amount with profit: ${totalAmountWithProfit} (Estimated: ${estimatedAmount}, Profit: ${profitPercentage}%, Quantity: ${quantity})`);
              console.log(`Price calculation: ${profitPercentage > 0 ?
                `[(${estimatedAmount} * ${profitPercentage}/100) + ${estimatedAmount}] * ${quantity}` :
                `${estimatedAmount} * ${quantity}`}`);

              // Calculate the correct balance
              const correctBalance = totalAmountWithProfit - totalPayments;
              console.log(`Correct balance calculation: ${totalAmountWithProfit} - ${totalPayments} = ${correctBalance}`);

              // Update the values
              orderData.advance_amount = totalPayments;
              orderData.balance_amount = correctBalance;
              orderData.total_amount_with_profit = totalAmountWithProfit;

              console.log(`Order ${orderId} - Total payments: ${totalPayments}, Balance: ${correctBalance}`);

              res.json(orderData);
            });
          });
        });
      });
    });
  });
});

// Middleware to handle file upload errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({ message: 'File upload error', error: err.message });
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ message: 'Server error during upload', error: err.message });
  }
  next();
};

// Create a new custom order - without file upload middleware for now
router.post("/create", (req, res) => {
  try {
  console.log('POST /custom-orders/create - Creating new custom order');

  // Log the raw request
  console.log('Request headers:', req.headers);
  console.log('Request files:', req.files);
  console.log('Request body (raw):', req.body);
  console.log('Request body (stringified):', JSON.stringify(req.body, null, 2));

  // Specifically log the supplier_id from the request body
  console.log('SUPPLIER DEBUG - supplier_id in request body:', req.body.supplier_id, 'type:', typeof req.body.supplier_id);

  // Get form data
  const {
    customer_name,
    customer_phone,
    customer_email,
    estimated_amount,
    profit_percentage,
    advance_amount,
    estimated_completion_date,
    category_id,
    supplier_id,
    description,
    special_requirements,
    created_by,
    branch_id
  } = req.body;

  console.log('Extracted form data:');
  console.log('- customer_name:', customer_name);
  console.log('- estimated_amount:', estimated_amount);
  console.log('- profit_percentage:', profit_percentage);
  console.log('- advance_amount:', advance_amount);
  console.log('- category_id:', category_id, typeof category_id);
  console.log('- supplier_id:', supplier_id, typeof supplier_id);
  console.log('- created_by:', created_by);
  console.log('- branch_id:', branch_id);

  // Validate required fields
  if (!customer_name || !estimated_amount) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Generate order reference (CUST-YYYY-XXXX)
  const year = new Date().getFullYear();
  const referencePrefix = `CUST-${year}-`;

  // Get the next sequence number
  const sequenceQuery = `
    SELECT MAX(SUBSTRING_INDEX(order_reference, '-', -1)) as max_seq
    FROM custom_orders
    WHERE order_reference LIKE ?
  `;

  con.query(sequenceQuery, [`${referencePrefix}%`], (err, results) => {
    if (err) {
      console.error("Error generating order reference:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    let nextSeq = 1;
    if (results[0].max_seq) {
      nextSeq = parseInt(results[0].max_seq) + 1;
    }

    const order_reference = `${referencePrefix}${nextSeq.toString().padStart(4, '0')}`;

    // Determine payment status
    let payment_status = 'Not Paid';
    if (advance_amount && parseFloat(advance_amount) > 0) {
      payment_status = parseFloat(advance_amount) >= parseFloat(estimated_amount) ? 'Fully Paid' : 'Partially Paid';
    }

    // Start transaction
    con.beginTransaction((transErr) => {
      if (transErr) {
        console.error("Error starting transaction:", transErr);
        return res.status(500).json({ message: "Database error", error: transErr.message });
      }

      // Insert the custom order
      const insertSql = `
        INSERT INTO custom_orders (
          order_reference,
          customer_name,
          customer_phone,
          customer_email,
          estimated_completion_date,
          estimated_amount,
          profit_percentage,
          advance_amount,
          order_status,
          payment_status,
          category_id,
          supplier_id,
          description,
          special_requirements,
          created_by,
          branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Convert numeric fields to their proper types
      const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;

      // Enhanced supplier_id parsing with detailed logging
      let parsedSupplierId = null;
      if (supplier_id) {
        console.log('SUPPLIER DEBUG - Raw supplier_id received:', supplier_id, 'type:', typeof supplier_id);

        // Simple direct parsing - convert to number
        if (typeof supplier_id === 'number') {
          parsedSupplierId = supplier_id;
        } else if (typeof supplier_id === 'string') {
          // Try to parse as integer
          parsedSupplierId = parseInt(supplier_id, 10);

          // If parsing fails, try to extract a number from the string
          if (isNaN(parsedSupplierId)) {
            const matches = supplier_id.match(/\d+/);
            if (matches && matches.length > 0) {
              parsedSupplierId = parseInt(matches[0], 10);
              console.log('SUPPLIER DEBUG - Extracted number from string:', parsedSupplierId);
            }
          }
        }

        // Final validation
        if (isNaN(parsedSupplierId) || parsedSupplierId <= 0) {
          console.error('SUPPLIER DEBUG - Invalid supplier_id, setting to null');
          parsedSupplierId = null;
        } else {
          console.log('SUPPLIER DEBUG - Final parsed supplier_id:', parsedSupplierId, 'type:', typeof parsedSupplierId);
        }
      }

      console.log('SUPPLIER DEBUG - Final supplier_id for database:', parsedSupplierId, 'from original:', supplier_id);

      const parsedCreatedBy = created_by ? parseInt(created_by, 10) : null;
      const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;

      // Ensure profit percentage is within limits (max 15%)
      // Use the exact value provided, or null if not provided (to use database default)
      let parsedProfitPercentage = null;
      if (profit_percentage !== undefined && profit_percentage !== '') {
        parsedProfitPercentage = Math.min(parseFloat(profit_percentage), 15);
      }

      console.log('Profit percentage:', profit_percentage, 'Parsed profit percentage:', parsedProfitPercentage);

      const insertParams = [
        order_reference,
        customer_name,
        customer_phone || null,
        customer_email || null,
        estimated_completion_date || null,
        parseFloat(estimated_amount),
        parsedProfitPercentage,
        parseFloat(advance_amount) || 0,
        'Pending',
        payment_status,
        parsedCategoryId,
        parsedSupplierId,
        description || '',
        special_requirements || '',
        parsedCreatedBy,
        parsedBranchId
      ];

      console.log('Parsed supplier_id:', parsedSupplierId, 'from original:', supplier_id);

      console.log('Insert parameters:', insertParams);

      con.query(insertSql, insertParams, (insertErr, insertResult) => {
        if (insertErr) {
          return con.rollback(() => {
            console.error("Error creating custom order:", insertErr);
            console.error("SQL query:", insertSql);
            console.error("Parameters:", insertParams);
            res.status(500).json({
              message: "Database error",
              error: insertErr.message,
              sqlState: insertErr.sqlState,
              sqlCode: insertErr.code,
              sqlNumber: insertErr.errno
            });
          });
        }

        const orderId = insertResult.insertId;

        // If advance payment was made, record it
        if (advance_amount && parseFloat(advance_amount) > 0) {
          const paymentSql = `
            INSERT INTO custom_order_payments (
              order_id,
              payment_amount,
              payment_method,
              notes
            ) VALUES (?, ?, ?, ?)
          `;

          con.query(paymentSql, [
            orderId,
            parseFloat(advance_amount),
            'Cash', // Default payment method
            'Initial advance payment'
          ], (paymentErr) => {
            if (paymentErr) {
              return con.rollback(() => {
                console.error("Error recording advance payment:", paymentErr);
                res.status(500).json({ message: "Database error", error: paymentErr.message });
              });
            }

            // Skip image processing for now
            console.log('Skipping image processing for testing');

            // Commit transaction directly
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
        } else {
          // No advance payment, skip image processing
          console.log('No advance payment, skipping image processing for testing');

          // Commit transaction directly
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
  });
  } catch (error) {
    console.error('Unexpected error in custom order creation:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Update custom order status
router.put("/:id/status", (req, res) => {
  const orderId = req.params.id;
  const { order_status, supplier_notes } = req.body;

  console.log(`PUT /custom-orders/${orderId}/status - Updating custom order status`);
  console.log('Request body:', req.body);

  if (!order_status) {
    console.log('Missing order_status in request body');
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

  console.log('Executing SQL query:', sql);
  console.log('With parameters:', params);

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating order status:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log('Query result:', result);

    if (result.affectedRows === 0) {
      console.log(`No order found with ID ${orderId}`);
      return res.status(404).json({ message: "Custom order not found" });
    }

    console.log(`Successfully updated order ${orderId} status to ${order_status}`);

    res.json({
      message: "Order status updated successfully",
      order_id: orderId,
      order_status,
      supplier_notes: supplier_notes || null
    });
  });
});

// Add payment to custom order
router.post("/:id/payments", (req, res) => {
  const orderId = req.params.id;
  const { payment_amount, payment_method, payment_reference, notes } = req.body;

  if (!payment_amount || parseFloat(payment_amount) <= 0) {
    return res.status(400).json({ message: "Invalid payment amount" });
  }

  // Start transaction
  con.beginTransaction((transErr) => {
    if (transErr) {
      console.error("Error starting transaction:", transErr);
      return res.status(500).json({ message: "Database error", error: transErr.message });
    }

    // First, check the number of existing payments to enforce the 3-payment limit
    const checkPaymentCountSql = `
      SELECT
        COUNT(*) as payment_count,
        (SELECT estimated_amount FROM custom_orders WHERE order_id = ?) as estimated_amount,
        (
          SELECT SUM(payment_amount)
          FROM custom_order_payments
          WHERE order_id = ?
        ) as existing_payments,
        (
          SELECT SUM(advance_amount)
          FROM advance_payments
          WHERE order_id = ? AND is_custom_order = 1
        ) as existing_advance_payments
    `;

    con.query(checkPaymentCountSql, [orderId, orderId, orderId], (countErr, countResults) => {
      if (countErr) {
        return con.rollback(() => {
          console.error("Error checking payment count:", countErr);
          res.status(500).json({ message: "Database error", error: countErr.message });
        });
      }

      const paymentCount = countResults[0].payment_count || 0;
      const estimatedAmount = parseFloat(countResults[0].estimated_amount || 0);
      const existingPayments = parseFloat(countResults[0].existing_payments || 0);
      const existingAdvancePayments = parseFloat(countResults[0].existing_advance_payments || 0);

      // Calculate total existing payments from both tables
      const totalExistingPayments = existingPayments + existingAdvancePayments;

      // Check if this would exceed the 3-payment limit
      if (paymentCount >= 3) {
        return con.rollback(() => {
          res.status(400).json({
            message: "Payment limit reached. Custom orders can only have a maximum of 3 payments.",
            payment_count: paymentCount
          });
        });
      }

      // Insert payment into custom_order_payments
      const paymentSql = `
        INSERT INTO custom_order_payments (
          order_id,
          payment_amount,
          payment_method,
          payment_reference,
          notes
        ) VALUES (?, ?, ?, ?, ?)
      `;

      con.query(paymentSql, [
        orderId,
        parseFloat(payment_amount),
        payment_method || 'Cash',
        payment_reference || null,
        notes || null
      ], (paymentErr, paymentResult) => {
        if (paymentErr) {
          return con.rollback(() => {
            console.error("Error adding payment:", paymentErr);
            res.status(500).json({ message: "Database error", error: paymentErr.message });
          });
        }

        // Get current order details
        const orderSql = `
          SELECT order_id, customer_name, estimated_amount, advance_amount, created_by, branch_id
          FROM custom_orders
          WHERE order_id = ?
        `;

        con.query(orderSql, [orderId], (orderErr, orderResults) => {
          if (orderErr) {
            return con.rollback(() => {
              console.error("Error fetching order details:", orderErr);
              res.status(500).json({ message: "Database error", error: orderErr.message });
            });
          }

          if (orderResults.length === 0) {
            return con.rollback(() => {
              res.status(404).json({ message: "Custom order not found" });
            });
          }

          const order = orderResults[0];

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

            // Calculate total payments for this order from BOTH tables
            const getTotalPaymentsSql = `
              SELECT
                (
                  SELECT COALESCE(SUM(payment_amount), 0)
                  FROM custom_order_payments
                  WHERE order_id = ?
                ) +
                (
                  SELECT COALESCE(SUM(advance_amount), 0)
                  FROM advance_payments
                  WHERE order_id = ? AND is_custom_order = 1
                ) as total_payments
            `;

            con.query(getTotalPaymentsSql, [orderId, orderId], (totalErr, totalResults) => {
              if (totalErr) {
                return con.rollback(() => {
                  console.error("Error calculating total payments:", totalErr);
                  res.status(500).json({ message: "Database error", error: totalErr.message });
                });
              }

              // Calculate the correct total payments including the new payment
              const totalPayments = parseFloat(totalResults[0].total_payments || 0);

              // Get profit percentage to calculate total amount with profit
              const getProfitSql = `SELECT profit_percentage FROM custom_orders WHERE order_id = ?`;

              con.query(getProfitSql, [orderId], (profitErr, profitResults) => {
                if (profitErr) {
                  return con.rollback(() => {
                    console.error("Error getting profit percentage:", profitErr);
                    res.status(500).json({ message: "Database error", error: profitErr.message });
                  });
                }

                // Use the actual profit percentage from the database without defaulting
                const profitPercentage = profitResults[0]?.profit_percentage;
                // Calculate total amount with profit only if profit percentage exists
                const totalAmountWithProfit = profitPercentage
                  ? parseFloat(order.estimated_amount) * (1 + (profitPercentage / 100))
                  : parseFloat(order.estimated_amount); // No profit if no percentage
                const balance_amount = totalAmountWithProfit - totalPayments;
                const payment_status = balance_amount <= 0 ? 'Fully Paid' : 'Partially Paid';

                console.log(`Order ${orderId} - Estimated: ${order.estimated_amount}, Profit: ${profitPercentage}%, Total with profit: ${totalAmountWithProfit}, Payments: ${totalPayments}, Balance: ${balance_amount}`);

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
                  order.customer_name,
                  totalAmountWithProfit, // Use total amount with profit
                  parseFloat(payment_amount),
                  balance_amount,
                  payment_status,
                  payment_method || 'Cash',
                  notes || 'Additional payment for custom order',
                  order.created_by,
                  order.branch_id,
                  1, // is_custom_order = true
                  orderId
                ], (advPayErr) => {
                  if (advPayErr) {
                    return con.rollback(() => {
                      console.error("Error creating advance payment:", advPayErr);
                      res.status(500).json({ message: "Database error", error: advPayErr.message });
                    });
                  }

                  // Update the order with the new advance amount and payment status
                  const updateSql = `
                    UPDATE custom_orders
                    SET advance_amount = ?,
                        payment_status = ?
                    WHERE order_id = ?
                  `;

                  con.query(updateSql, [totalPayments, payment_status, orderId], (updateErr, updateResult) => {
                    if (updateErr) {
                      return con.rollback(() => {
                        console.error("Error updating order:", updateErr);
                        res.status(500).json({ message: "Database error", error: updateErr.message });
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
                        message: "Payment added successfully",
                        payment_id: paymentResult.insertId,
                        new_advance_amount: totalPayments,
                        payment_status: payment_status,
                        balance_amount: balance_amount,
                        payment_count: paymentCount + 1,
                        remaining_payments: Math.max(0, 3 - (paymentCount + 1))
                      });
                    });
                  });
                });
              });
            });
            });
          });
        });
      });
    });
  });
});

// Add materials to custom order
router.post("/:id/materials", (req, res) => {
  const orderId = req.params.id;
  const materials = req.body.materials;

  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    return res.status(400).json({ message: "Invalid materials data" });
  }

  // Prepare batch insert values
  const materialValues = materials.map(material => [
    orderId,
    material.material_name,
    parseFloat(material.quantity),
    material.unit || 'g',
    material.cost_per_unit ? parseFloat(material.cost_per_unit) : null,
    material.total_cost ? parseFloat(material.total_cost) : null,
    material.supplier_id || null
  ]);

  const sql = `
    INSERT INTO custom_order_materials (
      order_id,
      material_name,
      quantity,
      unit,
      cost_per_unit,
      total_cost,
      supplier_id
    ) VALUES ?
  `;

  con.query(sql, [materialValues], (err, result) => {
    if (err) {
      console.error("Error adding materials:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.status(201).json({
      message: "Materials added successfully",
      materials_added: result.affectedRows
    });
  });
});

// Debug endpoint to see all payments for an order
router.get("/debug/payments/:orderId", (req, res) => {
  const orderId = req.params.orderId;

  const sql = `
    SELECT 'custom_order_payments' as source, payment_id, payment_amount as amount, payment_date, payment_method, notes
    FROM custom_order_payments
    WHERE order_id = ?

    UNION ALL

    SELECT 'advance_payments' as source, payment_id, advance_amount as amount, payment_date, payment_method, notes
    FROM advance_payments
    WHERE order_id = ? AND is_custom_order = 1

    ORDER BY payment_date
  `;

  con.query(sql, [orderId, orderId], (err, results) => {
    if (err) {
      console.error("Error fetching payment details:", err);
      return res.status(500).json({ error: err.message });
    }

    // Calculate totals
    let totalPaid = 0;
    results.forEach(payment => {
      totalPaid += parseFloat(payment.amount);
    });

    // Get order details
    const orderSql = `SELECT order_id, order_reference, customer_name, estimated_amount FROM custom_orders WHERE order_id = ?`;
    con.query(orderSql, [orderId], (orderErr, orderResults) => {
      if (orderErr) {
        console.error("Error fetching order details:", orderErr);
        return res.status(500).json({ error: orderErr.message });
      }

      const order = orderResults[0] || {};
      const estimatedAmount = order.estimated_amount || 0;
      const remainingBalance = estimatedAmount - totalPaid;

      res.json({
        order: order,
        payments: results,
        totalPaid: totalPaid,
        estimatedAmount: estimatedAmount,
        remainingBalance: remainingBalance,
        paymentCount: results.length
      });
    });
  });
});

// Get categories with supplier data for graph
router.get("/categories/suppliers", (req, res) => {
  const sql = `
    SELECT
      c.category_id,
      c.category_name,
      s.supplier_id,
      s.supplier_name,
      COUNT(DISTINCT co.order_id) as order_count
    FROM
      categories c
    LEFT JOIN
      custom_orders co ON c.category_id = co.category_id
    LEFT JOIN
      custom_order_materials com ON co.order_id = com.order_id
    LEFT JOIN
      suppliers s ON com.supplier_id = s.supplier_id
    GROUP BY
      c.category_id, s.supplier_id
    ORDER BY
      c.category_name, s.supplier_name
  `;

  con.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching category-supplier data:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Process data for graph
    const categories = {};

    results.forEach(row => {
      if (!categories[row.category_name]) {
        categories[row.category_name] = {
          category_id: row.category_id,
          category_name: row.category_name,
          suppliers: []
        };
      }

      if (row.supplier_id) {
        categories[row.category_name].suppliers.push({
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          order_count: row.order_count
        });
      }
    });

    res.json(Object.values(categories));
  });
});

// Send payment reminder for a custom order
router.post("/:id/send-reminder", async (req, res) => {
  const orderId = req.params.id;

  console.log(`POST /custom-orders/${orderId}/send-reminder - Sending payment reminder email`);

  // Get the order details with customer email
  console.log(`Fetching order details for order ID: ${orderId} for email reminder`);
  const sql = `
    SELECT co.*,
           co.customer_email as customer_email,
           co.order_id as order_id,
           co.customer_name as customer_name,
           co.estimated_amount as estimated_amount,
           co.advance_amount as advance_amount,
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
    console.log("Found order:", order);

    // Check if customer email exists
    if (!order.customer_email) {
      console.log("No customer email found for order:", orderId);
      return res.status(400).json({
        success: false,
        message: "Customer email not available for this order"
      });
    }

    console.log("Customer email found:", order.customer_email);

    try {
      console.log(`Attempting to send email to ${order.customer_email}`);

      // Check if sendCustomOrderPaymentReminder is defined
      if (typeof sendCustomOrderPaymentReminder !== 'function') {
        console.error("sendCustomOrderPaymentReminder is not a function:", sendCustomOrderPaymentReminder);
        return res.status(500).json({
          success: false,
          message: "Email service not properly initialized"
        });
      }

      // Send the reminder email
      console.log("Calling sendCustomOrderPaymentReminder with order:", order.order_id);
      const emailResult = await sendCustomOrderPaymentReminder(order, order.customer_email);
      console.log("Email sending result:", emailResult);

      if (emailResult.success) {
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
            } else {
              console.log(`Email log saved to database (${isMockEmail ? 'mock' : 'real'} email)`);
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

        console.log("Email sending result:", {
          success: true,
          isMock: isMockEmail,
          message: message,
          messageId: emailResult.messageId
        });

        return res.status(200).json({
          success: true,
          message: message,
          messageId: emailResult.messageId,
          isMockEmail: isMockEmail
        });
      } else {
        console.error("Email sending failed:", emailResult.error);
        return res.status(500).json({
          success: false,
          message: "Failed to send payment reminder email",
          error: emailResult.error
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

// Test endpoint for email service
router.post("/test-email", async (req, res) => {
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
    console.log("Sending test email to:", testOrder.customer_email);
    const emailResult = await sendCustomOrderPaymentReminder(testOrder, testOrder.customer_email);
    console.log("Test email result:", emailResult);

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

// Get completed custom orders for store manager dashboard
router.get("/completed", (req, res) => {
  console.log('GET /custom-orders/completed - Fetching completed custom orders');

  // Get branch_id from query parameters
  const branchId = req.query.branch_id;

  if (!branchId) {
    return res.status(400).json({ message: "Branch ID is required" });
  }

  // SQL query to get completed custom orders for the specified branch
  const sql = `
    SELECT
      co.*,
      c.category_name,
      s.supplier_name,
      b.branch_name
    FROM
      custom_orders co
    LEFT JOIN
      categories c ON co.category_id = c.category_id
    LEFT JOIN
      suppliers s ON co.supplier_id = s.supplier_id
    LEFT JOIN
      branches b ON co.branch_id = b.branch_id
    WHERE
      co.order_status = 'Completed'
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

// Send order completion notification to customer
router.post("/:id/send-completion-notification", async (req, res) => {
  const orderId = req.params.id;
  const { pickup_location } = req.body;

  console.log(`POST /custom-orders/${orderId}/send-completion-notification - Sending completion notification email`);

  // Get the order details with customer email
  const sql = `
    SELECT co.*,
           co.customer_email as customer_email,
           co.order_id as order_id,
           co.customer_name as customer_name,
           co.estimated_amount as estimated_amount,
           co.advance_amount as advance_amount,
           co.order_date as order_date,
           co.estimated_completion_date as estimated_completion_date,
           b.branch_name,
           b.branch_address,
           b.branch_phone
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
    console.log("Found order:", order);

    // Check if customer email exists
    if (!order.customer_email) {
      console.log("No customer email found for order:", orderId);
      return res.status(400).json({
        success: false,
        message: "Customer email not available for this order"
      });
    }

    console.log("Customer email found:", order.customer_email);

    try {
      console.log(`Attempting to send completion notification to ${order.customer_email}`);

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
      const totalAmount = Number(order.estimated_amount) || 0;
      const paidAmount = Number(order.advance_amount) || 0;
      const remainingBalance = totalAmount - paidAmount;
      order.remaining_balance = remainingBalance;

      // Send the completion notification email
      console.log("Calling sendOrderStatusUpdate with order:", order.order_id);
      const emailResult = await sendOrderStatusUpdate(order, order.customer_email, 'Completed');
      console.log("Email sending result:", emailResult);

      if (emailResult.success) {
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
            } else {
              console.log(`Email log saved to database (${isMockEmail ? 'mock' : 'real'} email)`);
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

        console.log("Email sending result:", {
          success: true,
          isMock: isMockEmail,
          message: message,
          messageId: emailResult.messageId
        });

        return res.status(200).json({
          success: true,
          message: message,
          messageId: emailResult.messageId,
          isMockEmail: isMockEmail
        });
      } else {
        console.error("Email sending failed:", emailResult.error);
        return res.status(500).json({
          success: false,
          message: "Failed to send completion notification email",
          error: emailResult.error
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

// Mark a custom order as picked up
router.put("/:id/mark-as-picked-up", (req, res) => {
  const orderId = req.params.id;
  const { pickup_notes } = req.body;

  console.log(`PUT /custom-orders/${orderId}/mark-as-picked-up - Marking order as picked up`);
  console.log('Request body:', req.body);

  // First, check if the order exists and is in "Completed" status
  const checkSql = `
    SELECT order_id, order_status, customer_name, customer_email
    FROM custom_orders
    WHERE order_id = ?
  `;

  con.query(checkSql, [orderId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking order status:", checkErr);
      return res.status(500).json({ message: "Database error", error: checkErr.message });
    }

    if (checkResults.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = checkResults[0];

    if (order.order_status !== 'Completed') {
      return res.status(400).json({
        message: "Order must be in 'Completed' status to be marked as picked up",
        current_status: order.order_status
      });
    }

    // Update the order status to "Picked Up" and set the pickup date
    const updateSql = `
      UPDATE custom_orders
      SET
        order_status = 'Picked Up',
        pickup_date = NOW(),
        pickup_notes = ?
      WHERE order_id = ?
    `;

    con.query(updateSql, [pickup_notes || null, orderId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Error updating order status:", updateErr);
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(500).json({ message: "Failed to update order status" });
      }

      // Return success response
      res.json({
        success: true,
        message: "Order marked as picked up successfully",
        order_id: orderId,
        pickup_date: new Date(),
        customer_name: order.customer_name
      });
    });
  });
});

// Get completed custom orders for store manager dashboard
router.get("/completed-orders", (req, res) => {
  console.log('GET /custom-orders/completed-orders - Fetching completed custom orders');

  // Get query parameters
  const branchId = req.query.branch_id;
  const includePickedUp = req.query.include_picked_up === 'true';

  let sql = `
    SELECT * FROM custom_order_details
    WHERE order_status = 'Completed'
  `;

  // Optionally include picked up orders
  if (includePickedUp) {
    sql = `
      SELECT * FROM custom_order_details
      WHERE order_status IN ('Completed', 'Picked Up')
    `;
  }

  // Add branch filter if provided
  const queryParams = [];
  if (branchId) {
    sql += ' AND branch_id = ?';
    queryParams.push(branchId);
  }

  // Add ORDER BY clause - newest first
  sql += ' ORDER BY order_date DESC';

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching completed custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results || []);
  });
});

export { router as customOrderRouter };