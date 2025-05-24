"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";

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
  sex: z.enum(["male", "female", "other"], { message: "Sex is required!" }),
  role: z.enum(["Admin", "Store Manager", "Sales Associate", "Cashier"], { message: "Role is required!" }),
  branchId: z.number().min(1, { message: "Branch ID is required!" }),
});

type Inputs = z.infer<typeof schema>;

const StoreManagerForm = ({ type, data }: { type: "create" | "update"; data?: any }) => {
  const [username, setUsername] = useState(data?.username || "");
  const [email, setEmail] = useState(data?.email || "");
  const [password, setPassword] = useState(data?.password || "");
  const [firstName, setFirstName] = useState(data?.firstName || "");
  const [lastName, setLastName] = useState(data?.lastName || "");
  const [nic, setNic] = useState(data?.nic || "");
  const [phone, setPhone] = useState(data?.phone || "");
  const [address, setAddress] = useState(data?.address || "");
  // Blood type field removed
  const [sex, setSex] = useState(data?.sex || "male");
  const [role, setRole] = useState(data?.role || "Admin");
  const [branchId, setBranchId] = useState(data?.branchId || 1); // Assuming default branch_id 1

  // Define branches for dropdown
  const branches = [
    { branch_id: 1, branch_name: "Mahiyangana Branch" },
    { branch_id: 2, branch_name: "Mahaoya Branch" }
  ];

  const { handleSubmit, register, formState: { errors } } = useForm<Inputs>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async () => {
    try {
      const storeManagerData = {
        username,
        email,
        password,
        firstName,
        lastName,
        nic,
        phone,
        address,
        sex,
        role,
        branchId,
      };

      const response = await fetch("http://localhost:3002/store-managers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(storeManagerData),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Store Manager added successfully!");
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to create Store Manager!");
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">{type === "create" ? "Create a new Store Manager" : "Update Store Manager details"}</h1>
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
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            type="password"
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

        {/* Blood type field removed */}

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sex")}
            value={sex}
            onChange={(e) => setSex(e.target.value)}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.sex && <p className="text-xs text-red-400">{errors.sex.message}</p>}
        </div>
      </div>

      <span className="text-xs text-gray-400 font-medium">Role Information</span>

      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Role</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("role")}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Admin">Admin</option>
            <option value="Store Manager">Store Manager</option>
            <option value="Sales Associate">Sales Associate</option>
            <option value="Cashier">Cashier</option>
          </select>
          {errors.role && <p className="text-xs text-red-400">{errors.role.message}</p>}
        </div>

        <div className="flex flex-col w-full md:w-1/4">
          <label className="text-xs text-gray-500">Branch</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("branchId", { valueAsNumber: true })} // Ensures value is parsed as a number
            value={branchId}
            onChange={(e) => setBranchId(Number(e.target.value))} // Convert string to number
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

      <div className="mt-4">
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded-md"
        >
          {type === "create" ? "Create" : "Update"} Store Manager
        </button>
      </div>
    </form>
  );
};

export default StoreManagerForm;
