"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import CategoryForm from "@/components/forms/CategoryForm";

// Interface for Category
interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
  action?: string; // Optional property for actions
}

// Interface for column definition
interface Column {
  header: string;
  accessor: keyof Category;
  className?: string;
}

const columns: Column[] = [
  { header: "ID", accessor: "category_id", className: "w-16" },
  { header: "Category Name", accessor: "category_name" },
  { header: "Description", accessor: "description", className: "hidden md:table-cell" },
  { header: "Actions", accessor: "action" }
];

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"create" | "update">("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { language } = useLanguage();

  // Fetch categories from the server
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3002/admin/category");
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      const data = await response.json();
      if (data.Status) {
        setCategories(data.Result);
      } else {
        throw new Error(data.Error || "Failed to fetch categories");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get user role from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) {
      setUserRole(storedRole);
    }
    fetchCategories();
  }, []);

  // Handle category deletion
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3002/admin/delete_category/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete category: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.Status) {
        // Refresh the categories list
        fetchCategories();
      } else {
        throw new Error(data.Error || "Failed to delete category");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error deleting category:", err);
    }
  };

  // Handle edit button click
  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormType("update");
    setShowForm(true);
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedCategory(null);
    fetchCategories();
  };

  // Render table row for each category
  const renderRow = (category: Category) => (
    <tr key={category.category_id} className="border-b border-gray-100">
      <td className="py-3">{category.category_id}</td>
      <td className="py-3">{category.category_name}</td>
      <td className="py-3 hidden md:table-cell">{category.description || "-"}</td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF6BD]"
            title="Edit category"
            onClick={() => handleEdit(category)}
          >
            <Image src="/edit.png" alt="Edit" width={16} height={16} />
          </button>

          {(userRole.toLowerCase() === "admin" || userRole.toLowerCase() === "store manager") && (
            <DeleteConfirmationModal
              itemName={category.category_name}
              onDelete={() => handleDelete(category.category_id)}
            />
          )}
        </div>
      </td>
    </tr>
  );

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {language === 'ta' ? 'வகைகள்' : 'Categories'}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFF6BD]">
              <Image src="/filter.png" alt="Filter" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="Sort" width={14} height={14} />
            </button>
            {(userRole.toLowerCase() === "admin" || userRole.toLowerCase() === "store manager") && (
              <button
                className="bg-lamaYellow text-black px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => {
                  setFormType("create");
                  setSelectedCategory(null);
                  setShowForm(true);
                }}
              >
                {language === 'ta' ? 'புதிய வகை' : 'New Category'}
              </button>
            )}
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No categories found</p>
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={categories}
            renderRow={renderRow}
          />
          <Pagination />
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CategoryForm
              type={formType}
              data={selectedCategory}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setSelectedCategory(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
