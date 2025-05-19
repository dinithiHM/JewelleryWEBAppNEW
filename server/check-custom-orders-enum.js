import con from './utils/db.js';

// Query to check the ENUM values for order_status in custom_orders table
const sql = `
  SELECT COLUMN_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'custom_orders'
  AND COLUMN_NAME = 'order_status'
`;

con.query(sql, (err, results) => {
  if (err) {
    console.error('Error checking ENUM values:', err);
    process.exit(1);
  }

  if (results.length > 0) {
    console.log('Current ENUM values for order_status:');
    console.log(results[0].COLUMN_TYPE);
  } else {
    console.log('Column not found');
  }

  // Close the connection
  con.end();
});
