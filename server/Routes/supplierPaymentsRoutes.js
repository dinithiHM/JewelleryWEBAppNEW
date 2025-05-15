import express from 'express';
import con from '../utils/db.js';

const router = express.Router();

// Get all supplier payments
router.get('/', (req, res) => {
  const query = `
    SELECT sp.*, o.category, s.name as supplier_name
    FROM supplier_payments sp
    JOIN orders o ON sp.order_id = o.order_id
    JOIN suppliers s ON o.supplier_id = s.supplier_id
    ORDER BY sp.payment_date DESC
  `;

  con.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching supplier payments:', err);
      return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }

    return res.json({ success: true, data: results });
  });
});

// Get payments for a specific order
router.get('/order/:orderId', (req, res) => {
  const { orderId } = req.params;

  // First get the order details
  con.query("SELECT * FROM orders WHERE order_id = ?", [orderId], (orderErr, orderResults) => {
    if (orderErr) {
      console.error('Error fetching order details:', orderErr);
      return res.status(500).json({ success: false, message: 'Database error', error: orderErr.message });
    }

    if (orderResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResults[0];

    // Then get all payments for this order
    const query = `
      SELECT * FROM supplier_payments
      WHERE order_id = ?
      ORDER BY payment_date DESC
    `;

    con.query(query, [orderId], (err, results) => {
      if (err) {
        console.error('Error fetching supplier payments for order:', err);
        return res.status(500).json({ success: false, message: 'Database error', error: err.message });
      }

      // Calculate total paid amount
      const totalPaid = results.reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0);

      // Return both the payments and the summary
      return res.json({
        success: true,
        data: results,
        summary: {
          order_id: parseInt(orderId),
          total_amount: parseFloat(order.total_amount),
          advance_payment_amount: parseFloat(order.advance_payment_amount),
          total_paid: totalPaid,
          remaining_balance: parseFloat(order.total_amount) - totalPaid,
          payment_status: order.payment_status,
          payment_count: results.length
        }
      });
    });
  });
});

// Create a new supplier payment
router.post('/create', (req, res) => {
  const {
    order_id,
    amount_paid, // Current payment amount
    existing_payment, // Previously paid amount
    total_advance_payment, // Total of all payments
    payment_method,
    notes,
    created_by,
    making_charges,
    estimated_price,
    total_amount,
    use_custom_estimate,
    is_final_payment // Flag indicating this is the final payment
  } = req.body;

  if (!order_id || !amount_paid) {
    return res.status(400).json({ success: false, message: 'Order ID and amount are required' });
  }

  // First, get the order details to validate payment amount
  const getOrderQuery = 'SELECT * FROM orders WHERE order_id = ?';

  con.query(getOrderQuery, [order_id], (err, orderResults) => {
    if (err) {
      console.error('Error fetching order details:', err);
      return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }

    if (orderResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResults[0];
    // Use the provided total amount or fall back to the existing one
    const orderTotalAmount = total_amount ? parseFloat(total_amount) : parseFloat(order.total_amount);
    // Use let instead of const so we can modify it for final payments
    let advancePaymentAmount = parseFloat(amount_paid);

    // Check if this is the first payment (advance payment)
    const checkPaymentsQuery = 'SELECT SUM(amount_paid) as total_paid FROM supplier_payments WHERE order_id = ?';

    con.query(checkPaymentsQuery, [order_id], (err, paymentResults) => {
      if (err) {
        console.error('Error checking existing payments:', err);
        return res.status(500).json({ success: false, message: 'Database error', error: err.message });
      }

      // Ensure existingPayments is a number
      const existingPayments = paymentResults[0].total_paid !== null ? parseFloat(paymentResults[0].total_paid) : 0;
      // Use let instead of const so we can modify it for final payments
      let totalPaidAfterThisPayment = existingPayments + advancePaymentAmount;

      // If this is the first payment, ensure it's at least 25% of the total
      if (existingPayments === 0 && advancePaymentAmount < (orderTotalAmount * 0.25)) {
        return res.status(400).json({
          success: false,
          message: 'Advance payment must be at least 25% of the total amount',
          minimumRequired: (orderTotalAmount * 0.25).toFixed(2),
          totalAmount: orderTotalAmount.toFixed(2)
        });
      }

      // If total paid exceeds total amount, reject
      // But allow payments that exactly match the remaining balance
      console.log('DEBUG - Payment validation:');
      console.log(`- Existing payments: ${existingPayments}`);
      console.log(`- Current payment: ${advancePaymentAmount}`);
      console.log(`- Total after this payment: ${totalPaidAfterThisPayment}`);
      console.log(`- Order total amount: ${orderTotalAmount}`);
      console.log(`- Difference: ${totalPaidAfterThisPayment - orderTotalAmount}`);
      console.log(`- Is final payment flag: ${is_final_payment ? 'Yes' : 'No'}`);

      // If this is marked as a final payment, allow it and adjust the amount to exactly match the remaining balance
      if (is_final_payment) {
        console.log('Allowing payment because it is marked as final payment');
        // Adjust the payment amount to exactly match the remaining balance
        const exactRemainingBalance = orderTotalAmount - existingPayments;
        console.log(`Adjusting final payment amount: ${advancePaymentAmount} -> ${exactRemainingBalance}`);
        // Override the payment amount with the exact remaining balance
        advancePaymentAmount = exactRemainingBalance;
        // Recalculate the total after this payment
        totalPaidAfterThisPayment = existingPayments + advancePaymentAmount;
        console.log(`Adjusted total after payment: ${totalPaidAfterThisPayment}`);
        // Continue with the payment
      }
      // If total paid exceeds total amount by more than a small tolerance
      else if (totalPaidAfterThisPayment > orderTotalAmount) {
        // Calculate the difference to see if it's just a floating point precision issue
        const difference = Math.abs(totalPaidAfterThisPayment - orderTotalAmount);
        console.log(`Difference between total paid and order total: ${difference}`);

        // If the difference is very small (less than 1 rupee), consider it equal
        if (difference < 1) {
          console.log(`Payment amount adjusted for precision: ${totalPaidAfterThisPayment} -> ${orderTotalAmount}`);
          // Adjust the payment to exactly match the remaining amount
          // This prevents floating point precision issues
        } else {
          console.log('Rejecting payment: Total exceeds order amount by more than tolerance');
          return res.status(400).json({
            success: false,
            message: 'Total payments cannot exceed the order amount',
            currentlyPaid: existingPayments.toFixed(2),
            totalAmount: orderTotalAmount.toFixed(2),
            remainingAmount: (orderTotalAmount - existingPayments).toFixed(2)
          });
        }
      }

      // Insert the payment
      const insertPaymentQuery = `
        INSERT INTO supplier_payments
        (order_id, amount_paid, payment_method, notes, created_by)
        VALUES (?, ?, ?, ?, ?)
      `;

      // Use the potentially adjusted payment amount
      console.log(`Inserting payment with amount: ${advancePaymentAmount}`);
      con.query(insertPaymentQuery, [
        order_id,
        advancePaymentAmount, // Use the adjusted amount if this is a final payment
        payment_method || 'Cash',
        notes || '',
        created_by || null
      ], (err, result) => {
        if (err) {
          console.error('Error creating supplier payment:', err);
          return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }

        // Update the order's payment status
        let paymentStatus = 'Partial';

        // Use total_advance_payment if provided, otherwise use calculated total
        const totalPaid = total_advance_payment !== undefined ? parseFloat(total_advance_payment) : totalPaidAfterThisPayment;

        // If this is marked as a final payment or the total paid is very close to or exceeds the order total
        if (is_final_payment || Math.abs(totalPaid - orderTotalAmount) < 1 || totalPaid >= orderTotalAmount) {
          console.log('Setting payment status to Completed');
          paymentStatus = 'Completed';
        }

        // Check if use_custom_estimate column exists
        con.query("SHOW COLUMNS FROM orders LIKE 'use_custom_estimate'", (customColumnErr, customColumnResults) => {
          if (customColumnErr) {
            console.error("Error checking for use_custom_estimate column:", customColumnErr);
          } else if (customColumnResults.length === 0) {
            // Add the column if it doesn't exist
            const alterTableSql = `
              ALTER TABLE orders
              ADD COLUMN use_custom_estimate TINYINT(1) DEFAULT 0
            `;

            con.query(alterTableSql, (alterErr) => {
              if (alterErr) {
                console.error("Error adding use_custom_estimate column:", alterErr);
              } else {
                console.log("Added use_custom_estimate column to orders table");
              }
            });
          }
        });

        // Update the order with new values
        const updateOrderQuery = `
          UPDATE orders
          SET advance_payment_amount = ?,
              payment_status = ?,
              total_payment_amount = ?
              ${making_charges ? ', making_charges = ?' : ''}
              ${estimated_price ? ', estimated_price = ?' : ''}
              ${total_amount ? ', total_amount = ?' : ''}
              ${use_custom_estimate !== undefined ? ', use_custom_estimate = ?' : ''}
          WHERE order_id = ?
        `;

        // Build the values array based on which fields are provided
        const updateValues = [
          total_advance_payment !== undefined ? parseFloat(total_advance_payment) : (existingPayments + advancePaymentAmount), // Use total advance payment if provided and the adjusted amount
          paymentStatus,
          orderTotalAmount
        ];

        // Add optional fields if provided
        if (making_charges) updateValues.push(making_charges);
        if (estimated_price) updateValues.push(estimated_price);
        if (total_amount) updateValues.push(total_amount);
        if (use_custom_estimate !== undefined) updateValues.push(use_custom_estimate ? 1 : 0);

        // Add the order_id at the end
        updateValues.push(order_id);

        con.query(updateOrderQuery, updateValues, (err) => {
          if (err) {
            console.error('Error updating order details:', err);
            // Don't return error here, as payment was already created
          }
        });

        // Use total_advance_payment if provided, otherwise use calculated total
        const totalPaidAmount = total_advance_payment !== undefined ? parseFloat(total_advance_payment) : totalPaidAfterThisPayment;

        return res.json({
          success: true,
          message: 'Supplier payment processed successfully',
          data: {
            payment_id: result.insertId,
            order_id,
            current_payment: advancePaymentAmount, // Use the adjusted amount
            existing_payment: parseFloat(existing_payment || 0),
            total_advance_payment: parseFloat(totalPaidAmount),
            payment_status: paymentStatus,
            total_paid: totalPaidAmount.toFixed(2),
            remaining: (orderTotalAmount - totalPaidAmount).toFixed(2)
          }
        });
      });
    });
  });
});

// Get supplier payment summary (for dashboard)
router.get('/summary', (req, res) => {
  const query = `
    SELECT
      SUM(sp.amount_paid) as total_paid,
      COUNT(DISTINCT sp.order_id) as orders_with_payments,
      (SELECT COUNT(*) FROM orders WHERE payment_status = 'Completed') as fully_paid_orders,
      (SELECT COUNT(*) FROM orders WHERE payment_status = 'Partial') as partially_paid_orders,
      (SELECT COUNT(*) FROM orders WHERE payment_status = 'Pending') as pending_payment_orders,
      (SELECT SUM(total_amount) FROM orders) as total_order_amount,
      (SELECT SUM(total_amount - IFNULL(
        (SELECT SUM(amount_paid) FROM supplier_payments WHERE order_id = orders.order_id), 0
      )) FROM orders) as total_outstanding
    FROM
      supplier_payments sp
  `;

  con.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching supplier payment summary:', err);
      return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }

    return res.json({ success: true, data: results[0] });
  });
});

// Get supplier liabilities (for store manager dashboard)
router.get('/liabilities', (req, res) => {
  const { role, branch_id } = req.query;

  console.log('GET /supplier-payments/liabilities - Fetching supplier liabilities');
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

export { router as supplierPaymentsRouter };
