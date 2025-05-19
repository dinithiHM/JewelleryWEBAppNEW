import con from './utils/db.js';

// Order ID to update
const orderId = 36; // Use the order ID from your error message
const newStatus = 'Completed';
const supplierNotes = 'Test notes from update script';

// Update the order status
const sql = `
  UPDATE custom_orders
  SET order_status = ?, supplier_notes = ?
  WHERE order_id = ?
`;

con.query(sql, [newStatus, supplierNotes, orderId], (err, result) => {
  if (err) {
    console.error('Error updating order status:', err);
  } else {
    console.log('Update result:', result);
    
    if (result.affectedRows === 0) {
      console.log(`No order found with ID ${orderId}`);
    } else {
      console.log(`Successfully updated order ${orderId} status to ${newStatus}`);
    }
  }
  
  // Now verify the update by fetching the order
  con.query('SELECT * FROM custom_orders WHERE order_id = ?', [orderId], (selectErr, selectResult) => {
    if (selectErr) {
      console.error('Error fetching updated order:', selectErr);
    } else {
      console.log('Updated order details:');
      console.log(selectResult[0]);
    }
    
    // Close the connection
    con.end();
  });
});
