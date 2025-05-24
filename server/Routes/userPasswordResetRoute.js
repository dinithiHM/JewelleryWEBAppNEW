import express from 'express';
import bcrypt from 'bcrypt';
import con from '../utils/db.js';

const router = express.Router();

// Route to reset a user's password (admin only)
router.put('/reset-password/:id', async (req, res) => {
  const userId = req.params.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  // Validate password strength
  const validatePassword = (password) => {
    const errors = [];

    // Check minimum length
    if (password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    // Check for special characters
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return errors;
  };

  // Validate the password
  const validationErrors = validatePassword(password);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: 'Password does not meet security requirements',
      errors: validationErrors
    });
  }

  try {
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update the user's password in the database
    const sql = 'UPDATE users SET password = ? WHERE user_id = ?';

    con.query(sql, [hashedPassword, userId], (err, result) => {
      if (err) {
        console.error('Error resetting password:', err);
        return res.status(500).json({
          message: 'Failed to reset password',
          error: err.message
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
        message: 'Password reset successfully',
        user_id: userId
      });
    });
  } catch (error) {
    console.error('Error in password reset process:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
