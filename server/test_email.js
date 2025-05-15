import { sendEmail } from './utils/emailService.js';

// Test email function
const testEmail = async () => {
  console.log('Testing email functionality...');

  try {
    // Use your own email for testing
    const testEmailAddress = 'dinithimahathanthri456@gmail.com';

    const result = await sendEmail({
      to: testEmailAddress,
      subject: 'Test Email from Jewelry System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Test Email</h2>

          <p>This is a test email from your jewelry system.</p>

          <p>If you're receiving this email, it means your email configuration is working correctly.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
            <p>This is an automated test email. Please do not reply to this message.</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    });

    if (result.success) {
      console.log('Test email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.error('Failed to send test email:', result.error);
    }
  } catch (error) {
    console.error('Error in test email function:', error);
  }
};

// Run the test
testEmail();
