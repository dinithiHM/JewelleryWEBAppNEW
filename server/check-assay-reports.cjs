const mysql = require('mysql2/promise');

async function checkAssayReports() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'jewellery_db'
    });

    console.log('Connected to database');

    // Query to get all assay reports
    const [reports] = await connection.execute('SELECT * FROM assay_reports');
    console.log('Assay Reports:', reports);
    console.log(`Total reports: ${reports.length}`);

    // Close connection
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAssayReports();
