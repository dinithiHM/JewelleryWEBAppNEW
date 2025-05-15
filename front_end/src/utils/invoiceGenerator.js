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
    
    // Add items table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Details', 20, 100);
    doc.text('AMOUNT', 170, 100, { align: 'right' });
    
    // Draw line under headers
    doc.line(20, 102, 190, 102);
    
    // Add items
    let yPos = 110;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    sale.items.forEach(item => {
      doc.text(item.product_title, 20, yPos);
      doc.text(formatCurrency(item.subtotal), 170, yPos, { align: 'right' });
      yPos += 8;
    });
    
    // Draw line after items
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    // Add subtotal
    doc.text('SUBTOTAL', 140, yPos);
    doc.text(formatCurrency(sale.total_amount), 170, yPos, { align: 'right' });
    yPos += 8;
    
    // Add discount info if any items have discounts
    const hasDiscounts = sale.items.some(item => item.discount_amount && item.discount_amount > 0);
    if (hasDiscounts) {
      const totalDiscount = sale.items.reduce((sum, item) => {
        if (item.discount_type === 'percentage') {
          return sum + (item.original_price * item.quantity * item.discount_amount / 100);
        } else {
          return sum + (item.discount_amount * item.quantity);
        }
      }, 0);
      
      const discountPercentage = Math.round((totalDiscount / (sale.total_amount + totalDiscount)) * 100);
      
      doc.text('Discounts', 140, yPos);
      doc.text(`${discountPercentage}.00%`, 170, yPos, { align: 'right' });
      yPos += 8;
    } else {
      doc.text('Discounts', 140, yPos);
      doc.text('0.00%', 170, yPos, { align: 'right' });
      yPos += 8;
    }
    
    // Add other fees
    doc.text('OTHER', 140, yPos);
    doc.text('$0.00', 170, yPos, { align: 'right' });
    yPos += 8;
    
    // Add total
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 140, yPos);
    doc.text(formatCurrency(sale.total_amount), 170, yPos, { align: 'right' });
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
