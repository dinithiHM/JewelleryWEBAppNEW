import con from './utils/db.js';

// Check custom_orders table structure
con.query('DESCRIBE custom_orders', (err, results) => {
  if (err) {
    console.error('Error describing custom_orders table:', err);
  } else {
    console.log('custom_orders table structure:');
    console.table(results);
    
    // Specifically check the payment_status column
    const paymentStatusColumn = results.find(col => col.Field === 'payment_status');
    if (paymentStatusColumn) {
      console.log('\nPayment status column details:');
      console.log(paymentStatusColumn);
      
      // If it's an enum, get the allowed values
      if (paymentStatusColumn.Type.startsWith('enum')) {
        const enumValues = paymentStatusColumn.Type
          .replace('enum(', '')
          .replace(')', '')
          .split(',')
          .map(val => val.replace(/'/g, ''));
        
        console.log('\nAllowed payment_status values:');
        console.log(enumValues);
      }
    }
  }

  // Close the connection
  con.end();
});
