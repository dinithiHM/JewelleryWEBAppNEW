import express from 'express';
import con from '../utils/db.js';

const router = express.Router();

// Route to fix missing advance payments for custom orders
router.get("/fix-missing-advance-payments", (req, res) => {
  console.log('GET /fix-missing-advance-payments - Fixing missing advance payments for custom orders');

  // Start transaction
  con.beginTransaction((transErr) => {
    if (transErr) {
      console.error("Error starting transaction:", transErr);
      return res.status(500).json({ message: "Database error", error: transErr.message });
    }

    // First, get all custom orders with payments in custom_order_payments
    // but no corresponding entries in advance_payments
    const findMissingPaymentsSql = `
      SELECT 
        co.order_id,
        co.order_reference,
        co.customer_name,
        co.estimated_amount,
        co.advance_amount,
        co.balance_amount,
        co.payment_status,
        co.created_by,
        co.branch_id,
        cop.payment_id as custom_payment_id,
        cop.payment_amount,
        cop.payment_date,
        cop.payment_method,
        cop.notes,
        (SELECT COUNT(*) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) as advance_payment_count
      FROM 
        custom_orders co
      JOIN 
        custom_order_payments cop ON co.order_id = cop.order_id
      WHERE 
        (SELECT COUNT(*) FROM advance_payments WHERE order_id = co.order_id AND is_custom_order = 1) = 0
      ORDER BY 
        co.order_id, cop.payment_date
    `;

    con.query(findMissingPaymentsSql, (findErr, missingPayments) => {
      if (findErr) {
        return con.rollback(() => {
          console.error("Error finding missing payments:", findErr);
          res.status(500).json({ message: "Database error", error: findErr.message });
        });
      }

      console.log(`Found ${missingPayments.length} missing payments to fix`);

      if (missingPayments.length === 0) {
        return con.commit(() => {
          res.json({ message: "No missing payments found" });
        });
      }

      // Group payments by order_id to handle multiple payments for the same order
      const orderPayments = {};
      missingPayments.forEach(payment => {
        if (!orderPayments[payment.order_id]) {
          orderPayments[payment.order_id] = [];
        }
        orderPayments[payment.order_id].push(payment);
      });

      // Process each order's payments
      const processOrder = (orderIds, index) => {
        if (index >= orderIds.length) {
          // All orders processed, commit transaction
          return con.commit((commitErr) => {
            if (commitErr) {
              return con.rollback(() => {
                console.error("Error committing transaction:", commitErr);
                res.status(500).json({ message: "Database error", error: commitErr.message });
              });
            }
            res.json({ 
              message: "Missing advance payments fixed successfully", 
              orders_processed: orderIds.length,
              payments_created: missingPayments.length
            });
          });
        }

        const orderId = orderIds[index];
        const payments = orderPayments[orderId];
        const order = payments[0]; // Use the first payment to get order details

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

          // Process each payment for this order
          const processPayment = (paymentIndex) => {
            if (paymentIndex >= payments.length) {
              // All payments for this order processed, move to next order
              return processOrder(orderIds, index + 1);
            }

            const payment = payments[paymentIndex];
            const payment_reference = `${referencePrefix}${(nextSeq + paymentIndex).toString().padStart(4, '0')}`;
            
            // Calculate balance amount based on estimated amount and this payment
            const balance_amount = parseFloat(payment.estimated_amount) - parseFloat(payment.payment_amount);
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
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            con.query(advancePaymentSql, [
              payment_reference,
              payment.customer_name,
              payment.payment_date,
              parseFloat(payment.estimated_amount),
              parseFloat(payment.payment_amount),
              balance_amount,
              payment_status,
              payment.payment_method || 'Cash',
              payment.notes || 'Initial advance payment for custom order',
              payment.created_by,
              payment.branch_id,
              1, // is_custom_order = true
              payment.order_id
            ], (advPayErr) => {
              if (advPayErr) {
                return con.rollback(() => {
                  console.error("Error creating advance payment:", advPayErr);
                  res.status(500).json({ message: "Database error", error: advPayErr.message });
                });
              }

              console.log(`Created advance payment for order ${payment.order_id}, payment ${payment.custom_payment_id}`);
              
              // Process next payment
              processPayment(paymentIndex + 1);
            });
          };

          // Start processing payments for this order
          processPayment(0);
        });
      };

      // Start processing orders
      processOrder(Object.keys(orderPayments), 0);
    });
  });
});

export { router as fixMissingAdvancePaymentsRouter };
