const express = require('express');
const con = require('../utils/db.js');
const { generateOrderReference } = require('../utils/referenceGenerator.js');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

// Determine which email service to use (real or mock)
let sendCustomOrderPaymentReminder = () => { throw new Error("Email service not initialized"); };
let sendOrderStatusUpdate = () => { throw new Error("Email service not initialized"); };

// Use a regular promise instead of an IIFE with async/await
Promise.resolve().then(() => {
  let emailService;
  try {
    // Force use of real email service since we know nodemailer is installed
    console.log("Using real email service");
    return import('../utils/emailService.js');
  } catch (e) {
    console.error("Error importing email service:", e);

    // Fallback to mock service if there's an error
    try {
      console.log("Falling back to mock email service");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const mockServicePath = path.join(__dirname, '..', 'utils', 'mockEmailService.js');

      if (!fs.existsSync(mockServicePath)) {
        console.log("Mock email service not found, please create it manually");
      }

      return import('../utils/mockEmailService.js');
    } catch (mockError) {
      console.error("Error importing mock email service:", mockError);
      // If both fail, we'll get an error when trying to use sendCustomOrderPaymentReminder
      return null;
    }
  }
}).then(emailService => {
  if (emailService) {
    sendCustomOrderPaymentReminder = emailService.sendCustomOrderPaymentReminder;
    sendOrderStatusUpdate = emailService.sendOrderStatusUpdate;
  }
}).catch(err => {
  console.error("Error initializing email service:", err);
});

const router = express.Router();

// Create a new custom order without file upload
router.post("/create", (req, res) => {
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
    branch_id
  } = req.body;

  // Log the raw form data for debugging
  console.log('Raw form data keys:', Object.keys(req.body));
  console.log('Raw supplier_id from form:', req.body.supplier_id, 'type:', typeof req.body.supplier_id);
  console.log('Full request body:', JSON.stringify(req.body, null, 2));

  // Log each field individually for debugging
  console.log('Extracted fields:');
  console.log('customer_name:', customer_name);
  console.log('customer_phone:', customer_phone);
  console.log('customer_email:', customer_email);
  console.log('estimated_amount:', estimated_amount);
  console.log('profit_percentage:', profit_percentage);
  console.log('quantity:', quantity);
  console.log('advance_amount:', advance_amount);
  console.log('estimated_completion_date:', estimated_completion_date);
  console.log('category_id:', category_id, 'type:', typeof category_id);
  console.log('supplier_id:', supplier_id, 'type:', typeof supplier_id);
  console.log('description:', description);
  console.log('special_requirements:', special_requirements);
  console.log('created_by:', created_by);
  console.log('branch_id:', branch_id);

  // Validate required fields
  if (!customer_name || !estimated_amount) {
    return res.status(400).json({ message: "Customer name and estimated amount are required" });
  }

  // Generate order reference
  const order_reference = generateOrderReference('CUST');
  console.log('Generated order reference:', order_reference);

  // Calculate total amount with profit
  const parsedEstimatedAmount = parseFloat(estimated_amount);
  const parsedProfitPercentage = profit_percentage ? Math.min(parseFloat(profit_percentage), 15) : 0;
  const parsedQuantity = quantity ? parseInt(quantity, 10) : 1;

  console.log(`Calculating total amount: Estimated: ${parsedEstimatedAmount}, Profit: ${parsedProfitPercentage}%, Quantity: ${parsedQuantity}`);

  // Calculate profit amount
  const profitAmount = parsedEstimatedAmount * (parsedProfitPercentage / 100);

  // Calculate price per unit (estimated amount + profit)
  const pricePerUnit = parsedEstimatedAmount + profitAmount;

  // Calculate total amount (price per unit * quantity)
  const totalAmount = pricePerUnit * parsedQuantity;

  console.log(`Calculated values: Profit Amount: ${profitAmount}, Price Per Unit: ${pricePerUnit}, Total Amount: ${totalAmount}`);

  // Determine payment status based on total amount
  const parsedAdvanceAmount = parseFloat(advance_amount) || 0;
  const payment_status = parsedAdvanceAmount > 0
    ? (parsedAdvanceAmount >= totalAmount ? 'Fully Paid' : 'Partially Paid')
    : 'Not Paid';

  console.log('Payment status:', payment_status);

  // First, verify the supplier exists if a supplier_id was provided
  // Convert numeric fields to their proper types
  const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;

  // Simplified supplier_id parsing - both tables use INT for supplier_id
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

  const parsedCreatedBy = created_by ? parseInt(created_by, 10) : null;
  const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;

  console.log('SUPPLIER DEBUG - Final supplier_id for database:', parsedSupplierId, 'from original:', supplier_id);

  // First, verify the supplier exists if a supplier_id was provided
  if (parsedSupplierId !== null) {
    // Make sure we're using the correct column name from the suppliers table
    con.query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [parsedSupplierId], (err, results) => {
      if (err) {
        console.error('SUPPLIER DEBUG - Error checking supplier existence:', err);
        // Continue with the transaction but log the error
        proceedWithTransaction();
      } else if (results.length === 0) {
        console.error(`SUPPLIER DEBUG - Supplier with ID ${parsedSupplierId} does not exist in database`);
        // If supplier doesn't exist, set to null to avoid foreign key constraint errors
        parsedSupplierId = null;
        console.log('SUPPLIER DEBUG - Set supplier_id to null because supplier not found');
        proceedWithTransaction();
      } else {
        console.log(`SUPPLIER DEBUG - Verified supplier with ID ${parsedSupplierId} exists in database`);
        // Double check the actual supplier_id from the database to ensure it matches
        const verifiedSupplierId = results[0].supplier_id;
        console.log(`SUPPLIER DEBUG - Database returned supplier_id: ${verifiedSupplierId}`);

        // Use the verified supplier_id from the database
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

      // Insert order
      // Construct SQL query with explicit column values for debugging
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
          branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Log the SQL query for debugging
      console.log('SQL Query:', insertSql);

      // Ensure profit percentage is within limits (max 15%)
      let parsedProfitPercentage = null;
      if (profit_percentage !== undefined && profit_percentage !== '') {
        parsedProfitPercentage = Math.min(parseFloat(profit_percentage), 15);
      }

      console.log('Profit percentage:', profit_percentage, 'Parsed profit percentage:', parsedProfitPercentage);

      // Parse quantity (default to 1 if not provided)
      const parsedQuantity = quantity ? parseInt(quantity, 10) : 1;
      console.log('Quantity:', quantity, 'Parsed quantity:', parsedQuantity);

      // Store the estimated amount per unit (not multiplied by quantity)
      const estimatedAmountPerUnit = parseFloat(estimated_amount);
      console.log('Estimated amount per unit:', estimatedAmountPerUnit);

      // Calculate the customer price ((estimated amount + profit) * quantity)
      const profitAmount = estimatedAmountPerUnit * (parsedProfitPercentage / 100);
      const pricePerUnit = estimatedAmountPerUnit + profitAmount;
      const customerPrice = pricePerUnit * parsedQuantity;
      console.log('Customer price:', customerPrice);

      // Calculate the total supplier cost (for reference only)
      const totalSupplierCost = estimatedAmountPerUnit * parsedQuantity;
      console.log('Total supplier cost:', totalSupplierCost);

      const insertParams = [
        order_reference,
        customer_name,
        customer_phone || null,
        customer_email || null,
        estimated_completion_date || null,
        estimatedAmountPerUnit, // Store the estimated amount per unit (not multiplied by quantity)
        parsedProfitPercentage,
        parsedQuantity,
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

      console.log('Insert parameters:', insertParams);

      // Log each parameter individually for clarity
      console.log('Parameter details:');
      console.log('1. order_reference:', insertParams[0]);
      console.log('2. customer_name:', insertParams[1]);
      console.log('3. customer_phone:', insertParams[2]);
      console.log('4. customer_email:', insertParams[3]);
      console.log('5. estimated_completion_date:', insertParams[4]);
      console.log('6. estimated_amount:', insertParams[5]);
      console.log('7. profit_percentage:', insertParams[6]);
      console.log('8. advance_amount:', insertParams[7]);
      console.log('9. order_status:', insertParams[8]);
      console.log('10. payment_status:', insertParams[9]);
      console.log('11. category_id:', insertParams[10]);
      console.log('12. supplier_id:', insertParams[11], 'type:', typeof insertParams[11]);
      console.log('13. description:', insertParams[12]);
      console.log('14. special_requirements:', insertParams[13]);
      console.log('15. created_by:', insertParams[14]);
      console.log('16. branch_id:', insertParams[15]);

      // Enhanced debugging for supplier_id
      console.log('SUPPLIER DEBUG - Final supplier_id being inserted:', parsedSupplierId, 'type:', typeof parsedSupplierId);

      // Create a copy of the parameters for logging
      const paramsCopy = [...insertParams];

      // Log each parameter with its position and value
      console.log('SUPPLIER DEBUG - All parameters being inserted:');
      paramsCopy.forEach((param, index) => {
        console.log(`Param ${index + 1}: ${param === null ? 'NULL' : param} (${typeof param})`);
      });

      // Log the SQL query with actual values for debugging
      let debugSql = insertSql;
      paramsCopy.forEach((param) => {
        if (param === null) {
          debugSql = debugSql.replace('?', 'NULL');
        } else {
          debugSql = debugSql.replace('?', typeof param === 'string' ? `'${param}'` : param);
        }
      });
      console.log('SUPPLIER DEBUG - Complete SQL with values:');
      console.log(debugSql);

      // Try to execute the query with detailed error handling
      con.query(insertSql, insertParams, (insertErr, insertResult) => {
        if (insertErr) {
          return con.rollback(() => {
            console.error("Error creating custom order:", insertErr);
            console.error("SQL query:", insertSql);
            console.error("Parameters:", insertParams);

            // Log more detailed error information
            console.error("Error code:", insertErr.code);
            console.error("Error number:", insertErr.errno);
            console.error("SQL state:", insertErr.sqlState);
            console.error("SQL message:", insertErr.message);

            // Check for specific error types
            if (insertErr.code === 'ER_BAD_NULL_ERROR') {
              console.error("NULL value error - check which column doesn't allow NULL");
            } else if (insertErr.code === 'ER_NO_REFERENCED_ROW_2') {
              console.error("Foreign key constraint error - supplier_id might not exist in suppliers table");
            }

            res.status(500).json({
              message: "Database error",
              error: insertErr.message,
              sqlState: insertErr.sqlState,
              sqlCode: insertErr.code,
              sqlNumber: insertErr.errno,
              sqlMessage: insertErr.message
            });
          });
        }

        const orderId = insertResult.insertId;
        console.log('Order created with ID:', orderId);

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

              // Calculate balance amount based on customer price (with profit)
              // Calculate the customer price ((estimated amount + profit) * quantity)
              const parsedEstimatedAmount = parseFloat(estimated_amount);
              const parsedProfitPercentage = profit_percentage ? Math.min(parseFloat(profit_percentage), 15) : 0;
              const parsedQuantity = quantity ? parseInt(quantity, 10) : 1;

              console.log(`Advance payment calculation: Estimated: ${parsedEstimatedAmount}, Profit: ${parsedProfitPercentage}%, Quantity: ${parsedQuantity}`);

              // Calculate profit amount
              const profitAmount = parsedEstimatedAmount * (parsedProfitPercentage / 100);

              // Calculate price per unit (estimated amount + profit)
              const pricePerUnit = parsedEstimatedAmount + profitAmount;

              // Calculate total amount (price per unit * quantity)
              const customerPrice = pricePerUnit * parsedQuantity;

              // Calculate balance amount (customer price - advance amount)
              const balance_amount = customerPrice - parseFloat(advance_amount);
              const payment_status = balance_amount <= 0 ? 'Completed' : 'Partially Paid';

              console.log('Price per unit:', pricePerUnit);
              console.log('Customer price (with quantity):', customerPrice);
              console.log('Advance amount:', parseFloat(advance_amount));
              console.log('Balance amount:', balance_amount);

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

              // Log the values being inserted into advance_payments
              console.log('Advance payment values:');
              console.log('- payment_reference:', payment_reference);
              console.log('- customer_name:', customer_name);
              console.log('- total_amount:', customerPrice);
              console.log('- advance_amount:', parseFloat(advance_amount));
              console.log('- balance_amount:', balance_amount);
              console.log('- payment_status:', payment_status);
              console.log('- created_by:', parsedCreatedBy);
              console.log('- branch_id:', parsedBranchId);
              console.log('- order_id:', orderId);

              con.query(advancePaymentSql, [
                payment_reference,
                customer_name,
                customerPrice, // Use customer price (with profit and quantity) as total amount
                parseFloat(advance_amount),
                balance_amount,
                payment_status,
                'Cash', // Default payment method
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

  console.log('Executing SQL query for completed custom orders:', sql);
  console.log('With parameters:', [branchId]);
  console.log('Including picked up orders:', includePickedUp);

  con.query(sql, [branchId], (err, results) => {
    if (err) {
      console.error("Error fetching completed custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${results.length} completed custom orders`);
    if (results.length > 0) {
      console.log('Sample completed custom order:', results[0]);
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

  console.log(`Normalized role: '${userRole}', Branch ID: ${branchId || 'not provided'}`);

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

  if (userRole === 'admin' || userRole === '') {
    // Admin sees all orders, but can filter by branch if requested
    console.log('Admin role detected - showing all branches');
    if (filterByBranch && branchId) {
      sql += ` WHERE co.branch_id = ?`;
      queryParams.push(branchId);
      console.log(`Admin filtering by branch_id: ${branchId}`);
    }
  } else {
    // Non-admin users can see all orders, but default filter is their branch
    if (filterByBranch && branchId) {
      sql += ` WHERE co.branch_id = ?`;
      queryParams.push(branchId);
      console.log(`Non-admin role filtering by branch_id: ${branchId}`);
    } else {
      console.log('Non-admin role showing all branches');
    }
  }

  // Add ORDER BY clause
  sql += ` ORDER BY co.order_date DESC`;

  console.log('Executing SQL:', sql);
  console.log('With parameters:', queryParams);

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
          console.log(`Updating payment status for order ${order.order_id} from ${order.payment_status} to ${order.current_payment_status}`);

          // Update both payment_status and advance_amount if needed
          const updateSql = `UPDATE custom_orders SET payment_status = ?, advance_amount = ? WHERE order_id = ?`;
          const advanceAmount = order.total_paid || order.latest_advance_amount || order.advance_amount || 0;

          con.query(updateSql, [order.current_payment_status, advanceAmount, order.order_id], (updateErr) => {
            if (updateErr) {
              console.error(`Error updating payment status for order ${order.order_id}:`, updateErr);
            } else {
              console.log(`Successfully updated order ${order.order_id} payment status to ${order.current_payment_status} and advance amount to ${advanceAmount}`);
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

  console.log(`Fetching custom order ${orderId} for role: ${userRole}, branch: ${branchId || 'not provided'}`);

  // Prepare SQL query - all users can see any order details
  const orderSql = `
    SELECT * FROM custom_order_details
    WHERE order_id = ?
  `;
  const queryParams = [orderId];

  console.log(`Fetching order details for order ID: ${orderId}`);

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
                image.image_path = 'uploads/custom_orders/' + image.image_path.split('/').pop();
              } else {
                // If it's just a filename
                image.image_path = 'uploads/custom_orders/' + image.image_path;
              }
            }
            console.log('Processed image path:', image.image_path);
          }
          return image;
        });

        // Also process the images string in the main result
        if (results[0].images) {
          const imagesList = results[0].images.split(',');
          const processedImagesList = imagesList.map(imagePath => {
            if (imagePath && !imagePath.startsWith('uploads/')) {
              if (imagePath.includes('/')) {
                return 'uploads/custom_orders/' + imagePath.split('/').pop();
              } else {
                return 'uploads/custom_orders/' + imagePath;
              }
            }
            return imagePath;
          });
          results[0].images = processedImagesList.join(',');
          console.log('Processed images string:', results[0].images);
        }

        // Check if order is from a different branch than the user's branch
        const orderBranchId = results[0].branch_id;
        const isFromOtherBranch = userRole !== 'admin' && branchId && orderBranchId !== parseInt(branchId);

        if (isFromOtherBranch) {
          console.log(`Order ${orderId} is from branch ${orderBranchId}, user is from branch ${branchId}`);
        }

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

  console.log(`POST /custom-orders/${orderId}/send-reminder - Sending payment reminder email`);

  // First, get the payment history to get the accurate total paid amount
  console.log(`Fetching payment history for order ID: ${orderId} to get accurate payment information`);

  // Get the payment history
  const historySql = `
    SELECT
      COALESCE(SUM(ap.advance_amount), 0) as total_advance_payments
    FROM
      advance_payments ap
    WHERE
      ap.order_id = ? AND ap.is_custom_order = 1
  `;

  con.query(historySql, [orderId], async (historyErr, historyResults) => {
    if (historyErr) {
      console.error("Error fetching payment history:", historyErr);
      return res.status(500).json({ message: "Database error", error: historyErr.message });
    }

    const totalAdvancePayments = historyResults[0]?.total_advance_payments || 0;
    console.log(`Total advance payments for order ${orderId}: ${totalAdvancePayments}`);

    // Get the order details with customer email
    console.log(`Fetching order details for order ID: ${orderId} for email reminder`);
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
      console.log("Found order:", order);

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
      const emailResult = sendCustomOrderPaymentReminder(order, order.customer_email);
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
    console.log("Sending test email to:", testOrder.customer_email);
    const emailResult = sendCustomOrderPaymentReminder(testOrder, testOrder.customer_email);
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

// Send order completion notification to customer
router.post("/:id/send-completion-notification", async (req, res) => {
  const orderId = req.params.id;
  const { pickup_location } = req.body;

  console.log(`POST /custom-orders/${orderId}/send-completion-notification - Sending completion notification email`);

  // First, get the payment history to get the accurate total paid amount
  console.log(`Fetching payment history for order ID: ${orderId} to get accurate payment information`);

  // Get the payment history
  const historySql = `
    SELECT
      COALESCE(SUM(ap.advance_amount), 0) as total_advance_payments
    FROM
      advance_payments ap
    WHERE
      ap.order_id = ? AND ap.is_custom_order = 1
  `;

  con.query(historySql, [orderId], async (historyErr, historyResults) => {
    if (historyErr) {
      console.error("Error fetching payment history:", historyErr);
      return res.status(500).json({ message: "Database error", error: historyErr.message });
    }

    const totalAdvancePayments = historyResults[0]?.total_advance_payments || 0;
    console.log(`Total advance payments for order ${orderId}: ${totalAdvancePayments}`);

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
      console.log("Found order:", order);

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
        console.log("Calling sendOrderStatusUpdate with order:", order.order_id);
        const emailResult = sendOrderStatusUpdate(order, order.customer_email, 'Completed');
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
});

// Mark a custom order as picked up
router.put("/:id/mark-as-picked-up", (req, res) => {
  const orderId = req.params.id;
  const { pickup_notes } = req.body;

  console.log(`PUT /custom-orders/${orderId}/mark-as-picked-up - Marking custom order as picked up`);
  console.log('Request body:', req.body);

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

module.exports = router;
