import mysql from 'mysql2';

// Create connection
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'jewellery_db'
});

// Connect to database
con.connect(err => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');

  // Check if assay_reports table exists
  con.query("SHOW TABLES LIKE 'assay_reports'", (err, tables) => {
    if (err) {
      console.error('Error checking tables:', err);
      return;
    }
    
    if (tables.length === 0) {
      console.log('assay_reports table does not exist');
      return;
    }
    
    console.log('assay_reports table exists');
    
    // Check if there are any records in the assay_reports table
    con.query('SELECT * FROM assay_reports', (err, reports) => {
      if (err) {
        console.error('Error querying assay_reports:', err);
        return;
      }
      
      console.log(`Found ${reports.length} assay reports`);
      
      if (reports.length > 0) {
        console.log('Sample report:', reports[0]);
      }
      
      // Close connection
      con.end();
    });
  });
});
