import express from 'express';
import con from '../utils/db.js';

const router = express.Router();

// Route to fix payment status in custom_orders table
router.get("/fix-payment-status", (req, res) => {
  console.log('GET /fix-payment-status - Fixing payment status in custom_orders table');

  // First, get all custom orders with their payments
  const getOrdersSql = `
    SELECT co.*,
      (SELECT COUNT(*) FROM advance_payments WHERE order_id = co.order_id) as payment_count,
      (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) as total_paid,
      (SELECT MIN(balance_amount) FROM advance_payments WHERE order_id = co.order_id) as min_balance
    FROM custom_orders co
  `;

  con.query(getOrdersSql, (err, orders) => {
    if (err) {
      console.error("Error fetching custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${orders.length} custom orders to check`);

    // Process each order and update its payment status
    const updatePromises = orders.map(order => {
      return new Promise((resolve) => {
        let newPaymentStatus;
        
        // Determine the correct payment status
        if (order.payment_count > 0 && order.total_paid) {
          if (order.total_paid >= order.estimated_amount || (order.min_balance !== null && order.min_balance <= 0)) {
            newPaymentStatus = 'Fully Paid';
          } else if (order.total_paid > 0) {
            newPaymentStatus = 'Partially Paid';
          } else {
            newPaymentStatus = 'Not Paid';
          }
        } else {
          newPaymentStatus = 'Not Paid';
        }

        // Only update if the status is different
        if (newPaymentStatus !== order.payment_status) {
          console.log(`Updating order ${order.order_id} payment status from ${order.payment_status} to ${newPaymentStatus}`);
          
          const updateSql = `UPDATE custom_orders SET payment_status = ? WHERE order_id = ?`;
          con.query(updateSql, [newPaymentStatus, order.order_id], (updateErr) => {
            if (updateErr) {
              console.error(`Error updating payment status for order ${order.order_id}:`, updateErr);
            } else {
              console.log(`Successfully updated order ${order.order_id} payment status to ${newPaymentStatus}`);
            }
            resolve();
          });
        } else {
          console.log(`Order ${order.order_id} already has correct payment status: ${order.payment_status}`);
          resolve();
        }
      });
    });

    // Wait for all updates to complete
    Promise.all(updatePromises).then(() => {
      res.json({ message: "Payment status fixed successfully", ordersProcessed: orders.length });
    }).catch(error => {
      console.error('Error fixing payment status:', error);
      res.status(500).json({ message: "Error fixing payment status", error: error.message });
    });
  });
});

// Route to fix advance amount in custom_orders table
router.get("/fix-advance-amount", (req, res) => {
  console.log('GET /fix-advance-amount - Fixing advance amount in custom_orders table');

  // Get all custom orders with their total paid amount
  const getOrdersSql = `
    SELECT co.order_id, co.advance_amount,
      (SELECT SUM(advance_amount) FROM advance_payments WHERE order_id = co.order_id) as total_paid
    FROM custom_orders co
    WHERE (SELECT COUNT(*) FROM advance_payments WHERE order_id = co.order_id) > 0
  `;

  con.query(getOrdersSql, (err, orders) => {
    if (err) {
      console.error("Error fetching custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${orders.length} custom orders with payments to check`);

    // Process each order and update its advance amount
    const updatePromises = orders.map(order => {
      return new Promise((resolve) => {
        if (order.total_paid !== null && order.total_paid !== order.advance_amount) {
          console.log(`Updating order ${order.order_id} advance amount from ${order.advance_amount} to ${order.total_paid}`);
          
          const updateSql = `UPDATE custom_orders SET advance_amount = ? WHERE order_id = ?`;
          con.query(updateSql, [order.total_paid, order.order_id], (updateErr) => {
            if (updateErr) {
              console.error(`Error updating advance amount for order ${order.order_id}:`, updateErr);
            } else {
              console.log(`Successfully updated order ${order.order_id} advance amount to ${order.total_paid}`);
            }
            resolve();
          });
        } else {
          console.log(`Order ${order.order_id} already has correct advance amount: ${order.advance_amount}`);
          resolve();
        }
      });
    });

    // Wait for all updates to complete
    Promise.all(updatePromises).then(() => {
      res.json({ message: "Advance amount fixed successfully", ordersProcessed: orders.length });
    }).catch(error => {
      console.error('Error fixing advance amount:', error);
      res.status(500).json({ message: "Error fixing advance amount", error: error.message });
    });
  });
});

export default router;
