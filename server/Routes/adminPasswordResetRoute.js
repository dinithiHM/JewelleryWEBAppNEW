import express from 'express';
import crypto from 'crypto';
import con from '../utils/db.js';
// Try to use the real email service first
import { sendEmail as sendRealEmail } from '../utils/emailService.js';
// Fallback to mock email service if real one fails
import { sendEmail as sendMockEmail } from '../utils/mockEmailService.js';

const router = express.Router();

// Store reset tokens in memory (in a real app, you'd use a database table)
const resetTokens = new Map();

// Request password reset - generates token and sends email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    // Check if email exists in admin table
    const sql = "SELECT * FROM admin WHERE email = ?";

    con.query(sql, [email], async (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Server error while checking email'
        });
      }

      // Always return success even if email not found (security best practice)
      // But only send email if admin exists
      if (result.length === 0) {
        console.log(`Password reset requested for non-existent admin email: ${email}`);
        return res.status(200).json({
          success: true,
          message: 'If your email exists in our system, you will receive password reset instructions',
          // Include a dummy reset URL for testing even if email doesn't exist
          debug: {
            resetUrl: `http://localhost:3000/reset-password?token=dummy-token-for-testing`,
            emailSent: false,
            usedMockService: true,
            emailAddress: email,
            messageId: 'not-sent-dummy-id'
          }
        });
      }

      const admin = result[0];

      // Generate a random token
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Store the token with admin ID and expiration (1 hour)
      resetTokens.set(resetToken, {
        adminId: admin.id,
        email: admin.email,
        expires: Date.now() + 3600000 // 1 hour from now
      });

      // Create reset URL
      const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

      // Log the email we're trying to send to
      console.log(`Attempting to send password reset email to: ${admin.email}`);

      try {
        // Prepare email content
        const emailOptions = {
          to: admin.email,
          subject: 'Password Reset - Sri Lanka Jewel Admin',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Password Reset Request</h2>

              <p>You requested a password reset for your admin account at Sri Lanka Jewel.</p>

              <p>Please click the button below to reset your password. This link will expire in 1 hour.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #f0c14b; color: #111; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
              </div>

              <p>If you cannot click the button, copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>

              <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
                <p>This is an automated email. Please do not reply to this message.</p>
              </div>
            </div>
          `
        };

        // Try to send with real email service first
        console.log('Attempting to send email using real email service...');
        let emailResult;
        let usedMockService = false;

        try {
          emailResult = await sendRealEmail(emailOptions);
          console.log('Real email service result:', emailResult);
        } catch (realEmailError) {
          console.error('Real email service failed:', realEmailError);
          console.log('Falling back to mock email service...');

          // If real email service fails, try mock service
          emailResult = await sendMockEmail(emailOptions);
          usedMockService = true;
          console.log('Mock email service result:', emailResult);
        }

        // For testing purposes, log the reset token and URL to the console
        console.log('===== FOR TESTING ONLY =====');
        console.log('Reset Token:', resetToken);
        console.log('Reset URL:', resetUrl);
        console.log('============================');

        if (emailResult.success) {
          return res.status(200).json({
            success: true,
            message: 'If your email exists in our system, you will receive password reset instructions',
            // Include diagnostic info and reset URL in the response
            debug: {
              resetUrl: resetUrl,
              emailSent: true,
              usedMockService: usedMockService,
              emailAddress: admin.email,
              messageId: emailResult.messageId || 'unknown'
            }
          });
        } else {
          console.error('Both email services failed:', emailResult.error);
          return res.status(500).json({
            success: false,
            message: 'Error sending password reset email',
            error: emailResult.error,
            debug: {
              resetUrl: resetUrl, // Still include reset URL for testing
              emailSent: false,
              emailAddress: admin.email,
              error: emailResult.error
            }
          });
        }
      } catch (emailError) {
        console.error('Exception during email sending process:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Exception occurred while sending email',
          error: emailError.message,
          debug: {
            resetUrl: resetUrl, // Still include reset URL for testing
            emailSent: false,
            emailAddress: admin.email,
            error: emailError.message
          }
        });
      }
    });
  } catch (error) {
    console.error('Error in password reset process:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
});

// Reset password with token
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Token and new password are required'
    });
  }

  // Check if token exists and is valid
  const tokenData = resetTokens.get(token);

  if (!tokenData) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  // Check if token is expired
  if (tokenData.expires < Date.now()) {
    // Remove expired token
    resetTokens.delete(token);

    return res.status(400).json({
      success: false,
      message: 'Token has expired'
    });
  }

  // Update password in database
  const sql = "UPDATE admin SET password = ? WHERE id = ?";

  con.query(sql, [newPassword, tokenData.adminId], (err, result) => {
    if (err) {
      console.error('Error updating password:', err);
      return res.status(500).json({
        success: false,
        message: 'Error updating password'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Remove used token
    resetTokens.delete(token);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  });
});

export default router;
