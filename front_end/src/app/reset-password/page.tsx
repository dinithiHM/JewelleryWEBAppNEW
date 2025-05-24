"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaLock } from "react-icons/fa";
import axios from "axios";
import { useLanguage } from "@/contexts/LanguageContext";

const ResetPassword = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();

  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // Get token from URL
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError(language === 'ta' ? 'மீட்டமைப்பு டோக்கன் காணப்படவில்லை' : 'Reset token not found');
    }
  }, [searchParams, language]);

  // Function to validate password and calculate strength
  const validatePassword = (password: string) => {
    const errors: string[] = [];
    let strength = 0;

    // Check minimum length
    if (password.length < 6) {
      errors.push(language === 'ta' ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்' : 'Password must be at least 6 characters long');
    } else {
      strength += 1;
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
      errors.push(language === 'ta' ? 'கடவுச்சொல்லில் குறைந்தது ஒரு பெரிய எழுத்து இருக்க வேண்டும்' : 'Password must contain at least one uppercase letter');
    } else {
      strength += 1;
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
      errors.push(language === 'ta' ? 'கடவுச்சொல்லில் குறைந்தது ஒரு சிறிய எழுத்து இருக்க வேண்டும்' : 'Password must contain at least one lowercase letter');
    } else {
      strength += 1;
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
      errors.push(language === 'ta' ? 'கடவுச்சொல்லில் குறைந்தது ஒரு எண் இருக்க வேண்டும்' : 'Password must contain at least one number');
    } else {
      strength += 1;
    }

    // Check for special characters
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(language === 'ta' ? 'கடவுச்சொல்லில் குறைந்தது ஒரு சிறப்பு எழுத்து இருக்க வேண்டும்' : 'Password must contain at least one special character');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      setError(language === 'ta' ? 'அனைத்து புலங்களையும் நிரப்பவும்' : 'Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(language === 'ta' ? 'கடவுச்சொற்கள் பொருந்தவில்லை' : 'Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const { errors } = validatePassword(newPassword);
    if (errors.length > 0) {
      setError(errors[0]);
      setIsLoading(false);
      return;
    }

    try {
      // Send request to reset password
      const response = await axios.post('http://localhost:3002/auth/reset-password', {
        token,
        newPassword
      });

      if (response.data.success) {
        setSuccess(language === 'ta' ? 'கடவுச்சொல் வெற்றிகரமாக மீட்டமைக்கப்பட்டது' : 'Password has been reset successfully');

        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(language === 'ta' ? 'கடவுச்சொல் மீட்டமைப்பு தோல்வியடைந்தது' : 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);

      // Handle different error responses
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError(language === 'ta' ? 'கடவுச்சொல் மீட்டமைப்பில் பிழை ஏற்பட்டது' : 'An error occurred during password reset');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4 py-8 sm:py-16"
      style={{
        backgroundImage: "url('/slide2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-black bg-opacity-60 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-white text-xl sm:text-2xl font-semibold text-center mb-6">
          {language === 'ta' ? 'கடவுச்சொல்லை மீட்டமைக்க' : 'Reset Password'}
        </h2>

        {error && (
          <div className="text-red-500 text-center mb-4 bg-red-100 p-2 rounded">{error}</div>
        )}

        {success && (
          <div className="text-green-500 text-center mb-4 bg-green-100 p-2 rounded">{success}</div>
        )}

        {!token && (
          <div className="text-white text-center">
            <p>{language === 'ta' ? 'தவறான அல்லது காலாவதியான டோக்கன்' : 'Invalid or expired token'}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg hover:bg-yellow-500 transition duration-300"
            >
              {language === 'ta' ? 'உள்நுழைவுக்குத் திரும்பு' : 'Back to Login'}
            </button>
          </div>
        )}

        {token && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col">
              <div className="flex items-center bg-gray-200 p-2 sm:p-3 rounded-lg">
                <FaLock className="text-gray-600 mr-2 sm:mr-3" />
                <input
                  type="password"
                  placeholder={language === 'ta' ? 'புதிய கடவுச்சொல்' : 'New Password'}
                  className="bg-transparent flex-1 outline-none text-gray-700 text-sm sm:text-base"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                />
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="mt-2 bg-black bg-opacity-40 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <div className="text-xs mr-2 text-white">
                      {language === 'ta' ? 'கடவுச்சொல் வலிமை:' : 'Password strength:'}
                    </div>
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
                  <ul className="text-xs text-white mt-1 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-red-300">
                        ✗ {error}
                      </li>
                    ))}
                    {validationErrors.length === 0 && newPassword && (
                      <li className="text-green-300">
                        ✓ {language === 'ta' ? 'கடவுச்சொல் அனைத்து தேவைகளையும் பூர்த்தி செய்கிறது' : 'Password meets all requirements'}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center bg-gray-200 p-2 sm:p-3 rounded-lg">
              <FaLock className="text-gray-600 mr-2 sm:mr-3" />
              <input
                type="password"
                placeholder={language === 'ta' ? 'கடவுச்சொல்லை உறுதிப்படுத்தவும்' : 'Confirm Password'}
                className="bg-transparent flex-1 outline-none text-gray-700 text-sm sm:text-base"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 text-black font-semibold py-2 sm:py-3 rounded-lg hover:bg-yellow-500 transition duration-300 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                  {language === 'ta' ? 'மீட்டமைக்கிறது...' : 'Resetting...'}
                </>
              ) : (
                language === 'ta' ? 'கடவுச்சொல்லை மீட்டமைக்க' : 'Reset Password'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-white text-sm hover:underline"
              >
                {language === 'ta' ? 'உள்நுழைவுக்குத் திரும்பு' : 'Back to Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
