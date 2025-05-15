"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { generateInvoicePDF } from '@/utils/invoiceGenerator';

interface SaleItem {
  sale_item_id: number;
  item_id: number;
  product_title: string;
  category: string;
  quantity: number;
  unit_price: number;
  original_price?: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed';
  subtotal: number;
}

interface Sale {
  sale_id: number;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  invoice_number: string | null;
  invoice_id: number | null;
  items: SaleItem[];
}

const SaleDetailsPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const saleId = params.id;

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Fetch sale details
  useEffect(() => {
    const fetchSaleDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3002/sales/${saleId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch sale details: ${response.status}`);
        }

        const data = await response.json();
        setSale(data);
      } catch (err) {
        console.error('Error fetching sale details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');

        // Use sample data for development
        setSale({
          sale_id: parseInt(saleId),
          customer_name: 'John Smith',
          total_amount: 22000,
          payment_method: 'Cash',
          sale_date: '2024-11-01 14:30:00',
          invoice_number: 'INV-2024-001',
          invoice_id: 1,
          items: [
            {
              sale_item_id: 1,
              item_id: 1,
              product_title: 'Cluster Earrings',
              category: 'Earrings',
              quantity: 2,
              unit_price: 11000,
              subtotal: 22000
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    if (saleId) {
      fetchSaleDetails();
    }
  }, [saleId]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Handle back button
  const handleBack = () => {
    router.push('/DashView/sales/view');
  };

  // Handle print invoice
  const handlePrintInvoice = () => {
    window.print();
  };

  // Handle download invoice
  const handleDownloadInvoice = async () => {
    if (!sale) return;

    try {
      console.log('Starting invoice download process for sale ID:', sale.sale_id);
      setGeneratingInvoice(true);

      // Fetch invoice data from the server
      console.log('Fetching invoice data from:', `http://localhost:3002/sales/invoice/${sale.sale_id}`);
      const response = await fetch(`http://localhost:3002/sales/invoice/${sale.sale_id}`);

      if (!response.ok) {
        console.error('Server response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch invoice data');
      }

      const data = await response.json();
      console.log('Received invoice data:', data);

      // Generate PDF
      console.log('Generating PDF with sale data and branch details');
      try {
        const pdfBlob = await generateInvoicePDF(data.sale, data.branchDetails);
        console.log('PDF generated successfully');

        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `Invoice_${data.sale.invoice_number || sale.sale_id}.pdf`;
        console.log('Setting download filename to:', fileName);
        link.download = fileName;
        document.body.appendChild(link);
        console.log('Triggering download');
        link.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log('Cleanup completed');
        }, 100);
      } catch (pdfError) {
        console.error('Error in PDF generation:', pdfError);
        alert('Error generating PDF: ' + pdfError.message);
      }

      // If the invoice was just created, refresh the sale data
      if (!sale.invoice_number && data.sale.invoice_number) {
        setSale({
          ...sale,
          invoice_number: data.sale.invoice_number
        });
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Failed to download invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Sale not found'}
        </div>
        <button
          className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
          onClick={handleBack}
        >
          <ArrowLeft size={18} className="mr-1" />
          Back to Sales
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            className="flex items-center text-blue-600 hover:text-blue-800"
            onClick={handleBack}
          >
            <ArrowLeft size={18} className="mr-1" />
            Back to Sales
          </button>

          <div className="flex gap-2">
            <button
              className="bg-white p-2 rounded-md border border-gray-300"
              onClick={handlePrintInvoice}
              title="Print page"
            >
              <Printer size={20} className="text-gray-700" />
            </button>
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-md flex items-center"
              onClick={handleDownloadInvoice}
              disabled={generatingInvoice}
            >
              <Download size={20} className="mr-2" />
              {generatingInvoice ? 'Generating...' : 'Download Invoice'}
            </button>
          </div>
        </div>

        {/* Sale Details */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Sale Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500">Sale ID</p>
              <p className="font-medium">#{sale.sale_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{formatDate(sale.sale_date)}</p>
            </div>
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-medium">{sale.customer_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Payment Method</p>
              <p className="font-medium">{sale.payment_method}</p>
            </div>
            <div>
              <p className="text-gray-500">Invoice Number</p>
              <p className="font-medium">
                {sale.invoice_number || (
                  <button
                    className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-full"
                    onClick={handleDownloadInvoice}
                    disabled={generatingInvoice}
                  >
                    {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                  </button>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Total Amount</p>
              <p className="font-bold text-lg">{formatCurrency(sale.total_amount)}</p>
            </div>
          </div>
        </div>

        {/* Sale Items */}
        <div>
          <h3 className="text-xl font-bold mb-4">Items</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sale.items.map((item) => (
                  <tr key={item.sale_item_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.product_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.original_price ? formatCurrency(item.original_price) : formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.discount_amount ? (
                        item.discount_type === 'percentage'
                          ? `${item.discount_amount}%`
                          : formatCurrency(item.discount_amount)
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-6 py-4 text-right font-bold">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold">
                    {formatCurrency(sale.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating action button for download */}
      <button
        className="fixed bottom-8 right-8 bg-yellow-400 hover:bg-yellow-500 text-black font-bold p-4 rounded-full shadow-lg flex items-center"
        onClick={handleDownloadInvoice}
        disabled={generatingInvoice}
        title="Download Invoice"
      >
        <Download size={24} className="mr-2" />
        {generatingInvoice ? 'Generating...' : 'Download Invoice'}
      </button>
    </div>
  );
};

export default SaleDetailsPage;
