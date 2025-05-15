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

// Create a test low stock notification
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
  'Gold Ring is running low on stock. Current stock: 5',
  'low_stock',
  JSON.stringify(["admin", "Store Manager", "sales associate"]),
  expiresAt,
  1, // Branch ID
  2, // Related ID (item_id)
  'item' // Related Type
];

con.query(sql, params, (err, result) => {
  if (err) {
    console.error('Error creating test low stock notification:', err);
    process.exit(1);
  }
  
  console.log(`Test low stock notification created with ID: ${result.insertId}`);
  
  // Close the connection
  con.end();
});
