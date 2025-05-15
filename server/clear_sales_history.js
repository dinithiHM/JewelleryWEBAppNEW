import con from './utils/db.js';

// Function to execute a query and return a promise
const executeQuery = (sql) => {
  return new Promise((resolve, reject) => {
    con.query(sql, (err, result) => {
      if (err) {
        console.error('Error executing query:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Main function to clear sales history
const clearSalesHistory = async () => {
  try {
    console.log('Starting to clear sales history...');
    
    // Begin transaction
    await executeQuery('START TRANSACTION');
    
    // 1. Delete records from invoices table
    console.log('Deleting records from invoices table...');
    const invoicesResult = await executeQuery('DELETE FROM invoices');
    console.log(`Deleted ${invoicesResult.affectedRows} records from invoices table`);
    
    // 2. Delete records from sale_items table
    console.log('Deleting records from sale_items table...');
    const saleItemsResult = await executeQuery('DELETE FROM sale_items');
    console.log(`Deleted ${saleItemsResult.affectedRows} records from sale_items table`);
    
    // 3. Delete records from sales table
    console.log('Deleting records from sales table...');
    const salesResult = await executeQuery('DELETE FROM sales');
    console.log(`Deleted ${salesResult.affectedRows} records from sales table`);
    
    // 4. Reset auto-increment counter for sales table
    console.log('Resetting auto-increment counter for sales table...');
    await executeQuery('ALTER TABLE sales AUTO_INCREMENT = 1');
    
    // 5. Reset auto-increment counter for sale_items table
    console.log('Resetting auto-increment counter for sale_items table...');
    await executeQuery('ALTER TABLE sale_items AUTO_INCREMENT = 1');
    
    // 6. Reset auto-increment counter for invoices table
    console.log('Resetting auto-increment counter for invoices table...');
    await executeQuery('ALTER TABLE invoices AUTO_INCREMENT = 1');
    
    // Commit transaction
    await executeQuery('COMMIT');
    
    console.log('Successfully cleared sales history and reset auto-increment counters!');
    console.log('You can now start making sales from sales_id 1.');
    
  } catch (error) {
    // Rollback transaction in case of error
    await executeQuery('ROLLBACK');
    console.error('Error clearing sales history:', error);
  } finally {
    // Close the database connection
    con.end();
    process.exit(0);
  }
};

// Run the function
clearSalesHistory();
