"use client";
import { useEffect, useState } from "react";
import { Filter, SortDesc } from "lucide-react";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import UserActionButtons from "@/components/UserActionButtons";

// Add interface for Cashier
interface Cashier {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  branch_id: number;
  nic: string;
  phone: string;
  address: string;
  action?: string; // Add this optional property
}

// Add interface for column definition
interface Column {
  header: string;
  accessor: keyof Cashier;
  className?: string;
}

const columns: Column[] = [
  { header: "Info", accessor: "first_name" },
  { header: "User Name", accessor: "username", className: "hidden md:table-cell" },
  { header: "Branch", accessor: "branch_id", className: "hidden md:table-cell" },
  { header: "NIC", accessor: "nic", className: "hidden lg:table-cell" },
  { header: "Phone", accessor: "phone", className: "hidden lg:table-cell" },
  { header: "Address", accessor: "address", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" }
];

const CashierListPage = () => {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [filteredCashiers, setFilteredCashiers] = useState<Cashier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  // Add delete handler
  const handleDelete = async (id: number) => {
    try {
      // Check if id is valid
      if (!id) {
        console.error('Invalid ID: ID is undefined or null');
        throw new Error('Invalid ID: Cannot delete without a valid ID');
      }

      console.log(`Attempting to delete Cashier with ID: ${id}`);

      // Try the delete endpoint with the correct ID
      const response = await fetch(`http://localhost:3002/cashiers/delete/${id}`, {
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
        const errorMessage = responseData?.message || 'Failed to delete cashier';
        const detailedError = responseData?.error || '';
        const sqlCode = responseData?.code || '';
        const sqlState = responseData?.sqlState || '';
        const sqlMessage = responseData?.sqlMessage || '';

        console.error('Detailed database error:', {
          message: errorMessage,
          error: detailedError,
          code: sqlCode,
          sqlState: sqlState,
          sqlMessage: sqlMessage
        });

        // Create a more informative error message
        const fullErrorMessage = `${errorMessage}${detailedError ? ': ' + detailedError : ''}${sqlCode ? ' (Code: ' + sqlCode + ')' : ''}`;
        throw new Error(fullErrorMessage);
      }

      // Remove the deleted item from the state
      setCashiers(prevCashiers =>
        prevCashiers.filter(cashier => cashier.id !== id)
      );
      setFilteredCashiers(prevCashiers =>
        prevCashiers.filter(cashier => cashier.id !== id)
      );

      // Show success message
      alert(responseData?.message || "Cashier deleted successfully");

    } catch (error) {
      console.error("Error deleting Cashier:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      alert(`Failed to delete Cashier: ${errorMessage}`);
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
        const response = await fetch("http://localhost:3002/cashiers/check-table-structure");
        if (response.ok) {
          const data = await response.json();
          console.log("Database structure for users table:", data);
        }
      } catch (error) {
        console.error("Error checking database structure:", error);
      }
    };

    checkDatabaseStructure();

    const fetchCashiers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:3002/cashiers");
        if (!response.ok) {
          throw new Error('Failed to fetch cashiers');
        }
        const data = await response.json();

        if (Array.isArray(data)) {
          // Log the first item to see its structure
          if (data.length > 0) {
            console.log('Sample cashier data:', data[0]);
          }

          // Map the data to ensure it has the correct property names
          const mappedData = data.map(item => ({
            id: item.user_id || item.id, // Try both possible ID field names
            first_name: item.first_name,
            last_name: item.last_name,
            email: item.email,
            username: item.username,
            branch_id: item.branch_id,
            nic: item.nic,
            phone: item.phone,
            address: item.address
          }));

          setCashiers(mappedData);
          setFilteredCashiers(mappedData);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (error) {
        console.error("Error fetching Cashiers:", error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCashiers();
  }, []);

  const renderRow = (item: Cashier) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-[#FFF6BD] text-sm hover:bg-[#FDE68A]">
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.first_name} {item.last_name}</h3>
          <p className="text-xs text-gray-500">{item.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell">{item.branch_id}</td>
      <td className="hidden lg:table-cell">{item.nic}</td>
      <td className="hidden lg:table-cell">{item.phone}</td>
      <td className="hidden lg:table-cell">{item.address}</td>
      <td>{renderActions(item)}</td>
    </tr>
  );

  const renderActions = (item: Cashier) => (
    <UserActionButtons
      id={item.id}
      name={`${item.first_name} ${item.last_name}`}
      userType="cashier"
      currentUserRole={userRole}
      onDelete={handleDelete}
    />
  );

  // Handle search functionality
  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredCashiers(cashiers);
      return;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = cashiers.filter(cashier =>
      cashier.first_name.toLowerCase().includes(lowerCaseSearch) ||
      cashier.last_name.toLowerCase().includes(lowerCaseSearch) ||
      cashier.email.toLowerCase().includes(lowerCaseSearch) ||
      cashier.username.toLowerCase().includes(lowerCaseSearch) ||
      cashier.phone.toLowerCase().includes(lowerCaseSearch) ||
      (cashier.nic && cashier.nic.toLowerCase().includes(lowerCaseSearch))
    );

    setFilteredCashiers(filtered);
  };

  if (isLoading) {
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
        <h1 className="hidden md:block text-lg font-semibold">Cashiers</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch onSearch={handleSearch} placeholder="Search cashiers..." />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFF6BD]">
              <Filter size={14} className="text-gray-700" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFF6BD]">
              <SortDesc size={14} className="text-gray-700" />
            </button>
            {userRole.toLowerCase() === "admin" && (
              <FormModal table="cashier" type="create"/>
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      {filteredCashiers.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No cashiers found.
        </div>
      ) : (
        <Table columns={columns} renderRow={renderRow} data={filteredCashiers} />
      )}

      {/* PAGINATION */}
      {filteredCashiers.length > 0 && <Pagination />}
    </div>
  );
};

export default CashierListPage;