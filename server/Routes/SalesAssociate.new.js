import express from "express";
import fs from "fs";
import con from "../utils/db.js"; // Database connection
import bcrypt from "bcrypt";

const router = express.Router();

// ✅ GET Sales Associates with Branch Name (JOIN users + branches)
router.get("/", (req, res) => {
  const sql = `
    SELECT users.*, branches.branch_name
    FROM users
    LEFT JOIN branches ON users.branch_id = branches.branch_id
    WHERE users.role = 'Sales Associate'
  `;

  con.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json(results || []); // Ensure response is always an array
  });
});

// ✅ GET a Single Sales Associate by ID with Branch Name (JOIN users + branches)
router.get("/:id", (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT users.*, branches.branch_name
    FROM users
    LEFT JOIN branches ON users.branch_id = branches.branch_id
    WHERE users.user_id = ? AND users.role = 'Sales Associate'
  `;

  con.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Sales Associate not found" });
    }
    res.json(results[0]); // Send single user object
  });
});

// ✅ CREATE Sales Associate
router.post("/create", (req, res) => {
  const { username, email, password, firstName, lastName, nic, phone, address, sex, role, branchId } = req.body;

  const parsedBranchId = parseInt(branchId, 10);
  if (isNaN(parsedBranchId)) {
    return res.status(400).json({ message: "Invalid branch ID. It must be a number." });
  }

  // Hash the password before inserting
  bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
    if (hashErr) {
      console.error("Error hashing password:", hashErr);
      return res.status(500).json({
        message: "Error hashing password",
        error: hashErr.message
      });
    }

    const sql = `INSERT INTO users (username, email, password, first_name, last_name, nic, phone, address, sex, role, branch_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [username, email, hashedPassword, firstName, lastName, nic, phone, address, sex, role, parsedBranchId];

    con.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      res.status(201).json({ message: "Sales Associate created successfully", userId: result.insertId });
    });
  });
});

// ✅ UPDATE Sales Associate
router.put("/update/:id", (req, res) => {
  const userId = req.params.id;
  const { username, email, password, firstName, lastName, nic, phone, address, sex, role, branchId } = req.body;

  const parsedBranchId = parseInt(branchId, 10);
  if (isNaN(parsedBranchId)) {
    return res.status(400).json({ message: "Invalid branch ID. It must be a number." });
  }

  // If password is provided, hash it before updating
  if (password && password.trim() !== '') {
    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error("Error hashing password:", hashErr);
        return res.status(500).json({
          message: "Error hashing password",
          error: hashErr.message
        });
      }

      const sql = `UPDATE users
                 SET username=?, email=?, password=?, first_name=?, last_name=?, nic=?, phone=?, address=?, sex=?, role=?, branch_id=?
                 WHERE user_id=? AND role = 'Sales Associate'`;
      const values = [username, email, hashedPassword, firstName, lastName, nic, phone, address, sex, role, parsedBranchId, userId];

      con.query(sql, values, (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err });
        }
        res.json({ message: "Sales Associate updated successfully" });
      });
    });
  } else {
    // No password update, exclude password field from update
    const sql = `UPDATE users
               SET username=?, email=?, first_name=?, last_name=?, nic=?, phone=?, address=?, sex=?, role=?, branch_id=?
               WHERE user_id=? AND role = 'Sales Associate'`;
    const values = [username, email, firstName, lastName, nic, phone, address, sex, role, parsedBranchId, userId];

    con.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      res.json({ message: "Sales Associate updated successfully" });
    });
  }
});

// ✅ DELETE Sales Associate
router.delete("/delete/:id", (req, res) => {
  const userId = req.params.id;
  console.log(`Attempting to delete Sales Associate with ID: ${userId}`);

  // First check if the user exists
  con.query("SELECT * FROM users WHERE user_id = ? AND role = 'Sales Associate'", [userId], (err, results) => {
    if (err) {
      console.error('Error checking if user exists:', err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      console.log(`Sales Associate with ID ${userId} not found`);
      return res.status(404).json({ message: "Sales Associate not found" });
    }

    console.log(`Found Sales Associate:`, results[0]);

    // Try to delete the image if it exists
    try {
      const imagePath = results[0].img;
      if (imagePath && fs.existsSync(imagePath)) {
        console.log(`Deleting image at path: ${imagePath}`);
        fs.unlinkSync(imagePath);
      }
    } catch (imageError) {
      // Log the error but continue with deletion
      console.error('Error deleting image:', imageError);
    }

    // Check for foreign key constraints first
    con.query(
      `SELECT
        TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        REFERENCED_TABLE_NAME = 'users' AND
        CONSTRAINT_SCHEMA = 'slanakajewel'`,
      (constraintErr, constraints) => {
        if (constraintErr) {
          console.error('Error checking constraints:', constraintErr);
        } else {
          console.log('Foreign key constraints that reference users table:', constraints);
        }

        // Try to delete the user from the database
        con.query("DELETE FROM users WHERE user_id = ? AND role = 'Sales Associate'", [userId], (deleteErr, result) => {
          if (deleteErr) {
            console.error('Error deleting user from database:', deleteErr);
            // Send detailed error information
            return res.status(500).json({
              message: "Database error",
              error: deleteErr.message,
              code: deleteErr.code,
              sqlState: deleteErr.sqlState,
              sqlMessage: deleteErr.sqlMessage
            });
          }

          console.log(`Successfully deleted Sales Associate with ID: ${userId}`);
          res.json({ message: "Sales Associate deleted successfully" });
        });
      }
    );
  });
});

// Add an endpoint to check the database structure
router.get("/check-table-structure", (req, res) => {
  con.query("DESCRIBE users", (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
});

// Export the router using default export
export default router;
