-- Create email_logs table for tracking email activities
CREATE TABLE IF NOT EXISTS email_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  email_type VARCHAR(50) NOT NULL COMMENT 'Type of email: payment_reminder, order_confirmation, etc.',
  recipient_email VARCHAR(100) NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' COMMENT 'sent, failed, etc.',
  message_id VARCHAR(100),
  error_message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_email_logs_order_id (order_id),
  INDEX idx_email_logs_email_type (email_type),
  INDEX idx_email_logs_sent_at (sent_at)
);
