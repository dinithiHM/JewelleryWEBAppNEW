import express from "express";
import con from "../utils/db.js";

const router = express.Router();

// Get count of jewellery items
router.get("/jewellery-items", (req, res) => {
  console.log('GET /dashboard-counts/jewellery-items - Counting jewellery items');

  // Get branch_id from query params if provided
  const branchId = req.query.branch_id;

  // Create SQL query with optional branch filter
  let sql = "SELECT COUNT(*) as count, SUM(in_stock) as total_stock FROM jewellery_items";
  const params = [];

  // Add branch filter if provided
  if (branchId) {
    sql += " WHERE branch_id = ?";
    params.push(branchId);
  }

  con.query(sql, params, (err, results) => {
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

// Get today's sales total
router.get("/today-sales", (req, res) => {
  console.log('GET /dashboard-counts/today-sales - Fetching today\'s sales total');

  // Get branch_id from query params if provided
  const branchId = req.query.branch_id;

  // Create SQL query with optional branch filter
  let sql = `
    SELECT COALESCE(SUM(total_amount), 0) as total_amount
    FROM sales
    WHERE DATE(sale_date) = CURDATE()
  `;

  const params = [];

  // Add branch filter if provided
  if (branchId) {
    sql += " AND branch_id = ?";
    params.push(branchId);
  }

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching today's sales:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json({ total_amount: results[0].total_amount || 0 });
  });
});

// Get low stock items count
router.get("/low-stock", (req, res) => {
  console.log('GET /dashboard-counts/low-stock - Counting low stock items');

  // Get branch_id from query params if provided
  const branchId = req.query.branch_id;
  // Get threshold from query params or use default (10)
  const threshold = parseInt(req.query.threshold) || 10;

  // Create SQL query with optional branch filter
  let sql = `
    SELECT COUNT(*) as count
    FROM jewellery_items
    WHERE in_stock <= ? AND in_stock > 0
  `;

  const params = [threshold];

  // Add branch filter if provided
  if (branchId) {
    sql += " AND branch_id = ?";
    params.push(branchId);
  }

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error counting low stock items:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json({ count: results[0].count || 0 });
  });
});

// Get all counts for dashboard
router.get("/all", (req, res) => {
  console.log('GET /dashboard-counts/all - Fetching all dashboard counts');

  // Get branch_id from query params if provided
  const branchId = req.query.branch_id;
  // Get threshold for low stock from query params or use default (10)
  const threshold = parseInt(req.query.threshold) || 10;

  const queries = [
    {
      name: 'jewelleryitem',
      sql: "SELECT COUNT(*) as count, SUM(in_stock) as total_stock FROM jewellery_items" + (branchId ? " WHERE branch_id = ?" : ""),
      params: branchId ? [branchId] : []
    },
    {
      name: 'lowstock',
      sql: "SELECT COUNT(*) as count FROM jewellery_items WHERE in_stock <= ? AND in_stock > 0" + (branchId ? " AND branch_id = ?" : ""),
      params: branchId ? [threshold, branchId] : [threshold]
    },
    {
      name: 'todaysales',
      sql: "SELECT COALESCE(SUM(total_amount), 0) as total_amount FROM sales WHERE DATE(sale_date) = CURDATE()" + (branchId ? " AND branch_id = ?" : ""),
      params: branchId ? [branchId] : []
    }
  ];

  const results = {};
  let completed = 0;

  queries.forEach(query => {
    con.query(query.sql, query.params || [], (err, data) => {
      if (err) {
        console.error(`Error in ${query.name} count query:`, err);
        results[query.name] = { error: err.message };
      } else {
        if (query.name === 'jewelleryitem') {
          results[query.name] = {
            count: data[0].count || 0,
            total_stock: data[0].total_stock || 0
          };
        } else if (query.name === 'todaysales') {
          results[query.name] = {
            total_amount: data[0].total_amount || 0
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
