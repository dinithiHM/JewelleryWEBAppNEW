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

// Create a test notification
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
  'Test Notification',
  'This is a test notification to verify that the notifications system is working correctly.',
  'sales',
  JSON.stringify(["admin", "Store Manager", "cashier"]),
  expiresAt,
  1, // Branch ID
  1, // Related ID
  'test' // Related Type
];

con.query(sql, params, (err, result) => {
  if (err) {
    console.error('Error creating test notification:', err);
    process.exit(1);
  }
  
  console.log(`Test notification created with ID: ${result.insertId}`);
  
  // Close the connection
  con.end();
});
