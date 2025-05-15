import nodemailer from 'nodemailer';

// Email configuration for Gmail
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'slankajewel@gmail.com',
    // Make sure this is the correct App Password from Google Account
    pass: 'viun mrlu hwfc nbxg'  
  },
  // Add these options to help with Gmail connectivity
  tls: {
    rejectUnauthorized: false
  }
};

// Create a transporter
const transporter = () => {
  try {
    console.log("Creating email transporter with config:", {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        // Don't log the actual password
        pass: emailConfig.auth.pass ? '********' : 'not set'
      }
    });

    const transport = nodemailer.createTransport(emailConfig);

    // Verify the connection configuration
    transport.verify(function(error, success) {
      if (error) {
        console.error('Email transporter verification failed:', error);
      } else {
        console.log('Email server is ready to send messages');
      }
    });

    return transport;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise} - Resolves with info about the sent email
 */
export const sendEmail = async (options) => {
  try {
    console.log(`Preparing to send email to: ${options.to}`);

    // Create mail options
    const mailOptions = {
      from: 'Sri Lanka Jewel <slankajewel@gmail.com>',
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || ''
    };

    // Add CC if provided
    if (options.cc) {
      mailOptions.cc = options.cc;
    }

    // Add BCC if provided
    if (options.bcc) {
      mailOptions.bcc = options.bcc;
    }

    // Add attachments if provided
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    console.log('Mail options prepared:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      // Don't log the full content for brevity
      textLength: mailOptions.text ? mailOptions.text.length : 0,
      htmlLength: mailOptions.html ? mailOptions.html.length : 0
    });

    // Get the transporter
    const transport = transporter();
    if (!transport) {
      throw new Error('Email transporter not available');
    }

    console.log('Sending email...');
    const info = await transport.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send an order confirmation email
 * @param {Object} order - Order details
 * @param {string} customerEmail - Customer email address
 * @returns {Promise} - Result of sending the email
 */
export const sendOrderConfirmation = async (order, customerEmail) => {
  const subject = `Order Confirmation #${order.order_id}`;

  // Create HTML content for the email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Order Confirmation</h2>

      <p>Dear Customer,</p>

      <p>Thank you for your order. We're pleased to confirm that we've received your order.</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Order Details</h3>
        <p><strong>Order ID:</strong> #${order.order_id}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
        <p><strong>Category:</strong> ${order.category}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Total Amount:</strong> Rs. ${Number(order.total_amount).toLocaleString()}</p>
      </div>

      <p>If you have any questions about your order, please contact our customer service.</p>

      <p>Thank you for choosing our jewelry shop!</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject,
    html
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
  const subject = `Payment Receipt for Order #${order.order_id}`;

  // Create HTML content for the email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Payment Receipt</h2>

      <p>Dear Customer,</p>

      <p>Thank you for your payment. This email confirms that we've received your payment for Order #${order.order_id}.</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
        <p><strong>Payment ID:</strong> #${payment.payment_id}</p>
        <p><strong>Date:</strong> ${new Date(payment.payment_date).toLocaleDateString()}</p>
        <p><strong>Amount Paid:</strong> Rs. ${Number(payment.amount_paid).toLocaleString()}</p>
        <p><strong>Payment Method:</strong> ${payment.payment_method}</p>
        <p><strong>Order ID:</strong> #${order.order_id}</p>
      </div>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Order Summary</h3>
        <p><strong>Total Order Amount:</strong> Rs. ${Number(order.total_amount).toLocaleString()}</p>
        <p><strong>Total Paid:</strong> Rs. ${Number(order.advance_payment_amount).toLocaleString()}</p>
        <p><strong>Remaining Balance:</strong> Rs. ${Number(order.total_amount - order.advance_payment_amount).toLocaleString()}</p>
        <p><strong>Payment Status:</strong> ${order.payment_status}</p>
      </div>

      <p>If you have any questions about your payment, please contact our customer service.</p>

      <p>Thank you for choosing our jewelry shop!</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject,
    html
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
  const subject = `Order Status Update for Order #${order.order_id}`;

  // Create HTML content for the email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Order Status Update</h2>

      <p>Dear Customer,</p>

      <p>We're writing to inform you that the status of your Order #${order.order_id} has been updated.</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Order Details</h3>
        <p><strong>Order ID:</strong> #${order.order_id}</p>
        <p><strong>Previous Status:</strong> ${order.status}</p>
        <p><strong>New Status:</strong> ${newStatus}</p>
        <p><strong>Updated On:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      ${getStatusMessage(newStatus)}

      <p>If you have any questions about your order, please contact our customer service.</p>

      <p>Thank you for choosing our jewelry shop!</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject,
    html
  });
};

/**
 * Get a message based on the order status
 * @param {string} status - Order status
 * @returns {string} - HTML message
 */
const getStatusMessage = (status) => {
  switch (status.toLowerCase()) {
    case 'processing':
      return `<p>Your order is now being processed. We'll update you when it's ready.</p>`;
    case 'completed':
      return `<p>Great news! Your order has been completed and is ready for pickup or delivery.</p>`;
    case 'cancelled':
      return `<p>Your order has been cancelled. If you didn't request this cancellation, please contact our customer service immediately.</p>`;
    default:
      return `<p>Your order status has been updated to "${status}".</p>`;
  }
};

/**
 * Send a payment reminder email for custom orders
 * @param {Object} order - Custom order details
 * @param {string} customerEmail - Customer email address
 * @returns {Promise} - Result of sending the email
 */
export const sendCustomOrderPaymentReminder = async (order, customerEmail) => {
  const subject = `Payment Reminder for Custom Order #${order.order_id}`;

  // Calculate remaining balance
  const totalAmount = Number(order.estimated_amount) || 0;
  const paidAmount = Number(order.advance_amount) || 0;
  const remainingBalance = totalAmount - paidAmount;

  // Format dates
  const orderDate = new Date(order.order_date).toLocaleDateString();
  const estimatedCompletionDate = order.estimated_completion_date ?
    new Date(order.estimated_completion_date).toLocaleDateString() : 'Not specified';

  // Create HTML content for the email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Payment Reminder</h2>

      <p>Dear ${order.customer_name},</p>

      <p>This is a friendly reminder about the remaining balance on your custom jewelry order.</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Order Details</h3>
        <p><strong>Order Reference:</strong> ${order.order_reference || `#${order.order_id}`}</p>
        <p><strong>Order Date:</strong> ${orderDate}</p>
        <p><strong>Estimated Completion:</strong> ${estimatedCompletionDate}</p>
        <p><strong>Description:</strong> ${order.description || 'Custom Jewelry Order'}</p>
      </div>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Payment Summary</h3>
        <p><strong>Total Order Amount:</strong> Rs. ${totalAmount.toLocaleString()}</p>
        <p><strong>Amount Paid:</strong> Rs. ${paidAmount.toLocaleString()}</p>
        <p><strong>Remaining Balance:</strong> <span style="color: #e53935; font-weight: bold;">Rs. ${remainingBalance.toLocaleString()}</span></p>
        <p><strong>Payment Status:</strong> ${order.payment_status}</p>
      </div>

      <p>To ensure timely completion of your order, please arrange for the payment of the remaining balance at your earliest convenience.</p>

      <p>You can make the payment by visiting our store or by contacting our customer service.</p>

      <div style="margin: 30px 0; text-align: center;">
        <a href="http://localhost:3000/DashView/custom-orders"
           style="background-color: #ffc107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          View Your Order
        </a>
      </div>

      <p>If you have already made the payment, please disregard this reminder.</p>

      <p>Thank you for choosing our jewelry shop!</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>If you have any questions, please contact our customer service.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject,
    html
  });
};

export default {
  sendEmail,
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOrderStatusUpdate,
  sendCustomOrderPaymentReminder
};
