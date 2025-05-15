import fs from 'fs';
import mysql from 'mysql2';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create connection
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'jewellery'
});

// Read SQL file
const sqlPath = path.join(__dirname, 'sql', 'gold_prices_table.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Execute SQL
con.query(sql, (err, result) => {
  if (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  }
  console.log('Gold prices table created successfully');
  con.end();
});
