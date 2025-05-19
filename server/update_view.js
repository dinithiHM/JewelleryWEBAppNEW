import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import con from './utils/db.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'fix_custom_order_view.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Split the SQL statements
const statements = sqlContent.split(';').filter(stmt => stmt.trim() !== '');

console.log(`Found ${statements.length} SQL statements to execute`);

// Execute each statement
let executedCount = 0;
for (const statement of statements) {
  if (statement.trim()) {
    con.query(statement, (err, result) => {
      if (err) {
        console.error(`Error executing SQL statement: ${err.message}`);
        console.error('Statement:', statement);
      } else {
        console.log(`Successfully executed SQL statement #${++executedCount}`);
        if (executedCount === statements.length) {
          console.log('All statements executed successfully');
          // Close the connection when all statements are executed
          con.end();
        }
      }
    });
  }
}
