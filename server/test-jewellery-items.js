import con from './utils/db.js';

// Query to check jewellery items with branch_id
const sql = `
  SELECT 
    j.branch_id,
    b.branch_name,
    j.category,
    SUM(j.in_stock) as total_stock
  FROM 
    jewellery_items j
  LEFT JOIN 
    branches b ON j.branch_id = b.branch_id
  WHERE 
    j.branch_id IN (1, 2) -- Mahiyangana (1) and MahaOya (2)
  GROUP BY 
    j.branch_id, j.category
  ORDER BY 
    j.branch_id, j.category
`;

console.log('Executing query to check jewellery items with branch_id...');

con.query(sql, (err, results) => {
  if (err) {
    console.error('Error executing query:', err);
    process.exit(1);
  }

  console.log('Query results:');
  console.log(JSON.stringify(results, null, 2));

  // Check if there are any results
  if (results.length === 0) {
    console.log('No jewellery items found with branch_id 1 or 2');
    
    // Check if there are any jewellery items at all
    con.query('SELECT COUNT(*) as count FROM jewellery_items', (err, countResults) => {
      if (err) {
        console.error('Error counting jewellery items:', err);
      } else {
        console.log(`Total jewellery items in the database: ${countResults[0].count}`);
      }
      
      // Check if there are any jewellery items with branch_id
      con.query('SELECT COUNT(*) as count FROM jewellery_items WHERE branch_id IS NOT NULL', (err, branchCountResults) => {
        if (err) {
          console.error('Error counting jewellery items with branch_id:', err);
        } else {
          console.log(`Jewellery items with branch_id: ${branchCountResults[0].count}`);
        }
        
        // Check branches table
        con.query('SELECT * FROM branches', (err, branchesResults) => {
          if (err) {
            console.error('Error fetching branches:', err);
          } else {
            console.log('Branches in the database:');
            console.log(JSON.stringify(branchesResults, null, 2));
          }
          
          process.exit(0);
        });
      });
    });
  } else {
    process.exit(0);
  }
});
