import express from 'express';
import {
  getSalesReport,
  getInventoryReport,
  getCurrentStockReport,
  getGoldStockReport,
  getLowStockReport,
  getInventoryValuationReport,
  exportReportCSV
} from '../Controllers/reportsController.js';
import { getFinancialReport } from '../Controllers/financialReportController.js';
import verifyToken from '../Middleware/authMiddleware.js';

const router = express.Router();

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`[${req.method}] /api/reports${req.url}`);
  next();
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.status(200).json({ message: 'Reports API is working!' });
});

// Sales reports
router.get('/sales', getSalesReport);

// Inventory reports
router.get('/inventory', getInventoryReport);
router.get('/inventory/current-stock', getCurrentStockReport);
router.get('/inventory/gold-stock', getGoldStockReport);
router.get('/inventory/low-stock', getLowStockReport);
router.get('/inventory/valuation', getInventoryValuationReport);

// Financial reports
router.get('/financial', getFinancialReport);

// Export reports
router.get('/export', exportReportCSV);

export default router;
