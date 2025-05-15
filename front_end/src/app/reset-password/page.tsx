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
  
  useEffect(() => {
    // Get token from URL
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError(language === 'ta' ? 'மீட்டமைப்பு டோக்கன் காணப்படவில்லை' : 'Reset token not found');
    }
  }, [searchParams, language]);
  
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
    
    if (newPassword.length < 6) {
      setError(language === 'ta' ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்' : 'Password must be at least 6 characters');
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
            <div className="flex items-center bg-gray-200 p-2 sm:p-3 rounded-lg">
              <FaLock className="text-gray-600 mr-2 sm:mr-3" />
              <input
                type="password"
                placeholder={language === 'ta' ? 'புதிய கடவுச்சொல்' : 'New Password'}
                className="bg-transparent flex-1 outline-none text-gray-700 text-sm sm:text-base"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
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
