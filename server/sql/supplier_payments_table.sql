-- Create supplier_payments table for tracking payments to suppliers
CREATE TABLE IF NOT EXISTS supplier_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- Add index for faster queries
CREATE INDEX idx_supplier_payments_order_id ON supplier_payments(order_id);

-- Add columns to orders table for payment tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_payment_amount DECIMAL(10, 2) NULL COMMENT 'Total amount to be paid to supplier',
ADD COLUMN IF NOT EXISTS advance_payment_amount DECIMAL(10, 2) NULL COMMENT 'Initial payment made to supplier',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending' COMMENT 'Payment status (Pending, Partial, Completed)';
