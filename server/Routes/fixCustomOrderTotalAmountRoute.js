import express from 'express';
import con from '../utils/db.js';

const router = express.Router();

// Route to fix total amount with profit and quantity for a specific custom order
router.get("/fix-order/:orderId", (req, res) => {
  const orderId = req.params.orderId;
  console.log(`GET /fix-total-amount/${orderId} - Fixing total amount with profit and quantity for order ${orderId}`);

  // First, get the order details
  const getOrderSql = `
    SELECT
      order_id,
      order_reference,
      customer_name,
      estimated_amount,
      profit_percentage,
      quantity,
      advance_amount
    FROM custom_orders
    WHERE order_id = ?
  `;

  con.query(getOrderSql, [orderId], (err, orders) => {
    if (err) {
      console.error("Error fetching custom order:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];

    // Calculate the total amount with profit and quantity
    const estimatedAmount = parseFloat(order.estimated_amount);
    const profitPercentage = order.profit_percentage ? parseFloat(order.profit_percentage) : 0;
    const quantity = order.quantity ? parseInt(order.quantity) : 1;
    const advanceAmount = parseFloat(order.advance_amount) || 0;

    // Calculate profit amount
    const profitAmount = estimatedAmount * (profitPercentage / 100);

    // Calculate price per unit (estimated amount + profit)
    const pricePerUnit = estimatedAmount + profitAmount;

    // Calculate total amount (price per unit * quantity)
    const totalAmountWithProfit = pricePerUnit * quantity;

    // Calculate balance amount
    const balanceAmount = totalAmountWithProfit - advanceAmount;

    console.log(`Order ${orderId} calculation breakdown:`);
    console.log(`- Estimated amount: ${estimatedAmount}`);
    console.log(`- Profit percentage: ${profitPercentage}%`);
    console.log(`- Profit amount: ${profitAmount}`);
    console.log(`- Price per unit: ${pricePerUnit}`);
    console.log(`- Quantity: ${quantity}`);
    console.log(`- Total amount with profit: ${totalAmountWithProfit}`);
    console.log(`- Advance amount: ${advanceAmount}`);
    console.log(`- Balance amount: ${balanceAmount}`);

    // Update the order with the correct total amount with profit and balance amount
    const updateOrderSql = `
      UPDATE custom_orders
      SET
        balance_amount = ?
      WHERE order_id = ?
    `;

    con.query(updateOrderSql, [balanceAmount, orderId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Error updating custom order:", updateErr);
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      console.log(`Updated order ${orderId} with correct balance amount: ${balanceAmount}`);

      // Now update all advance payments for this order to ensure they have the correct total amount
      const updatePaymentsSql = `
        UPDATE advance_payments
        SET
          total_amount = ?,
          balance_amount = ?
        WHERE order_id = ? AND is_custom_order = 1
      `;

      con.query(updatePaymentsSql, [totalAmountWithProfit, balanceAmount, orderId], (paymentsErr, paymentsResult) => {
        if (paymentsErr) {
          console.error("Error updating advance payments:", paymentsErr);
          return res.status(500).json({ message: "Database error", error: paymentsErr.message });
        }

        console.log(`Updated ${paymentsResult.affectedRows} advance payments for order ${orderId}`);

        // Return the updated order details
        res.json({
          message: "Order updated successfully",
          order_id: order.order_id,
          order_reference: order.order_reference,
          customer_name: order.customer_name,
          estimated_amount: estimatedAmount,
          profit_percentage: profitPercentage,
          quantity: quantity,
          total_amount_with_profit: totalAmountWithProfit,
          advance_amount: advanceAmount,
          balance_amount: balanceAmount,
          payments_updated: paymentsResult.affectedRows
        });
      });
    });
  });
});

// Route to fix total amount with profit and quantity for all custom orders
router.get("/fix-all-orders", (req, res) => {
  console.log('GET /fix-total-amount/fix-all-orders - Fixing total amount with profit and quantity for all orders');

  // Get all custom orders
  const getAllOrdersSql = `
    SELECT
      order_id,
      order_reference,
      customer_name,
      estimated_amount,
      profit_percentage,
      quantity,
      advance_amount
    FROM custom_orders
  `;

  con.query(getAllOrdersSql, (err, orders) => {
    if (err) {
      console.error("Error fetching custom orders:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${orders.length} custom orders to process`);

    // Process each order
    const updatedOrders = [];
    let processedCount = 0;

    const processOrder = (index) => {
      if (index >= orders.length) {
        // All orders processed
        return res.json({
          message: `Successfully updated ${processedCount} orders`,
          updated_orders: updatedOrders
        });
      }

      const order = orders[index];

      // Calculate the total amount with profit and quantity
      const estimatedAmount = parseFloat(order.estimated_amount);
      const profitPercentage = order.profit_percentage ? parseFloat(order.profit_percentage) : 0;
      const quantity = order.quantity ? parseInt(order.quantity) : 1;
      const advanceAmount = parseFloat(order.advance_amount) || 0;

      // Calculate profit amount
      const profitAmount = estimatedAmount * (profitPercentage / 100);

      // Calculate price per unit (estimated amount + profit)
      const pricePerUnit = estimatedAmount + profitAmount;

      // Calculate total amount (price per unit * quantity)
      const totalAmountWithProfit = pricePerUnit * quantity;

      // Calculate balance amount
      const balanceAmount = totalAmountWithProfit - advanceAmount;

      console.log(`Order ${order.order_id} calculation:`);
      console.log(`- Total amount with profit: ${totalAmountWithProfit}`);
      console.log(`- Balance amount: ${balanceAmount}`);

      // Update the order with the correct balance amount
      const updateOrderSql = `
        UPDATE custom_orders
        SET
          balance_amount = ?
        WHERE order_id = ?
      `;

      con.query(updateOrderSql, [balanceAmount, order.order_id], (updateErr, updateResult) => {
        if (updateErr) {
          console.error(`Error updating order ${order.order_id}:`, updateErr);
          // Continue with next order
          processOrder(index + 1);
          return;
        }

        // Update all advance payments for this order
        const updatePaymentsSql = `
          UPDATE advance_payments
          SET
            total_amount = ?,
            balance_amount = ?
          WHERE order_id = ? AND is_custom_order = 1
        `;

        con.query(updatePaymentsSql, [totalAmountWithProfit, balanceAmount, order.order_id], (paymentsErr, paymentsResult) => {
          if (paymentsErr) {
            console.error(`Error updating payments for order ${order.order_id}:`, paymentsErr);
            // Continue with next order
            processOrder(index + 1);
            return;
          }

          // Add to updated orders list
          updatedOrders.push({
            order_id: order.order_id,
            order_reference: order.order_reference,
            total_amount_with_profit: totalAmountWithProfit,
            balance_amount: balanceAmount,
            payments_updated: paymentsResult.affectedRows
          });

          processedCount++;

          // Process next order
          processOrder(index + 1);
        });
      });
    };

    // Start processing orders
    processOrder(0);
  });
});

export { router as fixCustomOrderTotalAmountRouter };
