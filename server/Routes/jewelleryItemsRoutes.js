import express from "express";
import con from "../utils/db.js"; // Database connection
import { fileURLToPath } from "url";
import path from "path";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get all jewellery items with branch filtering
router.get("/", (req, res) => {
  console.log('GET /jewellery-items - Fetching jewellery items');

  // Get branch_id from query parameters if provided
  const branchId = req.query.branch_id;
  const userRole = req.query.role;

  console.log(`Request params - Branch ID: ${branchId}, User Role: ${userRole}`);

  let sql, queryParams = [];

  // Check if branch_id column exists in jewellery_items table
  const checkColumnSql = `
    SELECT COUNT(*) as column_exists
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'jewellery_items'
    AND column_name = 'branch_id'
  `;

  con.query(checkColumnSql, (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking for branch_id column:", checkErr);
      return res.status(500).json({ message: "Database error", error: checkErr.message });
    }

    const branchColumnExists = checkResults[0].column_exists > 0;
    console.log(`Branch column exists: ${branchColumnExists}`);

    // If branch_id column exists and branch_id is provided and user is not admin, filter by branch
    if (branchColumnExists && branchId && userRole !== 'admin') {
      sql = `
        SELECT j.*, b.branch_name, c.category_name
        FROM jewellery_items j
        LEFT JOIN branches b ON j.branch_id = b.branch_id
        LEFT JOIN categories c ON j.category = c.category_name
        WHERE j.branch_id = ?
        ORDER BY j.product_added DESC
      `;
      queryParams.push(branchId);
      console.log(`Filtering jewellery items by branch_id: ${branchId}`);
    } else if (branchColumnExists) {
      // For admin users or when no branch_id is provided, but branch_id column exists
      sql = `
        SELECT j.*, b.branch_name, c.category_name
        FROM jewellery_items j
        LEFT JOIN branches b ON j.branch_id = b.branch_id
        LEFT JOIN categories c ON j.category = c.category_name
        ORDER BY j.product_added DESC
      `;
      console.log('Fetching all jewellery items with branch info (admin view)');
    } else {
      // If branch_id column doesn't exist yet, use simpler query
      sql = `
        SELECT j.*, c.category_name
        FROM jewellery_items j
        LEFT JOIN categories c ON j.category = c.category_name
        ORDER BY j.product_added DESC
      `;
      console.log('Fetching all jewellery items without branch info (column not yet added)');
    }

    con.query(sql, queryParams, (err, results) => {
      if (err) {
        console.error("Error fetching jewellery items:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      console.log(`Found ${results.length} jewellery items`);

      // Log the first item to check if gold-related fields are included
      if (results.length > 0) {
        console.log('Sample item data:', JSON.stringify(results[0], null, 2));
      }

      res.json(results || []);
    });
  });
});

// Get jewellery item by ID
router.get("/:id", (req, res) => {
  const itemId = req.params.id;
  const sql = "SELECT * FROM jewellery_items WHERE item_id = ?";

  con.query(sql, [itemId], (err, results) => {
    if (err) {
      console.error("Error fetching jewellery item:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Jewellery item not found" });
    }
    res.json(results[0]);
  });
});

// Create new jewellery item
router.post("/create", (req, res) => {
  const {
    product_title,
    category,
    in_stock,
    buying_price,
    selling_price,
    profit_percentage,
    branch_id,
    gold_carat,
    weight,
    assay_certificate,
    is_solid_gold,
    making_charges,
    additional_materials_charges
  } = req.body;

  console.log('POST /jewellery-items/create - Creating new jewellery item');
  console.log('Request body:', req.body);

  // Basic validation
  if (!product_title || !category || in_stock === undefined || !buying_price || !selling_price) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate profit percentage if not provided
  let calculatedProfitPercentage = profit_percentage;
  if (calculatedProfitPercentage === undefined && buying_price > 0) {
    calculatedProfitPercentage = ((selling_price - buying_price) / buying_price) * 100;
    // Limit to 15%
    calculatedProfitPercentage = Math.min(calculatedProfitPercentage, 15);
  }

  const sql = `
    INSERT INTO jewellery_items (
      product_title,
      category,
      in_stock,
      buying_price,
      selling_price,
      profit_percentage,
      branch_id,
      gold_carat,
      weight,
      assay_certificate,
      is_solid_gold,
      making_charges,
      additional_materials_charges,
      product_added
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    product_title,
    category,
    in_stock,
    buying_price,
    selling_price,
    calculatedProfitPercentage !== undefined ? parseFloat(calculatedProfitPercentage.toFixed(2)) : null,
    branch_id || null, // Default to null if branch_id is not provided
    gold_carat || null,
    weight || null,
    assay_certificate || null,
    is_solid_gold !== undefined ? is_solid_gold : true,
    making_charges || null,
    additional_materials_charges || null
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error creating jewellery item:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.status(201).json({
      message: "Jewellery item created successfully",
      itemId: result.insertId
    });
  });
});

// Update jewellery item
router.put("/update/:id", (req, res) => {
  const itemId = req.params.id;
  const {
    product_title,
    category,
    in_stock,
    buying_price,
    selling_price,
    profit_percentage,
    branch_id,
    gold_carat,
    weight,
    assay_certificate,
    is_solid_gold,
    making_charges,
    additional_materials_charges
  } = req.body;

  console.log('PUT /jewellery-items/update/:id - Updating jewellery item');
  console.log('Request body:', req.body);

  // Basic validation
  if (!product_title || !category || in_stock === undefined || !buying_price || !selling_price) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate profit percentage if not provided
  let calculatedProfitPercentage = profit_percentage;
  if (calculatedProfitPercentage === undefined && buying_price > 0) {
    calculatedProfitPercentage = ((selling_price - buying_price) / buying_price) * 100;
    // Limit to 15%
    calculatedProfitPercentage = Math.min(calculatedProfitPercentage, 15);
  }

  const sql = `
    UPDATE jewellery_items
    SET
      product_title = ?,
      category = ?,
      in_stock = ?,
      buying_price = ?,
      selling_price = ?,
      profit_percentage = ?,
      branch_id = ?,
      gold_carat = ?,
      weight = ?,
      assay_certificate = ?,
      is_solid_gold = ?,
      making_charges = ?,
      additional_materials_charges = ?,
      updated_at = NOW()
    WHERE item_id = ?
  `;

  const values = [
    product_title,
    category,
    in_stock,
    buying_price,
    selling_price,
    calculatedProfitPercentage !== undefined ? parseFloat(calculatedProfitPercentage.toFixed(2)) : null,
    branch_id || null, // Default to null if branch_id is not provided
    gold_carat || null,
    weight || null,
    assay_certificate || null,
    is_solid_gold !== undefined ? is_solid_gold : true,
    making_charges || null,
    additional_materials_charges || null,
    itemId
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating jewellery item:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Jewellery item not found" });
    }

    res.json({ message: "Jewellery item updated successfully" });
  });
});

// Delete jewellery item
router.delete("/delete/:id", (req, res) => {
  const itemId = req.params.id;

  const sql = "DELETE FROM jewellery_items WHERE item_id = ?";

  con.query(sql, [itemId], (err, result) => {
    if (err) {
      console.error("Error deleting jewellery item:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Jewellery item not found" });
    }

    res.json({ message: "Jewellery item deleted successfully" });
  });
});

// Get items by category with branch filtering
router.get("/category/:category", (req, res) => {
  const category = req.params.category;
  const branchId = req.query.branch_id;
  const userRole = req.query.role;

  console.log(`GET /jewellery-items/category/${category} - Fetching jewellery items by category`);
  console.log(`Request params - Branch ID: ${branchId}, User Role: ${userRole}`);

  let sql, queryParams = [category];

  // Check if branch_id column exists in jewellery_items table
  const checkColumnSql = `
    SELECT COUNT(*) as column_exists
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'jewellery_items'
    AND column_name = 'branch_id'
  `;

  con.query(checkColumnSql, (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking for branch_id column:", checkErr);
      return res.status(500).json({ message: "Database error", error: checkErr.message });
    }

    const branchColumnExists = checkResults[0].column_exists > 0;
    console.log(`Branch column exists: ${branchColumnExists}`);

    // If branch_id column exists and branch_id is provided and user is not admin, filter by branch
    if (branchColumnExists && branchId && userRole !== 'admin') {
      sql = `
        SELECT j.*, b.branch_name, c.category_name
        FROM jewellery_items j
        LEFT JOIN branches b ON j.branch_id = b.branch_id
        LEFT JOIN categories c ON j.category = c.category_name
        WHERE j.category = ? AND j.branch_id = ?
        ORDER BY j.product_added DESC
      `;
      queryParams.push(branchId);
      console.log(`Filtering jewellery items by category: ${category} and branch_id: ${branchId}`);
    } else if (branchColumnExists) {
      // For admin users or when no branch_id is provided, but branch_id column exists
      sql = `
        SELECT j.*, b.branch_name, c.category_name
        FROM jewellery_items j
        LEFT JOIN branches b ON j.branch_id = b.branch_id
        LEFT JOIN categories c ON j.category = c.category_name
        WHERE j.category = ?
        ORDER BY j.product_added DESC
      `;
      console.log(`Fetching all jewellery items by category: ${category} with branch info (admin view)`);
    } else {
      // If branch_id column doesn't exist yet, use simpler query
      sql = `
        SELECT j.*, c.category_name
        FROM jewellery_items j
        LEFT JOIN categories c ON j.category = c.category_name
        WHERE j.category = ?
        ORDER BY j.product_added DESC
      `;
      console.log(`Fetching all jewellery items by category: ${category} without branch info (column not yet added)`);
    }

    con.query(sql, queryParams, (err, results) => {
      if (err) {
        console.error("Error fetching jewellery items by category:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      console.log(`Found ${results.length} jewellery items in category ${category}`);
      res.json(results || []);
    });
  });
});

// Get items by branch
router.get("/branch/:branchId", (req, res) => {
  const branchId = req.params.branchId;

  console.log(`GET /jewellery-items/branch/${branchId} - Fetching jewellery items by branch`);

  // Check if branch_id column exists in jewellery_items table
  const checkColumnSql = `
    SELECT COUNT(*) as column_exists
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'jewellery_items'
    AND column_name = 'branch_id'
  `;

  con.query(checkColumnSql, (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking for branch_id column:", checkErr);
      return res.status(500).json({ message: "Database error", error: checkErr.message });
    }

    const branchColumnExists = checkResults[0].column_exists > 0;
    console.log(`Branch column exists: ${branchColumnExists}`);

    if (branchColumnExists) {
      const sql = `
        SELECT j.*, b.branch_name, c.category_name
        FROM jewellery_items j
        LEFT JOIN branches b ON j.branch_id = b.branch_id
        LEFT JOIN categories c ON j.category = c.category_name
        WHERE j.branch_id = ?
        ORDER BY j.product_added DESC
      `;

      con.query(sql, [branchId], (err, results) => {
        if (err) {
          console.error("Error fetching jewellery items by branch:", err);
          return res.status(500).json({ message: "Database error", error: err.message });
        }
        console.log(`Found ${results.length} jewellery items in branch ${branchId}`);
        res.json(results || []);
      });
    } else {
      // If branch_id column doesn't exist yet, return empty array
      console.log('Branch column does not exist yet, returning empty array');
      res.json([]);
    }
  });
});

export { router as jewelleryItemsRouter };
