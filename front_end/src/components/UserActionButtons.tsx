import { Eye, Pencil, Trash2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

interface UserActionButtonsProps {
  id: number;
  name: string;
  userType: "admin" | "store-manager" | "sales-associate" | "cashier" | "supplier";
  currentUserRole: string;
  onDelete: (id: number) => Promise<void>;
}

// Component for password reset modal
interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
  userId: number;
  userName: string;
}

const PasswordResetModal = ({ isOpen, onClose, onSubmit, userId, userName }: PasswordResetModalProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Function to validate password and calculate strength
  const validatePassword = (password: string) => {
    const errors: string[] = [];
    let strength = 0;

    // Check minimum length
    if (password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    } else {
      strength += 1;
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    } else {
      strength += 1;
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    } else {
      strength += 1;
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    } else {
      strength += 1;
    }

    // Check for special characters
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    } else {
      strength += 1;
    }

    return { errors, strength };
  };

  // Handle password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setNewPassword(password);

    if (password) {
      const { errors, strength } = validatePassword(password);
      setValidationErrors(errors);
      setPasswordStrength(strength);
    } else {
      setValidationErrors([]);
      setPasswordStrength(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    const { errors } = validatePassword(newPassword);

    if (errors.length > 0) {
      setError(errors[0]); // Show the first error
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    onSubmit(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setValidationErrors([]);
    setPasswordStrength(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Reset Password for {userName}</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={handlePasswordChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />

            {/* Password strength indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center mb-1">
                  <div className="text-xs mr-2">Password strength:</div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        passwordStrength === 0 ? 'bg-red-500' :
                        passwordStrength <= 2 ? 'bg-yellow-500' :
                        passwordStrength <= 4 ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Password requirements */}
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-red-500">
                      ✗ {error}
                    </li>
                  ))}
                  {validationErrors.length === 0 && newPassword && (
                    <li className="text-green-500">✓ Password meets all requirements</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserActionButtons = ({ id, name, userType, currentUserRole, onDelete }: UserActionButtonsProps) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Function to handle password reset
  const handlePasswordReset = async (newPassword: string) => {
    try {
      const response = await fetch(`http://localhost:3002/users/reset-password/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from the server
        if (response.status === 400 && data.errors) {
          // Show the first error message
          alert(`Password validation failed: ${data.errors[0]}`);
        } else {
          // Show general error message
          alert(data.message || 'Failed to reset password');
        }
        return;
      }

      alert('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password. Please try again.');
    }
  };

  // Format the view URL based on user type
  const getViewUrl = () => {
    switch (userType) {
      case 'store-manager':
        return `/DashView/list/StoreManager/${id}`;
      case 'sales-associate':
        return `/DashView/list/SalesAssociate/${id}`;
      case 'cashier':
        return `/DashView/list/cashier/${id}`;
      case 'supplier':
        return `/DashView/list/Supplier/${id}`;
      default:
        return `/DashView/list/${userType}/${id}`;
    }
  };

  // Format the edit URL based on user type
  const getEditUrl = () => {
    switch (userType) {
      case 'store-manager':
        return `/DashView/list/StoreManager/edit/${id}`;
      case 'sales-associate':
        return `/DashView/list/SalesAssociate/edit/${id}`;
      case 'cashier':
        return `/DashView/list/cashier/edit/${id}`;
      case 'supplier':
        return `/DashView/list/Supplier/edit/${id}`;
      default:
        return `/DashView/list/${userType}/edit/${id}`;
    }
  };

  const isAdmin = currentUserRole.toLowerCase() === "admin";

  return (
    <div className="flex items-center gap-2">
      {/* View Button */}
      <Link href={getViewUrl()}>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF6BD]"
          title="View details"
        >
          <Eye size={16} className="text-blue-600" />
        </button>
      </Link>

      {/* Edit Button - Only for admin */}
      {isAdmin && (
        <Link href={getEditUrl()}>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF6BD]"
            title="Edit user"
          >
            <Pencil size={16} className="text-yellow-600" />
          </button>
        </Link>
      )}

      {/* Password Reset Button - Only for admin */}
      {isAdmin && (
        <button
          className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF6BD]"
          title="Reset password"
          onClick={() => setIsPasswordModalOpen(true)}
        >
          <KeyRound size={16} className="text-green-600" />
        </button>
      )}

      {/* Delete Button - Only for admin */}
      {isAdmin && (
        <DeleteConfirmationModal
          itemName={name}
          onDelete={() => onDelete(id)}
          customTrigger={
            <button
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF6BD]"
              title="Delete user"
            >
              <Trash2 size={16} className="text-red-600" />
            </button>
          }
        />
      )}

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handlePasswordReset}
        userId={id}
        userName={name}
      />
    </div>
  );
};

export default UserActionButtons;
