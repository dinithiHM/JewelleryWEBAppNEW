import express from 'express';
import con from '../utils/db.js';
import { generateOrderReference } from '../utils/referenceGenerator.js';

// Determine which email service to use (real or mock)
let emailService;
try {
  // Force use of real email service since we know nodemailer is installed
  console.log("Using real email service for advance payments");
  emailService = await import('../utils/emailService.js');
} catch (e) {
  console.error("Error importing email service:", e);

  // Fallback to mock service if there's an error
  try {
    console.log("Falling back to mock email service for advance payments");
    emailService = await import('../utils/mockEmailService.js');
  } catch (mockError) {
    console.error("Error importing mock email service:", mockError);
    // If both fail, we'll get an error when trying to use sendCustomOrderPaymentReminder
  }
}

// Create a function for sending payment reminders for inventory items
const sendInventoryItemPaymentReminder = async (payment, customerEmail) => {
  // Use the existing sendCustomOrderPaymentReminder function but adapt it for inventory items
  const { sendCustomOrderPaymentReminder } = emailService;

  // Create a custom order-like object that the email function can use
  const orderLikeObject = {
    order_id: payment.payment_id,
    order_reference: payment.payment_reference,
    customer_name: payment.customer_name,
    estimated_amount: payment.total_amount,
    advance_amount: payment.advance_amount,
    order_date: payment.payment_date,
    estimated_completion_date: null,
    item_details: payment.item_name ? `${payment.item_name} (${payment.item_quantity || 1} item(s))` : 'Jewelry Item'
  };

  return sendCustomOrderPaymentReminder(orderLikeObject, customerEmail);
};

const router = express.Router();

// Get all advance payments
router.get("/", (req, res) => {
  console.log('GET /advance-payments - Fetching advance payments');

  // Get query parameters
  const { role, branch_id, status, grouped } = req.query;

  console.log('Query parameters:', { role, branch_id, status, grouped });

  // Start building the SQL query - use a subquery to get only the latest payment for each customer-order combination
  let sql = `
    SELECT ap.*
    FROM advance_payments ap
    INNER JOIN (
      SELECT
        CASE
          WHEN is_custom_order = 1 THEN CONCAT(customer_name, '-', order_id)
          ELSE CONCAT(customer_name, '-', item_id)
        END as unique_identifier,
        MAX(payment_id) as latest_payment_id
      FROM advance_payments
      GROUP BY unique_identifier
    ) latest ON ap.payment_id = latest.latest_payment_id
  `;
  const whereConditions = [];
  const params = [];

  // Add branch filter if applicable
  if (branch_id && role !== 'admin') {
    whereConditions.push('ap.branch_id = ?');
    params.push(branch_id);
  }

  // Add status filter if applicable
  if (status === 'outstanding') {
    // For custom orders, we need to check the status in the custom_orders table
    // For inventory items, we use the status in advance_payments
    whereConditions.push(`
      (
        (ap.is_custom_order = 1 AND EXISTS (
          SELECT 1 FROM custom_orders co
          WHERE co.order_id = ap.order_id
          AND co.payment_status != 'Fully Paid'
        ))
        OR
        (ap.is_custom_order = 0 AND ap.payment_status IN ('Pending', 'Partially Paid'))
      )
    `);
  } else if (status && status !== 'all') {
    whereConditions.push('ap.payment_status = ?');
    params.push(status);
  }

  // Combine where conditions if any
  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Add ordering
  sql += ' ORDER BY payment_date DESC';

  console.log('Executing SQL query:', sql);
  console.log('With parameters:', params);

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching advance payments:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${results ? results.length : 0} advance payments`);
    res.json(results || []);
  });
});

// Get payment history for a specific order
router.get("/history/order/:orderId", (req, res) => {
  const orderId = req.params.orderId;

  // First, get the order details to get the total amount
  const orderSql = `
    SELECT order_id, order_reference, customer_name, estimated_amount
    FROM custom_orders
    WHERE order_id = ?
  `;

  con.query(orderSql, [orderId], (orderErr, orderResults) => {
    if (orderErr) {
      console.error("Error fetching order details:", orderErr);
      return res.status(500).json({ message: "Database error", error: orderErr.message });
    }

    if (!orderResults || orderResults.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResults[0];

    // Now get all payments for this order
    const paymentsSql = `
      SELECT *
      FROM advance_payments
      WHERE order_id = ? AND is_custom_order = 1
      ORDER BY payment_date ASC
    `;

    con.query(paymentsSql, [orderId], (paymentsErr, paymentsResults) => {
      if (paymentsErr) {
        console.error("Error fetching payment history:", paymentsErr);
        return res.status(500).json({ message: "Database error", error: paymentsErr.message });
      }

      // Calculate total paid amount
      const totalPaid = paymentsResults.reduce((sum, payment) => sum + parseFloat(payment.advance_amount), 0);

      // Calculate remaining balance
      const remainingBalance = parseFloat(order.estimated_amount) - totalPaid;

      // Determine payment status
      let paymentStatus = "Pending";
      if (totalPaid >= parseFloat(order.estimated_amount)) {
        paymentStatus = "Completed";
      } else if (totalPaid > 0) {
        paymentStatus = "Partially Paid";
      }

      // Add running totals to each payment
      let runningTotal = 0;
      const paymentsWithRunningTotals = paymentsResults.map(payment => {
        runningTotal += parseFloat(payment.advance_amount);
        return {
          ...payment,
          running_total_paid: runningTotal,
          balance_after: parseFloat(order.estimated_amount) - runningTotal
        };
      });

      res.json({
        order_id: order.order_id,
        order_reference: order.order_reference,
        customer_name: order.customer_name,
        total_amount: parseFloat(order.estimated_amount),
        payments: paymentsWithRunningTotals,
        total_payments: paymentsResults.length,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        payment_status: paymentStatus
      });
    });
  });
});

// Get payment history for a customer
router.get("/history/customer/:customerName", (req, res) => {
  const customerName = req.params.customerName;

  const sql = `
    SELECT *
    FROM advance_payments
    WHERE customer_name = ?
    ORDER BY payment_date ASC
  `;

  con.query(sql, [customerName], (err, results) => {
    if (err) {
      console.error("Error fetching customer payment history:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${results.length} payments for customer ${customerName}`);
    res.json({
      customer_name: customerName,
      payments: results || [],
      total_payments: results.length,
      total_paid: results.reduce((sum, payment) => sum + parseFloat(payment.advance_amount), 0)
    });
  });
});

// Get payment history for an inventory item
router.get("/history/item/:itemId", (req, res) => {
  const itemId = req.params.itemId;
  const customerName = req.query.customer;

  console.log(`GET /advance-payments/history/item/${itemId} - Fetching payment history for item`);
  console.log(`Customer filter: ${customerName || 'none'}`);

  let sql = `
    SELECT *
    FROM advance_payments
    WHERE item_id = ? AND is_custom_order = 0
  `;

  const params = [itemId];

  // Add customer filter if provided
  if (customerName) {
    sql += ` AND customer_name = ?`;
    params.push(customerName);
  }

  // Add ordering
  sql += ` ORDER BY payment_date ASC`;

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching item payment history:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${results.length} payments for item ${itemId}`);

    // Calculate total amount and total paid
    let totalAmount = 0;
    let totalPaid = 0;

    if (results.length > 0) {
      // Use the total amount from the first payment record
      totalAmount = parseFloat(results[0].total_amount);

      // Sum up all advance amounts
      totalPaid = results.reduce((sum, payment) => sum + parseFloat(payment.advance_amount), 0);
    }

    // Calculate remaining balance
    const remainingBalance = totalAmount - totalPaid;

    res.json({
      item_id: itemId,
      customer_name: customerName,
      payments: results || [],
      total_payments: results.length,
      total_paid: totalPaid,
      total_amount: totalAmount,
      remaining_balance: remainingBalance
    });
  });
});

// Send payment reminder for an advance payment
router.post("/:id/send-reminder", async (req, res) => {
  const paymentId = req.params.id;

  console.log(`POST /advance-payments/${paymentId}/send-reminder - Sending payment reminder email`);

  // Get the payment details with customer email
  const sql = `
    SELECT ap.*, c.email as customer_email
    FROM advance_payments ap
    LEFT JOIN customers c ON ap.customer_name = c.name
    WHERE ap.payment_id = ?
  `;

  con.query(sql, [paymentId], async (err, results) => {
    if (err) {
      console.error("Error fetching payment details:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const payment = results[0];

    // Check if we have a customer email
    if (!payment.customer_email) {
      return res.status(400).json({
        success: false,
        message: "Cannot send reminder: Customer email is not available"
      });
    }

    try {
      console.log(`Attempting to send email to ${payment.customer_email}`);

      // Send the reminder email
      const emailResult = await sendInventoryItemPaymentReminder(payment, payment.customer_email);
      console.log("Email sending result:", emailResult);

      if (emailResult.success) {
        // Log the email sent in the database
        try {
          const logSql = `
            INSERT INTO email_logs (
              payment_id,
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
            paymentId,
            'payment_reminder',
            payment.customer_email,
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
          : "Real payment reminder email sent successfully to " + payment.customer_email;

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
      console.error("Error in email sending process:", error);
      return res.status(500).json({
        success: false,
        message: "Error in email sending process",
        error: error.message
      });
    }
  });
});

// Create a new advance payment
router.post("/create", (req, res) => {
  console.log('POST /advance-payments/create - Creating new advance payment');

  const {
    customer_name,
    total_amount,
    advance_amount,
    payment_method,
    notes,
    created_by,
    branch_id,
    is_custom_order,
    order_id: rawOrderId,
    item_id: rawItemId,
    item_quantity,
    existing_advance_amount, // New field for existing advance payments
    balance_amount: clientBalanceAmount, // Balance amount calculated by client
    previous_payment_id // New field for linking to previous inventory item payments
  } = req.body;

  console.log('Request body:', req.body);

  // Parse IDs to ensure they are integers or null
  const order_id = rawOrderId ? parseInt(rawOrderId, 10) : null;
  const item_id = rawItemId ? parseInt(rawItemId, 10) : null;

  console.log(`Parsed order_id: ${order_id}, is_custom_order: ${is_custom_order}`);

  // Validate required fields
  if (!customer_name || !total_amount || !advance_amount) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate balance, accounting for existing advance payments
  let balance_amount;
  if (clientBalanceAmount !== undefined) {
    // Use the balance amount provided by the client
    balance_amount = parseFloat(clientBalanceAmount);
  } else {
    // Calculate balance amount
    const existingAmount = existing_advance_amount ? parseFloat(existing_advance_amount) : 0;
    balance_amount = parseFloat(total_amount) - (parseFloat(advance_amount) + existingAmount);
  }

  // Determine payment status
  let payment_status = "Pending";
  if (balance_amount <= 0) {
    payment_status = "Completed";
  } else if (parseFloat(advance_amount) > 0) {
    payment_status = "Partially Paid";
  }

  // Generate a payment reference
  const payment_reference = generateOrderReference('PAY');

  // Insert into advance_payments table
  const sql = `
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
      order_id,
      item_id,
      item_quantity
    ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  con.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Log the received data
    console.log('Creating advance payment with data:', {
      is_custom_order,
      order_id,
      item_id,
      customer_name,
      total_amount,
      advance_amount,
      previous_payment_id: previous_payment_id || 'none',
      existing_advance_amount: existing_advance_amount || 0
    });

    const insertParams = [
      payment_reference,
      customer_name,
      total_amount,
      advance_amount,
      balance_amount,
      payment_status,
      payment_method || 'Cash',
      notes || '',
      created_by,
      branch_id,
      is_custom_order ? 1 : 0,
      order_id, // Use order_id for both custom and regular orders
      item_id || null,
      item_quantity || null
    ];

    console.log('Insert parameters for advance payment:', insertParams);

    con.query(sql, insertParams, (insertErr, result) => {
      if (insertErr) {
        return con.rollback(() => {
          console.error("Error creating advance payment:", insertErr);
          res.status(500).json({ message: "Database error", error: insertErr.message });
        });
      }

      // If this is a custom order, update the order's payment status
      if (is_custom_order && order_id) {
        const updateOrderSql = `
          UPDATE custom_orders
          SET payment_status = ?
          WHERE order_id = ?
        `;

        con.query(updateOrderSql, [payment_status, order_id], (updateErr) => {
          if (updateErr) {
            return con.rollback(() => {
              console.error("Error updating custom order:", updateErr);
              res.status(500).json({ message: "Database error", error: updateErr.message });
            });
          }

          con.commit((commitErr) => {
            if (commitErr) {
              return con.rollback(() => {
                console.error("Error committing transaction:", commitErr);
                res.status(500).json({ message: "Database error", error: commitErr.message });
              });
            }

            res.status(201).json({
              message: "Advance payment created successfully",
              payment_id: result.insertId,
              payment_reference,
              payment_status
            });
          });
        });
      } else {
        // For inventory items, deduct from stock immediately when advance payment is made
        const isInventoryItem = !is_custom_order && item_id && item_quantity;

        // First, create the inventory_deductions table if it doesn't exist
        const createTableSql = `
          CREATE TABLE IF NOT EXISTS inventory_deductions (
            deduction_id INT AUTO_INCREMENT PRIMARY KEY,
            payment_id INT NOT NULL,
            item_id INT NOT NULL,
            quantity INT NOT NULL,
            deduction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_payment (payment_id),
            FOREIGN KEY (payment_id) REFERENCES advance_payments(payment_id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES jewellery_items(item_id) ON DELETE RESTRICT
          )
        `;

        con.query(createTableSql, (createErr) => {
          if (createErr) {
            return con.rollback(() => {
              console.error("Error creating inventory_deductions table:", createErr);
              res.status(500).json({ message: "Database error", error: createErr.message });
            });
          }

          if (isInventoryItem) {
            console.log(`New advance payment for inventory item ${item_id}. Deducting ${item_quantity} from stock immediately.`);

            // Update inventory
            const updateStockSql = "UPDATE jewellery_items SET in_stock = in_stock - ? WHERE item_id = ? AND in_stock >= ?";
            con.query(updateStockSql, [item_quantity, item_id, item_quantity], (stockErr, stockResult) => {
              if (stockErr) {
                return con.rollback(() => {
                  console.error("Error updating inventory stock:", stockErr);
                  res.status(500).json({ message: "Database error", error: stockErr.message });
                });
              }

              if (stockResult.affectedRows === 0) {
                return con.rollback(() => {
                  console.error(`Insufficient stock for item ID ${item_id}`);
                  res.status(400).json({ message: `Insufficient stock for item ID ${item_id}` });
                });
              }

              // Record the deduction
              const recordDeductionSql = `
                INSERT INTO inventory_deductions (payment_id, item_id, quantity)
                VALUES (?, ?, ?)
              `;
              con.query(recordDeductionSql, [result.insertId, item_id, item_quantity], (recordErr) => {
                if (recordErr) {
                  return con.rollback(() => {
                    console.error("Error recording inventory deduction:", recordErr);
                    res.status(500).json({ message: "Database error", error: recordErr.message });
                  });
                }

                // Commit the transaction
                con.commit((commitErr) => {
                  if (commitErr) {
                    return con.rollback(() => {
                      console.error("Error committing transaction:", commitErr);
                      res.status(500).json({ message: "Database error", error: commitErr.message });
                    });
                  }

                  res.status(201).json({
                    message: "Advance payment created successfully and inventory deducted",
                    payment_id: result.insertId,
                    payment_reference,
                    payment_status,
                    inventory_updated: true
                  });
                });
              });
            });
          } else {
            // No inventory update needed
            con.commit((commitErr) => {
              if (commitErr) {
                return con.rollback(() => {
                  console.error("Error committing transaction:", commitErr);
                  res.status(500).json({ message: "Database error", error: commitErr.message });
                });
              }

              res.status(201).json({
                message: "Advance payment created successfully",
                payment_id: result.insertId,
                payment_reference,
                payment_status
              });
            });
          }
        });
      }
    });
  });
});

// Update an advance payment (for additional payments)
router.put("/:id", (req, res) => {
  const paymentId = req.params.id;
  const { additional_payment, notes } = req.body;

  if (!additional_payment || additional_payment <= 0) {
    return res.status(400).json({ message: "Invalid payment amount" });
  }

  // Get current payment details
  const getSql = "SELECT * FROM advance_payments WHERE payment_id = ?";
  con.query(getSql, [paymentId], (err, results) => {
    if (err) {
      console.error("Error fetching payment:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const payment = results[0];

    // Calculate new amounts
    const newAdvanceAmount = parseFloat(payment.advance_amount) + parseFloat(additional_payment);
    const newBalanceAmount = parseFloat(payment.total_amount) - newAdvanceAmount;

    // Determine new payment status
    let newPaymentStatus = "Partially Paid";
    if (newBalanceAmount <= 0) {
      newPaymentStatus = "Completed";
    }

    // For inventory items, we need to check if stock has already been deducted
    const isInventoryItem = !payment.is_custom_order && payment.item_id && payment.item_quantity;

    // We'll check if this payment has a record in the inventory_deductions table
    // If not, we need to deduct from stock now
    let checkDeductionSql = "SELECT COUNT(*) as count FROM inventory_deductions WHERE payment_id = ?";

    // First, let's make sure the inventory_deductions table exists
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS inventory_deductions (
        deduction_id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        deduction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_payment (payment_id),
        FOREIGN KEY (payment_id) REFERENCES advance_payments(payment_id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES jewellery_items(item_id) ON DELETE RESTRICT
      )
    `;

    // Start a transaction to ensure data consistency
    con.beginTransaction((transErr) => {
      if (transErr) {
        console.error("Error starting transaction:", transErr);
        return res.status(500).json({ message: "Database error", error: transErr.message });
      }

      // First, create the inventory_deductions table if it doesn't exist
      con.query(createTableSql, (createErr) => {
        if (createErr) {
          return con.rollback(() => {
            console.error("Error creating inventory_deductions table:", createErr);
            res.status(500).json({ message: "Database error", error: createErr.message });
          });
        }

        // Update the payment
        const updateSql = `
          UPDATE advance_payments
          SET advance_amount = ?,
              balance_amount = ?,
              payment_status = ?,
              notes = CONCAT(notes, '\nAdditional payment of LKR ', ?, ' on ', NOW(), '. ', ?)
          WHERE payment_id = ?
        `;

        con.query(updateSql, [
          newAdvanceAmount,
          newBalanceAmount,
          newPaymentStatus,
          additional_payment,
          notes || '',
          paymentId
        ], (updateErr) => {
          if (updateErr) {
            return con.rollback(() => {
              console.error("Error updating payment:", updateErr);
              res.status(500).json({ message: "Database error", error: updateErr.message });
            });
          }

          // If this is an inventory item, check if we need to deduct from stock
          if (isInventoryItem) {
            // Check if we've already deducted for this payment
            con.query(checkDeductionSql, [paymentId], (checkErr, checkResults) => {
              if (checkErr) {
                return con.rollback(() => {
                  console.error("Error checking inventory deductions:", checkErr);
                  res.status(500).json({ message: "Database error", error: checkErr.message });
                });
              }

              const alreadyDeducted = checkResults[0].count > 0;

              if (!alreadyDeducted) {
                console.log(`Payment ${paymentId} for inventory item ${payment.item_id}. Deducting ${payment.item_quantity} from stock.`);

                // Update inventory
                const updateStockSql = "UPDATE jewellery_items SET in_stock = in_stock - ? WHERE item_id = ? AND in_stock >= ?";
                con.query(updateStockSql, [payment.item_quantity, payment.item_id, payment.item_quantity], (stockErr, stockResult) => {
                  if (stockErr) {
                    return con.rollback(() => {
                      console.error("Error updating inventory stock:", stockErr);
                      res.status(500).json({ message: "Database error", error: stockErr.message });
                    });
                  }

                  if (stockResult.affectedRows === 0) {
                    return con.rollback(() => {
                      console.error(`Insufficient stock for item ID ${payment.item_id}`);
                      res.status(400).json({ message: `Insufficient stock for item ID ${payment.item_id}` });
                    });
                  }

                  // Record the deduction
                  const recordDeductionSql = `
                    INSERT INTO inventory_deductions (payment_id, item_id, quantity)
                    VALUES (?, ?, ?)
                  `;
                  con.query(recordDeductionSql, [paymentId, payment.item_id, payment.item_quantity], (recordErr) => {
                    if (recordErr) {
                      return con.rollback(() => {
                        console.error("Error recording inventory deduction:", recordErr);
                        res.status(500).json({ message: "Database error", error: recordErr.message });
                      });
                    }

                    // Commit the transaction
                    con.commit((commitErr) => {
                      if (commitErr) {
                        return con.rollback(() => {
                          console.error("Error committing transaction:", commitErr);
                          res.status(500).json({ message: "Database error", error: commitErr.message });
                        });
                      }

                      res.json({
                        message: "Advance payment updated successfully and inventory deducted",
                        payment_id: paymentId,
                        new_advance_amount: newAdvanceAmount,
                        new_balance_amount: newBalanceAmount,
                        payment_status: newPaymentStatus,
                        inventory_updated: true
                      });
                    });
                  });
                });
              } else {
                // Already deducted, just commit the transaction
                con.commit((commitErr) => {
                  if (commitErr) {
                    return con.rollback(() => {
                      console.error("Error committing transaction:", commitErr);
                      res.status(500).json({ message: "Database error", error: commitErr.message });
                    });
                  }

                  res.json({
                    message: "Advance payment updated successfully",
                    payment_id: paymentId,
                    new_advance_amount: newAdvanceAmount,
                    new_balance_amount: newBalanceAmount,
                    payment_status: newPaymentStatus
                  });
                });
              }
            });
          } else {
            // Not an inventory item, just commit the transaction
            con.commit((commitErr) => {
              if (commitErr) {
                return con.rollback(() => {
                  console.error("Error committing transaction:", commitErr);
                  res.status(500).json({ message: "Database error", error: commitErr.message });
                });
              }

              res.json({
                message: "Advance payment updated successfully",
                payment_id: paymentId,
                new_advance_amount: newAdvanceAmount,
                new_balance_amount: newBalanceAmount,
                payment_status: newPaymentStatus
              });
            });
          }
        });
      });
    });
  });
});

// Get available jewellery items for advance payment
router.get("/items/available", (_req, res) => {
  const sql = `
    SELECT
      item_id,
      product_title,
      category,
      selling_price,
      in_stock
    FROM
      jewellery_items
    WHERE
      in_stock > 0
    ORDER BY
      category, product_title
  `;

  con.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching available items:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results || []);
  });
});

// Get custom orders for advance payment
router.get("/orders/custom", (_req, res) => {
  console.log('GET /advance-payments/orders/custom - Fetching custom orders for advance payment');

  // First, let's get all custom orders to see what's in the database
  const debugSql = `SELECT * FROM custom_orders`;
  con.query(debugSql, (debugErr, debugResults) => {
    if (debugErr) {
      console.error("Error in debug query:", debugErr);
    } else {
      console.log("DEBUG - All custom orders in database:");
      debugResults.forEach(order => {
        console.log(`Order ID: ${order.order_id}, Reference: ${order.order_reference}, ` +
                   `Customer: ${order.customer_name}, Estimated: ${order.estimated_amount}, ` +
                   `Advance: ${order.advance_amount}, Status: ${order.payment_status}`);
      });
    }
  });

  // Now let's check all advance payments
  const debugPaymentsSql = `SELECT * FROM advance_payments WHERE is_custom_order = 1`;
  con.query(debugPaymentsSql, (debugErr, debugResults) => {
    if (debugErr) {
      console.error("Error in debug payments query:", debugErr);
    } else {
      console.log("DEBUG - All advance payments for custom orders:");
      debugResults.forEach(payment => {
        console.log(`Payment ID: ${payment.payment_id}, Reference: ${payment.payment_reference}, ` +
                   `Order ID: ${payment.order_id}, Amount: ${payment.advance_amount}`);
      });
    }
  });

  // Get custom orders that are not fully paid
  const sql = `
    SELECT
      co.order_id,
      co.order_reference,
      co.customer_name,
      co.estimated_amount,
      co.advance_amount,
      co.estimated_amount - co.advance_amount AS balance_amount,
      co.payment_status,
      co.order_date,
      co.estimated_completion_date
    FROM
      custom_orders co
    WHERE
      co.payment_status != 'Fully Paid'
    ORDER BY
      co.order_date DESC
  `;

  console.log('Fetching custom orders that are not fully paid');

  con.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${results.length} custom orders that need payment`);

    // Log detailed information about each order for debugging
    results.forEach(order => {
      console.log(`Order ID: ${order.order_id}, Reference: ${order.order_reference}`);
      console.log(`  Estimated Amount: ${order.estimated_amount}, Advance Amount: ${order.advance_amount}`);
      console.log(`  Balance Amount: ${order.balance_amount}, Payment Status: ${order.payment_status}`);
    });

    res.json(results || []);
  });
});

export { router as advancePaymentRouter };
