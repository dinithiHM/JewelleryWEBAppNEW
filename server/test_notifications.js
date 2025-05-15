// This script tests the notification system by creating notifications of all types
// Run with: node test_notifications.js

import mysql from 'mysql2/promise';

// Create connection
const createConnection = async () => {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: 3307,
    password: '123456',
    database: 'slanakajewel'
  });
};

// Calculate expiration date (5 days from now)
const getExpirationDate = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 5);
  return expiresAt;
};

// Create a test sales notification
const createSalesNotification = async (con) => {
  console.log('Creating test sales notification...');
  
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
    'This is a test sales notification to verify that the notification system is working correctly.',
    'sales',
    JSON.stringify([
      "admin", "Admin", "administrator", "Administrator",
      "store manager", "Store Manager", "storemanager", "StoreManager",
      "cashier", "Cashier"
    ]),
    getExpirationDate(),
    1, // Branch ID
    1, // Related ID
    'sale' // Related Type
  ];

  try {
    const [result] = await con.execute(sql, params);
    console.log(`Test sales notification created with ID: ${result.insertId}`);
    return result.insertId;
  } catch (err) {
    console.error('Error creating test sales notification:', err);
    throw err;
  }
};

// Create a test inventory order notification
const createInventoryOrderNotification = async (con) => {
  console.log('Creating test inventory order notification...');
  
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
    'This is a test inventory order notification to verify that the notification system is working correctly.',
    'inventory_order',
    JSON.stringify([
      "admin", "Admin", "administrator", "Administrator",
      "store manager", "Store Manager", "storemanager", "StoreManager"
    ]),
    getExpirationDate(),
    1, // Branch ID
    2, // Related ID
    'order' // Related Type
  ];

  try {
    const [result] = await con.execute(sql, params);
    console.log(`Test inventory order notification created with ID: ${result.insertId}`);
    return result.insertId;
  } catch (err) {
    console.error('Error creating test inventory order notification:', err);
    throw err;
  }
};

// Create a test low stock notification
const createLowStockNotification = async (con) => {
  console.log('Creating test low stock notification...');
  
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
    'This is a test low stock notification to verify that the notification system is working correctly.',
    'low_stock',
    JSON.stringify([
      "admin", "Admin", "administrator", "Administrator",
      "store manager", "Store Manager", "storemanager", "StoreManager",
      "sales associate", "Sales Associate", "salesassociate", "SalesAssociate"
    ]),
    getExpirationDate(),
    1, // Branch ID
    3, // Related ID
    'item' // Related Type
  ];

  try {
    const [result] = await con.execute(sql, params);
    console.log(`Test low stock notification created with ID: ${result.insertId}`);
    return result.insertId;
  } catch (err) {
    console.error('Error creating test low stock notification:', err);
    throw err;
  }
};

// Create all test notifications
const createAllTestNotifications = async () => {
  let con;
  try {
    con = await createConnection();
    console.log('Connected to database');
    
    await createSalesNotification(con);
    await createInventoryOrderNotification(con);
    await createLowStockNotification(con);
    
    console.log('All test notifications created successfully');
  } catch (error) {
    console.error('Error creating test notifications:', error);
  } finally {
    if (con) {
      await con.end();
      console.log('Database connection closed');
    }
  }
};

// Run the function
createAllTestNotifications();
