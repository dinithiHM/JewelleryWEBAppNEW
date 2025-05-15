import express from "express";
import con from "../utils/db.js";

const router = express.Router();

// Get count of jewellery items
router.get("/jewellery-items", (req, res) => {
  console.log('GET /dashboard-counts/jewellery-items - Counting jewellery items');
  
  const sql = "SELECT COUNT(*) as count, SUM(in_stock) as total_stock FROM jewellery_items";
  
  con.query(sql, (err, results) => {
    if (err) {
      console.error("Error counting jewellery items:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    
    res.json({
      count: results[0].count || 0,
      total_stock: results[0].total_stock || 0
    });
  });
});

// Get count of users by role
router.get("/users/:role", (req, res) => {
  const role = req.params.role;
  console.log(`GET /dashboard-counts/users/${role} - Counting users with role ${role}`);
  
  // Convert role parameter to match database format
  let dbRole = role;
  if (role === 'storemanager') {
    dbRole = 'Store Manager';
  } else if (role === 'salesassociate') {
    dbRole = 'Sales Associate';
  } else if (role === 'cashier') {
    dbRole = 'Cashier';
  }
  
  const sql = "SELECT COUNT(*) as count FROM users WHERE role = ?";
  
  con.query(sql, [dbRole], (err, results) => {
    if (err) {
      console.error(`Error counting ${role} users:`, err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    
    res.json({ count: results[0].count || 0 });
  });
});

// Get all counts for dashboard
router.get("/all", (req, res) => {
  console.log('GET /dashboard-counts/all - Fetching all dashboard counts');
  
  const queries = [
    { name: 'jewelleryitem', sql: "SELECT COUNT(*) as count, SUM(in_stock) as total_stock FROM jewellery_items" },
    { name: 'storemanager', sql: "SELECT COUNT(*) as count FROM users WHERE role = 'Store Manager'" },
    { name: 'cashier', sql: "SELECT COUNT(*) as count FROM users WHERE role = 'Cashier'" },
    { name: 'salesassociate', sql: "SELECT COUNT(*) as count FROM users WHERE role = 'Sales Associate'" }
  ];
  
  const results = {};
  let completed = 0;
  
  queries.forEach(query => {
    con.query(query.sql, (err, data) => {
      if (err) {
        console.error(`Error in ${query.name} count query:`, err);
        results[query.name] = { error: err.message };
      } else {
        if (query.name === 'jewelleryitem') {
          results[query.name] = {
            count: data[0].count || 0,
            total_stock: data[0].total_stock || 0
          };
        } else {
          results[query.name] = { count: data[0].count || 0 };
        }
      }
      
      completed++;
      if (completed === queries.length) {
        res.json(results);
      }
    });
  });
});

export { router as dashboardCountsRouter };
