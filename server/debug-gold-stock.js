import mysql from 'mysql2';
import util from 'util';

// Create a connection to the database
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  port: 3307,
  password: '123456',
  database: 'slanakajewel'
});

// Convert callback-based functions to promise-based
const query = util.promisify(con.query).bind(con);

async function debugGoldStock() {
  try {
    console.log('Checking orders with gold...');
    const orders = await query('SELECT order_id, offer_gold, selected_karats, karat_values FROM orders WHERE offer_gold = 1 LIMIT 5');

    console.log('Orders with gold:');
    orders.forEach(order => {
      console.log(`Order ID: ${order.order_id}`);
      console.log(`Offer Gold: ${order.offer_gold}`);
      console.log(`Selected Karats: ${order.selected_karats}`);
      console.log(`Karat Values: ${order.karat_values}`);
      console.log('---');
    });

    console.log('\nChecking gold stock...');
    const goldStock = await query('SELECT * FROM gold_stock');

    console.log('Current Gold Stock:');
    goldStock.forEach(item => {
      console.log(`Stock ID: ${item.stock_id}`);
      console.log(`Purity: ${item.purity}`);
      console.log(`Quantity: ${item.quantity_in_grams} grams`);
      console.log(`Price: ${item.price_per_gram}`);
      console.log('---');
    });

    // Test the stored procedure
    if (orders.length > 0) {
      const testOrderId = orders[0].order_id;
      console.log(`\nTesting stored procedure with order ID: ${testOrderId}`);

      try {
        await query(`CALL update_gold_stock_from_order(${testOrderId})`);
        console.log('Stored procedure executed successfully');

        // Check gold stock after procedure
        console.log('\nGold stock after procedure:');
        const updatedGoldStock = await query('SELECT * FROM gold_stock');
        updatedGoldStock.forEach(item => {
          console.log(`Stock ID: ${item.stock_id}`);
          console.log(`Purity: ${item.purity}`);
          console.log(`Quantity: ${item.quantity_in_grams} grams`);
          console.log(`Price: ${item.price_per_gram}`);
          console.log('---');
        });
      } catch (procError) {
        console.error('Error executing stored procedure:', procError);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    con.end();
  }
}

debugGoldStock();
