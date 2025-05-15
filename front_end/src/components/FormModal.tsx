"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, JSX } from "react";

// Dynamic imports for forms
const StoreManagerForm = dynamic(() => import("./forms/StoreManagerForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SalesAssociateForm = dynamic(() => import("./forms/StoreManagerForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SupplierForm = dynamic(() => import("./forms/SupplierForm"), {
  loading: () => <h1>Loading...</h1>,
});
const CashierForm = dynamic(() => import("./forms/CashierForm"), {
  loading: () => <h1>Loading...</h1>,
});
const CategoryForm = dynamic(() => import("./forms/CategoryForm"), {
  loading: () => <h1>Loading...</h1>,
});
// const ParentForm = dynamic(() => import("./forms/SupplierForm"), {
//   loading: () => <h1>Loading...</h1>,
// });

// const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
//   loading: () => <h1>Loading...</h1>,
// });
// ... Add more dynamic imports for other table types

// Forms mapping object
const forms: {
  [key: string]: (type: "create" | "update", data?: any) => JSX.Element;
} = {
  "store-manager": (type, data) => <StoreManagerForm type={type} data={data} />,
  supplier: (type, data) => <SupplierForm type={type} data={data} />, // ✅ Corrected
  "sales-associate": (type, data) => <SalesAssociateForm type={type} data={data} />, // ✅ Corrected
  cashier: (type, data) => <CashierForm type={type} data={data} />, // ✅ Added Cashier form
  category: (type, data) => <CategoryForm type={type} data={data} onSuccess={() => {}} onCancel={() => {}} />, // ✅ Added Category form
};


interface FormModalProps {
  table: string;
  type: "create" | "update" | "delete";  // Make type more specific
  id?: number;
  onDelete?: () => Promise<void>;  // Make onDelete return Promise
  data?: any;
  itemName?: string;  // Name of the item to be deleted (for confirmation message)
}

const FormModal: React.FC<FormModalProps> = ({ table, type, id, onDelete, data, itemName }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-yellow"
      : "bg-#FFF6BD";

  const [open, setOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      try {
        await onDelete();
        setOpen(false);
      } catch (error) {
        console.error("Error deleting:", error);
        // Show error message to user
        alert("Failed to delete. Please try again.");
      }
    }
  };

  // Determine the form to render based on the table value
  const Form = () => {
    if (type === "delete" && id) {
      return (
        <form className="p-4 flex flex-col gap-4">
          <span className="text-center font-medium">
            {itemName ?
              `Are you sure you want to delete ${itemName}?` :
              `All data will be lost. Are you sure you want to delete this ${table}?`}
          </span>
          <div className="flex justify-center gap-4 mt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-gray-500 text-white py-2 px-4 rounded-md border-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="bg-red-700 text-white py-2 px-4 rounded-md border-none"
            >
              Delete
            </button>
          </div>
        </form>
      );
    }

    // Check if the form exists for the given table
    const FormComponent = forms[table];
    if (!FormComponent) {
      return <div>Form for {table} not found!</div>;
    }

    return type === "delete" ? null : FormComponent(type, data);
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <Form />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;