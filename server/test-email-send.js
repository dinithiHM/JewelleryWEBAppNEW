import con from './utils/db.js';
import { sendOrderStatusUpdate } from './utils/emailService.js';

// Order ID to test
const orderId = 35;

// Get the order details
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
         b.location as branch_address,
         b.contact_number as branch_phone
  FROM custom_orders co
  LEFT JOIN branches b ON co.branch_id = b.branch_id
  WHERE co.order_id = ?
`;

con.query(sql, [orderId], async (err, results) => {
  if (err) {
    console.error("Error fetching custom order:", err);
    con.end();
    return;
  }

  if (results.length === 0) {
    console.log(`No order found with ID ${orderId}`);
    con.end();
    return;
  }

  const order = results[0];
  console.log("Found order:", order);

  // Check if customer email exists
  if (!order.customer_email) {
    console.log("No customer email found for order:", orderId);
    con.end();
    return;
  }

  console.log("Customer email found:", order.customer_email);

  try {
    console.log(`Attempting to send completion notification to ${order.customer_email}`);

    // Add pickup location to order object
    order.pickup_location = order.branch_name || 'our store';

    // Calculate remaining balance
    const totalAmount = Number(order.estimated_amount) || 0;
    const paidAmount = Number(order.advance_amount) || 0;
    const remainingBalance = totalAmount - paidAmount;
    order.remaining_balance = remainingBalance;

    // Send the completion notification email
    console.log("Calling sendOrderStatusUpdate with order:", order.order_id);
    const emailResult = await sendOrderStatusUpdate(order, order.customer_email, 'Completed');
    console.log("Email sending result:", emailResult);

    con.end();
  } catch (error) {
    console.error("Error in send-completion-notification:", error);
    con.end();
  }
});
