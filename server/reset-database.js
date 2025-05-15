import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jewellery_db',
  multipleStatements: true // Important for running multiple SQL statements
});

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'sql', 'reset_all_data.sql');
const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

console.log('Connecting to database...');

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  
  console.log('Connected to database. Executing reset script...');
  
  // Execute the SQL script
  connection.query(sqlScript, (err, results) => {
    if (err) {
      console.error('Error executing SQL script:', err);
      connection.end();
      process.exit(1);
    }
    
    console.log('Database reset completed successfully!');
    console.log('Results:');
    
    // The last query in the script returns a count of rows in each table
    const lastResult = results[results.length - 1];
    if (Array.isArray(lastResult)) {
      lastResult.forEach(row => {
        console.log(`${row.Table_Name}: ${row.Row_Count} rows`);
      });
    }
    
    // Close the connection
    connection.end();
    console.log('Database connection closed.');
  });
});
