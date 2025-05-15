"use client";
import { useEffect, useState } from "react";
import { Filter, SortDesc } from "lucide-react";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import UserActionButtons from "@/components/UserActionButtons";

type Supplier = {
  id: number;
  supplier_id?: string; // Optional field
  name: string;
  address: string;
  contact_no: string;
  manufacturing_items: string;
  category: string;
};

const columns = [
  { header: "Name", accessor: "name" },
  { header: "Supplier ID", accessor: "supplier_id", className: "hidden md:table-cell" },
  { header: "Address", accessor: "address", className: "hidden md:table-cell" },
  { header: "Contact No", accessor: "contact_no", className: "hidden lg:table-cell" },
  { header: "Manufacturing Items", accessor: "manufacturing_items", className: "hidden md:table-cell" },
  { header: "Category", accessor: "category", className: "hidden md:table-cell" },
  { header: "Actions", accessor: "action" },
];

const SupplierListPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);  // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const [userRole, setUserRole] = useState<string>("");

  // Add delete handler
  const handleDelete = async (id: number) => {
    try {
      // Check if id is valid
      if (!id) {
        console.error('Invalid ID: ID is undefined or null');
        throw new Error('Invalid ID: Cannot delete without a valid ID');
      }

      console.log(`Attempting to delete Supplier with ID: ${id}`);

      // Make the delete request
      const response = await fetch(`http://localhost:3002/suppliers/delete/${id}`, {
        method: 'DELETE',
      });

      // Log the response status
      console.log(`Delete response status: ${response.status}`);

      // Try to parse the response as JSON
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError);
      }

      if (!response.ok) {
        // Extract detailed error information
        const errorMessage = responseData?.message || 'Failed to delete supplier';
        const detailedError = responseData?.error || '';

        console.error('Detailed error:', {
          message: errorMessage,
          error: detailedError
        });

        throw new Error(errorMessage);
      }

      // Remove the deleted item from the state
      setSuppliers(prevSuppliers =>
        prevSuppliers.filter(supplier => supplier.id !== id)
      );
      setFilteredSuppliers(prevSuppliers =>
        prevSuppliers.filter(supplier => supplier.id !== id)
      );

      // Show success message
      alert(responseData?.message || "Supplier deleted successfully");

    } catch (error) {
      console.error("Error deleting Supplier:", error);
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`Failed to delete Supplier: ${errorMessage}`);
      throw error; // Re-throw the error so the modal can handle it
    }
  };

  useEffect(() => {
    // Get role from localStorage
    const storedRole = localStorage.getItem("role");
    if (storedRole) {
      setUserRole(storedRole);
    }

    // Check database structure to debug
    const checkDatabaseStructure = async () => {
      try {
        const response = await fetch("http://localhost:3002/suppliers/check-table-structure");
        if (response.ok) {
          const data = await response.json();
          console.log("Database structure for suppliers table:", data);
        }
      } catch (error) {
        console.error("Error checking database structure:", error);
      }
    };

    // Test database connection
    const testDatabaseConnection = async () => {
      try {
        const response = await fetch("http://localhost:3002/suppliers/test-connection");
        if (response.ok) {
          const data = await response.json();
          console.log("Database connection test:", data);
        }
      } catch (error) {
        console.error("Error testing database connection:", error);
      }
    };

    // Count suppliers
    const countSuppliers = async () => {
      try {
        const response = await fetch("http://localhost:3002/suppliers/count");
        if (response.ok) {
          const data = await response.json();
          console.log("Supplier count:", data);
        }
      } catch (error) {
        console.error("Error counting suppliers:", error);
      }
    };

    checkDatabaseStructure();
    testDatabaseConnection();
    countSuppliers();

    const fetchSuppliers = async () => {
      try {
        setLoading(true);  // Start loading
        console.log('Fetching suppliers from API...');
        const response = await fetch("http://localhost:3002/suppliers");
        console.log('API response status:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to fetch suppliers: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API response data type:', typeof data);
        console.log('API response data:', data);

        if (Array.isArray(data)) {
          console.log('Data is an array with length:', data.length);

          // Log the first item to see its structure
          if (data.length > 0) {
            console.log('Sample supplier data:', data[0]);
          } else {
            console.log('No suppliers found in the response');
          }

          // Directly set the data without complex mapping
          console.log('Setting suppliers with raw data:', data);
          setSuppliers(data);
          setFilteredSuppliers(data);
        } else {
          console.error("Expected an array but got:", data);
          setError("Unexpected data format");
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch suppliers");
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchSuppliers();
  }, []);

  const renderRow = (item: any) => {
    return (
      <tr key={item.id} className="border-b border-gray-200 even:bg-[#FFF6BD] text-sm hover:bg-[#FDE68A]">
        <td className="p-4">{item.name || 'N/A'}</td>
        <td className="hidden md:table-cell">{item.supplier_id || 'N/A'}</td>
        <td className="hidden md:table-cell">{item.address || 'N/A'}</td>
        <td className="hidden lg:table-cell">{item.contact_no || 'N/A'}</td>
        <td className="hidden md:table-cell">{item.manufacturing_items || 'N/A'}</td>
        <td className="hidden md:table-cell">{item.category || 'N/A'}</td>
        <td>
          <UserActionButtons
            id={item.supplier_id || item.id}
            name={item.name || 'Supplier'}
            userType="supplier"
            currentUserRole={userRole}
            onDelete={handleDelete}
          />
        </td>
      </tr>
    );
  };

  // Handle search functionality
  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = suppliers.filter(supplier =>
      (supplier.name && supplier.name.toLowerCase().includes(lowerCaseSearch)) ||
      (supplier.supplier_id && supplier.supplier_id.toLowerCase().includes(lowerCaseSearch)) ||
      (supplier.address && supplier.address.toLowerCase().includes(lowerCaseSearch)) ||
      (supplier.contact_no && supplier.contact_no.toLowerCase().includes(lowerCaseSearch)) ||
      (supplier.manufacturing_items && supplier.manufacturing_items.toLowerCase().includes(lowerCaseSearch)) ||
      (supplier.category && supplier.category.toLowerCase().includes(lowerCaseSearch))
    );

    setFilteredSuppliers(filtered);
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Suppliers</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onSearch={handleSearch} placeholder="Search suppliers..." />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFF6BD]">
              <Filter size={14} className="text-gray-700" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFF6BD]">
              <SortDesc size={14} className="text-gray-700" />
            </button>
            {userRole.toLowerCase() === "admin" && (
              <FormModal table="supplier" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      {filteredSuppliers.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No suppliers found.
        </div>
      ) : (
        <Table columns={columns} renderRow={renderRow} data={filteredSuppliers} />
      )}

      {/* PAGINATION */}
      {filteredSuppliers.length > 0 && <Pagination />}
    </div>
  );
};

export default SupplierListPage;
