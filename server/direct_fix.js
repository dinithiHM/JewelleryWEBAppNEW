import con from './utils/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'sql', 'direct_fix_payment_status.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

// Split the SQL into individual statements
const statements = sql.split(';').filter(statement => statement.trim() !== '');

// Execute each statement
console.log('Executing SQL statements...');
let statementCount = 0;

function executeNextStatement() {
  if (statementCount >= statements.length) {
    console.log('All statements executed successfully.');
    process.exit(0);
    return;
  }

  const statement = statements[statementCount];
  console.log(`Executing statement ${statementCount + 1}/${statements.length}:`);
  console.log(statement);

  con.query(statement, (err, results) => {
    if (err) {
      console.error('Error executing statement:', err);
      process.exit(1);
    }

    console.log('Statement executed successfully.');
    if (results && results.length > 0) {
      console.log('Results:', results);
    }

    statementCount++;
    executeNextStatement();
  });
}

// Start execution
executeNextStatement();
