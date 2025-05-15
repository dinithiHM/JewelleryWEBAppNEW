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

// Create a test inventory order notification
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
  'A new inventory order for Gold Jewelry has been placed with ABC Suppliers',
  'inventory_order',
  JSON.stringify(["admin", "Store Manager"]),
  expiresAt,
  1, // Branch ID
  3, // Related ID (order_id)
  'order' // Related Type
];

con.query(sql, params, (err, result) => {
  if (err) {
    console.error('Error creating test inventory order notification:', err);
    process.exit(1);
  }
  
  console.log(`Test inventory order notification created with ID: ${result.insertId}`);
  
  // Close the connection
  con.end();
});
