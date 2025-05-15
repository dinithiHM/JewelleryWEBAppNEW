"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import { useLanguage } from "@/contexts/LanguageContext";
import CategoryForm from "@/components/forms/CategoryForm";
import { Eye, Pencil, Trash2 } from "lucide-react";

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
    const storedRole = localStorage.getItem("role");
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

  // Handle view button click
  const handleView = (category: Category) => {
    setSelectedCategory(category);
    setFormType("view");
    setShowForm(true);
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
        <div className="flex items-center gap-4">
          <button
            title="View category"
            onClick={() => handleView(category)}
            className="text-blue-500 hover:text-blue-700"
          >
            <Eye size={18} />
          </button>

          {(userRole.toLowerCase() === "admin" || userRole.toLowerCase() === "store manager") && (
            <>
              <button
                title="Edit category"
                onClick={() => handleEdit(category)}
                className="text-yellow-500 hover:text-yellow-700"
              >
                <Pencil size={18} />
              </button>

              <button
                title="Delete category"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${category.category_name}?`)) {
                    handleDelete(category.category_id);
                  }
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white p-4 rounded-md flex-1">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">
          {language === 'ta' ? 'வகைகள்' : 'Categories'}
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input
              type="search"
              className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Search items..."
            />
          </div>
          {(userRole.toLowerCase() === "admin" || userRole.toLowerCase() === "store manager") && (
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
              onClick={() => {
                setFormType("create");
                setSelectedCategory(null);
                setShowForm(true);
              }}
            >
              <span>+</span>
              {language === 'ta' ? 'புதிய வகை' : 'Add new category'}
            </button>
          )}
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
              type={formType === "view" ? "view" : formType}
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
