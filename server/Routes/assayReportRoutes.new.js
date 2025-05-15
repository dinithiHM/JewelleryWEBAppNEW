import express from 'express';
import con from '../utils/db.js';
import verifyToken from '../Middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all assay reports
router.get("/", (req, res) => {
  console.log('GET /assay-reports - Fetching all assay reports');

  // Get user role and branch from the request
  const userRole = req.user.role ? req.user.role.toLowerCase() : '';
  let userBranchId = req.user.branch_id ? parseInt(req.user.branch_id) : null;

  // Check if branch_id is provided in query params (for filtering)
  const requestedBranchId = req.query.branch_id ? parseInt(req.query.branch_id) : null;

  console.log(`User role: ${userRole}, User Branch ID: ${userBranchId}, Requested Branch ID: ${requestedBranchId}`);
  console.log(`Is admin? ${userRole === 'admin'}, Is store manager? ${userRole === 'store manager'}`);
  console.log(`User object:`, req.user);

  let sql = `
    SELECT ar.*, b.branch_name
    FROM assay_reports ar
    LEFT JOIN branches b ON ar.branch_id = b.branch_id
  `;

  let whereConditions = [];
  let queryParams = [];

  // For non-admin users, always filter by their branch unless they're a store manager with branch switching permission
  if (userRole !== 'admin' && userRole !== 'store manager') {
    if (userBranchId) {
      whereConditions.push('ar.branch_id = ?');
      queryParams.push(userBranchId);
    }
  }
  // For store managers or admins who requested a specific branch
  else if (requestedBranchId) {
    whereConditions.push('ar.branch_id = ?');
    queryParams.push(requestedBranchId);
  }
  // Admin with no branch filter sees all reports (no WHERE clause added)

  // Debug log
  console.log(`User role: ${userRole}, filtering conditions:`, whereConditions, queryParams);

  // Add WHERE clause if we have conditions
  if (whereConditions.length > 0) {
    sql += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  sql += ` ORDER BY ar.report_date DESC`;

  console.log('SQL Query:', sql);
  console.log('Query Params:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching assay reports:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    console.log(`Found ${results.length} assay reports`);
    res.json(results || []);
  });
});

// Get assay report by ID
router.get("/:id", (req, res) => {
  const reportId = req.params.id;

  console.log(`GET /assay-reports/${reportId} - Fetching assay report`);

  // Get user role and branch from the request
  const userRole = req.user.role ? req.user.role.toLowerCase() : '';
  let userBranchId = req.user.branch_id ? parseInt(req.user.branch_id) : null;

  // Check if branch_id is provided in query params (for store managers who can switch branches)
  if (req.query.branch_id) {
    userBranchId = parseInt(req.query.branch_id);
  }

  console.log(`GET single report - User role: ${userRole}, User Branch ID: ${userBranchId}`);
  console.log(`Is admin? ${userRole === 'admin'}, Is store manager? ${userRole === 'store manager'}`);
  console.log(`User object:`, req.user);

  let sql = `
    SELECT ar.*, b.branch_name
    FROM assay_reports ar
    LEFT JOIN branches b ON ar.branch_id = b.branch_id
    WHERE ar.report_id = ?
  `;

  // If not admin or store manager, also check branch
  if (userRole !== 'admin' && userRole !== 'store manager') {
    if (userBranchId) {
      sql += ` AND ar.branch_id = ?`;
    }
  } else if (userRole === 'store manager' && req.query.branch_id) {
    // For store managers who requested a specific branch
    sql += ` AND ar.branch_id = ?`;
  }

  // Build query params based on role and branch
  let queryParams = [reportId];
  if (userRole !== 'admin' && userRole !== 'store manager' && userBranchId) {
    queryParams.push(userBranchId);
  } else if (userRole === 'store manager' && req.query.branch_id) {
    queryParams.push(parseInt(req.query.branch_id));
  }

  console.log('Single report SQL:', sql);
  console.log('Single report params:', queryParams);

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching assay report:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Assay report not found" });
    }

    // Get metal compositions
    const compositionSql = `
      SELECT * FROM metal_compositions
      WHERE report_id = ?
      ORDER BY element_name
    `;

    con.query(compositionSql, [reportId], (compErr, compositions) => {
      if (compErr) {
        console.error("Error fetching metal compositions:", compErr);
        return res.status(500).json({ message: "Database error", error: compErr.message });
      }

      // Add compositions to the report
      const report = results[0];
      report.compositions = compositions || [];

      res.json(report);
    });
  });
});

// Create new assay report
router.post("/create", (req, res) => {
  const {
    report_date,
    customer_name,
    weight,
    gold_percentage,
    gold_concentration,
    gold_carat,
    sample_type,
    remarks,
    branch_id,
    compositions,
    item_id,
    is_homogeneous,
    has_solder,
    solder_quality
  } = req.body;

  console.log('POST /assay-reports/create - Creating new assay report');
  console.log('Request body:', req.body);

  // Basic validation
  if (!report_date || !weight || !gold_percentage || !gold_carat) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Start a transaction
  con.beginTransaction(err => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // Generate a sequential certificate number
    const getNextCertificateNumberSql = `
      SELECT MAX(CAST(SUBSTRING(certificate_no, 4) AS UNSIGNED)) as max_num
      FROM assay_reports
      WHERE certificate_no LIKE 'AC-%'
    `;

    con.query(getNextCertificateNumberSql, (numErr, numResults) => {
      if (numErr) {
        return con.rollback(() => {
          console.error("Error getting next certificate number:", numErr);
          res.status(500).json({ message: "Database error", error: numErr.message });
        });
      }

      // Get the next number (start with 1 if no records exist)
      const maxNum = numResults[0].max_num || 0;
      const nextNum = maxNum + 1;
      const certificate_no = `AC-${nextNum}`;

      console.log(`Generated certificate number: ${certificate_no}`);

      // Insert assay report
      const reportSql = `
        INSERT INTO assay_reports (
          certificate_no,
          report_date,
          customer_name,
          weight,
          gold_percentage,
          gold_concentration,
          gold_carat,
          sample_type,
          remarks,
          branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Log the branch_id to debug
      console.log('Branch ID from request:', branch_id, 'Type:', typeof branch_id);

      const reportValues = [
        certificate_no,
        report_date,
        customer_name || null,
        weight,
        gold_percentage,
        gold_concentration || gold_percentage,
        gold_carat,
        sample_type || null,
        remarks || null,
        branch_id ? parseInt(branch_id) : null
      ];

      console.log('Report values:', reportValues);

      con.query(reportSql, reportValues, (reportErr, reportResult) => {
        if (reportErr) {
          return con.rollback(() => {
            console.error("Error creating assay report:", reportErr);
            res.status(500).json({ message: "Database error", error: reportErr.message });
          });
        }

        const reportId = reportResult.insertId;

        // If compositions are provided, insert them
        if (compositions && compositions.length > 0) {
          const compositionSql = `
            INSERT INTO metal_compositions (
              report_id,
              element_name,
              element_symbol,
              concentration
            ) VALUES ?
          `;

          const compositionValues = compositions.map(comp => [
            reportId,
            comp.element_name,
            comp.element_symbol,
            comp.concentration
          ]);

          con.query(compositionSql, [compositionValues], (compErr) => {
            if (compErr) {
              return con.rollback(() => {
                console.error("Error inserting metal compositions:", compErr);
                res.status(500).json({ message: "Database error", error: compErr.message });
              });
            }

            // If item_id is provided, link the report to the jewellery item
            if (item_id) {
              const metadataSql = `
                INSERT INTO jewellery_items_metadata (
                  item_id,
                  report_id,
                  is_homogeneous,
                  has_solder,
                  solder_quality
                ) VALUES (?, ?, ?, ?, ?)
              `;

              const metadataValues = [
                item_id,
                reportId,
                is_homogeneous !== undefined ? is_homogeneous : true,
                has_solder !== undefined ? has_solder : false,
                solder_quality || null
              ];

              con.query(metadataSql, metadataValues, (metadataErr) => {
                if (metadataErr) {
                  return con.rollback(() => {
                    console.error("Error linking jewellery item:", metadataErr);
                    res.status(500).json({ message: "Database error", error: metadataErr.message });
                  });
                }

                // Update the jewellery item with assay details
                const updateItemSql = `
                  UPDATE jewellery_items
                  SET
                    gold_carat = ?,
                    weight = ?,
                    assay_certificate = ?,
                    is_solid_gold = ?
                  WHERE item_id = ?
                `;

                const updateItemValues = [
                  gold_carat,
                  weight,
                  certificate_no,
                  is_homogeneous !== undefined ? is_homogeneous : true,
                  item_id
                ];

                con.query(updateItemSql, updateItemValues, (updateErr) => {
                  if (updateErr) {
                    return con.rollback(() => {
                      console.error("Error updating jewellery item:", updateErr);
                      res.status(500).json({ message: "Database error", error: updateErr.message });
                    });
                  }

                  // Commit the transaction
                  con.commit(commitErr => {
                    if (commitErr) {
                      return con.rollback(() => {
                        console.error("Error committing transaction:", commitErr);
                        res.status(500).json({ message: "Database error", error: commitErr.message });
                      });
                    }

                    res.status(201).json({
                      message: "Assay report created successfully",
                      report_id: reportId,
                      certificate_no
                    });
                  });
                });
              });
            } else {
              // No item_id provided, just commit the transaction
              con.commit(commitErr => {
                if (commitErr) {
                  return con.rollback(() => {
                    console.error("Error committing transaction:", commitErr);
                    res.status(500).json({ message: "Database error", error: commitErr.message });
                  });
                }

                res.status(201).json({
                  message: "Assay report created successfully",
                  report_id: reportId,
                  certificate_no
                });
              });
            }
          });
        } else {
          // No compositions provided, just commit the transaction
          con.commit(commitErr => {
            if (commitErr) {
              return con.rollback(() => {
                console.error("Error committing transaction:", commitErr);
                res.status(500).json({ message: "Database error", error: commitErr.message });
              });
            }

            res.status(201).json({
              message: "Assay report created successfully",
              report_id: reportId,
              certificate_no
            });
          });
        }
      });
    });
  });
});

// Update assay report
router.put("/update/:id", (req, res) => {
  const reportId = req.params.id;
  const {
    certificate_no,
    report_date,
    customer_name,
    weight,
    gold_percentage,
    gold_concentration,
    gold_carat,
    sample_type,
    remarks,
    branch_id,
    compositions,
    item_id,
    is_homogeneous,
    has_solder,
    solder_quality
  } = req.body;

  console.log(`PUT /assay-reports/update/${reportId} - Updating assay report`);
  console.log('Request body:', req.body);

  // Basic validation
  if (!report_date || !weight || !gold_percentage || !gold_carat) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const sql = `
    UPDATE assay_reports
    SET
      certificate_no = ?,
      report_date = ?,
      customer_name = ?,
      weight = ?,
      gold_percentage = ?,
      gold_concentration = ?,
      gold_carat = ?,
      sample_type = ?,
      remarks = ?,
      branch_id = ?,
      updated_at = NOW()
    WHERE report_id = ?
  `;

  // Log the branch_id to debug
  console.log('Update - Branch ID from request:', branch_id, 'Type:', typeof branch_id);

  const values = [
    certificate_no,
    report_date,
    customer_name || null,
    weight,
    gold_percentage,
    gold_concentration || gold_percentage,
    gold_carat,
    sample_type || null,
    remarks || null,
    branch_id ? parseInt(branch_id) : null,
    reportId
  ];

  console.log('Update values:', values);

  // Start a transaction
  con.beginTransaction(err => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    con.query(sql, values, (err, result) => {
      if (err) {
        return con.rollback(() => {
          console.error("Error updating assay report:", err);
          res.status(500).json({ message: "Database error", error: err.message });
        });
      }

      if (result.affectedRows === 0) {
        return con.rollback(() => {
          res.status(404).json({ message: "Assay report not found" });
        });
      }

      // Handle compositions if provided
      const updateCompositions = (callback) => {
        if (compositions && compositions.length > 0) {
          // First delete existing compositions
          const deleteCompSql = `DELETE FROM metal_compositions WHERE report_id = ?`;

          con.query(deleteCompSql, [reportId], (deleteErr) => {
            if (deleteErr) {
              return con.rollback(() => {
                console.error("Error deleting existing compositions:", deleteErr);
                res.status(500).json({ message: "Database error", error: deleteErr.message });
              });
            }

            // Insert new compositions
            const compositionSql = `
              INSERT INTO metal_compositions (
                report_id,
                element_name,
                element_symbol,
                concentration
              ) VALUES ?
            `;

            const compositionValues = compositions.filter(comp => comp.concentration > 0).map(comp => [
              reportId,
              comp.element_name,
              comp.element_symbol,
              comp.concentration
            ]);

            if (compositionValues.length > 0) {
              con.query(compositionSql, [compositionValues], (compErr) => {
                if (compErr) {
                  return con.rollback(() => {
                    console.error("Error inserting metal compositions:", compErr);
                    res.status(500).json({ message: "Database error", error: compErr.message });
                  });
                }

                callback();
              });
            } else {
              callback();
            }
          });
        } else {
          callback();
        }
      };

      // Handle item metadata if provided
      const updateItemMetadata = (callback) => {
        if (item_id) {
          // Check if metadata already exists
          const checkMetadataSql = `SELECT metadata_id FROM jewellery_items_metadata WHERE report_id = ?`;

          con.query(checkMetadataSql, [reportId], (checkErr, checkResults) => {
            if (checkErr) {
              return con.rollback(() => {
                console.error("Error checking metadata:", checkErr);
                res.status(500).json({ message: "Database error", error: checkErr.message });
              });
            }

            if (checkResults.length > 0) {
              // Update existing metadata
              const updateMetadataSql = `
                UPDATE jewellery_items_metadata
                SET
                  item_id = ?,
                  is_homogeneous = ?,
                  has_solder = ?,
                  solder_quality = ?
                WHERE report_id = ?
              `;

              const metadataValues = [
                item_id,
                is_homogeneous !== undefined ? is_homogeneous : true,
                has_solder !== undefined ? has_solder : false,
                solder_quality || null,
                reportId
              ];

              con.query(updateMetadataSql, metadataValues, (updateErr) => {
                if (updateErr) {
                  return con.rollback(() => {
                    console.error("Error updating metadata:", updateErr);
                    res.status(500).json({ message: "Database error", error: updateErr.message });
                  });
                }

                callback();
              });
            } else {
              // Insert new metadata
              const insertMetadataSql = `
                INSERT INTO jewellery_items_metadata (
                  item_id,
                  report_id,
                  is_homogeneous,
                  has_solder,
                  solder_quality
                ) VALUES (?, ?, ?, ?, ?)
              `;

              const metadataValues = [
                item_id,
                reportId,
                is_homogeneous !== undefined ? is_homogeneous : true,
                has_solder !== undefined ? has_solder : false,
                solder_quality || null
              ];

              con.query(insertMetadataSql, metadataValues, (insertErr) => {
                if (insertErr) {
                  return con.rollback(() => {
                    console.error("Error inserting metadata:", insertErr);
                    res.status(500).json({ message: "Database error", error: insertErr.message });
                  });
                }

                callback();
              });
            }
          });
        } else {
          callback();
        }
      };

      // Update jewellery item if provided
      const updateJewelleryItem = (callback) => {
        if (item_id) {
          const updateItemSql = `
            UPDATE jewellery_items
            SET
              gold_carat = ?,
              weight = ?,
              assay_certificate = ?,
              is_solid_gold = ?
            WHERE item_id = ?
          `;

          const updateItemValues = [
            gold_carat,
            weight,
            certificate_no,
            is_homogeneous !== undefined ? is_homogeneous : true,
            item_id
          ];

          con.query(updateItemSql, updateItemValues, (updateErr) => {
            if (updateErr) {
              return con.rollback(() => {
                console.error("Error updating jewellery item:", updateErr);
                res.status(500).json({ message: "Database error", error: updateErr.message });
              });
            }

            callback();
          });
        } else {
          callback();
        }
      };

      // Execute all updates in sequence
      updateCompositions(() => {
        updateItemMetadata(() => {
          updateJewelleryItem(() => {
            // Commit the transaction
            con.commit(commitErr => {
              if (commitErr) {
                return con.rollback(() => {
                  console.error("Error committing transaction:", commitErr);
                  res.status(500).json({ message: "Database error", error: commitErr.message });
                });
              }

              res.json({
                message: "Assay report updated successfully",
                report_id: reportId
              });
            });
          });
        });
      });
    });
  });
});

// Delete assay report
router.delete("/delete/:id", (req, res) => {
  const reportId = req.params.id;

  console.log(`DELETE /assay-reports/delete/${reportId} - Deleting assay report`);

  // Start a transaction
  con.beginTransaction(err => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    // First, get all jewellery items linked to this report
    const getItemsSql = `
      SELECT item_id FROM jewellery_items_metadata
      WHERE report_id = ?
    `;

    con.query(getItemsSql, [reportId], (getErr, items) => {
      if (getErr) {
        return con.rollback(() => {
          console.error("Error getting linked items:", getErr);
          res.status(500).json({ message: "Database error", error: getErr.message });
        });
      }

      // Update all linked jewellery items to remove assay details
      if (items && items.length > 0) {
        const itemIds = items.map(item => item.item_id);
        const updateItemsSql = `
          UPDATE jewellery_items
          SET
            gold_carat = NULL,
            weight = NULL,
            assay_certificate = NULL,
            is_solid_gold = TRUE
          WHERE item_id IN (?)
        `;

        con.query(updateItemsSql, [itemIds], (updateErr) => {
          if (updateErr) {
            return con.rollback(() => {
              console.error("Error updating jewellery items:", updateErr);
              res.status(500).json({ message: "Database error", error: updateErr.message });
            });
          }

          // Delete the assay report (this will cascade delete metadata and compositions)
          const deleteReportSql = `DELETE FROM assay_reports WHERE report_id = ?`;

          con.query(deleteReportSql, [reportId], (deleteErr, deleteResult) => {
            if (deleteErr) {
              return con.rollback(() => {
                console.error("Error deleting assay report:", deleteErr);
                res.status(500).json({ message: "Database error", error: deleteErr.message });
              });
            }

            if (deleteResult.affectedRows === 0) {
              return con.rollback(() => {
                res.status(404).json({ message: "Assay report not found" });
              });
            }

            // Commit the transaction
            con.commit(commitErr => {
              if (commitErr) {
                return con.rollback(() => {
                  console.error("Error committing transaction:", commitErr);
                  res.status(500).json({ message: "Database error", error: commitErr.message });
                });
              }

              res.json({
                message: "Assay report deleted successfully",
                report_id: reportId
              });
            });
          });
        });
      } else {
        // No linked items, just delete the report
        const deleteReportSql = `DELETE FROM assay_reports WHERE report_id = ?`;

        con.query(deleteReportSql, [reportId], (deleteErr, deleteResult) => {
          if (deleteErr) {
            return con.rollback(() => {
              console.error("Error deleting assay report:", deleteErr);
              res.status(500).json({ message: "Database error", error: deleteErr.message });
            });
          }

          if (deleteResult.affectedRows === 0) {
            return con.rollback(() => {
              res.status(404).json({ message: "Assay report not found" });
            });
          }

          // Commit the transaction
          con.commit(commitErr => {
            if (commitErr) {
              return con.rollback(() => {
                console.error("Error committing transaction:", commitErr);
                res.status(500).json({ message: "Database error", error: commitErr.message });
              });
            }

            res.json({
              message: "Assay report deleted successfully",
              report_id: reportId
            });
          });
        });
      }
    });
  });
});

// Get available jewellery items (without assay reports)
router.get("/available-items", (req, res) => {
  console.log('GET /assay-reports/available-items - Fetching available jewellery items');

  // Get user role and branch from the request
  const userRole = req.user.role;
  let userBranchId = req.user.branch_id;

  // Check if branch_id is provided in query params
  if (req.query.branch_id) {
    userBranchId = parseInt(req.query.branch_id);
  }

  console.log(`User role: ${userRole}, Branch ID: ${userBranchId}`);

  // Query to get items that don't have assay reports yet
  // or include all items if includeAll=true is in the query
  const includeAll = req.query.includeAll === 'true';

  let sql = `
    SELECT ji.*, b.branch_name
    FROM jewellery_items ji
    LEFT JOIN branches b ON ji.branch_id = b.branch_id
    LEFT JOIN jewellery_items_metadata jim ON ji.item_id = jim.item_id
  `;

  let whereConditions = [];
  let queryParams = [];

  // Filter by branch for non-admin users
  if (userRole !== 'admin' && userBranchId) {
    whereConditions.push('ji.branch_id = ?');
    queryParams.push(userBranchId);
  } else if (userBranchId) {
    // For admin users who selected a specific branch
    whereConditions.push('ji.branch_id = ?');
    queryParams.push(userBranchId);
  }

  // Filter out items that already have assay reports unless includeAll is true
  if (!includeAll) {
    whereConditions.push('jim.metadata_id IS NULL');
  }

  // Add WHERE clause if we have conditions
  if (whereConditions.length > 0) {
    sql += ' WHERE ' + whereConditions.join(' AND ');
  }

  sql += ' ORDER BY ji.product_added DESC';

  con.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching available jewellery items:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${results.length} available jewellery items`);
    res.json(results || []);
  });
});

// Add metal composition to a report
router.post("/:id/compositions", (req, res) => {
  const reportId = req.params.id;
  const { element_name, element_symbol, concentration } = req.body;

  // Basic validation
  if (!element_name || concentration === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO metal_compositions (
      report_id,
      element_name,
      element_symbol,
      concentration
    ) VALUES (?, ?, ?, ?)
  `;

  const values = [
    reportId,
    element_name,
    element_symbol || null,
    concentration
  ];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error adding metal composition:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.status(201).json({
      message: "Metal composition added successfully",
      composition_id: result.insertId
    });
  });
});

// Get metal compositions for a report
router.get("/:id/compositions", (req, res) => {
  const reportId = req.params.id;

  const sql = `
    SELECT * FROM metal_compositions
    WHERE report_id = ?
    ORDER BY element_name
  `;

  con.query(sql, [reportId], (err, results) => {
    if (err) {
      console.error("Error fetching metal compositions:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results || []);
  });
});

export { router as assayReportRouter };
