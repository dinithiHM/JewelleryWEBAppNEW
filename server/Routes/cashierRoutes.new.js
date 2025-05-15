import express from "express";
import con from "../utils/db.js";
import bcrypt from "bcrypt";

const router = express.Router();

// Get all cashiers
router.get("/", (req, res) => {
  console.log('GET /cashiers - Fetching all cashiers');

  const sql = `
    SELECT u.*, b.branch_name
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE u.role = 'cashier'
    ORDER BY u.user_id
  `;

  con.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching cashiers:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    console.log(`Found ${results.length} cashiers`);
    res.json(results || []);
  });
});

// Get a single cashier by ID
router.get("/:id", (req, res) => {
  const userId = req.params.id;
  console.log(`GET /cashiers/${userId} - Fetching cashier by ID`);

  if (!userId) {
    return res.status(400).json({ message: "Missing user ID" });
  }

  const sql = `
    SELECT u.*, b.branch_name
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE u.user_id = ? AND u.role = 'cashier'
  `;

  con.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching cashier:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Cashier not found" });
    }

    console.log(`Found cashier with ID ${userId}`);
    res.json(results[0]);
  });
});

// Create a new cashier
router.post("/create", (req, res) => {
  console.log("POST /cashiers/create - Creating new cashier");
  console.log("Request body:", req.body);

  const {
    username,
    email,
    password,
    first_name,
    last_name,
    nic,
    phone,
    address,
    branch_id,
    role
  } = req.body;

  // Validate required fields
  if (!username || !email || !password || !first_name || !last_name || !nic || !phone || !address) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if username or email already exists
  const checkSql = "SELECT * FROM users WHERE username = ? OR email = ?";
  con.query(checkSql, [username, email], (err, results) => {
    if (err) {
      console.error("Error checking existing users:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length > 0) {
      const existingUser = results[0];
      if (existingUser.username === username) {
        return res.status(409).json({ message: "Username already exists" });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ message: "Email already exists" });
      }
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

      // Insert new cashier with hashed password
      const insertSql = `
        INSERT INTO users (
          username,
          email,
          password,
          first_name,
          last_name,
          nic,
          phone,
          address,
          branch_id,
          role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        username,
        email,
        hashedPassword, // Now using the hashed password
        first_name,
        last_name,
        nic,
        phone,
        address,
        branch_id || 1, // Default to branch_id 1 if not provided
        "cashier" // Force role to be cashier regardless of what was sent
      ];

      con.query(insertSql, values, (err, result) => {
        if (err) {
          console.error("Error creating cashier:", err);
          return res.status(500).json({
            message: "Database error",
            error: err.message,
            code: err.code,
            sqlState: err.sqlState,
            sqlMessage: err.sqlMessage
          });
        }

        console.log(`Created new cashier with ID ${result.insertId}`);
        res.status(201).json({
          message: "Cashier created successfully",
          userId: result.insertId
        });
      });
    });
  });
});

// Update an existing cashier
router.put("/update/:id", (req, res) => {
  const userId = req.params.id;
  console.log(`PUT /cashiers/update/${userId} - Updating cashier`);
  console.log("Request body:", req.body);

  if (!userId) {
    return res.status(400).json({ message: "Missing user ID" });
  }

  const {
    username,
    email,
    password,
    first_name,
    last_name,
    nic,
    phone,
    address,
    branch_id
  } = req.body;

  // Validate required fields
  if (!username || !email || !first_name || !last_name || !nic || !phone || !address) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if username or email already exists for other users
  const checkSql = "SELECT * FROM users WHERE (username = ? OR email = ?) AND user_id != ?";
  con.query(checkSql, [username, email, userId], (err, results) => {
    if (err) {
      console.error("Error checking existing users:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length > 0) {
      const existingUser = results[0];
      if (existingUser.username === username) {
        return res.status(409).json({ message: "Username already exists" });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    // Prepare base update SQL and values
    let updateSql = `
      UPDATE users SET
        username = ?,
        email = ?,
        first_name = ?,
        last_name = ?,
        nic = ?,
        phone = ?,
        address = ?,
        branch_id = ?
    `;

    let values = [
      username,
      email,
      first_name,
      last_name,
      nic,
      phone,
      address,
      branch_id || 1 // Default to branch_id 1 if not provided
    ];

    // Handle password update separately if provided
    if (password && password.trim() !== '') {
      // Hash the password before updating
      bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          console.error("Error hashing password:", hashErr);
          return res.status(500).json({
            message: "Error hashing password",
            error: hashErr.message
          });
        }

        // Add hashed password to update
        const passwordUpdateSql = updateSql + ", password = ? WHERE user_id = ? AND role = 'cashier'";
        const passwordValues = [...values, hashedPassword, userId];

        con.query(passwordUpdateSql, passwordValues, (err, result) => {
          if (err) {
            console.error("Error updating cashier:", err);
            return res.status(500).json({
              message: "Database error",
              error: err.message,
              code: err.code,
              sqlState: err.sqlState,
              sqlMessage: err.sqlMessage
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Cashier not found or not updated" });
          }

          console.log(`Updated cashier with ID ${userId} (including password)`);
          res.json({ message: "Cashier updated successfully" });
        });
      });
    } else {
      // No password update, just update other fields
      updateSql += " WHERE user_id = ? AND role = 'cashier'";
      values.push(userId);

      con.query(updateSql, values, (err, result) => {
        if (err) {
          console.error("Error updating cashier:", err);
          return res.status(500).json({
            message: "Database error",
            error: err.message,
            code: err.code,
            sqlState: err.sqlState,
            sqlMessage: err.sqlMessage
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Cashier not found or not updated" });
        }

        console.log(`Updated cashier with ID ${userId}`);
        res.json({ message: "Cashier updated successfully" });
      });
    }
  });
});

// Delete a cashier
router.delete("/delete/:id", (req, res) => {
  const userId = req.params.id;
  console.log(`DELETE /cashiers/delete/${userId} - Deleting cashier`);

  if (!userId) {
    return res.status(400).json({ message: "Missing user ID" });
  }

  const sql = "DELETE FROM users WHERE user_id = ? AND role = 'cashier'";

  con.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error deleting cashier:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
        code: err.code,
        sqlState: err.sqlState,
        sqlMessage: err.sqlMessage
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cashier not found or already deleted" });
    }

    console.log(`Deleted cashier with ID ${userId}`);
    res.json({ message: "Cashier deleted successfully" });
  });
});

// Export the router using default export
export default router;
