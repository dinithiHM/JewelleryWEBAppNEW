import express from 'express';
import con from '../utils/db.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get total count of sales
router.get("/count", (req, res) => {
  console.log('GET /sales/count - Getting total count of sales');

  // Get query parameters
  const branchId = req.query.branch_id;
  const userId = req.query.user_id;

  // Build SQL query to count sales
  let sql = "SELECT COUNT(*) as total FROM sales";

  // Add WHERE clause if filters are provided
  const whereConditions = [];
  const queryParams = [];

  if (branchId) {
    whereConditions.push('branch_id = ?');
    queryParams.push(branchId);
  }

  if (userId) {
    whereConditions.push('user_id = ?');
    queryParams.push(userId);
  }

  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error counting sales:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json({ total: results[0].total });
  });
});

// Get all sales with their items
router.get("/", (req, res) => {
  // Get query parameters
  const branchId = req.query.branch_id;
  const userId = req.query.user_id;
  const date = req.query.date; // Add date filter

  let sql = `
    SELECT
      s.sale_id,
      s.customer_name,
      s.total_amount,
      s.payment_method,
      s.sale_date,
      i.invoice_number,
      s.user_id,
      u.first_name AS cashier_first_name,
      u.last_name AS cashier_last_name,
      s.branch_id,
      b.branch_name
    FROM
      sales s
    LEFT JOIN
      invoices i ON s.sale_id = i.sale_id
    LEFT JOIN
      users u ON s.user_id = u.user_id
    LEFT JOIN
      branches b ON s.branch_id = b.branch_id
  `;

  // Add WHERE clause if filters are provided
  const whereConditions = [];
  const queryParams = [];

  if (branchId) {
    whereConditions.push('s.branch_id = ?');
    queryParams.push(branchId);
  }

  if (userId) {
    whereConditions.push('s.user_id = ?');
    queryParams.push(userId);
  }

  // Add date filter if provided
  if (date) {
    whereConditions.push('DATE(s.sale_date) = ?');
    queryParams.push(date);
  }

  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  sql += ' ORDER BY s.sale_date DESC';

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching sales:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results || []);
  });
});

// Get finance data (income and expenses) by period and branch
// Important: This route must be defined BEFORE the /:id route to avoid being caught by it
router.get("/finance", (req, res) => {
  console.log('GET /sales/finance - Fetching finance data');

  // Get query parameters
  const period = req.query.period || 'monthly'; // 'daily' or 'monthly'
  const branchId = req.query.branch_id; // Optional branch filter
  const year = req.query.year || new Date().getFullYear(); // Default to current year
  const month = req.query.month; // Optional month filter (1-12)

  console.log(`Fetching ${period} finance data for year: ${year}${month ? ', month: ' + month : ''}${branchId ? ', branch: ' + branchId : ''}`);

  let sql, groupBy;
  const queryParams = [];

  // Base query to get sales data
  let baseQuery;

  if (period === 'daily') {
    baseQuery = `
      SELECT
        DATE(s.sale_date) as date,
        s.branch_id,
        b.branch_name,
        SUM(s.total_amount) as income
      FROM
        sales s
      LEFT JOIN
        branches b ON s.branch_id = b.branch_id
    `;
  } else { // monthly
    baseQuery = `
      SELECT
        CONCAT(YEAR(s.sale_date), '-', LPAD(MONTH(s.sale_date), 2, '0')) as date,
        s.branch_id,
        b.branch_name,
        SUM(s.total_amount) as income
      FROM
        sales s
      LEFT JOIN
        branches b ON s.branch_id = b.branch_id
    `;
  }

  // WHERE clause conditions
  const whereConditions = [];

  // Add year condition
  whereConditions.push('YEAR(s.sale_date) = ?');
  queryParams.push(year);

  // Add month condition if provided
  if (month) {
    whereConditions.push('MONTH(s.sale_date) = ?');
    queryParams.push(month);
  }

  // Add branch condition if provided
  if (branchId) {
    whereConditions.push('s.branch_id = ?');
    queryParams.push(branchId);
  }

  // Add WHERE clause to base query
  if (whereConditions.length > 0) {
    baseQuery += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Set GROUP BY based on period
  if (period === 'daily') {
    groupBy = 'date, s.branch_id, b.branch_name';
  } else { // monthly
    groupBy = 'date, s.branch_id, b.branch_name';
  }

  // Complete the query
  sql = `
    ${baseQuery}
    GROUP BY ${groupBy}
    ORDER BY date ASC
  `;

  console.log('Executing SQL:', sql);
  console.log('With parameters:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching finance data:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Process results to format for the chart
    const formattedData = processFinanceData(results, period);

    res.json(formattedData);
  });
});

// Get top selling items
// IMPORTANT: This route must be defined BEFORE the /:id route to avoid being caught by it
router.get("/top-selling-items", (req, res) => {
  console.log('GET /sales/top-selling-items - Fetching top selling items');

  // Get query parameters
  const limit = req.query.limit ? parseInt(req.query.limit) : 3; // Default to top 3 items
  const branchId = req.query.branch_id ? parseInt(req.query.branch_id) : null; // Optional branch filter
  const period = req.query.period || 'all'; // 'today', 'week', 'month', 'all'

  // Calculate date range based on period
  const now = new Date();
  let startDate = null;

  if (period === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    // Last 7 days
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === 'month') {
    // Last 30 days
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  }

  // Build the SQL query to get top selling items
  let sql = `
    SELECT
      ji.item_id,
      ji.product_title,
      ji.category,
      COALESCE(ji.gold_carat, '') AS gold_carat,
      SUM(si.quantity) AS total_quantity,
      SUM(si.subtotal) AS total_amount,
      COUNT(DISTINCT s.sale_id) AS sale_count
    FROM
      sales s
    JOIN
      sale_items si ON s.sale_id = si.sale_id
    JOIN
      jewellery_items ji ON si.item_id = ji.item_id
  `;

  // Add WHERE clause if filters are provided
  const whereConditions = [];
  const queryParams = [];

  // Add date filter if period is specified
  if (startDate) {
    whereConditions.push('s.sale_date >= ?');
    queryParams.push(startDate.toISOString().split('T')[0]);
  }

  // Add branch filter if provided
  if (branchId) {
    whereConditions.push('s.branch_id = ?');
    queryParams.push(branchId);
  }

  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Group by item, order by quantity sold (most sold items first), and limit results
  sql += `
    GROUP BY ji.item_id, ji.product_title, ji.category, ji.gold_carat
    ORDER BY total_quantity DESC, total_amount DESC
    LIMIT ?
  `;
  queryParams.push(limit);

  console.log('Executing SQL:', sql);
  console.log('With parameters:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching top selling items:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log('Top selling items results:', results);

    // Check if we have any results
    if (!results || results.length === 0) {
      console.log('No top selling items found for the given filters');
      return res.json([]);
    }

    // Format the results
    const formattedResults = results.map(item => ({
      item_id: item.item_id,
      product_title: item.product_title,
      category: item.category,
      gold_carat: item.gold_carat,
      total_quantity: item.total_quantity,
      total_amount: parseFloat(item.total_amount),
      sale_count: item.sale_count
    }));

    res.json(formattedResults);
  });
});

// Get recent sales with item details for today only
router.get("/recent", (req, res) => {
  console.log('GET /sales/recent - Fetching today\'s sales with item details');

  // Get query parameters
  const limit = req.query.limit ? parseInt(req.query.limit) : 5; // Default to 5 recent sales
  const branchId = req.query.branch_id ? parseInt(req.query.branch_id) : null; // Optional branch filter
  const debug = req.query.debug === 'true'; // Debug mode to show all sales regardless of date

  // Get today's date in YYYY-MM-DD format
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  console.log('Current server time:', now);
  console.log('Filtering for today\'s date:', today);

  // Build the SQL query to get today's sales with item details
  let sql = `
    SELECT
      s.sale_id,
      s.customer_name,
      s.total_amount,
      s.payment_method,
      s.sale_date,
      si.item_id,
      si.quantity,
      si.unit_price,
      si.subtotal,
      COALESCE(ji.product_title, 'Unknown Item') AS product_title,
      COALESCE(ji.category, 'Uncategorized') AS category,
      TIME_FORMAT(s.sale_date, '%h:%i %p') AS sale_time,
      DATE_FORMAT(s.sale_date, '%M %d, %Y') AS sale_date_formatted
    FROM
      sales s
    JOIN
      sale_items si ON s.sale_id = si.sale_id
    LEFT JOIN
      jewellery_items ji ON si.item_id = ji.item_id
  `;

  // Add WHERE clause for today's date and branch filter if provided
  const whereConditions = [];
  const queryParams = [];

  // Filter for today's date unless in debug mode
  if (!debug) {
    // Use a more flexible date comparison to handle timezone differences
    whereConditions.push('DATE(s.sale_date) = DATE(?)');
    queryParams.push(today);
    console.log('Applying date filter for today:', today);
  } else {
    console.log('Debug mode: showing all sales regardless of date');
  }

  // Add branch filter if provided
  if (branchId) {
    whereConditions.push('s.branch_id = ?');
    queryParams.push(branchId);
  }

  // Add WHERE clause if there are any conditions
  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Order by sale date (most recent first) and limit results
  sql += ' ORDER BY s.sale_date DESC LIMIT ?';
  queryParams.push(limit);

  console.log('Executing SQL:', sql);
  console.log('With parameters:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching recent sales:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log('Query results:', results);

    // Check if we have any results
    if (!results || results.length === 0) {
      console.log('No sales found for the given filters');
      return res.json([]);
    }

    // Group results by sale_id to handle multiple items in one sale
    const salesMap = {};

    results.forEach(row => {
      if (!salesMap[row.sale_id]) {
        salesMap[row.sale_id] = {
          sale_id: row.sale_id,
          customer_name: row.customer_name,
          total_amount: row.total_amount,
          payment_method: row.payment_method,
          sale_date: row.sale_date,
          sale_time: row.sale_time,
          sale_date_formatted: row.sale_date_formatted,
          items: []
        };
      }

      salesMap[row.sale_id].items.push({
        item_id: row.item_id,
        product_title: row.product_title,
        category: row.category,
        quantity: row.quantity,
        unit_price: row.unit_price,
        subtotal: row.subtotal
      });
    });

    // Convert map to array
    const sales = Object.values(salesMap);

    console.log(`Found ${sales.length} sales for today`);

    // Return empty array if no sales found
    res.json(sales || []);
  });
});

// Get sale details by ID including items
router.get("/:id", (req, res) => {
  const saleId = req.params.id;

  // Get sale details
  const saleSql = `
    SELECT
      s.sale_id,
      s.customer_name,
      s.total_amount,
      s.payment_method,
      s.sale_date,
      i.invoice_number,
      s.user_id,
      u.first_name AS cashier_first_name,
      u.last_name AS cashier_last_name,
      s.branch_id,
      b.branch_name
    FROM
      sales s
    LEFT JOIN
      invoices i ON s.sale_id = i.sale_id
    LEFT JOIN
      users u ON s.user_id = u.user_id
    LEFT JOIN
      branches b ON s.branch_id = b.branch_id
    WHERE
      s.sale_id = ?
  `;

  con.query(saleSql, [saleId], (err, saleResults) => {
    if (err) {
      console.error("Error fetching sale:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (saleResults.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Check if the table has the new discount columns
    con.query("SHOW COLUMNS FROM sale_items LIKE 'original_price'", (err, columns) => {
      if (err) {
        console.error("Error checking sale_items columns:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      // Get sale items
      let itemsSql;

      // Check if making_charges column exists
      con.query("SHOW COLUMNS FROM sale_items LIKE 'making_charges'", (err, makingChargesColumns) => {
        if (err) {
          console.error("Error checking for making_charges column:", err);
          makingChargesColumns = [];
        }

        if (columns.length > 0 && makingChargesColumns.length > 0) {
          // New schema with discount columns and making charges
          itemsSql = `
            SELECT
              si.sale_item_id,
              si.item_id,
              ji.product_title,
              ji.category,
              si.quantity,
              si.unit_price,
              si.original_price,
              si.discount_amount,
              si.discount_type,
              si.subtotal,
              si.making_charges,
              si.additional_materials_charges
            FROM
              sale_items si
            LEFT JOIN
              jewellery_items ji ON si.item_id = ji.item_id
            WHERE
              si.sale_id = ?
          `;
        } else if (columns.length > 0) {
          // New schema with discount columns
          itemsSql = `
            SELECT
              si.sale_item_id,
              si.item_id,
              ji.product_title,
              ji.category,
              si.quantity,
              si.unit_price,
              si.original_price,
              si.discount_amount,
              si.discount_type,
              si.subtotal
            FROM
              sale_items si
            LEFT JOIN
              jewellery_items ji ON si.item_id = ji.item_id
            WHERE
              si.sale_id = ?
          `;
        } else {
          // Old schema without discount columns
          itemsSql = `
            SELECT
              si.sale_item_id,
              si.item_id,
              ji.product_title,
              ji.category,
              si.quantity,
              si.unit_price,
              si.subtotal
            FROM
              sale_items si
            LEFT JOIN
              jewellery_items ji ON si.item_id = ji.item_id
            WHERE
              si.sale_id = ?
          `;
        }

      con.query(itemsSql, [saleId], (err, itemsResults) => {
        if (err) {
          console.error("Error fetching sale items:", err);
          return res.status(500).json({ message: "Database error", error: err.message });
        }

        // Combine sale and items
        const sale = saleResults[0];

        // Process items to ensure making_charges and additional_materials_charges are included in calculations
        const processedItems = (itemsResults || []).map(item => {
          // If the item has making_charges or additional_materials_charges, ensure they're included in the subtotal
          if (item.making_charges || item.additional_materials_charges) {
            // Ensure values are numbers
            const makingCharges = parseFloat(item.making_charges || 0);
            const additionalCharges = parseFloat(item.additional_materials_charges || 0);

            // Update the subtotal to include these charges if they're not already included
            if (item.subtotal) {
              // Check if the subtotal already includes these charges
              const baseSubtotal = item.quantity * item.unit_price;
              const expectedTotalWithCharges = baseSubtotal + makingCharges + additionalCharges;

              // If the subtotal doesn't match the expected total with charges, update it
              if (Math.abs(item.subtotal - expectedTotalWithCharges) > 0.01) {
                console.log(`Updating subtotal for item ${item.item_id} from ${item.subtotal} to ${expectedTotalWithCharges}`);
                item.subtotal = expectedTotalWithCharges;
              }
            }
          }
          return item;
        });

        sale.items = processedItems;

        res.json(sale);
      });
      }); // Close makingChargesColumns query
    });
  });
});

// Create a new sale
router.post("/create", (req, res) => {
  const { customer_name, total_amount, payment_method, items, user_id, branch_id } = req.body;

  if (!customer_name || !total_amount || !payment_method || !items || !items.length) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Check if the total amount from the frontend already includes making_charges and additional_materials_charges
  // We'll use the total_amount provided by the frontend directly, as it already includes all charges
  // This prevents double-counting of making charges and additional materials charges

  console.log(`Using provided total amount: ${total_amount} from frontend`);

  console.log('Creating sale with gold price information:', items.filter(item => item.gold_carat && item.gold_weight).length, 'gold items');

  // Start transaction
  con.beginTransaction(async (err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    try {
      // Check if user_id and branch_id columns exist in sales table
      const [hasUserIdColumn, hasBranchIdColumn] = await Promise.all([
        new Promise((resolve) => {
          con.query("SHOW COLUMNS FROM sales LIKE 'user_id'", (checkErr, results) => {
            if (checkErr) {
              console.error("Error checking for user_id column:", checkErr);
            }
            resolve(results && results.length > 0);
          });
        }),
        new Promise((resolve) => {
          con.query("SHOW COLUMNS FROM sales LIKE 'branch_id'", (checkErr, results) => {
            if (checkErr) {
              console.error("Error checking for branch_id column:", checkErr);
            }
            resolve(results && results.length > 0);
          });
        })
      ]);

      // Prepare SQL based on available columns
      let saleSql, saleParams;

      // Use the total amount provided by the frontend directly
      const finalTotalAmount = total_amount;

      if (hasUserIdColumn && hasBranchIdColumn) {
        // Both columns exist, use them
        saleSql = "INSERT INTO sales (customer_name, total_amount, payment_method, user_id, branch_id) VALUES (?, ?, ?, ?, ?)";
        saleParams = [customer_name, finalTotalAmount, payment_method, user_id, branch_id];
      } else {
        // Columns don't exist, use original schema
        saleSql = "INSERT INTO sales (customer_name, total_amount, payment_method) VALUES (?, ?, ?)";
        saleParams = [customer_name, finalTotalAmount, payment_method];
      }

      // Insert sale
      con.query(saleSql, saleParams, (err, saleResult) => {
        if (err) {
          return con.rollback(() => {
            console.error("Error creating sale:", err);
            res.status(500).json({ message: "Database error", error: err.message });
          });
        }

        const saleId = saleResult.insertId;

        // Insert sale items and update inventory
        const insertItemPromises = items.map(item => {
          return new Promise((resolve, reject) => {
            // First check if the item exists in the jewellery_items table
            console.log('Checking if item exists:', item.item_id);
            con.query("SELECT * FROM jewellery_items WHERE item_id = ?", [item.item_id], (err, results) => {
              if (err) {
                console.error('Error checking item existence:', err);
                return reject(err);
              }

              if (results.length === 0) {
                console.error('Item not found in jewellery_items table:', item.item_id);
                return reject(new Error(`Item with ID ${item.item_id} does not exist in the database`));
              }

              console.log('Item found in database:', results[0]);

              // Insert sale item with discount information
              const subtotal = item.quantity * item.unit_price;

              // Check if the table has the new gold price columns
              con.query("SHOW COLUMNS FROM sale_items LIKE 'gold_price_per_gram'", (err, goldColumns) => {
                if (err) {
                  return reject(err);
                }

                // Check if the table has the discount columns
                con.query("SHOW COLUMNS FROM sale_items LIKE 'original_price'", (err, discountColumns) => {
                  if (err) {
                    return reject(err);
                  }

                  // Check if the table has the making charges columns
                  con.query("SHOW COLUMNS FROM sale_items LIKE 'making_charges'", (err, makingChargesColumns) => {
                    if (err) {
                      return reject(err);
                    }

                    // Check if the table has the profit_percentage column
                    con.query("SHOW COLUMNS FROM sale_items LIKE 'profit_percentage'", (err, profitColumns) => {
                      if (err) {
                        return reject(err);
                      }

                  let itemSql;
                  let itemParams;

                  if (goldColumns.length > 0 && discountColumns.length > 0 && makingChargesColumns.length > 0 && profitColumns.length > 0) {
                    // New schema with gold price, discount columns, making charges columns, and profit_percentage
                    itemSql = `
                      INSERT INTO sale_items (
                        sale_id, item_id, quantity, unit_price, original_price,
                        discount_amount, discount_type, subtotal,
                        gold_price_per_gram, gold_carat, gold_weight, is_gold_price_based,
                        making_charges, additional_materials_charges, profit_percentage
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    // Calculate subtotal including making charges and additional materials charges
                    const totalWithCharges = subtotal +
                      (item.making_charges || 0) +
                      (item.additional_materials_charges || 0);

                    // Use the profit_percentage from the item, or default to 15%
                    const profitPercentage = item.profit_percentage !== undefined && item.profit_percentage > 0
                      ? parseFloat(String(item.profit_percentage))
                      : 15;

                    itemParams = [
                      saleId,
                      item.item_id,
                      item.quantity,
                      item.unit_price,
                      item.original_price || item.unit_price,
                      item.discount_amount || null,
                      item.discount_type || null,
                      totalWithCharges, // Use the total with charges
                      item.gold_price_per_gram || null,
                      item.gold_carat || null,
                      item.gold_weight || null,
                      item.is_gold_price_based ? 1 : 0,
                      item.making_charges || null,
                      item.additional_materials_charges || null,
                      profitPercentage
                    ];
                  } else if (goldColumns.length > 0 && discountColumns.length > 0 && makingChargesColumns.length > 0) {
                    // New schema with gold price, discount columns, and making charges columns (but no profit_percentage)
                    itemSql = `
                      INSERT INTO sale_items (
                        sale_id, item_id, quantity, unit_price, original_price,
                        discount_amount, discount_type, subtotal,
                        gold_price_per_gram, gold_carat, gold_weight, is_gold_price_based,
                        making_charges, additional_materials_charges
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    // Calculate subtotal including making charges and additional materials charges
                    const totalWithCharges = subtotal +
                      (item.making_charges || 0) +
                      (item.additional_materials_charges || 0);

                    itemParams = [
                      saleId,
                      item.item_id,
                      item.quantity,
                      item.unit_price,
                      item.original_price || item.unit_price,
                      item.discount_amount || null,
                      item.discount_type || null,
                      totalWithCharges, // Use the total with charges
                      item.gold_price_per_gram || null,
                      item.gold_carat || null,
                      item.gold_weight || null,
                      item.is_gold_price_based ? 1 : 0,
                      item.making_charges || null,
                      item.additional_materials_charges || null
                    ];
                  } else if (goldColumns.length > 0 && discountColumns.length > 0) {
                    // New schema with both gold price and discount columns
                    itemSql = `
                      INSERT INTO sale_items (
                        sale_id, item_id, quantity, unit_price, original_price,
                        discount_amount, discount_type, subtotal,
                        gold_price_per_gram, gold_carat, gold_weight, is_gold_price_based
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    itemParams = [
                      saleId,
                      item.item_id,
                      item.quantity,
                      item.unit_price,
                      item.original_price || item.unit_price,
                      item.discount_amount || null,
                      item.discount_type || null,
                      subtotal,
                      item.gold_price_per_gram || null,
                      item.gold_carat || null,
                      item.gold_weight || null,
                      item.is_gold_price_based ? 1 : 0
                    ];
                  } else if (discountColumns.length > 0) {
                    // Schema with discount columns but no gold price columns
                    itemSql = `
                      INSERT INTO sale_items (
                        sale_id, item_id, quantity, unit_price, original_price,
                        discount_amount, discount_type, subtotal
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    itemParams = [
                      saleId,
                      item.item_id,
                      item.quantity,
                      item.unit_price,
                      item.original_price || item.unit_price,
                      item.discount_amount || null,
                      item.discount_type || null,
                      subtotal
                    ];
                  } else {
                    // Old schema without discount or gold price columns
                    itemSql = "INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)";
                    itemParams = [saleId, item.item_id, item.quantity, item.unit_price, subtotal];
                  }

                  con.query(itemSql, itemParams, (err) => {
                    if (err) {
                      return reject(err);
                    }

                    // Update inventory
                    const updateSql = "UPDATE jewellery_items SET in_stock = in_stock - ? WHERE item_id = ? AND in_stock >= ?";
                    con.query(updateSql, [item.quantity, item.item_id, item.quantity], (err, updateResult) => {
                      if (err) {
                        return reject(err);
                      }

                      if (updateResult.affectedRows === 0) {
                        return reject(new Error('Insufficient stock for item ID ' + item.item_id));
                      }

                      resolve();
                    });
                  });
                  }); // Close profit_percentage query
                  }); // Close makingChargesColumns query
                });
              });
            });
          });
        });

        // Wait for all item insertions to complete
        Promise.all(insertItemPromises)
          .then(() => {
            // Generate invoice number
            const invoiceNumber = `INV-${new Date().getFullYear()}-${saleId.toString().padStart(4, '0')}`;
            const invoiceSql = "INSERT INTO invoices (sale_id, invoice_number) VALUES (?, ?)";

            con.query(invoiceSql, [saleId, invoiceNumber], (err) => {
              if (err) {
                return con.rollback(() => {
                  console.error("Error creating invoice:", err);
                  res.status(500).json({ message: "Database error", error: err.message });
                });
              }

              // Commit transaction
              con.commit((err) => {
                if (err) {
                  return con.rollback(() => {
                    console.error("Error committing transaction:", err);
                    res.status(500).json({ message: "Database error", error: err.message });
                  });
                }

                // Create a notification for the sale
                try {
                  console.log('Attempting to create sale notification...');
                  // Get the first item name for the notification (if any)
                  const firstItem = items.length > 0 ? items[0] : null;
                  const itemName = firstItem && firstItem.product_title ? firstItem.product_title : null;

                  console.log('Sale notification data:', {
                    sale_id: saleId,
                    amount: total_amount,
                    branch_id: branch_id,
                    item_name: itemName
                  });

                  // Make a direct database insert instead of using fetch
                  // Calculate expiration date (5 days from now)
                  const expiresAt = new Date();
                  expiresAt.setDate(expiresAt.getDate() + 5);

                  // Create notification for Admin, Store Manager, and Cashier
                  const title = 'New Sale';
                  const message = `A new sale${itemName ? ' of ' + itemName : ''} has been made for LKR ${total_amount.toFixed(2)}`;
                  // Include all possible role formats to ensure compatibility
                  const targetRoles = JSON.stringify(["admin", "Admin", "store manager", "Store Manager", "storemanager", "cashier", "Cashier"]);

                  const notificationSql = `
                    INSERT INTO notifications (
                      title,
                      message,
                      type,
                      target_roles,
                      expires_at,
                      branch_id,
                      related_id,
                      related_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `;

                  const notificationParams = [
                    title,
                    message,
                    'sales',
                    targetRoles,
                    expiresAt,
                    branch_id,
                    saleId,
                    'sale'
                  ];

                  con.query(notificationSql, notificationParams, (notificationErr, notificationResult) => {
                    if (notificationErr) {
                      console.error('Error creating sale notification in database:', notificationErr);
                    } else {
                      console.log(`Sale notification created with ID: ${notificationResult.insertId}`);
                    }
                  });
                } catch (notificationError) {
                  console.error('Error creating sale notification:', notificationError);
                  // Continue anyway, notification failure shouldn't stop the sale response
                }

                res.status(201).json({
                  message: "Sale created successfully",
                  sale_id: saleId,
                  invoice_number: invoiceNumber
                });
              });
            });
          })
          .catch((err) => {
            con.rollback(() => {
              console.error("Error processing items:", err);
              res.status(500).json({ message: err.message });
            });
          });
      });
    } catch (error) {
      con.rollback(() => {
        console.error("Unexpected error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
      });
    }
  });
});

// Simple test route
router.get("/test", (_req, res) => {
  console.log('GET /sales/test - Test route');
  return res.json({ message: 'Sales router is working!' });
});

// Generate invoice for a sale
router.get("/invoice/:id", (req, res) => {
  const saleId = req.params.id;
  console.log(`GET /sales/invoice/${saleId} - Generating invoice`);

  // Get sale details with items
  const saleSql = `
    SELECT
      s.sale_id,
      s.customer_name,
      s.total_amount,
      s.payment_method,
      s.sale_date,
      i.invoice_number,
      s.user_id,
      u.first_name AS cashier_first_name,
      u.last_name AS cashier_last_name,
      s.branch_id,
      b.branch_name
    FROM
      sales s
    LEFT JOIN
      invoices i ON s.sale_id = i.sale_id
    LEFT JOIN
      users u ON s.user_id = u.user_id
    LEFT JOIN
      branches b ON s.branch_id = b.branch_id
    WHERE
      s.sale_id = ?
  `;

  con.query(saleSql, [saleId], (err, saleResults) => {
    if (err) {
      console.error("Error fetching sale for invoice:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (saleResults.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const sale = saleResults[0];

    // Check if invoice exists, if not create one
    if (!sale.invoice_number) {
      const invoiceNumber = `INV-${new Date().getFullYear()}-${saleId.toString().padStart(4, '0')}`;
      const invoiceSql = "INSERT INTO invoices (sale_id, invoice_number) VALUES (?, ?)";

      con.query(invoiceSql, [saleId, invoiceNumber], (err) => {
        if (err) {
          console.error("Error creating invoice:", err);
          return res.status(500).json({ message: "Database error", error: err.message });
        }

        sale.invoice_number = invoiceNumber;

        // Continue with fetching items and branch details
        fetchItemsAndBranchDetails(sale);
      });
    } else {
      // Continue with fetching items and branch details
      fetchItemsAndBranchDetails(sale);
    }

    function fetchItemsAndBranchDetails(sale) {
      // Check if the table has the new discount columns
      con.query("SHOW COLUMNS FROM sale_items LIKE 'original_price'", (err, columns) => {
        if (err) {
          console.error("Error checking sale_items columns:", err);
          return res.status(500).json({ message: "Database error", error: err.message });
        }

        // Get sale items
        let itemsSql;

        // Check if making_charges column exists
        con.query("SHOW COLUMNS FROM sale_items LIKE 'making_charges'", (err, makingChargesColumns) => {
          if (err) {
            console.error("Error checking for making_charges column:", err);
            makingChargesColumns = [];
          }

          if (columns.length > 0 && makingChargesColumns.length > 0) {
            // New schema with discount columns and making charges
            itemsSql = `
              SELECT
                si.sale_item_id,
                si.item_id,
                ji.product_title,
                ji.category,
                si.quantity,
                si.unit_price,
                si.original_price,
                si.discount_amount,
                si.discount_type,
                si.subtotal,
                si.making_charges,
                si.additional_materials_charges
              FROM
                sale_items si
              LEFT JOIN
                jewellery_items ji ON si.item_id = ji.item_id
              WHERE
                si.sale_id = ?
            `;
          } else if (columns.length > 0) {
            // New schema with discount columns
            itemsSql = `
              SELECT
                si.sale_item_id,
                si.item_id,
                ji.product_title,
                ji.category,
                si.quantity,
                si.unit_price,
                si.original_price,
                si.discount_amount,
                si.discount_type,
                si.subtotal
              FROM
                sale_items si
              LEFT JOIN
                jewellery_items ji ON si.item_id = ji.item_id
              WHERE
                si.sale_id = ?
            `;
          } else {
            // Old schema without discount columns
            itemsSql = `
              SELECT
                si.sale_item_id,
                si.item_id,
                ji.product_title,
                ji.category,
                si.quantity,
                si.unit_price,
                si.subtotal
              FROM
                sale_items si
              LEFT JOIN
                jewellery_items ji ON si.item_id = ji.item_id
              WHERE
                si.sale_id = ?
            `;
          }

        con.query(itemsSql, [saleId], (err, itemsResults) => {
          if (err) {
            console.error("Error fetching sale items for invoice:", err);
            return res.status(500).json({ message: "Database error", error: err.message });
          }

          // Add items to sale
          sale.items = itemsResults || [];

          // Get branch details
          const branchId = sale.branch_id;

          if (branchId) {
            const branchSql = `
              SELECT
                branch_id,
                branch_name,
                location,
                contact_number
              FROM
                branches
              WHERE
                branch_id = ?
            `;

            con.query(branchSql, [branchId], (err, branchResults) => {
              if (err) {
                console.error("Error fetching branch details:", err);
                // Continue without branch details
                return res.json({
                  sale: sale,
                  branchDetails: null
                });
              }

              const branchDetails = branchResults.length > 0 ? branchResults[0] : null;

              res.json({
                sale: sale,
                branchDetails: branchDetails
              });
            });
          } else {
            // No branch ID, return without branch details
            res.json({
              sale: sale,
              branchDetails: null
            });
          }
        });
        }); // Close makingChargesColumns query
      });
    }
  });
});

// Get recent sales by date (for calendar view)
router.get("/recent", (req, res) => {
  console.log('GET /sales/recent - Fetching recent sales');

  // Get query parameters
  const date = req.query.date; // Optional date filter (YYYY-MM-DD)
  const limit = parseInt(req.query.limit) || 5; // Number of sales to return per branch, default 5

  console.log(`Fetching recent sales${date ? ' for date: ' + date : ''}`);

  let sql = `
    SELECT
      s.sale_id,
      s.customer_name,
      s.total_amount,
      s.payment_method,
      s.sale_date,
      s.branch_id,
      b.branch_name,
      u.first_name AS cashier_first_name,
      u.last_name AS cashier_last_name,
      GROUP_CONCAT(ji.product_title SEPARATOR ', ') AS sold_items
    FROM
      sales s
    LEFT JOIN
      branches b ON s.branch_id = b.branch_id
    LEFT JOIN
      users u ON s.user_id = u.user_id
    LEFT JOIN
      sale_items si ON s.sale_id = si.sale_id
    LEFT JOIN
      jewellery_items ji ON si.item_id = ji.item_id
  `;

  // Add WHERE clause if date filter is provided
  const whereConditions = [];
  const queryParams = [];

  if (date) {
    whereConditions.push('DATE(s.sale_date) = ?');
    queryParams.push(date);
  }

  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Group by sale_id to combine sold items
  sql += ' GROUP BY s.sale_id, s.customer_name, s.total_amount, s.payment_method, s.sale_date, s.branch_id, b.branch_name, u.first_name, u.last_name';

  // Order by date (most recent first)
  sql += ' ORDER BY s.sale_date DESC';

  console.log('Executing SQL:', sql);
  console.log('With parameters:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching recent sales:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Group sales by branch
    const salesByBranch = {};

    results.forEach(sale => {
      const branchId = sale.branch_id;
      if (!salesByBranch[branchId]) {
        salesByBranch[branchId] = {
          branch_id: branchId,
          branch_name: sale.branch_name,
          sales: []
        };
      }

      // Only add if we haven't reached the limit for this branch
      if (salesByBranch[branchId].sales.length < limit) {
        salesByBranch[branchId].sales.push({
          sale_id: sale.sale_id,
          customer_name: sale.customer_name,
          total_amount: sale.total_amount,
          payment_method: sale.payment_method,
          sale_date: sale.sale_date,
          cashier_name: `${sale.cashier_first_name} ${sale.cashier_last_name}`,
          sold_items: sale.sold_items
        });
      }
    });

    // Convert to array
    const response = Object.values(salesByBranch);

    res.json(response);
  });
});

// Generate empty finance data (no sample data)
function generateSampleFinanceData() {
  // Return empty chart data with just the structure
  return {
    chartData: [],
    branches: [
      { id: 1, name: 'Mahiyangana Branch' },
      { id: 2, name: 'Mahaoya Branch' }
    ]
  };
}

// Helper function to get month name
function getMonthName(monthIndex) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex];
}

// Helper function to process finance data for the chart
function processFinanceData(results, period) {
  // If no results, return empty data
  if (!results || results.length === 0) {
    return generateSampleFinanceData();
  }

  // Group data by date and branch
  const groupedData = {};
  const branches = new Set();

  results.forEach(row => {
    // Handle date properly to avoid timezone issues
    let key;

    if (period === 'daily') {
      // For daily data, use the date string directly from the database
      // This ensures we use the correct date without timezone issues
      if (typeof row.date === 'string' && row.date.includes('-')) {
        // If it's already in YYYY-MM-DD format, use it directly
        key = row.date.split('T')[0]; // Remove any time component
      } else {
        // Fallback to parsing the date
        const date = new Date(row.date);
        // Use local date string to avoid timezone issues
        key = date.getFullYear() + '-' +
              String(date.getMonth() + 1).padStart(2, '0') + '-' +
              String(date.getDate()).padStart(2, '0');
      }
    } else { // monthly
      // For monthly data, extract year and month
      if (typeof row.date === 'string' && row.date.includes('-')) {
        // If it's already in YYYY-MM format or YYYY-MM-DD format
        const parts = row.date.split('-');
        key = `${parts[0]}-${parts[1]}`;
      } else {
        // Fallback to parsing the date
        const date = new Date(row.date);
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    }

    if (!groupedData[key]) {
      // Extract month for display name if it's a monthly view
      let displayName;
      if (period === 'daily') {
        // For daily view, use the day part of the date
        displayName = key.split('-')[2]; // Get the day part
      } else {
        // For monthly view, use the month name
        const monthIndex = parseInt(key.split('-')[1], 10) - 1; // Convert month to 0-based index
        displayName = getMonthName(monthIndex);
      }

      groupedData[key] = {
        name: displayName,
        date: key
      };
    }

    const branchKey = `branch_${row.branch_id}`;
    groupedData[key][branchKey] = row.income;
    branches.add(row.branch_id);

    // Add to total income
    groupedData[key].income = (groupedData[key].income || 0) + row.income;

    // Add branch name
    groupedData[key][`branch_${row.branch_id}_name`] = row.branch_name;
  });

  // Convert to array and sort by date
  const chartData = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));

  // Add expense data (for now, generate random expenses)
  chartData.forEach(item => {
    item.expense = Math.round(item.income * (0.4 + Math.random() * 0.3)); // 40-70% of income
  });

  return {
    chartData,
    branches: Array.from(branches).map(id => {
      const branchName = results.find(r => r.branch_id === id)?.branch_name || `Branch ${id}`;
      return { id, name: branchName };
    })
  };
}

// Get available jewellery items for sale
router.get("/available-items", (_req, res) => {
  console.log('GET /sales/available-items - Fetching available items');

  // Directly query the jewellery_items table
  try {
    // Get all items for now to debug
    const sql = "SELECT item_id, product_title, category, in_stock, selling_price FROM jewellery_items";
    console.log('Executing SQL query:', sql);

    con.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching available items:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      console.log(`Found ${results ? results.length : 0} items in jewellery_items table`);
      if (results && results.length > 0) {
        console.log('First item found:', JSON.stringify(results[0]));
      } else {
        console.log('No items found in jewellery_items table');
      }

      return res.json(results || []);
    });
  } catch (error) {
    console.error('Unexpected error in /available-items route:', error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});



// Get top selling items
router.get("/top-selling-items", (req, res) => {
  console.log('GET /sales/top-selling-items - Fetching top selling items');

  // Get query parameters
  const limit = req.query.limit ? parseInt(req.query.limit) : 3; // Default to top 3 items
  const branchId = req.query.branch_id ? parseInt(req.query.branch_id) : null; // Optional branch filter
  const period = req.query.period || 'all'; // 'today', 'week', 'month', 'all'

  // Calculate date range based on period
  const now = new Date();
  let startDate = null;

  if (period === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    // Last 7 days
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === 'month') {
    // Last 30 days
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  }

  // Convert to YYYY-MM-DD format if needed
  const startDateStr = startDate ? startDate.toISOString().split('T')[0] : null;

  console.log(`Fetching top ${limit} selling items${startDateStr ? ' since ' + startDateStr : ''}`);

  // Build the SQL query to get top selling items
  let sql = `
    SELECT
      ji.item_id,
      COALESCE(ji.product_title, 'Unknown Item') AS product_title,
      COALESCE(ji.category, 'Uncategorized') AS category,
      SUM(si.quantity) AS total_quantity,
      SUM(si.subtotal) AS total_amount
    FROM
      sales s
    JOIN
      sale_items si ON s.sale_id = si.sale_id
    LEFT JOIN
      jewellery_items ji ON si.item_id = ji.item_id
  `;

  // Add WHERE clause if filters are provided
  const whereConditions = [];
  const queryParams = [];

  // Add date filter if period is specified
  if (startDateStr) {
    whereConditions.push('DATE(s.sale_date) >= ?');
    queryParams.push(startDateStr);
  }

  // Add branch filter if provided
  if (branchId) {
    whereConditions.push('s.branch_id = ?');
    queryParams.push(branchId);
  }

  // Add WHERE clause if there are any conditions
  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Group by item, order by quantity sold (most sold items first), and limit results
  sql += `
    GROUP BY ji.item_id, ji.product_title, ji.category
    ORDER BY total_quantity DESC, total_amount DESC
    LIMIT ?
  `;
  queryParams.push(limit);

  console.log('Executing SQL:', sql);
  console.log('With parameters:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching top selling items:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log('Query results:', results);

    // Check if we have any results
    if (!results || results.length === 0) {
      console.log('No top selling items found for the given filters');
      return res.json([]);
    }

    // Format the results
    const formattedResults = results.map((item, index) => ({
      rank: index + 1,
      item_id: item.item_id,
      product_title: item.product_title,
      category: item.category,
      total_quantity: item.total_quantity,
      total_amount: parseFloat(item.total_amount)
    }));

    console.log(`Found ${formattedResults.length} top selling items`);
    res.json(formattedResults);
  });
});



// Get top categories by sales
router.get("/categories-by-sales", (req, res) => {
  console.log('GET /sales/categories-by-sales - Fetching top categories by sales');

  // Get query parameters
  const saleIds = req.query.sale_ids ? req.query.sale_ids.split(',').map(id => parseInt(id)) : [];
  const date = req.query.date; // Optional date filter (YYYY-MM-DD)
  const branchId = req.query.branch_id ? parseInt(req.query.branch_id) : null; // Optional branch filter

  console.log(`Fetching categories by sales${date ? ' for date: ' + date : ''}${saleIds.length > 0 ? ' for sale IDs: ' + saleIds.join(',') : ''}`);

  // Build the SQL query
  let sql = `
    SELECT
      COALESCE(c.category_name, ji.category) AS category_name,
      COUNT(DISTINCT s.sale_id) AS sale_count,
      COUNT(*) AS item_count,
      SUM(si.quantity) AS total_quantity,
      SUM(si.subtotal) AS total_amount
    FROM
      sales s
    JOIN
      sale_items si ON s.sale_id = si.sale_id
    JOIN
      jewellery_items ji ON si.item_id = ji.item_id
    LEFT JOIN
      categories c ON ji.category = c.category_name
  `;

  // Add WHERE clause if filters are provided
  const whereConditions = [];
  const queryParams = [];

  if (saleIds.length > 0) {
    // Handle array of IDs properly
    if (saleIds.length === 1) {
      whereConditions.push('s.sale_id = ?');
      queryParams.push(saleIds[0]);
    } else {
      const placeholders = saleIds.map(() => '?').join(',');
      whereConditions.push(`s.sale_id IN (${placeholders})`);
      queryParams.push(...saleIds);
    }
  }

  if (date) {
    whereConditions.push('DATE(s.sale_date) = ?');
    queryParams.push(date);
  }

  if (branchId) {
    whereConditions.push('s.branch_id = ?');
    queryParams.push(branchId);
  }

  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  // Group by category and order by count (most sold items first)
  sql += ' GROUP BY COALESCE(c.category_name, ji.category) ORDER BY total_quantity DESC, total_amount DESC';

  console.log('Executing SQL:', sql);
  console.log('With parameters:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching categories by sales:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log("Categories by sales results:", results);

    // Check if we have any results
    if (!results || results.length === 0) {
      console.log("No categories found for the given filters");
    } else {
      console.log(`Found ${results.length} categories, top category: ${results[0].category_name}`);
    }

    res.json(results || []);
  });
});

export { router as salesRouter };
