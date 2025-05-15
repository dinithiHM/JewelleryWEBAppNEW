"use client";

import { formatCurrency } from './formatters';

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

/**
 * Export jewellery items to PDF
 * @param {Array} items - Array of jewellery items
 * @param {Object} filters - Filter settings
 * @param {string} userRole - User role
 */
export const exportJewelleryItemsToPDF = async (items, filters, userRole) => {
  try {
    // Dynamically import jsPDF and jspdf-autotable to avoid SSR issues
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    await import('jspdf-autotable');

    // Create new PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Jewellery Stock Report', 14, 22);

    // Add filters info
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString();
    doc.text(`Generated on: ${today}`, 14, 30);

    if (filters) {
      let line = 35;
      if (filters.branch) {
        doc.text(`Branch: ${filters.branch}`, 14, line);
        line += 5;
      }

      if (filters.category) {
        doc.text(`Category: ${filters.category}`, 14, line);
        line += 5;
      }

      if (filters.startDate) {
        doc.text(`From: ${filters.startDate}`, 14, line);
        line += 5;
      }

      if (filters.endDate) {
        doc.text(`To: ${filters.endDate}`, 14, line);
        line += 5;
      }
    }

    // Create table
    const tableColumn = [
      'ID', 'Product Title', 'Category',
      userRole === 'admin' ? 'Branch' : '',
      'In Stock', 'Buying Price', 'Selling Price', 'Date Added'
    ].filter(Boolean);

    const tableRows = items.map(item => {
      const row = [
        item.item_id,
        item.product_title,
        item.category_name || item.category,
        userRole === 'admin' ? (item.branch_name || `Branch ${item.branch_id}`) : '',
        item.in_stock,
        formatCurrency(item.buying_price),
        formatCurrency(item.selling_price),
        formatDate(item.product_added)
      ];

      // Remove branch column if not admin
      if (userRole !== 'admin') {
        row.splice(3, 1);
      }

      return row;
    });

    // Add table to document
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: filters && (filters.startDate || filters.endDate) ? 55 : 45,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 204, 0], textColor: [0, 0, 0] }
    });

    // Save the PDF
    doc.save('jewellery-stock-report.pdf');

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
