-- Insert a test sales notification
INSERT INTO notifications (
  title, 
  message, 
  type, 
  target_roles, 
  expires_at, 
  branch_id, 
  related_id, 
  related_type
) VALUES (
  'Test Sales Notification',
  'This is a test sales notification to verify that the notifications system is working correctly.',
  'sales',
  '["admin", "Store Manager", "cashier"]',
  DATE_ADD(NOW(), INTERVAL 5 DAY),
  1,
  1,
  'test'
);

-- Insert a test inventory order notification
INSERT INTO notifications (
  title, 
  message, 
  type, 
  target_roles, 
  expires_at, 
  branch_id, 
  related_id, 
  related_type
) VALUES (
  'Test Inventory Order Notification',
  'This is a test inventory order notification to verify that the notifications system is working correctly.',
  'inventory_order',
  '["admin", "Store Manager"]',
  DATE_ADD(NOW(), INTERVAL 5 DAY),
  1,
  2,
  'test'
);

-- Insert a test low stock notification
INSERT INTO notifications (
  title, 
  message, 
  type, 
  target_roles, 
  expires_at, 
  branch_id, 
  related_id, 
  related_type
) VALUES (
  'Test Low Stock Notification',
  'This is a test low stock notification to verify that the notifications system is working correctly.',
  'low_stock',
  '["admin", "Store Manager", "sales associate"]',
  DATE_ADD(NOW(), INTERVAL 5 DAY),
  1,
  3,
  'test'
);
