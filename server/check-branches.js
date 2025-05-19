import con from './utils/db.js';

// Check branches table structure
con.query('DESCRIBE branches', (err, results) => {
  if (err) {
    console.error('Error describing branches table:', err);
  } else {
    console.log('branches table structure:');
    console.table(results);
  }

  // Check if there are any records in the branches table
  con.query('SELECT * FROM branches', (countErr, countResults) => {
    if (countErr) {
      console.error('Error fetching branches:', countErr);
    } else {
      console.log(`Total branches: ${countResults.length}`);
      console.log('Branch data:');
      console.table(countResults);
    }

    // Close the connection
    con.end();
  });
});
