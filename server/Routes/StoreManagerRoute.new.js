import express from "express";
import fs from "fs";
import con from "../utils/db.js"; // Database connection
import bcrypt from "bcrypt";

const router = express.Router();

// ✅ GET Store Managers with Branch Name (JOIN users + branches)
router.get("/", (req, res) => {
  const sql = `
    SELECT users.*, branches.branch_name
    FROM users
    LEFT JOIN branches ON users.branch_id = branches.branch_id
    WHERE users.role = 'Store Manager'
  `;

  con.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json(results || []); // Ensure response is always an array
  });
});

// ✅ GET a Single Store Manager by ID with Branch Name (JOIN users + branches)
router.get("/:id", (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT users.*, branches.branch_name
    FROM users
    LEFT JOIN branches ON users.branch_id = branches.branch_id
    WHERE users.user_id = ? AND users.role = 'Store Manager'
  `;

  con.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Store Manager not found" });
    }
    res.json(results[0]); // Send single user object
  });
});

// ✅ CREATE Store Manager
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
      res.status(201).json({ message: "Store Manager created successfully", userId: result.insertId });
    });
  });
});

// ✅ UPDATE Store Manager
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
                 WHERE user_id=? AND role = 'Store Manager'`;
      const values = [username, email, hashedPassword, firstName, lastName, nic, phone, address, sex, role, parsedBranchId, userId];

      con.query(sql, values, (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err });
        }
        res.json({ message: "Store Manager updated successfully" });
      });
    });
  } else {
    // No password update, exclude password field from update
    const sql = `UPDATE users
               SET username=?, email=?, first_name=?, last_name=?, nic=?, phone=?, address=?, sex=?, role=?, branch_id=?
               WHERE user_id=? AND role = 'Store Manager'`;
    const values = [username, email, firstName, lastName, nic, phone, address, sex, role, parsedBranchId, userId];

    con.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      res.json({ message: "Store Manager updated successfully" });
    });
  }
});

// ✅ DELETE Store Manager
router.delete("/delete/:id", (req, res) => {
  const userId = req.params.id;
  console.log(`Attempting to delete Store Manager with ID: ${userId}`);

  // First check if the user exists
  con.query("SELECT * FROM users WHERE user_id = ? AND role = 'Store Manager'", [userId], (err, results) => {
    if (err) {
      console.error('Error checking if user exists:', err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      console.log(`Store Manager with ID ${userId} not found`);
      return res.status(404).json({ message: "Store Manager not found" });
    }

    console.log(`Found Store Manager:`, results[0]);

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

    // Delete the user from the database
    con.query("DELETE FROM users WHERE user_id = ? AND role = 'Store Manager'", [userId], (deleteErr, result) => {
      if (deleteErr) {
        console.error('Error deleting user from database:', deleteErr);
        return res.status(500).json({
          message: "Database error",
          error: deleteErr.message,
          code: deleteErr.code,
          sqlState: deleteErr.sqlState
        });
      }

      console.log(`Successfully deleted Store Manager with ID: ${userId}`);
      res.json({ message: "Store Manager deleted successfully" });
    });
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
