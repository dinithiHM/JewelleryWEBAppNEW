import express from "express";
import jwt from "jsonwebtoken";
import con from "../utils/db.js";

const authRouter = express.Router();

// ✅ Login Route with Plain Text Password Check (For now, skipping hash)
authRouter.post("/login", (req, res) => {
    const sql = "SELECT * FROM admin WHERE email = ? AND password = ?";

    con.query(sql, [req.body.email, req.body.password], (err, result) => {
        if (err) return res.status(500).json({ loginStatus: false, Error: "Server error" });

        if (result.length === 0) {
            return res.status(401).json({ loginStatus: false, Error: "Wrong email or password" });
        }

        const admin = result[0];

        // ✅ Generate JWT token
        const token = jwt.sign({ id: admin.id, email: admin.email, role: "Admin" }, "jwt_secret_key", { expiresIn: "1d" });

        return res.status(200).json({ loginStatus: true, token });
    });
});

// ✅ Register Route (Hash Passwords Later)
authRouter.post("/register", (req, res) => {
    const { email, password } = req.body;

    const sql = "INSERT INTO admin (email, password) VALUES (?, ?)";
    con.query(sql, [email, password], (err, result) => {
        if (err) return res.status(500).json({ Error: "Database error" });

        return res.status(201).json({ message: "Admin registered successfully" });
    });
});

// ✅ Token Verification Route
authRouter.get("/verifyToken", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ Error: "Unauthorized" });

    jwt.verify(token, "jwt_secret_key", (err, decoded) => {
        if (err) return res.status(401).json({ Error: "Invalid token" });

        return res.status(200).json({ loginStatus: true, user: decoded });
    });
});

export { authRouter };
