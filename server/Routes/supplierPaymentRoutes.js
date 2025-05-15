import express from "express";
import con from "../utils/db.js"; // Database connection

const router = express.Router();

// Create a new supplier payment
router.post("/create", (req, res) => {
  const {
    order_id,
    amount_paid,
    payment_method,
    notes,
    created_by
  } = req.body;

  console.log('POST /supplier-payments/create - Creating new payment');
  console.log(`Payment details - Order ID: ${order_id}, Amount: ${amount_paid}, Method: ${payment_method}`);

  // Basic validation
  if (!order_id || !amount_paid) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // First, check if the order exists
  con.query("SELECT * FROM orders WHERE order_id = ?", [order_id], (orderErr, orderResults) => {
    if (orderErr) {
      console.error("Error checking order:", orderErr);
      return res.status(500).json({ message: "Database error", error: orderErr.message });
    }

    if (orderResults.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResults[0];
    
    // Update the order with the new payment information
    const updateOrderSql = `
      UPDATE orders 
      SET 
        making_charges = ?,
        estimated_price = ?,
        total_amount = ?,
        advance_payment_amount = ?,
        total_payment_amount = ?,
        payment_status = ?
      WHERE order_id = ?
    `;

    const making_charges = req.body.making_charges || order.making_charges;
    const estimated_price = req.body.estimated_price || order.estimated_price;
    const total_amount = req.body.total_amount || order.total_amount;
    const advance_payment_amount = amount_paid;
    const total_payment_amount = total_amount;
    
    // Determine payment status
    let payment_status = 'Partial';
    if (advance_payment_amount >= total_amount) {
      payment_status = 'Paid';
    } else if (advance_payment_amount <= 0) {
      payment_status = 'Pending';
    }

    const updateOrderValues = [
      making_charges,
      estimated_price,
      total_amount,
      advance_payment_amount,
      total_payment_amount,
      payment_status,
      order_id
    ];

    con.query(updateOrderSql, updateOrderValues, (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Error updating order payment details:", updateErr);
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      // Now create a payment record in the supplier_payments table if it exists
      con.query("SHOW TABLES LIKE 'supplier_payments'", (tableErr, tableResults) => {
        if (tableErr) {
          console.error("Error checking for supplier_payments table:", tableErr);
          // Still return success for the order update
          return res.status(200).json({
            success: true,
            message: "Order payment details updated successfully, but couldn't check for supplier_payments table",
            orderId: order_id
          });
        }

        if (tableResults.length === 0) {
          // Table doesn't exist, create it
          const createTableSql = `
            CREATE TABLE supplier_payments (
              payment_id INT AUTO_INCREMENT PRIMARY KEY,
              order_id INT NOT NULL,
              amount_paid DECIMAL(10,2) NOT NULL,
              payment_method VARCHAR(50) DEFAULT 'Cash',
              notes TEXT,
              created_by INT,
              payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            )
          `;

          con.query(createTableSql, (createErr) => {
            if (createErr) {
              console.error("Error creating supplier_payments table:", createErr);
              // Still return success for the order update
              return res.status(200).json({
                success: true,
                message: "Order payment details updated successfully, but couldn't create supplier_payments table",
                orderId: order_id
              });
            }

            // Now insert the payment record
            insertPaymentRecord();
          });
        } else {
          // Table exists, insert the payment record
          insertPaymentRecord();
        }
      });

      // Function to insert the payment record
      function insertPaymentRecord() {
        const insertPaymentSql = `
          INSERT INTO supplier_payments (
            order_id,
            amount_paid,
            payment_method,
            notes,
            created_by
          ) VALUES (?, ?, ?, ?, ?)
        `;

        const insertPaymentValues = [
          order_id,
          amount_paid,
          payment_method || 'Cash',
          notes || null,
          created_by || null
        ];

        con.query(insertPaymentSql, insertPaymentValues, (insertErr, insertResult) => {
          if (insertErr) {
            console.error("Error creating payment record:", insertErr);
            // Still return success for the order update
            return res.status(200).json({
              success: true,
              message: "Order payment details updated successfully, but payment record creation failed",
              orderId: order_id
            });
          }

          // Everything succeeded
          res.status(201).json({
            success: true,
            message: "Payment processed successfully",
            orderId: order_id,
            paymentId: insertResult.insertId
          });
        });
      }
    });
  });
});

// Get all payments for an order
router.get("/order/:id", (req, res) => {
  const orderId = req.params.id;

  const sql = `
    SELECT * FROM supplier_payments 
    WHERE order_id = ? 
    ORDER BY payment_date DESC
  `;

  con.query(sql, [orderId], (err, results) => {
    if (err) {
      console.error("Error fetching payments:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
});

export { router as supplierPaymentRouter };
