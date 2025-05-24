'use client';

import React, { useState, useEffect } from 'react';
import { UserCircle, Mail, Phone, MapPin, Building, Shield, Key } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserData {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  address: string;
  branch_id: number;
  branch_name?: string;
}

const ProfilePage = () => {
  const { language } = useLanguage();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Get user ID from localStorage
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('User ID not found. Please log in again.');
        }

        // Fetch user data
        const response = await fetch(`http://localhost:3002/users/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        setUserData(data);

        // If user has a branch_id, fetch branch details
        if (data.branch_id) {
          const branchResponse = await fetch(`http://localhost:3002/branches/${data.branch_id}`);
          if (branchResponse.ok) {
            const branchData = await branchResponse.json();
            setUserData(prev => prev ? { ...prev, branch_name: branchData.branch_name } : null);
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate passwords
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Validate password strength
    const { errors } = validatePassword(newPassword);
    if (errors.length > 0) {
      setPasswordError(errors[0]);
      return;
    }

    try {
      setIsSubmitting(true);

      // Get user ID from localStorage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      // Send password reset request
      const response = await fetch(`http://localhost:3002/users/reset-password/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      // Clear form and show success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password reset successfully');

      // Hide password reset form after 3 seconds
      setTimeout(() => {
        setShowPasswordReset(false);
        setPasswordSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Error resetting password:', err);
      setPasswordError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Translations
  const translations = {
    profile: language === 'ta' ? 'சுயவிவரம்' : 'Profile',
    personalInfo: language === 'ta' ? 'தனிப்பட்ட தகவல்' : 'Personal Information',
    name: language === 'ta' ? 'பெயர்' : 'Name',
    email: language === 'ta' ? 'மின்னஞ்சல்' : 'Email',
    phone: language === 'ta' ? 'தொலைபேசி' : 'Phone',
    address: language === 'ta' ? 'முகவரி' : 'Address',
    role: language === 'ta' ? 'பங்கு' : 'Role',
    branch: language === 'ta' ? 'கிளை' : 'Branch',
    resetPassword: language === 'ta' ? 'கடவுச்சொல்லை மீட்டமைக்க' : 'Reset Password',
    currentPassword: language === 'ta' ? 'தற்போதைய கடவுச்சொல்' : 'Current Password',
    newPassword: language === 'ta' ? 'புதிய கடவுச்சொல்' : 'New Password',
    confirmPassword: language === 'ta' ? 'கடவுச்சொல்லை உறுதிப்படுத்தவும்' : 'Confirm Password',
    submit: language === 'ta' ? 'சமர்ப்பிக்கவும்' : 'Submit',
    cancel: language === 'ta' ? 'ரத்து செய்' : 'Cancel',
    loading: language === 'ta' ? 'ஏற்றுகிறது...' : 'Loading...',
    error: language === 'ta' ? 'பிழை ஏற்பட்டது' : 'An error occurred',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">{translations.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">{translations.error}</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-yellow-400 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{translations.profile}</h1>
          </div>

          {/* User Info */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="bg-yellow-100 p-4 rounded-full">
                <UserCircle size={80} className="text-yellow-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {userData?.first_name} {userData?.last_name}
                </h2>
                <div className="flex items-center mt-1">
                  <Shield size={16} className="text-yellow-600 mr-2" />
                  <span className="text-gray-600 font-medium">{userData?.role}</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{translations.personalInfo}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <Mail className="text-yellow-600 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">{translations.email}</p>
                    <p className="text-gray-900">{userData?.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="text-yellow-600 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">{translations.phone}</p>
                    <p className="text-gray-900">{userData?.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="text-yellow-600 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">{translations.address}</p>
                    <p className="text-gray-900">{userData?.address || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Building className="text-yellow-600 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">{translations.branch}</p>
                    <p className="text-gray-900">{userData?.branch_name || 'Not assigned'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Reset Button */}
            <div className="mt-8">
              <button
                onClick={() => setShowPasswordReset(!showPasswordReset)}
                className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                <Key size={18} className="mr-2" />
                {translations.resetPassword}
              </button>
            </div>

            {/* Password Reset Form */}
            {showPasswordReset && (
              <div className="mt-6 p-6 bg-gray-50 rounded-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{translations.resetPassword}</h3>

                {passwordError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleResetPassword}>
                  <div className="mb-4">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {translations.currentPassword}
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {translations.newPassword}
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {translations.confirmPassword}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowPasswordReset(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {translations.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? '...' : translations.submit}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
