-- Create notifications table for the jewelry management system
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('sales', 'inventory_order', 'low_stock') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  is_read BOOLEAN DEFAULT FALSE,
  target_roles JSON NOT NULL COMMENT 'Array of roles that should see this notification',
  branch_id INT,
  related_id INT COMMENT 'ID of the related entity (sale_id, order_id, item_id)',
  related_type VARCHAR(50) COMMENT 'Type of the related entity (sale, order, item)',
  
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_created_at (created_at),
  INDEX idx_notifications_expires_at (expires_at),
  INDEX idx_notifications_branch_id (branch_id),
  
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);
