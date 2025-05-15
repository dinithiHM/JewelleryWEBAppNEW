import express from 'express';
import con from '../utils/db.js';

const router = express.Router();

// Route to directly fix payment status for all custom orders
router.get("/fix-payment-status-directly", (req, res) => {
  console.log('GET /fix-payment-status-directly - Fixing payment status for all custom orders');

  // This query directly updates the payment status based on comparing advance_amount with estimated_amount
  const updateSql = `
    UPDATE custom_orders
    SET payment_status = 
      CASE 
        WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
        WHEN advance_amount > 0 THEN 'Partially Paid'
        ELSE 'Not Paid'
      END
  `;

  con.query(updateSql, (err) => {
    if (err) {
      console.error("Error updating payment status:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Also update the advance_payments table to be consistent
    const updateAdvancePaymentsSql = `
      UPDATE advance_payments ap
      JOIN custom_orders co ON ap.order_id = co.order_id AND ap.is_custom_order = 1
      SET ap.payment_status = 
        CASE 
          WHEN ap.balance_amount <= 0 THEN 'Completed'
          ELSE 'Partially Paid'
        END
    `;

    con.query(updateAdvancePaymentsSql, (advErr) => {
      if (advErr) {
        console.error("Error updating advance payments status:", advErr);
        return res.status(500).json({ message: "Database error", error: advErr.message });
      }

      res.json({ 
        message: "Payment status fixed successfully for all orders",
        details: "Updated both custom_orders and advance_payments tables"
      });
    });
  });
});

// Route to fix a specific custom order's payment status
router.get("/fix-payment-status/:orderId", (req, res) => {
  const orderId = req.params.orderId;
  console.log(`GET /fix-payment-status/${orderId} - Fixing payment status for order ${orderId}`);

  // First, update the advance_amount to ensure it's accurate
  const updateAdvanceAmountSql = `
    UPDATE custom_orders
    SET advance_amount = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM custom_order_payments
      WHERE order_id = ?
    )
    WHERE order_id = ?
  `;

  con.query(updateAdvanceAmountSql, [orderId, orderId], (updateErr) => {
    if (updateErr) {
      console.error("Error updating advance amount:", updateErr);
      return res.status(500).json({ message: "Database error", error: updateErr.message });
    }

    // Update payment status based on the updated advance_amount
    const updatePaymentStatusSql = `
      UPDATE custom_orders
      SET payment_status = 
        CASE 
          WHEN advance_amount >= estimated_amount THEN 'Fully Paid'
          WHEN advance_amount > 0 THEN 'Partially Paid'
          ELSE 'Not Paid'
        END
      WHERE order_id = ?
    `;

    con.query(updatePaymentStatusSql, [orderId], (statusErr) => {
      if (statusErr) {
        console.error("Error updating payment status:", statusErr);
        return res.status(500).json({ message: "Database error", error: statusErr.message });
      }

      // Also update the advance_payments table for this order
      const updateAdvancePaymentsSql = `
        UPDATE advance_payments
        SET payment_status = 
          CASE 
            WHEN balance_amount <= 0 THEN 'Completed'
            ELSE 'Partially Paid'
          END
        WHERE order_id = ? AND is_custom_order = 1
      `;

      con.query(updateAdvancePaymentsSql, [orderId], (advErr) => {
        if (advErr) {
          console.error("Error updating advance payments status:", advErr);
          return res.status(500).json({ message: "Database error", error: advErr.message });
        }

        res.json({ 
          message: `Payment status fixed successfully for order ${orderId}`,
          details: "Updated both custom_orders and advance_payments tables"
        });
      });
    });
  });
});

export { router as fixPaymentStatusDirectlyRouter };
