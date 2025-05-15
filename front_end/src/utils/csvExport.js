"use client";

import { saveAs } from 'file-saver';

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
 * Export jewellery items to CSV
 * @param {Array} items - Array of jewellery items
 * @param {string} userRole - User role
 */
export const exportJewelleryItemsToCSV = (items, userRole) => {
  try {
    // Create CSV header
    const header = [
      'ID', 'Product Title', 'Category', 
      userRole === 'admin' ? 'Branch' : '', 
      'In Stock', 'Buying Price', 'Selling Price', 'Date Added'
    ].filter(Boolean).join(',');
    
    // Create CSV rows
    const rows = items.map(item => {
      const row = [
        item.item_id,
        `"${item.product_title}"`, // Wrap in quotes to handle commas
        `"${item.category_name || item.category}"`,
        userRole === 'admin' ? `"${item.branch_name || `Branch ${item.branch_id}`}"` : '',
        item.in_stock,
        item.buying_price,
        item.selling_price,
        `"${formatDate(item.product_added)}"`
      ];
      
      // Remove branch column if not admin
      if (userRole !== 'admin') {
        row.splice(3, 1);
      }
      
      return row.join(',');
    }).join('\n');
    
    // Combine header and rows
    const csv = `${header}\n${rows}`;
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'jewellery-stock-report.csv');
    
    return true;
  } catch (error) {
    console.error('Error generating CSV:', error);
    return false;
  }
};
