-- Create gold_prices table for caching gold price data
CREATE TABLE IF NOT EXISTS gold_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  price DECIMAL(10, 2) NOT NULL,
  karat VARCHAR(10) NOT NULL DEFAULT '24K',
  currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
  timestamp DATETIME NOT NULL,
  source VARCHAR(50) DEFAULT 'GoldPriceZ API'
);

-- Add index for faster queries
CREATE INDEX idx_gold_prices_timestamp ON gold_prices(timestamp);
