import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/adminlogin", (req, res) => {
    const sql = "SELECT * FROM admin WHERE email = ? AND password = ?";

    con.query(sql, [req.body.email, req.body.password], (err, result) => {
      if (err) {
        return res.status(500).json({ loginStatus: false, Error: "Query error" });
      }

      if (result.length > 0) {
        const admin = result[0];

        // Generate JWT Access Token
        const accessToken = jwt.sign(
          { role: "admin", email: admin.email, id: admin.id },
          "jwt_secret_key",
          { expiresIn: "1d" }
        );

        // Set token in HTTP-only cookie
        res.cookie("token", accessToken, {
          httpOnly: true, // Prevents JavaScript access for security
          secure: process.env.NODE_ENV === "production", // Secure in production
          sameSite: "Strict",
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        // Return response with the access token
        return res.status(200).json({
          loginStatus: true,
          message: "Login successful",
          accessToken: accessToken, // Send token in response
        });
      } else {
        return res.status(401).json({
          loginStatus: false,
          Error: "Wrong email or password",
        });
      }
    });
  });

router.get('/category', (req, res) => {
    const sql = "SELECT * FROM categories";
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error: " + err})
        return res.json({Status: true, Result: result})
    })
})

router.post('/add_category', (req, res) => {
    const sql = "INSERT INTO categories (category_name, description) VALUES (?, ?)"
    con.query(sql, [req.body.category_name, req.body.description || null], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error: " + err})
        return res.json({Status: true, Result: result})
    })
})

router.get('/category/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM categories WHERE category_id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error: " + err})
        return res.json({Status: true, Result: result})
    })
})

router.put('/edit_category/:id', (req, res) => {
    const id = req.params.id;
    const sql = "UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?";
    con.query(sql, [req.body.category_name, req.body.description, id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error: " + err})
        return res.json({Status: true, Result: result})
    })
})

router.delete('/delete_category/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM categories WHERE category_id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error: " + err})
        return res.json({Status: true, Result: result})
    })
})

router.get('/admin_count', (req, res) => {
    const sql = "select count(id) as admin from admin";
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"+err})
        return res.json({Status: true, Result: result})
    })
})

router.get('/admin_records', (req, res) => {
    const sql = "select * from admin"
    con.query(sql, (err, result) => {
        if(err) return res.json({Status: false, Error: "Query Error"+err})
        return res.json({Status: true, Result: result})
    })
})

router.get('/logout', (req, res) => {
    res.clearCookie('token')
    return res.json({Status: true})
})

export { router as adminRouter };