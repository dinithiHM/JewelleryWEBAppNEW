-- Update the order_status ENUM to include "Picked Up"
ALTER TABLE custom_orders 
MODIFY COLUMN order_status ENUM('Pending', 'In Progress', 'Completed', 'Picked Up', 'Delivered', 'Cancelled') DEFAULT 'Pending';
