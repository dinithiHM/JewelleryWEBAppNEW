"use client";

import { X, Trash2 } from "lucide-react";
import { useState, ReactNode } from "react";

interface DeleteConfirmationModalProps {
  itemName: string;
  onDelete: () => Promise<void>;
  customTrigger?: ReactNode;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  itemName,
  onDelete,
  customTrigger
}) => {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      try {
        setIsDeleting(true);
        await onDelete();
        setOpen(false);
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Default delete button if no custom trigger is provided
  const defaultTrigger = (
    <button
      className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF6BD]"
      onClick={() => setOpen(true)}
      title="Delete"
    >
      <Trash2 size={16} className="text-red-600" />
    </button>
  );

  return (
    <>
      {/* Use custom trigger if provided, otherwise use default */}
      {customTrigger ? (
        <div onClick={() => setOpen(true)}>{customTrigger}</div>
      ) : (
        defaultTrigger
      )}

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md relative w-[90%] max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>

            <p className="mb-6">
              Are you sure you want to delete this person?
              {itemName && <span className="font-semibold block mt-2">{itemName}</span>}
            </p>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>

            <button
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteConfirmationModal;