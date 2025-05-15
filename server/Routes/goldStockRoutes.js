import express from 'express';
import con from '../utils/db.js';
import verifyToken from '../Middleware/authMiddleware.js';

const router = express.Router();

// Create debug routes without authentication
const debugRouter = express.Router();

/**
 * Debug endpoint to check current gold stock values
 */
debugRouter.get('/debug', (req, res) => {
  console.log('GET /gold-stock/debug - Checking current gold stock values');

  const sql = `
    SELECT * FROM gold_stock
    ORDER BY
      CASE
        WHEN purity = '24KT' THEN 1
        WHEN purity = '22KT' THEN 2
        WHEN purity = '21KT' THEN 3
        WHEN purity = '18KT' THEN 4
        WHEN purity = '16KT' THEN 5
        ELSE 6
      END
  `;

  con.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching gold stock for debug:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    return res.json({
      success: true,
      data: results
    });
  });
});

/**
 * Debug endpoint to reset gold stock values
 */
debugRouter.post('/reset', (req, res) => {
  console.log('POST /gold-stock/reset - Resetting gold stock values');

  // Start a transaction
  con.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    // Reset values for each karat
    const updates = [
      { purity: '24KT', quantity: 100 },
      { purity: '22KT', quantity: 150 },
      { purity: '21KT', quantity: 200 },
      { purity: '18KT', quantity: 250 },
      { purity: '16KT', quantity: 300 }
    ];

    const updatePromises = updates.map(update => {
      return new Promise((resolve, reject) => {
        const sql = `
          UPDATE gold_stock
          SET quantity_in_grams = ?
          WHERE purity = ?
        `;

        con.query(sql, [update.quantity, update.purity], (updateErr, updateResult) => {
          if (updateErr) {
            reject(updateErr);
          } else {
            console.log(`Reset ${update.purity} to ${update.quantity}g`);
            resolve(updateResult);
          }
        });
      });
    });

    Promise.all(updatePromises)
      .then(() => {
        // Commit the transaction
        con.commit(commitErr => {
          if (commitErr) {
            console.error('Error committing transaction:', commitErr);
            return con.rollback(() => {
              res.status(500).json({
                success: false,
                message: 'Error committing transaction',
                error: commitErr.message
              });
            });
          }

          res.json({
            success: true,
            message: 'Gold stock values reset successfully',
            updates
          });
        });
      })
      .catch(error => {
        console.error('Error updating gold stock:', error);
        con.rollback(() => {
          res.status(500).json({
            success: false,
            message: 'Error updating gold stock',
            error: error.message
          });
        });
      });
  });
});

// Register debug routes
router.use(debugRouter);

// Apply authentication middleware to all other routes
router.use(verifyToken);

/**
 * Get all gold stock items
 * Filters by branch_id if user is not admin
 */
router.get('/', (req, res) => {
  console.log('GET /gold-stock - Fetching gold stock');

  // Get user info from the token
  const { role, branch_id } = req.user;

  // Build the query
  let sql = `
    SELECT
      gs.stock_id,
      gs.purity,
      gs.quantity_in_grams,
      gs.price_per_gram,
      gs.last_updated,
      gs.branch_id,
      gs.description,
      gs.status,
      b.branch_name
    FROM
      gold_stock gs
    LEFT JOIN
      branches b ON gs.branch_id = b.branch_id
    WHERE
      gs.status = 'active'
  `;

  const params = [];

  // If user is not admin, filter by branch
  if (role.toLowerCase() !== 'admin' && branch_id) {
    sql += ` AND gs.branch_id = ?`;
    params.push(branch_id);
  }

  // Order by purity
  sql += ` ORDER BY
    CASE
      WHEN gs.purity = '24KT' THEN 1
      WHEN gs.purity = '22KT' THEN 2
      WHEN gs.purity = '21KT' THEN 3
      WHEN gs.purity = '18KT' THEN 4
      WHEN gs.purity = '16KT' THEN 5
      ELSE 6
    END`;

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching gold stock:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Found ${results.length} gold stock items`);
    return res.json({
      success: true,
      data: results
    });
  });
});

/**
 * Get a specific gold stock item by ID
 */
router.get('/:id', (req, res) => {
  console.log(`GET /gold-stock/${req.params.id} - Fetching gold stock item`);

  const stockId = req.params.id;

  const sql = `
    SELECT
      gs.*,
      b.branch_name
    FROM
      gold_stock gs
    LEFT JOIN
      branches b ON gs.branch_id = b.branch_id
    WHERE
      gs.stock_id = ?
  `;

  con.query(sql, [stockId], (err, results) => {
    if (err) {
      console.error('Error fetching gold stock item:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gold stock item not found'
      });
    }

    return res.json({
      success: true,
      data: results[0]
    });
  });
});

/**
 * Create a new gold stock item
 */
router.post('/', (req, res) => {
  console.log('POST /gold-stock - Creating new gold stock item');

  const {
    purity,
    quantity_in_grams,
    price_per_gram,
    branch_id,
    description,
    status
  } = req.body;

  // Validate required fields
  if (!purity || !quantity_in_grams || !price_per_gram) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  const sql = `
    INSERT INTO gold_stock (
      purity,
      quantity_in_grams,
      price_per_gram,
      branch_id,
      description,
      status
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    purity,
    quantity_in_grams,
    price_per_gram,
    branch_id || null,
    description || null,
    status || 'active'
  ];

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error creating gold stock item:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    console.log(`Created gold stock item with ID: ${result.insertId}`);
    return res.status(201).json({
      success: true,
      message: 'Gold stock item created successfully',
      data: { stock_id: result.insertId }
    });
  });
});

/**
 * Update a gold stock item
 */
router.put('/:id', (req, res) => {
  console.log(`PUT /gold-stock/${req.params.id} - Updating gold stock item`);

  const stockId = req.params.id;
  const {
    purity,
    quantity_in_grams,
    price_per_gram,
    branch_id,
    description,
    status
  } = req.body;

  // Build the update query dynamically
  const updates = [];
  const params = [];

  if (purity !== undefined) {
    updates.push('purity = ?');
    params.push(purity);
  }

  if (quantity_in_grams !== undefined) {
    updates.push('quantity_in_grams = ?');
    params.push(quantity_in_grams);
  }

  if (price_per_gram !== undefined) {
    updates.push('price_per_gram = ?');
    params.push(price_per_gram);
  }

  if (branch_id !== undefined) {
    updates.push('branch_id = ?');
    params.push(branch_id);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }

  const sql = `
    UPDATE gold_stock
    SET ${updates.join(', ')}
    WHERE stock_id = ?
  `;

  params.push(stockId);

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error updating gold stock item:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gold stock item not found'
      });
    }

    console.log(`Updated gold stock item ${stockId}`);
    return res.json({
      success: true,
      message: 'Gold stock item updated successfully'
    });
  });
});

/**
 * Check if there's enough gold stock for an order
 */
router.post('/check-availability', (req, res) => {
  console.log('POST /gold-stock/check-availability - Checking gold availability');

  const { selectedKarats, karatValues } = req.body;

  if (!selectedKarats || !karatValues) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Build a query to check availability for each selected karat
  const checks = [];
  const params = [];

  Object.keys(selectedKarats).forEach(karat => {
    if (selectedKarats[karat] && karatValues[karat] > 0) {
      checks.push(`(purity = ? AND quantity_in_grams >= ?)`);
      params.push(karat, karatValues[karat]);
    }
  });

  if (checks.length === 0) {
    return res.json({
      success: true,
      available: true,
      message: 'No gold selected to check'
    });
  }

  const sql = `
    SELECT
      purity,
      quantity_in_grams
    FROM
      gold_stock
    WHERE
      ${checks.join(' OR ')}
  `;

  con.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error checking gold availability:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    // Check if we got results for all selected karats
    const availabilityMap = {};
    results.forEach(item => {
      availabilityMap[item.purity] = item.quantity_in_grams;
    });

    const unavailableItems = [];
    Object.keys(selectedKarats).forEach(karat => {
      if (selectedKarats[karat] && karatValues[karat] > 0) {
        if (!availabilityMap[karat] || availabilityMap[karat] < karatValues[karat]) {
          unavailableItems.push({
            purity: karat,
            requested: karatValues[karat],
            available: availabilityMap[karat] || 0
          });
        }
      }
    });

    if (unavailableItems.length > 0) {
      return res.json({
        success: true,
        available: false,
        unavailableItems,
        message: 'Some requested gold is not available in sufficient quantity'
      });
    }

    return res.json({
      success: true,
      available: true,
      message: 'All requested gold is available'
    });
  });
});



export { router as goldStockRouter };
