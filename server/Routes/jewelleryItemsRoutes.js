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

// This route has been moved after the specific routes to avoid route conflicts

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

  console.log('Create - Profit percentage from request:', profit_percentage);
  console.log('Create - Buying price:', buying_price);
  console.log('Create - Selling price:', selling_price);

  if (calculatedProfitPercentage === undefined && buying_price > 0) {
    calculatedProfitPercentage = ((selling_price - buying_price) / buying_price) * 100;
    // Limit to 15%
    calculatedProfitPercentage = Math.min(calculatedProfitPercentage, 15);
    console.log('Create - Calculated profit percentage:', calculatedProfitPercentage);
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
    calculatedProfitPercentage !== undefined && calculatedProfitPercentage !== null ?
      parseFloat(typeof calculatedProfitPercentage === 'number' ? calculatedProfitPercentage.toFixed(2) : calculatedProfitPercentage) :
      null,
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
  console.log('Item ID:', itemId);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Product title from request:', product_title);

  // Basic validation
  if (!product_title || !category || in_stock === undefined || !buying_price || !selling_price) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Calculate profit percentage if not provided
  let calculatedProfitPercentage = profit_percentage;

  console.log('Profit percentage from request:', profit_percentage);
  console.log('Buying price:', buying_price);
  console.log('Selling price:', selling_price);

  if (calculatedProfitPercentage === undefined && buying_price > 0) {
    calculatedProfitPercentage = ((selling_price - buying_price) / buying_price) * 100;
    // Limit to 15%
    calculatedProfitPercentage = Math.min(calculatedProfitPercentage, 15);
    console.log('Calculated profit percentage:', calculatedProfitPercentage);
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
    calculatedProfitPercentage !== undefined && calculatedProfitPercentage !== null ?
      parseFloat(typeof calculatedProfitPercentage === 'number' ? calculatedProfitPercentage.toFixed(2) : calculatedProfitPercentage) :
      null,
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

// Test endpoint to check if the server is working correctly
router.get("/test", (_req, res) => {
  console.log('GET /jewellery-items/test - Testing endpoint');
  return res.json({ message: "Test endpoint working correctly" });
});

// Get stock levels by branch and category
router.get("/stock-by-branch", (_req, res) => {
  console.log('GET /jewellery-items/stock-by-branch - Fetching stock levels by branch and category');
  console.log('Request received at:', new Date().toISOString());

  // First, check if branch_id column exists and if there are any jewellery items
  const checkSql = `
    SELECT COUNT(*) as count
    FROM jewellery_items
  `;

  con.query(checkSql, (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking jewellery items:", checkErr);
      return res.status(500).json({ message: "Database error", error: checkErr.message });
    }

    console.log(`Found ${checkResults[0].count} total jewellery items`);

    // If no items found, return empty data
    if (checkResults[0].count === 0) {
      console.log("No jewellery items found in the database");
      return res.json({
        categories: [],
        stockByBranch: { 1: {}, 2: {} }
      });
    }

    // Check if branch_id column has values assigned
    const checkBranchSql = `
      SELECT COUNT(*) as count
      FROM jewellery_items
      WHERE branch_id IS NOT NULL
    `;

    con.query(checkBranchSql, (branchErr, branchResults) => {
      if (branchErr) {
        console.error("Error checking branch_id values:", branchErr);
        return res.status(500).json({ message: "Database error", error: branchErr.message });
      }

      console.log(`Found ${branchResults[0].count} jewellery items with branch_id assigned`);

      // If no branch_id values are assigned, assign them
      if (branchResults[0].count === 0) {
        console.log("No branch_id values assigned. Assigning branch_id values...");

        // Assign branch_id values to existing items (alternating between 1 and 2)
        const updateSql = `
          UPDATE jewellery_items
          SET branch_id = CASE
            WHEN item_id % 2 = 0 THEN 1  -- Even IDs to branch 1 (Mahiyangana)
            ELSE 2                       -- Odd IDs to branch 2 (MahaOya)
          END
          WHERE branch_id IS NULL
        `;

        con.query(updateSql, (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Error assigning branch_id values:", updateErr);
            return res.status(500).json({ message: "Database error", error: updateErr.message });
          }

          console.log(`Assigned branch_id values to ${updateResult.affectedRows} jewellery items`);

          // Now update in_stock values for all items that have NULL or 0 values
          const updateStockSql = `
            UPDATE jewellery_items
            SET in_stock = FLOOR(RAND() * 20) + 5  -- Random stock between 5-25
            WHERE in_stock IS NULL OR in_stock = 0
          `;

          con.query(updateStockSql, (stockUpdateErr, stockUpdateResult) => {
            if (stockUpdateErr) {
              console.error("Error updating in_stock values:", stockUpdateErr);
              // Continue anyway, this is not critical
            } else {
              console.log(`Updated in_stock values for ${stockUpdateResult.affectedRows} jewellery items`);
            }

            // Continue with fetching categories and stock data
            fetchCategoriesAndStockData();
          });
        });
      } else {
        // Check if in_stock values need to be updated
        const checkStockSql = `
          SELECT COUNT(*) as count
          FROM jewellery_items
          WHERE in_stock IS NULL OR in_stock = 0
        `;

        con.query(checkStockSql, (stockCheckErr, stockCheckResults) => {
          if (stockCheckErr) {
            console.error("Error checking in_stock values:", stockCheckErr);
            // Continue anyway, this is not critical
            fetchCategoriesAndStockData();
          } else if (stockCheckResults[0].count > 0) {
            console.log(`Found ${stockCheckResults[0].count} jewellery items with no in_stock values. Updating...`);

            // Update in_stock values for items that have NULL or 0 values
            const updateStockSql = `
              UPDATE jewellery_items
              SET in_stock = FLOOR(RAND() * 20) + 5  -- Random stock between 5-25
              WHERE in_stock IS NULL OR in_stock = 0
            `;

            con.query(updateStockSql, (stockUpdateErr, stockUpdateResult) => {
              if (stockUpdateErr) {
                console.error("Error updating in_stock values:", stockUpdateErr);
              } else {
                console.log(`Updated in_stock values for ${stockUpdateResult.affectedRows} jewellery items`);
              }

              // Continue with fetching categories and stock data
              fetchCategoriesAndStockData();
            });
          } else {
            // Branch IDs and in_stock values are already assigned, continue with fetching categories and stock data
            fetchCategoriesAndStockData();
          }
        });
      }
    });
  });

  // Function to fetch categories and stock data
  function fetchCategoriesAndStockData() {
    // Get all unique categories from jewellery_items table
    const categoriesSql = `
      SELECT DISTINCT category
      FROM jewellery_items
      ORDER BY category
    `;

    con.query(categoriesSql, (catErr, categories) => {
      if (catErr) {
        console.error("Error fetching categories:", catErr);
        return res.status(500).json({ message: "Database error", error: catErr.message });
      }

      console.log(`Found ${categories.length} unique categories in jewellery_items`);

      // Extract category names
      const categoryNames = categories.map(cat => cat.category);
      console.log("Categories:", categoryNames);

      // Now get stock levels by branch and category
      const stockSql = `
        SELECT
          j.branch_id,
          CASE
            WHEN j.branch_id = 1 THEN 'Mahiyangana'
            WHEN j.branch_id = 2 THEN 'MahaOya'
            ELSE 'Unknown'
          END as branch_name,
          j.category,
          SUM(IFNULL(j.in_stock, 0)) as total_stock
        FROM
          jewellery_items j
        WHERE
          j.branch_id IN (1, 2)
        GROUP BY
          j.branch_id, j.category
        ORDER BY
          j.branch_id, j.category
      `;

      con.query(stockSql, (stockErr, stockResults) => {
        if (stockErr) {
          console.error("Error fetching stock levels:", stockErr);
          return res.status(500).json({ message: "Database error", error: stockErr.message });
        }

        console.log(`Found ${stockResults.length} stock results`);
        console.log("Stock results:", JSON.stringify(stockResults));

        // Transform the results into a format suitable for the chart
        const stockByBranch = {};

        // Initialize with empty data for all branches and categories
        [1, 2].forEach(branchId => {
          stockByBranch[branchId] = {};
          categoryNames.forEach(category => {
            stockByBranch[branchId][category] = 0;
          });
        });

        // Fill in the actual data
        stockResults.forEach(item => {
          if (item.branch_id && item.category) {
            stockByBranch[item.branch_id][item.category] = parseInt(item.total_stock);
          }
        });

        console.log("Formatted stock data:", JSON.stringify(stockByBranch));

        res.json({
          categories: categoryNames,
          stockByBranch
        });
      });
    });
  }
});

// Get jewellery item by ID - This should be the last route to avoid conflicts with specific routes
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

export { router as jewelleryItemsRouter };
