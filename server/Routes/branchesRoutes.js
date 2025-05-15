import express from 'express';
import con from '../utils/db.js';
import verifyToken from '../Middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all branches
router.get('/', (req, res) => {
    console.log('GET /branches - Fetching all branches');
    console.log('User from token:', req.user);

    const sql = `SELECT * FROM branches ORDER BY branch_id`;

    con.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching branches:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }

        console.log(`Found ${results.length} branches`);
        res.json(results);
    });
});

// Get branch by ID
router.get('/:id', (req, res) => {
    const branchId = req.params.id;
    console.log(`GET /branches/${branchId} - Fetching branch by ID`);

    const sql = `SELECT * FROM branches WHERE branch_id = ?`;

    con.query(sql, [branchId], (err, results) => {
        if (err) {
            console.error('Error fetching branch:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        res.json(results[0]);
    });
});

export default router;
