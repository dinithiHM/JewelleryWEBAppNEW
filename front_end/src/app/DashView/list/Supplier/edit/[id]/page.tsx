"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

interface Supplier {
  supplier_id: number | string;
  name: string;
  address: string;
  contact_no: string;
  manufacturing_items: string;
  category: string;
  username?: string;
}

interface Category {
  category_id: number;
  category_name: string;
}

const EditSupplierPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [manufacturingItems, setManufacturingItems] = useState("");
  const [category, setCategory] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Validation schema
  const nameSchema = z.string()
    .min(1, "Name is required")
    .refine(value => !/\d/.test(value), {
      message: "Name should not contain numeric values"
    });

  const passwordSchema = z.string()
    .refine(value => value === "" || value.length >= 6, {
      message: "Password must be at least 6 characters"
    })
    .refine(value => value === "" || /[A-Z]/.test(value), {
      message: "Password must contain at least one uppercase letter"
    })
    .refine(value => value === "" || /[a-z]/.test(value), {
      message: "Password must contain at least one lowercase letter"
    })
    .refine(value => value === "" || /[0-9]/.test(value), {
      message: "Password must contain at least one number"
    });

  // Fetch supplier data
  useEffect(() => {
    const fetchSupplier = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3002/suppliers/${id}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch supplier: ${response.status}`);
        }

        const data = await response.json();
        
        if (data) {
          setSupplier({
            supplier_id: data.supplier_id,
            name: data.name,
            address: data.address,
            contact_no: data.contact_no,
            manufacturing_items: data.manufacturing_items,
            category: data.category,
            username: data.username
          });

          // Set form values
          setName(data.name || "");
          setAddress(data.address || "");
          setContactNo(data.contact_no || "");
          setManufacturingItems(data.manufacturing_items || "");
          setCategory(data.category || "");
          setUsername(data.username || "");
        } else {
          throw new Error("Supplier data not found");
        }
      } catch (error) {
        console.error("Error fetching supplier:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:3002/categories");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
          setCategories(data);
        } else if (data && data.Result && Array.isArray(data.Result)) {
          setCategories(data.Result);
        } else {
          // Default categories if API doesn't return expected format
          setCategories([
            { category_id: 1, category_name: "Gold" },
            { category_id: 2, category_name: "Silver" },
            { category_id: 3, category_name: "Diamond" },
            { category_id: 4, category_name: "Platinum" }
          ]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Set default categories if fetch fails
        setCategories([
          { category_id: 1, category_name: "Gold" },
          { category_id: 2, category_name: "Silver" },
          { category_id: 3, category_name: "Diamond" },
          { category_id: 4, category_name: "Platinum" }
        ]);
      }
    };

    if (id) {
      fetchSupplier();
      fetchCategories();
    }
  }, [id]);

  // Validate form fields
  const validateField = (field: string, value: string) => {
    try {
      if (field === 'name') {
        nameSchema.parse(value);
      } else if (field === 'password') {
        passwordSchema.parse(value);
      }
      
      // If validation passes, remove any existing error for this field
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || `Invalid ${field}`;
        setValidationErrors(prev => ({
          ...prev,
          [field]: errorMessage
        }));
      }
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const isNameValid = validateField('name', name);
    const isPasswordValid = validateField('password', password);
    
    if (!isNameValid || !isPasswordValid) {
      return; // Stop submission if validation fails
    }
    
    setIsSaving(true);
    setError(null);

    try {
      const supplierData: any = {
        name,
        address,
        contact_no: contactNo,
        manufacturing_items: manufacturingItems,
        category
      };

      // Only include username and password if they're provided
      if (username.trim() !== "") {
        supplierData.username = username;
      }
      
      if (password.trim() !== "") {
        supplierData.password = password;
      }

      const response = await fetch(`http://localhost:3002/suppliers/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supplierData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update supplier");
      }

      alert("Supplier updated successfully!");
      router.push("/DashView/list/Supplier");
    } catch (error) {
      console.error("Error updating supplier:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center mb-6">
        <Link href="/DashView/list/Supplier" className="mr-4">
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-xl font-semibold">Edit Supplier</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                validateField('name', e.target.value);
              }}
              className={`w-full p-2 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              required
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input
              type="text"
              value={contactNo}
              onChange={(e) => setContactNo(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_name}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Items</label>
            <input
              type="text"
              value={manufacturingItems}
              onChange={(e) => setManufacturingItems(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username (optional)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password (leave blank to keep current)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validateField('password', e.target.value);
              }}
              className={`w-full p-2 border ${validationErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md`}
            />
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
            )}
            {!validationErrors.password && password && (
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 6 characters and include uppercase, lowercase, and numbers
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/DashView/list/Supplier">
            <button type="button" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2">
              Cancel
            </button>
          </Link>
          <button
            type="submit"
            className="px-4 py-2 bg-yellow-500 text-white rounded-md flex items-center"
            disabled={isSaving || Object.keys(validationErrors).length > 0}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSupplierPage;
