# Database Reset Scripts

This folder contains SQL scripts to reset various tables in the database. These scripts will delete all data from the specified tables and reset the auto-increment counters to start from 1.

## Available Scripts

1. `reset_suppliers.sql` - Resets the suppliers table
2. `reset_orders.sql` - Resets the orders and order_items tables
3. `reset_custom_orders.sql` - Resets the custom_orders and related tables
4. `reset_advance_payments.sql` - Resets the advance_payments table
5. `reset_all_data.sql` - Resets all of the above tables at once

## How to Use

### Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database
3. Open the script file you want to run
4. Click the lightning bolt icon to execute the script
5. Verify that the tables have been reset

### Using MySQL Command Line

1. Open a terminal or command prompt
2. Navigate to the folder containing the script
3. Connect to your MySQL server:
   ```
   mysql -u your_username -p your_database_name
   ```
4. Enter your password when prompted
5. Run the script:
   ```
   source reset_all_data.sql
   ```
   (Replace `reset_all_data.sql` with the name of the script you want to run)

## Important Notes

- These scripts use `TRUNCATE TABLE` which is faster than `DELETE FROM` but cannot be rolled back
- Foreign key checks are temporarily disabled to allow truncating tables with foreign key relationships
- The scripts reset the auto-increment counters to 1, so new records will start with ID 1
- The `reset_all_data.sql` script also inserts sample supplier data after resetting

## Caution

**WARNING**: These scripts will permanently delete all data from the specified tables. Make sure you have a backup of your data before running these scripts if you need to preserve any existing data.
