import con from './utils/db.js';

console.log('Starting database update script...');

// Function to execute a query and log the result
const executeQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing query: ${query}`);
    con.query(query, params, (err, result) => {
      if (err) {
        console.error(`Error executing query: ${err.message}`);
        return reject(err);
      }
      console.log(`Query executed successfully: ${JSON.stringify(result)}`);
      resolve(result);
    });
  });
};

// Main function to update the database
const updateDatabase = async () => {
  try {
    // Check if user_id column exists
    const userIdColumnCheck = await executeQuery("SHOW COLUMNS FROM sales LIKE 'user_id'");
    if (userIdColumnCheck.length === 0) {
      console.log('Adding user_id column to sales table...');
      await executeQuery("ALTER TABLE sales ADD COLUMN user_id INT");
    } else {
      console.log('user_id column already exists in sales table.');
    }

    // Check if branch_id column exists
    const branchIdColumnCheck = await executeQuery("SHOW COLUMNS FROM sales LIKE 'branch_id'");
    if (branchIdColumnCheck.length === 0) {
      console.log('Adding branch_id column to sales table...');
      await executeQuery("ALTER TABLE sales ADD COLUMN branch_id INT");
    } else {
      console.log('branch_id column already exists in sales table.');
    }

    // Check if branches table exists
    const branchesTableCheck = await executeQuery("SHOW TABLES LIKE 'branches'");
    if (branchesTableCheck.length === 0) {
      console.log('Creating branches table...');
      await executeQuery(`
        CREATE TABLE branches (
          branch_id INT PRIMARY KEY AUTO_INCREMENT,
          branch_name VARCHAR(100) NOT NULL,
          location VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert default branches
      console.log('Inserting default branches...');
      await executeQuery(`
        INSERT INTO branches (branch_id, branch_name, location) 
        VALUES 
        (1, 'Mahiyangana Branch', 'Mahiyangana'),
        (2, 'Mahaoya Branch', 'Mahaoya')
      `);
    } else {
      console.log('branches table already exists.');
      
      // Check if default branches exist
      const branchesCheck = await executeQuery("SELECT * FROM branches WHERE branch_id IN (1, 2)");
      if (branchesCheck.length < 2) {
        console.log('Inserting missing default branches...');
        if (!branchesCheck.some(b => b.branch_id === 1)) {
          await executeQuery("INSERT INTO branches (branch_id, branch_name, location) VALUES (1, 'Mahiyangana Branch', 'Mahiyangana')");
        }
        if (!branchesCheck.some(b => b.branch_id === 2)) {
          await executeQuery("INSERT INTO branches (branch_id, branch_name, location) VALUES (2, 'Mahaoya Branch', 'Mahaoya')");
        }
      } else {
        console.log('Default branches already exist.');
      }
    }

    console.log('Database update completed successfully!');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    // Close the database connection
    con.end();
  }
};

// Run the update
updateDatabase();
