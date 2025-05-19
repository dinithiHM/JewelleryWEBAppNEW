import { formatCurrency } from './formatters';

/**
 * Generate a PDF invoice for a sale
 * @param {Object} sale - Sale object with items
 * @param {Object} branchDetails - Branch details (name, location, contact)
 * @returns {Promise<Blob>} - PDF blob that can be downloaded
 */
export const generateInvoicePDF = async (sale, branchDetails) => {
  try {
    // Dynamically import jsPDF and jspdf-autotable to avoid SSR issues
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    await import('jspdf-autotable');

    // Create new PDF document
    const doc = new jsPDF();

    // Set colors and fonts
    doc.setDrawColor(200, 200, 200); // Light gray for borders
    doc.setTextColor(150, 75, 0); // Brown color for title

    // Add title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('S.LANKA GOLD JEWELLERY', 105, 25, { align: 'center' });

    // Add branch details
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0); // Black for normal text
    doc.setFont('helvetica', 'normal');

    const branchName = branchDetails?.branch_name || 'Mahiyangana Branch';
    const location = branchDetails?.location || 'No.07 Front of the Bus Stand, Mahiyanganya';
    const contactNumber = branchDetails?.contact_number || '(077)721-1193';

    doc.text(location, 105, 35, { align: 'center' });
    doc.text(contactNumber, 105, 40, { align: 'center' });

    // Add invoice number and date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`INVOICE #${sale.invoice_number?.replace('INV-', '') || ''}`, 20, 55);

    // Format date
    const saleDate = new Date(sale.sale_date);
    const formattedDate = saleDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE: ${formattedDate}`, 20, 62);

    // Add customer info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FOR', 20, 75);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.customer_name, 20, 82);

    // Add items table with headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Details', 20, 100);
    doc.text('QTY', 80, 100);
    doc.text('ORIGINAL PRICE', 100, 100);
    doc.text('DISCOUNT', 135, 100);
    doc.text('PRICE', 160, 100);
    doc.text('AMOUNT', 190, 100, { align: 'right' });

    // Draw line under headers
    doc.line(20, 102, 190, 102);

    // Add items
    let yPos = 110;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    sale.items.forEach(item => {
      // Item name/details
      doc.text(item.product_title, 20, yPos);

      // Quantity
      doc.text(item.quantity.toString(), 80, yPos);

      // Original price (selected unit price when sale was made)
      const originalPrice = item.original_price || item.unit_price;
      doc.text(formatCurrency(originalPrice), 100, yPos);

      // Discount
      let discountText = '-';
      if (item.discount_amount && item.discount_amount > 0) {
        // Show the discount amount with the type (fixed or percentage)
        if (item.discount_type === 'percentage') {
          discountText = `${item.discount_amount}%`;
        } else if (item.discount_type === 'fixed') {
          discountText = formatCurrency(item.discount_amount);
        } else {
          // If type is not specified but we have an amount, default to showing the amount
          discountText = formatCurrency(item.discount_amount);
        }
      }
      doc.text(discountText, 135, yPos);

      // Final unit price
      doc.text(formatCurrency(item.unit_price), 160, yPos);

      // Subtotal
      const correctSubtotal = item.unit_price * item.quantity;
      doc.text(formatCurrency(correctSubtotal), 190, yPos, { align: 'right' });

      yPos += 8;
    });

    // Draw line after items
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Calculate original total (before discounts)
    let originalTotal = 0;
    sale.items.forEach(item => {
      const originalPrice = item.original_price || item.unit_price;
      originalTotal += originalPrice * item.quantity;
    });

    // Add original total (before discounts)
    doc.text('ORIGINAL TOTAL', 120, yPos);
    doc.text(formatCurrency(originalTotal), 190, yPos, { align: 'right' });
    yPos += 8;

    // Add subtotal (after discounts)
    doc.text('SUBTOTAL', 120, yPos);
    doc.text(formatCurrency(sale.total_amount), 190, yPos, { align: 'right' });
    yPos += 8;

    // Add discount info if any items have discounts
    const hasDiscounts = sale.items.some(item => item.discount_amount && item.discount_amount > 0);
    if (hasDiscounts) {
      // Calculate total original price and total discount amount
      let totalOriginalValue = 0;
      let totalDiscountAmount = 0;

      sale.items.forEach(item => {
        const originalPrice = item.original_price || item.unit_price;
        const originalSubtotal = originalPrice * item.quantity;
        const finalSubtotal = item.unit_price * item.quantity;
        const itemDiscountAmount = originalSubtotal - finalSubtotal;

        totalOriginalValue += originalSubtotal;
        totalDiscountAmount += itemDiscountAmount;
      });

      // Calculate discount percentage safely
      let discountPercentage = 0;
      if (totalOriginalValue > 0 && totalDiscountAmount > 0) {
        discountPercentage = Math.round((totalDiscountAmount / totalOriginalValue) * 100);
      }

      doc.text('Total Discount', 120, yPos);
      doc.text(formatCurrency(totalDiscountAmount), 190, yPos, { align: 'right' });
      yPos += 8;

      doc.text('Discount Percentage', 120, yPos);
      doc.text(`${discountPercentage}%`, 190, yPos, { align: 'right' });
      yPos += 8;
    } else {
      doc.text('Discount', 120, yPos);
      doc.text('Rs. 0.00 (0%)', 190, yPos, { align: 'right' });
      yPos += 8;
    }

    // Add other fees
    doc.text('OTHER', 120, yPos);
    doc.text('Rs. 0.00', 190, yPos, { align: 'right' });
    yPos += 8;

    // Add total
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 120, yPos);
    doc.text(formatCurrency(sale.total_amount), 190, yPos, { align: 'right' });
    yPos += 15;

    // Add payment instructions
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Make all checks payable to S.LANKA GOLD JEWELLERY', 105, yPos, { align: 'center' });
    yPos += 5;

    doc.text('If you have any questions concerning this invoice, use the following contact information:', 105, yPos, { align: 'center' });
    yPos += 5;

    doc.text(`Asam Saleem, ${contactNumber}`, 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('THANK YOU FOR YOUR BUSINESS!', 105, yPos, { align: 'center' });

    // Return the PDF as a blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
};
