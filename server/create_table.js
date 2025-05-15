import con from './utils/db.js';

// SQL to create the gold_prices table
const sql = `
CREATE TABLE IF NOT EXISTS gold_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  price DECIMAL(10, 2) NOT NULL,
  karat VARCHAR(10) NOT NULL DEFAULT '24K',
  currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
  timestamp DATETIME NOT NULL,
  source VARCHAR(50) DEFAULT 'GoldPriceZ API',
  INDEX idx_gold_prices_timestamp (timestamp)
);
`;

// Execute the SQL
con.query(sql, (err, result) => {
  if (err) {
    console.error('Error creating gold_prices table:', err);
  } else {
    console.log('gold_prices table created or already exists');
  }

  // Close the connection
  con.end();
  process.exit(0);
});
