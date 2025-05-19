import con from "../utils/db.js";
import { format } from 'date-fns';

// Helper function to format date for SQL queries
const formatDateForSQL = (date) => {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
};

// Helper function to get date range based on period
const getDateRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate = new Date(today);
  let endDate = new Date(today);

  // Set end date to end of current day (23:59:59)
  endDate.setHours(23, 59, 59, 999);

  switch (period) {
    case 'today':
      // Start date is already beginning of today, end date is end of today
      break;
    case 'yesterday':
      startDate.setDate(today.getDate() - 1);
      endDate.setDate(today.getDate() - 1);
      break;
    case 'last7':
      startDate.setDate(today.getDate() - 6); // 7 days including today
      break;
    case 'last30':
      startDate.setDate(today.getDate() - 29); // 30 days including today
      break;
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'lastMonth':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
    default:
      startDate.setDate(today.getDate() - 29); // Default to last 30 days including today
  }

  // Format dates for SQL
  return {
    startDate: formatDateForSQL(startDate),
    endDate: formatDateForSQL(endDate)
  };
};

// Get financial report data
export const getFinancialReport = async (req, res) => {
  try {
    const { period = 'last30', startDate, endDate, branchId } = req.query;

    // Log the requested period for debugging
    console.log('Financial report requested with period:', period);

    // Determine date range
    const dateRange = startDate && endDate
      ? { startDate, endDate }
      : getDateRange(period);

    console.log('Date range:', dateRange);

    // Base WHERE clause for branch filtering
    const branchFilter = branchId ? 'AND s.branch_id = ?' : '';
    const branchParams = branchId ? [branchId] : [];

    // Get all branches for the filter dropdown
    const branchesQuery = `SELECT branch_id, branch_name FROM branches ORDER BY branch_name`;
    const [branches] = await con.promise().query(branchesQuery);

    // 1. Revenue Overview
    // Get sales revenue
    const salesRevenueQuery = `
      SELECT
        COALESCE(SUM(total_amount), 0) AS totalSalesRevenue,
        COUNT(*) AS totalSalesCount
      FROM sales s
      WHERE sale_date BETWEEN ? AND ? ${branchFilter}
    `;
    console.log('Sales revenue query:', salesRevenueQuery);
    console.log('Sales revenue params:', [dateRange.startDate, dateRange.endDate, ...branchParams]);

    const [salesRevenue] = await con.promise().query(
      salesRevenueQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );
    console.log('Sales revenue result:', salesRevenue);

    // Get individual sales for debugging
    const individualSalesQuery = `
      SELECT sale_id, customer_name, total_amount, sale_date
      FROM sales s
      WHERE sale_date BETWEEN ? AND ? ${branchFilter}
      ORDER BY sale_date DESC
      LIMIT 10
    `;

    const [individualSales] = await con.promise().query(
      individualSalesQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );
    console.log('Individual sales (up to 10):', individualSales);

    // Get advance payments revenue
    const advancePaymentsQuery = `
      SELECT
        COALESCE(SUM(advance_amount), 0) AS totalAdvancePayments,
        COUNT(*) AS totalAdvancePaymentsCount
      FROM advance_payments ap
      WHERE payment_date BETWEEN ? AND ? ${branchFilter ? 'AND ap.branch_id = ?' : ''}
    `;
    console.log('Advance payments query:', advancePaymentsQuery);
    console.log('Advance payments params:', [dateRange.startDate, dateRange.endDate, ...branchParams]);

    const [advancePayments] = await con.promise().query(
      advancePaymentsQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );
    console.log('Advance payments result:', advancePayments);

    // Get individual advance payments for debugging
    const individualAdvancePaymentsQuery = `
      SELECT payment_id, customer_name, advance_amount, payment_date
      FROM advance_payments ap
      WHERE payment_date BETWEEN ? AND ? ${branchFilter ? 'AND ap.branch_id = ?' : ''}
      ORDER BY payment_date DESC
      LIMIT 10
    `;

    const [individualAdvancePayments] = await con.promise().query(
      individualAdvancePaymentsQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );
    console.log('Individual advance payments (up to 10):', individualAdvancePayments);

    // Get orders revenue - using order_items table for total_amount
    const ordersRevenueQuery = `
      SELECT
        COALESCE(SUM(oi.total_amount), 0) AS totalOrdersRevenue,
        COUNT(DISTINCT o.order_id) AS totalOrdersCount
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.created_at BETWEEN ? AND ? ${branchFilter ? 'AND o.branch_id = ?' : ''}
    `;
    console.log('Orders revenue query:', ordersRevenueQuery);
    console.log('Orders revenue params:', [dateRange.startDate, dateRange.endDate, ...branchParams]);

    const [ordersRevenue] = await con.promise().query(
      ordersRevenueQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );
    console.log('Orders revenue result:', ordersRevenue);

    // Get individual orders for debugging
    const individualOrdersQuery = `
      SELECT o.order_id, o.created_at, oi.total_amount
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.created_at BETWEEN ? AND ? ${branchFilter ? 'AND o.branch_id = ?' : ''}
      ORDER BY o.created_at DESC
      LIMIT 10
    `;

    const [individualOrders] = await con.promise().query(
      individualOrdersQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );
    console.log('Individual orders (up to 10):', individualOrders);

    // 2. Revenue by time period (daily)
    const revenueByDayQuery = `
      SELECT
        DATE(sale_date) AS date,
        COALESCE(SUM(total_amount), 0) AS amount
      FROM sales s
      WHERE sale_date BETWEEN ? AND ? ${branchFilter}
      GROUP BY DATE(sale_date)
      ORDER BY date
    `;
    const [revenueByDay] = await con.promise().query(
      revenueByDayQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );

    // 3. Revenue by payment method
    const revenueByPaymentMethodQuery = `
      SELECT
        payment_method,
        COUNT(*) AS count,
        COALESCE(SUM(total_amount), 0) AS amount
      FROM sales s
      WHERE sale_date BETWEEN ? AND ? ${branchFilter}
      GROUP BY payment_method
      ORDER BY amount DESC
    `;
    const [revenueByPaymentMethod] = await con.promise().query(
      revenueByPaymentMethodQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );

    // 4. Revenue by branch
    const revenueByBranchQuery = `
      SELECT
        b.branch_id,
        b.branch_name,
        COUNT(s.sale_id) AS count,
        COALESCE(SUM(s.total_amount), 0) AS amount
      FROM sales s
      JOIN branches b ON s.branch_id = b.branch_id
      WHERE s.sale_date BETWEEN ? AND ? ${branchFilter}
      GROUP BY b.branch_id
      ORDER BY amount DESC
    `;
    const [revenueByBranch] = await con.promise().query(
      revenueByBranchQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );

    // 5. Profit Margin Analysis (if buying_price is available)
    const profitMarginQuery = `
      SELECT
        COALESCE(SUM(ji.selling_price - ji.buying_price), 0) AS totalProfit,
        COALESCE(AVG((ji.selling_price - ji.buying_price) / ji.selling_price * 100), 0) AS averageProfitMargin
      FROM jewellery_items ji
      JOIN sale_items si ON ji.item_id = si.item_id
      JOIN sales s ON s.sale_id = si.sale_id AND s.sale_date BETWEEN ? AND ? ${branchFilter}
      WHERE ji.branch_id = s.branch_id
    `;
    const [profitMargin] = await con.promise().query(
      profitMarginQuery,
      [dateRange.startDate, dateRange.endDate, ...branchParams]
    );

    console.log('Profit margin result:', profitMargin);

    // Ensure profit margin values are numbers
    const processedProfitMargin = profitMargin[0] ? {
      totalProfit: parseFloat(profitMargin[0].totalProfit) || 0,
      averageProfitMargin: parseFloat(profitMargin[0].averageProfitMargin) || 0
    } : {
      totalProfit: 0,
      averageProfitMargin: 0
    };

    // Prepare and send response
    // Convert revenue values to numbers to ensure proper calculation
    const salesRevenueValue = Number(salesRevenue[0]?.totalSalesRevenue) || 0;
    const advancePaymentsValue = Number(advancePayments[0]?.totalAdvancePayments) || 0;
    const ordersRevenueValue = Number(ordersRevenue[0]?.totalOrdersRevenue) || 0;

    // Calculate total revenue
    const totalRevenue = salesRevenueValue + advancePaymentsValue + ordersRevenueValue;

    console.log('Revenue calculation:', {
      salesRevenueValue,
      advancePaymentsValue,
      ordersRevenueValue,
      totalRevenue
    });

    const response = {
      period,
      dateRange,
      branches,
      selectedBranch: branchId,
      revenue: {
        sales: salesRevenueValue,
        advancePayments: advancePaymentsValue,
        orders: ordersRevenueValue,
        total: totalRevenue
      },
      transactions: {
        sales: Number(salesRevenue[0]?.totalSalesCount) || 0,
        advancePayments: Number(advancePayments[0]?.totalAdvancePaymentsCount) || 0,
        orders: Number(ordersRevenue[0]?.totalOrdersCount) || 0,
        total: (Number(salesRevenue[0]?.totalSalesCount) || 0) +
               (Number(advancePayments[0]?.totalAdvancePaymentsCount) || 0) +
               (Number(ordersRevenue[0]?.totalOrdersCount) || 0)
      },
      revenueByDay,
      revenueByPaymentMethod,
      revenueByBranch,
      profitMargin: processedProfitMargin
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ message: 'Error generating financial report', error: error.message });
  }
};
