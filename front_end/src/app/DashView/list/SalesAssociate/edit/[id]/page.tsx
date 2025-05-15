"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface SalesAssociate {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nic: string;
  phone: string;
  address: string;
  branch_id: number;
  sex?: string;
  role?: string;
}

interface Branch {
  branch_id: number;
  branch_name: string;
}

const EditSalesAssociatePage = () => {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [salesAssociate, setSalesAssociate] = useState<SalesAssociate | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nic, setNic] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [sex, setSex] = useState("male");
  const [role, setRole] = useState("Sales Associate");
  const [branchId, setBranchId] = useState<number>(1);

  // Fetch sales associate data
  useEffect(() => {
    const fetchSalesAssociate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3002/sales-associates/${id}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch sales associate: ${response.status}`);
        }

        const data = await response.json();
        
        if (data) {
          setSalesAssociate({
            id: data.user_id || data.id,
            username: data.username,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            nic: data.nic,
            phone: data.phone,
            address: data.address,
            branch_id: data.branch_id,
            sex: data.sex,
            role: data.role
          });

          // Set form values
          setUsername(data.username || "");
          setEmail(data.email || "");
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setNic(data.nic || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
          setSex(data.sex || "male");
          setRole(data.role || "Sales Associate");
          setBranchId(data.branch_id || 1);
        } else {
          throw new Error("Sales associate data not found");
        }
      } catch (error) {
        console.error("Error fetching sales associate:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchBranches = async () => {
      try {
        const response = await fetch("http://localhost:3002/branches");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch branches: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.Result && Array.isArray(data.Result)) {
          setBranches(data.Result);
        } else {
          setBranches([
            { branch_id: 1, branch_name: "Mahiyangana Branch" },
            { branch_id: 2, branch_name: "Mahaoya Branch" }
          ]);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
        // Set default branches if fetch fails
        setBranches([
          { branch_id: 1, branch_name: "Mahiyangana Branch" },
          { branch_id: 2, branch_name: "Mahaoya Branch" }
        ]);
      }
    };

    if (id) {
      fetchSalesAssociate();
      fetchBranches();
    }
  }, [id]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const salesAssociateData = {
        username,
        email,
        password: password.trim() !== "" ? password : undefined, // Only include password if it's not empty
        firstName,
        lastName,
        nic,
        phone,
        address,
        sex,
        role,
        branchId
      };

      const response = await fetch(`http://localhost:3002/sales-associates/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salesAssociateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update sales associate");
      }

      alert("Sales Associate updated successfully!");
      router.push("/DashView/list/SalesAssociate");
    } catch (error) {
      console.error("Error updating sales associate:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSaving(false);
    }
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
          <Link href="/DashView/list/SalesAssociate" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Sales Associates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center mb-6">
        <Link href="/DashView/list/SalesAssociate" className="mr-4">
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-xl font-semibold">Edit Sales Associate</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password (leave blank to keep current)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIC</label>
            <input
              type="text"
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/DashView/list/SalesAssociate">
            <button type="button" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2">
              Cancel
            </button>
          </Link>
          <button
            type="submit"
            className="px-4 py-2 bg-yellow-500 text-white rounded-md flex items-center"
            disabled={isSaving}
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

export default EditSalesAssociatePage;
