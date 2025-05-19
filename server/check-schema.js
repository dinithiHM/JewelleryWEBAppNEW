import con from './utils/db.js';

// Check custom_orders table structure
con.query('DESCRIBE custom_orders', (err, results) => {
  if (err) {
    console.error('Error describing custom_orders table:', err);
  } else {
    console.log('custom_orders table structure:');
    console.table(results);
  }

  // Check if there are any records in the custom_orders table
  con.query('SELECT COUNT(*) as count FROM custom_orders', (countErr, countResults) => {
    if (countErr) {
      console.error('Error counting custom_orders:', countErr);
    } else {
      console.log(`Total custom orders: ${countResults[0].count}`);
    }

    // Close the connection
    con.end();
  });
});
