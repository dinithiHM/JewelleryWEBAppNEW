"use client";

import { useState } from "react";
import Image from "next/image";

interface DeleteButtonProps {
  id: number | string | null | undefined;
  name: string;
  endpoint: string;
  onSuccess?: () => void;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({
  id,
  name,
  endpoint,
  onSuccess
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      console.log(`Deleting item with ID: ${id} (${typeof id}) from endpoint: ${endpoint}`);

      // Make sure ID is valid and convert to number if needed
      let numericId: number;

      if (id === null || id === undefined) {
        throw new Error('Missing ID: ID is null or undefined');
      }

      // Convert to number if it's a string or already a number
      numericId = typeof id === 'number' ? id : Number(id);

      // Validate the numeric ID
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error(`Invalid ID: ${id} cannot be converted to a valid number`);
      }

      console.log(`Using numeric ID for deletion: ${numericId}`);

      // Use the numeric ID for the rest of the function
      id = numericId;

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      });

      console.log(`Delete response status: ${response.status}`);

      const data = await response.json();
      console.log('Delete response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete');
      }

      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF6BD]"
        onClick={() => setIsOpen(true)}
        title="Delete"
      >
        <Image src="/delete.png" alt="Delete" width={16} height={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>

            <p className="mb-6">
              Are you sure you want to delete {name || 'this item'}?
            </p>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteButton;
