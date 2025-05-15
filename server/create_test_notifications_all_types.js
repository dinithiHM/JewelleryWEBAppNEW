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
    'New Sale Notification',
    'A new gold ring has been sold for LKR 25,000.',
    'sales',
    JSON.stringify([
      "admin", "Admin", 
      "store manager", "Store Manager", "storemanager", 
      "cashier", "Cashier"
    ]),
    expiresAt,
    1, // Branch ID
    1, // Related ID
    'sale' // Related Type
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
    'New Inventory Order',
    'A new inventory order for Gold Jewelry has been placed with ABC Suppliers.',
    'inventory_order',
    JSON.stringify([
      "admin", "Admin", 
      "store manager", "Store Manager", "storemanager"
    ]),
    expiresAt,
    1, // Branch ID
    2, // Related ID
    'order' // Related Type
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
    'Low Stock Alert',
    'Gold Ring is running low on stock. Current stock: 5 items.',
    'low_stock',
    JSON.stringify([
      "admin", "Admin", 
      "store manager", "Store Manager", "storemanager", 
      "sales associate", "Sales Associate", "salesassociate"
    ]),
    expiresAt,
    1, // Branch ID
    3, // Related ID
    'item' // Related Type
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
