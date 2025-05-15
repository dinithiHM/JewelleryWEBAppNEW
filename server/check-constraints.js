// Script to check foreign key constraints on custom_orders table
import con from './utils/db.js';

// Query to check foreign key constraints
const query = `
  SELECT
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
  FROM
    information_schema.KEY_COLUMN_USAGE
  WHERE
    TABLE_NAME = 'custom_orders'
    AND COLUMN_NAME = 'supplier_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
`;

con.query(query, (err, results) => {
  if (err) {
    console.error('Error checking constraints:', err);
    process.exit(1);
  }

  console.log('Foreign key constraints on supplier_id:');
  console.log(JSON.stringify(results, null, 2));

  // Now check the suppliers table structure
  con.query('DESCRIBE suppliers', (err, supplierResults) => {
    if (err) {
      console.error('Error checking suppliers table:', err);
      process.exit(1);
    }

    console.log('\nSuppliers table structure:');
    console.log(JSON.stringify(supplierResults, null, 2));

    // Check if there are any suppliers in the database
    con.query('SELECT supplier_id, name FROM suppliers LIMIT 5', (err, supplierData) => {
      if (err) {
        console.error('Error fetching suppliers:', err);
        process.exit(1);
      }

      console.log('\nSample suppliers in database:');
      console.log(JSON.stringify(supplierData, null, 2));

      process.exit(0);
    });
  });
});
