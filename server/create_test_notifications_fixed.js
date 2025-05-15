import mysql from 'mysql2';

// Create connection
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  port: 3307,
  password: '123456',
  database: 'slanakajewel'
});

// Calculate expiration date (5 days from now)
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 5);

// Create a test sales notification
const createSalesNotification = () => {
  const sql = `
    INSERT INTO notifications (
      title, 
      message, 
      type, 
      target_roles, 
      expires_at, 
      branch_id, 
      related_id, 
      related_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    'Test Sales Notification',
    'This is a test sales notification to verify that the notifications system is working correctly.',
    'sales',
    JSON.stringify(["admin", "Store Manager", "cashier"]),
    expiresAt,
    1, // Branch ID
    1, // Related ID
    'test' // Related Type
  ];

  return new Promise((resolve, reject) => {
    con.query(sql, params, (err, result) => {
      if (err) {
        console.error('Error creating sales notification:', err);
        reject(err);
      } else {
        console.log(`Sales notification created with ID: ${result.insertId}`);
        resolve(result.insertId);
      }
    });
  });
};

// Create a test inventory order notification
const createInventoryOrderNotification = () => {
  const sql = `
    INSERT INTO notifications (
      title, 
      message, 
      type, 
      target_roles, 
      expires_at, 
      branch_id, 
      related_id, 
      related_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    'Test Inventory Order Notification',
    'This is a test inventory order notification to verify that the notifications system is working correctly.',
    'inventory_order',
    JSON.stringify(["admin", "Store Manager"]),
    expiresAt,
    1, // Branch ID
    2, // Related ID
    'test' // Related Type
  ];

  return new Promise((resolve, reject) => {
    con.query(sql, params, (err, result) => {
      if (err) {
        console.error('Error creating inventory order notification:', err);
        reject(err);
      } else {
        console.log(`Inventory order notification created with ID: ${result.insertId}`);
        resolve(result.insertId);
      }
    });
  });
};

// Create a test low stock notification
const createLowStockNotification = () => {
  const sql = `
    INSERT INTO notifications (
      title, 
      message, 
      type, 
      target_roles, 
      expires_at, 
      branch_id, 
      related_id, 
      related_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    'Test Low Stock Notification',
    'This is a test low stock notification to verify that the notifications system is working correctly.',
    'low_stock',
    JSON.stringify(["admin", "Store Manager", "sales associate"]),
    expiresAt,
    1, // Branch ID
    3, // Related ID
    'test' // Related Type
  ];

  return new Promise((resolve, reject) => {
    con.query(sql, params, (err, result) => {
      if (err) {
        console.error('Error creating low stock notification:', err);
        reject(err);
      } else {
        console.log(`Low stock notification created with ID: ${result.insertId}`);
        resolve(result.insertId);
      }
    });
  });
};

// Run all notification creation functions
const createAllNotifications = async () => {
  try {
    await createSalesNotification();
    await createInventoryOrderNotification();
    await createLowStockNotification();
    console.log('All test notifications created successfully');
  } catch (error) {
    console.error('Error creating test notifications:', error);
  } finally {
    con.end();
  }
};

// Execute the function
createAllNotifications();
