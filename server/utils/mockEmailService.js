/**
 * Mock Email Service
 *
 * This is a development replacement for the real email service when nodemailer is not available.
 * It logs email details to the console instead of actually sending emails.
 */

export const sendEmail = async (options) => {
  console.log('\n=== MOCK EMAIL SERVICE ===');
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('Text:', options.text || '(No plain text content)');
  console.log('HTML:', options.html ? '(HTML content available)' : '(No HTML content)');
  if (options.cc) console.log('CC:', options.cc);
  if (options.bcc) console.log('BCC:', options.bcc);
  if (options.attachments) console.log('Attachments:', options.attachments.length);
  console.log('=========================\n');

  // Always return success for testing
  return {
    success: true,
    messageId: `mock-email-${Date.now()}`,
    mockEmail: true
  };
};

/**
 * Send an order confirmation email
 * @param {Object} order - Order details
 * @param {string} customerEmail - Customer email address
 * @returns {Promise} - Result of sending the email
 */
export const sendOrderConfirmation = async (order, customerEmail) => {
  console.log(`MOCK EMAIL: Sending order confirmation to ${customerEmail} for order #${order.order_id}`);

  return sendEmail({
    to: customerEmail,
    subject: `Order Confirmation #${order.order_id}`,
    text: `Dear ${order.customer_name || 'Customer'}, your order #${order.order_id} has been confirmed.`
  });
};

/**
 * Send a payment receipt email
 * @param {Object} payment - Payment details
 * @param {Object} order - Order details
 * @param {string} customerEmail - Customer email address
 * @returns {Promise} - Result of sending the email
 */
export const sendPaymentReceipt = async (payment, order, customerEmail) => {
  console.log(`MOCK EMAIL: Sending payment receipt to ${customerEmail} for order #${order.order_id}`);

  return sendEmail({
    to: customerEmail,
    subject: `Payment Receipt for Order #${order.order_id}`,
    text: `Dear ${order.customer_name || 'Customer'}, we've received your payment of Rs. ${payment.amount_paid} for order #${order.order_id}.`
  });
};

/**
 * Send an order status update email
 * @param {Object} order - Order details
 * @param {string} customerEmail - Customer email address
 * @param {string} newStatus - New order status
 * @returns {Promise} - Result of sending the email
 */
export const sendOrderStatusUpdate = async (order, customerEmail, newStatus) => {
  console.log(`MOCK EMAIL: Sending status update to ${customerEmail} for order #${order.order_id} - New status: ${newStatus}`);

  return sendEmail({
    to: customerEmail,
    subject: `Order Status Update for Order #${order.order_id}`,
    text: `Dear ${order.customer_name || 'Customer'}, your order #${order.order_id} status has been updated to ${newStatus}.`
  });
};

/**
 * Send a payment reminder email for custom orders
 * @param {Object} order - Custom order details
 * @param {string} customerEmail - Customer email address
 * @returns {Promise} - Result of sending the email
 */
export const sendCustomOrderPaymentReminder = async (order, customerEmail) => {
  console.log(`MOCK EMAIL: Sending payment reminder to ${customerEmail} for custom order #${order.order_id}`);

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

  return sendEmail({
    to: customerEmail,
    subject: `Payment Reminder for Custom Order #${order.order_id}`,
    text: `Dear ${order.customer_name}, this is a reminder about your remaining balance of Rs. ${remainingBalance.toLocaleString()} for order #${order.order_id}.`
  });
};

export default {
  sendEmail,
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOrderStatusUpdate,
  sendCustomOrderPaymentReminder
};
