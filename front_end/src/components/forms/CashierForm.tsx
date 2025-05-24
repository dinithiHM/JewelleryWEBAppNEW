"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";

// Custom validation for name fields (no numeric values)
const nameValidator = (fieldName: string) =>
  z.string()
    .min(1, { message: `${fieldName} is required!` })
    .refine(value => !/\d/.test(value), {
      message: `${fieldName} should not contain numbers`
    });

// Zod schema for form validation
const schema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters long!" }).max(50, { message: "Username must be at most 50 characters long!" }),
  email: z.string().email({ message: "Invalid email address!" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long!" }),
  firstName: nameValidator("First name"),
  lastName: nameValidator("Last name"),
  nic: z.string().min(1, { message: "NIC is required!" }).max(20, { message: "NIC must be at most 20 characters long!" }),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string().min(1, { message: "Address is required!" }),
  branchId: z.number().min(1, { message: "Branch ID is required!" }),
});

type Inputs = z.infer<typeof schema>;

const CashierForm = ({ type, data }: { type: "create" | "update"; data?: any }) => {
  const [username, setUsername] = useState(data?.username || "");
  const [email, setEmail] = useState(data?.email || "");
  const [password, setPassword] = useState(data?.password || "");
  const [firstName, setFirstName] = useState(data?.firstName || "");
  const [lastName, setLastName] = useState(data?.lastName || "");
  const [nic, setNic] = useState(data?.nic || "");
  const [phone, setPhone] = useState(data?.phone || "");
  const [address, setAddress] = useState(data?.address || "");
  const [branchId, setBranchId] = useState(data?.branchId || 1); // Assuming default branch_id 1
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set hardcoded branches for dropdown
  useEffect(() => {
    // Hardcoded branches as specified
    const hardcodedBranches = [
      { branch_id: 1, branch_name: "Mahiyangana Branch" },
      { branch_id: 2, branch_name: "Mahaoya Branch" }
    ];

    setBranches(hardcodedBranches);
  }, []);

  const { handleSubmit, register, formState: { errors } } = useForm<Inputs>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const cashierData = {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        nic,
        phone,
        address,
        branch_id: branchId,
        role: "cashier" // Set role to cashier
      };

      const url = type === "create"
        ? "http://localhost:3002/cashiers/create"
        : `http://localhost:3002/cashiers/update/${data?.id}`;

      const response = await fetch(url, {
        method: type === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cashierData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(type === "create" ? "Cashier added successfully!" : "Cashier updated successfully!");
        // Reset form if creating a new cashier
        if (type === "create") {
          setUsername("");
          setEmail("");
          setPassword("");
          setFirstName("");
          setLastName("");
          setNic("");
          setPhone("");
          setAddress("");
          setBranchId(1);
        }
        // Reload the page after a short delay to show the new data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(`Error: ${result.message || "Something went wrong"}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("Failed to process cashier data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">{type === "create" ? "Add a new Cashier" : "Update Cashier details"}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {success}
        </div>
      )}

      <span className="text-xs text-gray-400 font-medium">Authentication Information</span>

      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Username</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Email</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Password</label>
          <input
            type="password"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>
      </div>

      <span className="text-xs text-gray-400 font-medium">Personal Information</span>

      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">First Name</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("firstName")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          {errors.firstName && <p className="text-xs text-red-400">{errors.firstName.message}</p>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Last Name</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lastName")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          {errors.lastName && <p className="text-xs text-red-400">{errors.lastName.message}</p>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">NIC</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("nic")}
            value={nic}
            onChange={(e) => setNic(e.target.value)}
          />
          {errors.nic && <p className="text-xs text-red-400">{errors.nic.message}</p>}
        </div>
      </div>

      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Phone</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Address</label>
          <input
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("address")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {errors.address && <p className="text-xs text-red-400">{errors.address.message}</p>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Branch</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("branchId", { valueAsNumber: true })}
            value={branchId}
            onChange={(e) => setBranchId(Number(e.target.value))}
          >
            {branches.map((branch) => (
              <option key={branch.branch_id} value={branch.branch_id}>
                {branch.branch_name}
              </option>
            ))}
          </select>
          {errors.branchId && <p className="text-xs text-red-400">{errors.branchId.message}</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-[#FFC700] text-black px-4 py-2 rounded-md text-sm font-medium"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : type === "create" ? "Create Cashier" : "Update Cashier"}
        </button>
      </div>
    </form>
  );
};

export default CashierForm;
