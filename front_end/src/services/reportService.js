import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Create axios instance with auth header
const axiosInstance = axios.create({
  baseURL: `${API_URL}/api/reports`,
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage
    let token = localStorage.getItem('token');

    // If token not found in localStorage, try to get it from userInfo
    if (!token) {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        try {
          const parsedUserInfo = JSON.parse(userInfo);
          token = parsedUserInfo.token;
        } catch (e) {
          console.error('Error parsing userInfo:', e);
        }
      }
    }

    // If token found, add it to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found for API request');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Get sales report data
 * @param {Object} params - Query parameters for the report
 * @returns {Promise} - Promise with report data
 */
export const getSalesReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/sales', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching sales report:', error);
    throw error;
  }
};

/**
 * Get inventory report data
 * @param {Object} params - Query parameters for the report
 * @returns {Promise} - Promise with report data
 */
export const getInventoryReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/inventory', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    throw error;
  }
};

/**
 * Get current stock report data
 * @param {Object} params - Query parameters for the report (branchId for filtering)
 * @returns {Promise} - Promise with report data
 */
export const getCurrentStockReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/inventory/current-stock', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching current stock report:', error);
    throw error;
  }
};

/**
 * Get gold stock report data
 * @param {Object} params - Query parameters for the report
 * @returns {Promise} - Promise with report data
 */
export const getGoldStockReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/inventory/gold-stock', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching gold stock report:', error);
    throw error;
  }
};

/**
 * Get low stock report data
 * @param {Object} params - Query parameters for the report (branchId for filtering)
 * @returns {Promise} - Promise with report data
 */
export const getLowStockReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/inventory/low-stock', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock report:', error);
    throw error;
  }
};

/**
 * Get inventory valuation report data
 * @param {Object} params - Query parameters for the report (branchId for filtering)
 * @returns {Promise} - Promise with report data
 */
export const getInventoryValuationReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/inventory/valuation', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory valuation report:', error);
    throw error;
  }
};

/**
 * Get customer report data
 * @param {Object} params - Query parameters for the report
 * @returns {Promise} - Promise with report data
 */
export const getCustomerReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/customers', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching customer report:', error);
    throw error;
  }
};

/**
 * Get financial report data
 * @param {Object} params - Query parameters for the report
 * @returns {Promise} - Promise with report data
 */
export const getFinancialReport = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/financial', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching financial report:', error);
    throw error;
  }
};

/**
 * Export report as CSV
 * @param {String} reportType - Type of report to export
 * @param {Object} params - Query parameters for the report
 * @returns {Promise} - Promise with export result
 */
export const exportReportCSV = async (reportType, params = {}) => {
  try {
    const response = await axiosInstance.get('/export', {
      params: { reportType, format: 'csv', ...params },
      responseType: 'blob'
    });

    // Create a download link and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${reportType}_report_${date}.csv`);

    document.body.appendChild(link);
    link.click();
    link.remove();

    return { success: true };
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

/**
 * Export report as PDF
 * @param {String} reportType - Type of report to export
 * @param {Object} params - Query parameters for the report
 * @param {Object} chartRef - Optional reference to chart component for including in PDF
 * @returns {Promise} - Promise with export result
 */
export const exportReportPDF = async (reportType, params = {}, chartRef = null) => {
  try {
    // Always get data from the API first
    let data = [];
    let filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}`;

    // Get data from the API
    console.log('Fetching report data from API for', reportType);
    const response = await axiosInstance.get('/export', {
      params: { reportType, format: 'json', ...params }
    });

    // Log the response for debugging
    console.log('API response:', response.data);

    // Check if we have data from the API
    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log('Using API data for report');
      data = response.data.data;
      filename = response.data.filename || filename;
    } else {
      console.log('No data from API, checking for chart data');
      // If no data from API, try to use chart data as fallback
      if (chartRef && chartRef.current) {
        try {
          // Create data from the chart for PDF
          const chartData = window.chartData || [];

          if (chartData && chartData.length > 0) {
            console.log('Using chart data for report');
            data = chartData;
          } else {
            console.log('No chart data available');
          }
        } catch (chartError) {
          console.error('Error getting chart data:', chartError);
        }
      }
    }

    // Get user info from server response or fallback to localStorage
    let userName = 'System User';

    // Check if the server provided a user name in the response
    if (response.data && response.data.generatedBy) {
      console.log('Using server-provided user name:', response.data.generatedBy);
      userName = response.data.generatedBy;
    } else {
      // Fallback to localStorage if server didn't provide a name
      const userInfo = JSON.parse(localStorage.getItem('userInfo')) || { name: 'System User' };
      console.log('Using localStorage user name:', userInfo.name);
      userName = userInfo.name;
    }

    // Import jsPDF and autoTable dynamically
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    // Define gold-themed colors for charts
    const COLORS = ['#D4AF37', '#CFB53B', '#B8860B', '#DAA520', '#FFD700', '#FFC125', '#FFBF00', '#F0E68C'];

    // Create a new PDF document
    const doc = new jsPDF();

    // Add company header
    doc.setFontSize(22);
    doc.setTextColor(184, 134, 11); // Gold color
    doc.text("S Lanaka Jewellery", 105, 15, { align: 'center' });

    // Add title
    let title = 'Report';
    let titleColor = [184, 134, 11]; // Default gold color

    switch (reportType) {
      case 'current-stock':
        title = 'Current Stock Report';
        titleColor = [0, 128, 0]; // Green
        break;
      case 'gold-stock':
        title = 'Gold Stock Report';
        titleColor = [184, 134, 11]; // Gold
        break;
      case 'low-stock':
        title = 'Low Stock Report';
        titleColor = [255, 0, 0]; // Red
        break;
      case 'valuation':
        title = 'Inventory Valuation Report';
        titleColor = [0, 0, 128]; // Navy
        break;
      case 'sales-daily':
        title = 'Daily Sales Report';
        titleColor = [75, 0, 130]; // Indigo
        break;
      case 'sales-monthly':
        title = 'Monthly Sales Report';
        titleColor = [75, 0, 130]; // Indigo
        break;
      case 'sales-category':
        title = 'Sales by Category Report';
        titleColor = [75, 0, 130]; // Indigo
        break;
      case 'sales-branch':
        title = 'Sales by Branch Report';
        titleColor = [75, 0, 130]; // Indigo
        break;
    }

    // Add report title
    doc.setFontSize(18);
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.text(title, 105, 25, { align: 'center' });

    // Add date and user info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} by ${userName}`, 105, 32, { align: 'center' });

    // Add decorative line
    doc.setDrawColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    // Set starting Y position for the table
    let yPos = 40;

    // For sales reports, ensure we have the correct columns in the right order
    let formattedData = data;
    let headers = [];

    // Special handling for category report
    if (reportType === 'sales-category' && window.chartData && window.chartData.length > 0) {
      console.log('Using chart data for category report PDF');

      // Use the category data from the chart
      const categoryData = window.chartData;

      // Define the expected columns for category report
      headers = ['Category', 'Quantity Sold', 'Sales Amount', '% of Total Sales'];

      // Calculate total sales for percentage
      const totalSales = categoryData.reduce((sum, item) => sum + item.value, 0);

      // Format the data
      formattedData = categoryData.map(item => {
        const percentage = ((item.value / totalSales) * 100).toFixed(2) + '%';
        return {
          category: item.name,
          quantity: '0', // We don't have this in chartData, will be updated if available
          amount: item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          percentage: percentage
        };
      });

      // Try to get quantity data from the page if available
      if (typeof window !== 'undefined' && window.categoryQuantities) {
        formattedData.forEach(item => {
          if (window.categoryQuantities[item.category]) {
            item.quantity = window.categoryQuantities[item.category];
          }
        });
      }
    }
    else if (reportType.startsWith('sales-') && data.length > 0) {
      // Define the expected columns for sales reports
      const expectedColumns = [
        'sale_id', 'sale_date', 'total_amount', 'discount',
        'payment_method', 'customer_name', 'branch_name', 'employee_name'
      ];

      // Format the headers
      headers = [
        'Sale ID', 'Sale Date', 'Total Amount', 'Discount',
        'Payment Method', 'Customer Name', 'Branch Name', 'Employee Name'
      ];

      // Ensure data has all expected columns in the right order
      formattedData = data.map(item => {
        const formattedItem = {};
        expectedColumns.forEach(col => {
          formattedItem[col] = item[col] !== undefined ? item[col] : 'N/A';
        });
        return formattedItem;
      });
    } else {
      // For other reports, use the default approach
      headers = Object.keys(data[0] || {}).map(header => {
        // Convert camelCase or snake_case to Title Case with spaces
        return header
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
      });
    }

    // Format data for autoTable
    const tableData = formattedData.map(item => {
      return Object.values(item);
    });

    // Define gold-themed colors for different report types
    let headColor, alternateColor;

    switch (true) {
      case reportType.startsWith('sales-'):
        headColor = [75, 0, 130]; // Deep purple for sales
        alternateColor = [245, 245, 255]; // Light purple-ish
        break;
      case reportType === 'gold-stock':
        headColor = [184, 134, 11]; // Gold
        alternateColor = [255, 248, 220]; // Cornsilk
        break;
      case reportType === 'current-stock':
        headColor = [0, 128, 0]; // Green
        alternateColor = [240, 255, 240]; // Honeydew
        break;
      case reportType === 'low-stock':
        headColor = [178, 34, 34]; // Firebrick
        alternateColor = [255, 240, 240]; // Light red
        break;
      case reportType === 'valuation':
        headColor = [0, 0, 128]; // Navy
        alternateColor = [240, 248, 255]; // Alice blue
        break;
      default:
        headColor = [218, 165, 32]; // Goldenrod (default)
        alternateColor = [253, 245, 230]; // Light gold
        break;
    }

    // Check if we have data to display in the table
    if (tableData.length > 0) {
      console.log('Creating table with data:', tableData.length, 'rows');

      // Create table with gold-themed styling
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: yPos,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: headColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: alternateColor
        },
        columnStyles: {
          // Apply specific formatting based on report type
          ...(reportType === 'sales-daily' ? {
            0: { halign: 'center' },  // Sale ID
            1: { halign: 'center' },  // Sale Date
            2: { halign: 'right' },   // Total Amount
            3: { halign: 'right' },   // Discount
            4: { halign: 'center' },  // Payment Method
            5: { halign: 'left' },    // Customer Name
            6: { halign: 'left' },    // Branch Name
            7: { halign: 'left' }     // Employee Name
          } : reportType === 'sales-monthly' ? {
            0: { halign: 'center' },  // Month
            1: { halign: 'right' },   // Sales Amount
            2: { halign: 'center' },  // Transactions
            3: { halign: 'right' }    // Average
          } : {
            // Default formatting for other reports
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
          })
        },
        didDrawPage: () => {
          // Add footer with page numbers
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(
            `S Lanaka Jewellery - Page ${doc.internal.getNumberOfPages()}`,
            105,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      });
    } else {
      console.log('No data for table, skipping table creation');
      // Add a message indicating no data
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("No data available for the selected filters", 105, yPos + 20, { align: 'center' });

      // Update yPos for chart placement
      yPos += 30;
    }

    // Get the final Y position after the table
    // Use the current yPos if no table was created or autoTable is not available
    let finalY = yPos;
    if (doc.autoTable && doc.autoTable.previous) {
      finalY = doc.autoTable.previous.finalY;
      console.log('Final Y position from autoTable:', finalY);
    } else {
      console.log('Using default Y position:', finalY);
    }

    // Always add a page break for the chart
    doc.addPage();

    // Add chart after the table if available (for sales reports)
    if (reportType.startsWith('sales-')) {
      try {
        console.log('Adding chart to PDF on new page');

        // Add a title for the chart section
        doc.setFontSize(16);
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);

        // Use different title based on report type
        const chartTitle = reportType === 'sales-category'
          ? "Sales Distribution by Category"
          : "Sales Trend Chart";

        doc.text(chartTitle, 105, 20, { align: 'center' });

        // Create a simple chart directly in the PDF
        if (typeof window !== 'undefined' && window.chartData) {
          // Validate chart data
          if (!Array.isArray(window.chartData)) {
            console.error('Chart data is not an array:', window.chartData);
            throw new Error('Invalid chart data format');
          }

          if (window.chartData.length === 0) {
            console.warn('Chart data array is empty');
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(
              "No data available for chart visualization",
              105,
              60,
              { align: 'center' }
            );
            return;
          }

          const chartData = window.chartData;
          console.log('Using chart data from window object:', chartData.length, 'data points');

          // Set up chart dimensions for A4 page (210 x 297 mm)
          const pageWidth = doc.internal.pageSize.width;

          // Center the chart on the page with proper margins
          const chartX = 25;
          const chartY = 40;
          const chartWidth = pageWidth - 50; // 25mm margins on each side
          const chartHeight = 120; // Taller chart

          // Calculate bar spacing and width based on data points
          // Adjust based on number of data points to prevent overcrowding
          const maxBars = Math.min(chartData.length, 15); // Limit to 15 data points max
          const barSpacing = chartWidth / (maxBars * 2);
          const barWidth = Math.min(barSpacing * 0.8, 12); // Limit max width

          // Find max values for scaling
          let maxAmount = 0;
          let maxTransactions = 0;

          // Validate and find max values
          chartData.forEach(item => {
            // Ensure values are numbers and valid
            if (item && typeof item.amount !== 'undefined') {
              const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0;
              maxAmount = Math.max(maxAmount, amount);
            }

            if (item && typeof item.transactions !== 'undefined') {
              const transactions = typeof item.transactions === 'number' ? item.transactions : parseFloat(item.transactions) || 0;
              maxTransactions = Math.max(maxTransactions, transactions);
            }
          });

          console.log('Chart max values:', { maxAmount, maxTransactions });

          // Ensure we have non-zero max values
          if (maxAmount <= 0) maxAmount = 1000;
          if (maxTransactions <= 0) maxTransactions = 10;

          // Add some padding to max values
          maxAmount = maxAmount * 1.1;
          maxTransactions = maxTransactions * 1.1;

          // Draw chart axes
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);

          // Y-axis
          doc.line(chartX, chartY, chartX, chartY + chartHeight);

          // X-axis
          doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight);

          // Determine which data points to show if we have too many
          let dataToShow = chartData;
          if (chartData.length > maxBars) {
            // If we have too many data points, sample them evenly
            const step = Math.ceil(chartData.length / maxBars);
            dataToShow = [];
            for (let i = 0; i < chartData.length; i += step) {
              dataToShow.push(chartData[i]);
            }
            // Always include the last data point
            if (dataToShow[dataToShow.length - 1] !== chartData[chartData.length - 1]) {
              dataToShow.push(chartData[chartData.length - 1]);
            }
          }

          // Draw chart based on report type
          if (reportType === 'sales-category') {
            // Draw pie chart for category data
            const centerX = chartX + chartWidth / 2;
            const centerY = chartY + chartHeight / 2;
            const radius = Math.min(chartWidth, chartHeight) / 2.5;

            // Calculate total for percentages
            const total = chartData.reduce((sum, item) => sum + (typeof item.value === 'number' ? item.value : 0), 0);

            // Draw pie slices
            let startAngle = 0;
            let endAngle = 0;

            // Draw legend
            doc.setFontSize(10);
            const legendX = chartX + 10;
            let legendY = chartY + 10;
            const legendSpacing = 15;

            chartData.forEach((item, index) => {
              const value = typeof item.value === 'number' ? item.value : 0;
              const percentage = total > 0 ? value / total : 0;
              endAngle = startAngle + percentage * 2 * Math.PI;

              // Set slice color
              const colorIndex = index % COLORS.length;
              const r = parseInt(COLORS[colorIndex].substring(1, 3), 16);
              const g = parseInt(COLORS[colorIndex].substring(3, 5), 16);
              const b = parseInt(COLORS[colorIndex].substring(5, 7), 16);

              // Draw pie slice
              doc.setFillColor(r, g, b);
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(1);

              // Draw the slice
              doc.circle(centerX, centerY, radius, 'S');
              doc.setLineWidth(0.5);

              // Calculate angles for the slice

              // Draw slice
              if (percentage > 0) {
                doc.moveTo(centerX, centerY);
                doc.lineTo(
                  centerX + Math.cos(startAngle) * radius,
                  centerY + Math.sin(startAngle) * radius
                );

                // Draw arc (approximated with lines)
                const steps = Math.max(10, Math.floor(percentage * 60));
                for (let i = 1; i <= steps; i++) {
                  const angle = startAngle + (i / steps) * (endAngle - startAngle);
                  doc.lineTo(
                    centerX + Math.cos(angle) * radius,
                    centerY + Math.sin(angle) * radius
                  );
                }

                doc.lineTo(centerX, centerY);
                doc.fill();
              }

              // Add to legend
              doc.setFillColor(r, g, b);
              doc.rect(legendX, legendY - 6, 10, 10, 'F');
              doc.setTextColor(0, 0, 0);
              doc.text(
                `${item.name}: ${(percentage * 100).toFixed(1)}%`,
                legendX + 15,
                legendY
              );
              legendY += legendSpacing;

              // Update start angle for next slice
              startAngle = endAngle;
            });
          }
          else if (reportType === 'sales-monthly') {
            // Check if we have enough data points for a line chart
            if (dataToShow.length <= 1) {
              // Not enough data for a line chart
              doc.setFontSize(12);
              doc.setTextColor(100, 100, 100);
              doc.text(
                "Not enough data points for chart visualization",
                chartX + chartWidth / 2,
                chartY + chartHeight / 2,
                { align: 'center' }
              );
              return; // Exit early
            }

            // Draw line chart for monthly data
            const pointSpacing = chartWidth / (Math.max(dataToShow.length - 1, 1));

            // Draw lines
            // Amount line (dark gold)
            doc.setDrawColor(184, 134, 11); // DarkGoldenRod
            doc.setLineWidth(2);

            // Draw amount line
            let prevX, prevY;
            dataToShow.forEach((item, index) => {
              // Skip items with invalid data
              if (typeof item.amount !== 'number' || isNaN(item.amount)) {
                console.warn('Invalid amount value in chart data:', item);
                return;
              }

              const x = chartX + (index * pointSpacing);
              const y = chartY + chartHeight - ((item.amount / maxAmount) * chartHeight);

              // Draw point
              doc.setFillColor(184, 134, 11); // DarkGoldenRod
              doc.circle(x, y, 3, 'F');

              // Draw line segment
              if (index > 0 && prevX !== undefined && prevY !== undefined) {
                doc.line(prevX, prevY, x, y);
              }

              prevX = x;
              prevY = y;
            });

            // Transactions line (gold)
            doc.setDrawColor(218, 165, 32); // GoldenRod
            doc.setLineWidth(2);

            // Draw transactions line
            prevX = undefined;
            prevY = undefined;
            dataToShow.forEach((item, index) => {
              // Skip items with invalid data
              if (typeof item.transactions !== 'number' || isNaN(item.transactions)) {
                console.warn('Invalid transactions value in chart data:', item);
                return;
              }

              const x = chartX + (index * pointSpacing);
              const y = chartY + chartHeight - ((item.transactions / maxTransactions) * chartHeight);

              // Draw point
              doc.setFillColor(218, 165, 32); // GoldenRod
              doc.circle(x, y, 3, 'F');

              // Draw line segment
              if (index > 0 && prevX !== undefined && prevY !== undefined) {
                doc.line(prevX, prevY, x, y);
              }

              prevX = x;
              prevY = y;

              // Add month label
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);

              // Rotate labels if we have many data points
              if (dataToShow.length > 7) {
                doc.text(
                  item.month || item.date,
                  x,
                  chartY + chartHeight + 10,
                  {
                    align: 'right',
                    angle: 45
                  }
                );
              } else {
                doc.text(
                  item.month || item.date,
                  x,
                  chartY + chartHeight + 8,
                  { align: 'center' }
                );
              }
            });
          } else {
            // Draw bar chart for daily data
            dataToShow.forEach((item, index) => {
              const x = chartX + (index * barSpacing * 2) + barSpacing;

              // Amount bar (dark gold)
              const amountHeight = (item.amount / maxAmount) * chartHeight;
              doc.setFillColor(184, 134, 11); // DarkGoldenRod
              doc.rect(
                x,
                chartY + chartHeight - amountHeight,
                barWidth,
                amountHeight,
                'F'
              );

              // Transactions bar (gold)
              const transactionsHeight = (item.transactions / maxTransactions) * chartHeight;
              doc.setFillColor(218, 165, 32); // GoldenRod
              doc.rect(
                x + barWidth,
                chartY + chartHeight - transactionsHeight,
                barWidth,
                transactionsHeight,
                'F'
              );

              // Add date label
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);

              // Rotate labels if we have many data points
              if (dataToShow.length > 7) {
                doc.text(
                  item.date,
                  x + barWidth / 2,
                  chartY + chartHeight + 10,
                  {
                    align: 'right',
                    angle: 45
                  }
                );
              } else {
                doc.text(
                  item.date,
                  x + barWidth / 2,
                  chartY + chartHeight + 8,
                  { align: 'center' }
                );
              }
            });
          }

          // Calculate legend position based on chart dimensions
          const legendY = chartY + chartHeight + (dataToShow.length > 7 ? 25 : 15);

          // Add legend with better spacing
          doc.setFillColor(184, 134, 11); // DarkGoldenRod
          doc.rect(chartX, legendY, 10, 5, 'F');
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);
          doc.text('Sales Amount', chartX + 15, legendY + 4);

          doc.setFillColor(218, 165, 32); // GoldenRod
          doc.rect(chartX + 80, legendY, 10, 5, 'F');
          doc.text('Transactions', chartX + 95, legendY + 4);

          // Add grid lines for better readability
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);

          // Horizontal grid lines
          for (let i = 1; i < 4; i++) {
            const y = chartY + (chartHeight / 4) * i;
            doc.line(chartX, y, chartX + chartWidth, y);
          }

          // Add Y-axis labels with better formatting
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);

          // Format large numbers with K/M suffix
          const formatLargeNumber = (num) => {
            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
            return num.toString();
          };

          // Amount labels (left)
          doc.text(
            formatLargeNumber(maxAmount),
            chartX - 3,
            chartY + 5,
            { align: 'right' }
          );
          doc.text(
            formatLargeNumber(maxAmount * 0.75),
            chartX - 3,
            chartY + (chartHeight * 0.25),
            { align: 'right' }
          );
          doc.text(
            formatLargeNumber(maxAmount * 0.5),
            chartX - 3,
            chartY + (chartHeight * 0.5),
            { align: 'right' }
          );
          doc.text(
            formatLargeNumber(maxAmount * 0.25),
            chartX - 3,
            chartY + (chartHeight * 0.75),
            { align: 'right' }
          );
          doc.text('0', chartX - 3, chartY + chartHeight, { align: 'right' });

          // Transactions labels (right)
          doc.text(
            formatLargeNumber(maxTransactions),
            chartX + chartWidth + 3,
            chartY + 5,
            { align: 'left' }
          );
          doc.text(
            formatLargeNumber(maxTransactions * 0.75),
            chartX + chartWidth + 3,
            chartY + (chartHeight * 0.25),
            { align: 'left' }
          );
          doc.text(
            formatLargeNumber(maxTransactions * 0.5),
            chartX + chartWidth + 3,
            chartY + (chartHeight * 0.5),
            { align: 'left' }
          );
          doc.text(
            formatLargeNumber(maxTransactions * 0.25),
            chartX + chartWidth + 3,
            chartY + (chartHeight * 0.75),
            { align: 'left' }
          );
          doc.text('0', chartX + chartWidth + 3, chartY + chartHeight, { align: 'left' });

          // Add axis titles
          doc.setFontSize(8);
          doc.setTextColor(184, 134, 11); // DarkGoldenRod
          doc.text(
            "Sales Amount (LKR)",
            chartX - 15,
            chartY - 10,
            { angle: 90 }
          );

          doc.setTextColor(218, 165, 32); // GoldenRod
          doc.text(
            "Transactions",
            chartX + chartWidth + 15,
            chartY - 10,
            { angle: 270 }
          );

          // Add a note about the chart
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(
            "Chart shows sales amount and transaction count trends over the selected period",
            105,
            legendY + 20,
            { align: 'center' }
          );
        } else {
          // If no chart data is available, add a message
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text(
            "Chart visualization not available - no data",
            105,
            60,
            { align: 'center' }
          );
          console.log('No chart data available in window.chartData');
        }
      } catch (chartErr) {
        console.error('Error adding chart to PDF:', chartErr);
        // If there's an error, add a message
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(
          "Chart visualization not available - error occurred",
          105,
          60,
          { align: 'center' }
        );
      }
    } else {
      console.log('Chart not added to PDF - not a sales report');
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);

    return { success: true };
  } catch (error) {
    console.error('Error exporting report as PDF:', error);
    throw error;
  }
};

/**
 * Get custom report data
 * @param {Object} config - Custom report configuration
 * @returns {Promise} - Promise with report data
 */
export const getCustomReport = async (config) => {
  try {
    // This would be implemented to handle custom report requests
    // For now, we'll just return a mock response
    return {
      success: true,
      message: 'Custom report functionality will be implemented here',
      config
    };
  } catch (error) {
    console.error('Error generating custom report:', error);
    throw error;
  }
};
