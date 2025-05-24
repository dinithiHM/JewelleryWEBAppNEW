import { formatCurrency } from './formatters';

/**
 * Generate a PDF receipt for a custom order
 * @param {Object} order - Custom order object with all details
 * @returns {Promise<Blob>} - PDF blob that can be downloaded
 */
export const generateCustomOrderReceipt = async (order) => {
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

    const branchName = order.branch_name || 'Mahiyangana Branch';
    const location = 'No.07 Front of the Bus Stand, Mahiyanganya';
    const contactNumber = '(077)721-1193';

    doc.text(branchName, 105, 35, { align: 'center' });
    doc.text(location, 105, 40, { align: 'center' });
    doc.text(contactNumber, 105, 45, { align: 'center' });

    // Add receipt title and reference number
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOM ORDER RECEIPT', 105, 60, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Reference: ${order.order_reference}`, 105, 70, { align: 'center' });

    // Format date
    const orderDate = new Date(order.order_date);
    const formattedDate = orderDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${formattedDate}`, 105, 77, { align: 'center' });

    // Draw a divider line
    doc.setDrawColor(150, 75, 0); // Brown color for divider
    doc.setLineWidth(0.5);
    doc.line(20, 85, 190, 85);

    // Customer Information section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 20, 95);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let yPos = 105;

    // Customer name
    doc.text('Name:', 25, yPos);
    doc.text(order.customer_name, 70, yPos);
    yPos += 7;

    // Customer phone
    if (order.customer_phone) {
      doc.text('Phone:', 25, yPos);
      doc.text(order.customer_phone, 70, yPos);
      yPos += 7;
    }

    // Customer email
    if (order.customer_email) {
      doc.text('Email:', 25, yPos);
      doc.text(order.customer_email, 70, yPos);
      yPos += 7;
    }

    // Order Information section
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Information', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Due date
    doc.text('Due Date:', 25, yPos);
    const dueDate = order.estimated_completion_date ? new Date(order.estimated_completion_date) : null;
    const formattedDueDate = dueDate ? dueDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : 'Not specified';
    doc.text(formattedDueDate, 70, yPos);
    yPos += 7;

    // Category
    if (order.category_name) {
      doc.text('Category:', 25, yPos);
      doc.text(order.category_name, 70, yPos);
      yPos += 7;
    }

    // Supplier
    if (order.supplier_name) {
      doc.text('Supplier:', 25, yPos);
      doc.text(order.supplier_name, 70, yPos);
      yPos += 7;
    }

    // Branch
    doc.text('Branch:', 25, yPos);
    doc.text(order.branch_name, 70, yPos);
    yPos += 7;

    // Created by
    doc.text('Created By:', 25, yPos);
    doc.text(`${order.created_by_first_name} ${order.created_by_last_name}`, 70, yPos);
    yPos += 7;

    // Quantity
    if (order.quantity) {
      doc.text('Quantity:', 25, yPos);
      doc.text(order.quantity.toString(), 70, yPos);
      yPos += 7;
    }

    // Payment Information section
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Information', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Calculate unit price (price per item)
    const unitPrice = order.total_amount_with_profit ||
                     (order.estimated_amount * (1 + (order.profit_percentage || 0) / 100));

    // Calculate total price (unit price * quantity)
    const quantity = order.quantity || 1;
    const totalAmount = unitPrice * quantity;

    // Unit price (if quantity > 1)
    if (quantity > 1) {
      doc.text('Unit Price:', 25, yPos);
      doc.text(formatCurrency(unitPrice), 120, yPos);
      yPos += 7;
    }

    // Total amount (customer price)
    doc.text('Total Amount (Customer Price):', 25, yPos);
    doc.text(formatCurrency(totalAmount), 120, yPos);
    yPos += 7;

    // Advance payment
    doc.text('Advance Payment:', 25, yPos);
    doc.text(formatCurrency(order.advance_amount || 0), 120, yPos);
    yPos += 7;

    // Balance
    doc.text('Balance:', 25, yPos);
    const balance = order.balance_with_profit ||
                   (totalAmount - (order.advance_amount || 0));
    doc.text(formatCurrency(balance), 120, yPos);
    yPos += 15;

    // Order description if available
    if (order.description) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Order Description', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Split description into multiple lines if needed
      const descriptionLines = doc.splitTextToSize(order.description, 170);
      doc.text(descriptionLines, 25, yPos);
      yPos += (descriptionLines.length * 5) + 10;
    }

    // Special requirements if available
    if (order.special_requirements) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Special Requirements', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Split special requirements into multiple lines if needed
      const requirementsLines = doc.splitTextToSize(order.special_requirements, 170);
      doc.text(requirementsLines, 25, yPos);
      yPos += (requirementsLines.length * 5) + 10;
    }

    // Add footer
    yPos = Math.max(yPos, 240); // Ensure there's enough space for the footer

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for placing your order with us! Please ensure you obtain an authorized seal from our shop for validation.', 105, yPos, { align: 'center' });
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('THANK YOU FOR YOUR BUSINESS!', 105, yPos, { align: 'center' });

    // Return the PDF as a blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating custom order receipt PDF:', error);
    throw error;
  }
};
