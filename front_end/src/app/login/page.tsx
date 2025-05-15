"use client";

import { useState } from "react";
import { FaUser, FaLock } from "react-icons/fa";
import { useLanguage } from "@/contexts/LanguageContext";
import axios from "axios";
import { IoMdClose } from "react-icons/io";

const Login = () => {
  // State variables to hold the email, password, and error messages
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<{
    message: string;
    isError: boolean;
    resetUrl?: string;
    emailSent?: boolean;
    usedMockService?: boolean;
    emailAddress?: string;
    messageId?: string;
    error?: string;
  } | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Use the language context
  const { language } = useLanguage();

  // We're removing the auto-redirect effect completely
  // This ensures the login page stays visible until the user submits the form

  // Handle forgot password request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Forgot password form submitted");

    // Reset status
    setForgotPasswordStatus(null);

    // Validate email
    if (!forgotPasswordEmail) {
      setForgotPasswordStatus({
        message: language === 'ta' ? 'மின்னஞ்சல் தேவை' : 'Email is required',
        isError: true
      });
      return;
    }

    // Check if it's an admin email (only allow admin reset)
    if (!forgotPasswordEmail.includes('@')) {
      setForgotPasswordStatus({
        message: language === 'ta' ? 'சரியான மின்னஞ்சலை உள்ளிடவும்' : 'Please enter a valid email',
        isError: true
      });
      return;
    }

    try {
      setIsSendingResetEmail(true);

      // Send request to backend
      const response = await axios.post('http://localhost:3002/auth/forgot-password', {
        email: forgotPasswordEmail
      });

      console.log('Password reset response:', response.data);

      // Check if debug information is available
      const debugInfo = response.data.debug || {};

      // Always show success message even if email doesn't exist (security best practice)
      setForgotPasswordStatus({
        message: language === 'ta'
          ? 'மின்னஞ்சல் அனுப்பப்பட்டது. உங்கள் இன்பாக்ஸை சரிபார்க்கவும்'
          : 'If your email exists in our system, you will receive password reset instructions',
        isError: false,
        // Store all diagnostic information with fallbacks
        resetUrl: debugInfo.resetUrl || 'http://localhost:3000/reset-password?token=fallback-token',
        emailSent: debugInfo.emailSent !== undefined ? debugInfo.emailSent : false,
        usedMockService: debugInfo.usedMockService !== undefined ? debugInfo.usedMockService : true,
        emailAddress: debugInfo.emailAddress || forgotPasswordEmail,
        messageId: debugInfo.messageId || 'unknown'
      });

      // Keep the modal open to show the diagnostic information
      // Don't close it automatically

      // Clear the email field
      setForgotPasswordEmail('');

    } catch (error: any) {
      console.error('Error requesting password reset:', error);

      // Try to extract error details if available
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          'Unknown error';

      console.log('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: errorMessage
      });

      // Create a fallback reset URL for testing even when there's an error
      const fallbackResetUrl = 'http://localhost:3000/reset-password?token=error-fallback-token';

      setForgotPasswordStatus({
        message: language === 'ta'
          ? 'கடவுச்சொல் மீட்டமைப்பு கோரிக்கையில் பிழை ஏற்பட்டது'
          : `An error occurred while requesting password reset: ${errorMessage}`,
        isError: true,
        error: errorMessage,
        // Include any debug info that might be in the error response with fallbacks
        resetUrl: error.response?.data?.debug?.resetUrl || fallbackResetUrl,
        emailSent: false,
        emailAddress: forgotPasswordEmail,
        usedMockService: true
      });

      // Alert the user about the error for better visibility
      alert(`Error requesting password reset: ${errorMessage}\n\nCheck the console for more details.`);
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError(language === 'ta' ? 'மின்னஞ்சல் மற்றும் கடவுச்சொல் தேவை' : 'Email and password are required');
      setIsLoading(false);
      return;
    }

    // We'll try to authenticate with the backend

    try {
      // First try admin login
      try {
        console.log("Trying admin login with:", { email, password });
        const adminResponse = await axios.post("http://localhost:3002/auth/login", { email, password });
        console.log("Admin login response:", adminResponse.data);

        if (adminResponse.data.loginStatus) {
          localStorage.setItem("token", adminResponse.data.token || "admin-token");
          localStorage.setItem("role", "Admin");

          const userInfo = {
            role: "Admin",
            userName: "Administrator",
            userId: 0,
            branch_id: null,
            branchName: ''
          };

          localStorage.setItem("userInfo", JSON.stringify(userInfo));
          window.location.href = "/DashView/admin";
          return;
        }
      } catch (adminError) {
        console.error("Admin login error:", adminError);
        // Continue to try employee login
      }

      // Then try employee login
      try {
        console.log("Trying employee login with:", { email, password });
        const userResponse = await axios.post("http://localhost:3002/users/userlogin", { email, password });
        console.log("Employee login response:", userResponse.data);

        if (userResponse.data.loginStatus) {
          console.log("Employee login successful with role:", userResponse.data.role);
          localStorage.setItem("token", userResponse.data.accessToken || "employee-token");
          localStorage.setItem("role", userResponse.data.role);

          // Store individual items first for backward compatibility
          if (userResponse.data.userName) {
            localStorage.setItem("userName", userResponse.data.userName);
          }

          if (userResponse.data.userId) {
            localStorage.setItem("userId", userResponse.data.userId.toString());
          }

          if (userResponse.data.branchName) {
            localStorage.setItem("branchName", userResponse.data.branchName);
          }

          if (userResponse.data.branchId) {
            localStorage.setItem("branchId", userResponse.data.branchId.toString());
          }

          // For Store Managers, set a hardcoded branch name based on branch ID if not provided
          if (userResponse.data.role === "Store Manager" && userResponse.data.branchId && !userResponse.data.branchName) {
            const branchId = userResponse.data.branchId;
            let branchName = "";

            if (branchId === 1) {
              branchName = "Mahiyanganaya Branch";
            } else if (branchId === 2) {
              branchName = "Mahaoya Branch";
            } else {
              branchName = `Branch ${branchId}`;
            }

            localStorage.setItem("branchName", branchName);
          }

          // Store all user info in a single object for easier access
          const userInfo = {
            role: userResponse.data.role,
            userName: userResponse.data.userName || '',
            userId: userResponse.data.userId,
            branch_id: userResponse.data.branchId,
            branchName: userResponse.data.branchName || localStorage.getItem("branchName") || ''
          };

          localStorage.setItem("userInfo", JSON.stringify(userInfo));

          // Redirect based on role
          switch (userResponse.data.role.toLowerCase()) {
            case 'admin':
              window.location.href = '/DashView/admin';
              break;
            case 'store manager':
              window.location.href = '/DashView/storeManager';
              break;
            case 'sales associate':
              window.location.href = '/DashView/salesAssociate';
              break;
            case 'cashier':
              window.location.href = '/DashView/cashier';
              break;
            default:
              window.location.href = '/DashView/user';
          }
          return;
        }
      } catch (userError) {
        console.error("Employee login error:", userError);
      }

      // If we get here, both login attempts failed
      // But still try the test accounts as a fallback
      if (email === 'admin@test.com' && password === 'admin123') {
        const userInfo = {
          role: 'Admin',
          userName: 'Administrator',
          userId: 1,
          branch_id: null,
          branchName: ''
        };

        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        localStorage.setItem('token', 'mock-token-admin');
        localStorage.setItem('role', userInfo.role);

        window.location.href = '/DashView/admin';
        return;
      }

      if (email === 'manager@test.com' && password === 'manager123') {
        // Set individual items first
        localStorage.setItem('userName', 'Store Manager');
        localStorage.setItem('userId', '2');
        localStorage.setItem('branchId', '1');
        localStorage.setItem('branchName', 'Mahiyanganaya Branch');

        const userInfo = {
          role: 'Store Manager',
          userName: 'Store Manager',
          userId: 2,
          branch_id: 1,
          branchName: 'Mahiyanganaya Branch'
        };

        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        localStorage.setItem('token', 'mock-token-manager');
        localStorage.setItem('role', userInfo.role);

        window.location.href = '/DashView/storeManager';
        return;
      }

      setError(language === 'ta' ? 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்' : 'Invalid email or password');
    } catch (err) {
      console.error('Login error:', err);
      setError(language === 'ta' ? 'உள்நுழைவதில் பிழை ஏற்பட்டது' : 'An error occurred during login');
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
      <div className="bg-black bg-opacity-60 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md">
        <h2 className="text-white text-xl sm:text-2xl font-semibold text-center mb-6">
          {language === 'ta' ? 'உள்நுழைவு' : 'Login'}
        </h2>
        {error && (
          <div className="text-red-500 text-center mb-4 bg-red-100 p-2 rounded">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center bg-gray-200 p-2 sm:p-3 rounded-lg">
            <FaUser className="text-gray-600 mr-2 sm:mr-3" />
            <input
              type="email"
              placeholder={language === 'ta' ? 'மின்னஞ்சல்' : 'Email'}
              className="bg-transparent flex-1 outline-none text-gray-700 text-sm sm:text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center bg-gray-200 p-2 sm:p-3 rounded-lg">
            <FaLock className="text-gray-600 mr-2 sm:mr-3" />
            <input
              type="password"
              placeholder={language === 'ta' ? 'கடவுச்சொல்' : 'Password'}
              className="bg-transparent flex-1 outline-none text-gray-700 text-sm sm:text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                {language === 'ta' ? 'உள்நுழைகிறது...' : 'Signing in...'}
              </>
            ) : (
              language === 'ta' ? 'உள்நுழைக' : 'Login'
            )}
          </button>
          <p
            onClick={() => setShowForgotPasswordModal(true)}
            className="text-center text-white mt-2 text-xs sm:text-sm cursor-pointer hover:underline"
          >
            {language === 'ta' ? 'கடவுச்சொல்லை மறந்துவிட்டீர்களா?' : 'Forgot Password?'}
          </p>

          {/* Forgot Password Modal */}
          {showForgotPasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {language === 'ta' ? 'கடவுச்சொல்லை மீட்டமைக்க' : 'Reset Password'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowForgotPasswordModal(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordStatus(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <IoMdClose size={24} />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {language === 'ta'
                    ? 'உங்கள் நிர்வாக மின்னஞ்சலை உள்ளிடவும், கடவுச்சொல்லை மீட்டமைக்க வழிமுறைகளுடன் ஒரு மின்னஞ்சல் அனுப்பப்படும்.'
                    : 'Enter your admin email and we will send you instructions to reset your password.'}
                </p>

                {forgotPasswordStatus && (
                  <div className={`p-3 mb-4 rounded text-sm ${
                    forgotPasswordStatus.isError
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {forgotPasswordStatus.message}
                  </div>
                )}

                {/* For testing purposes - always display diagnostic information */}
                {forgotPasswordStatus && (
                  <div className="p-3 mb-4 rounded text-sm bg-blue-100 text-blue-700">
                    <p className="font-bold mb-2">Email Diagnostic Information:</p>

                    {forgotPasswordStatus.emailSent ? (
                      <div className="mb-2 p-2 bg-green-100 text-green-700 rounded">
                        <p className="font-semibold">✅ Email was sent successfully</p>
                        {forgotPasswordStatus.usedMockService ? (
                          <p className="text-orange-600">⚠️ Using mock email service (check server console)</p>
                        ) : (
                          <p>Using real email service</p>
                        )}
                        <p>Sent to: {forgotPasswordStatus.emailAddress}</p>
                        {forgotPasswordStatus.messageId && (
                          <p>Message ID: {forgotPasswordStatus.messageId}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">
                        <p className="font-semibold">❌ Email sending failed</p>
                        {forgotPasswordStatus.error && (
                          <p>Error: {forgotPasswordStatus.error}</p>
                        )}
                      </div>
                    )}

                    <p className="font-bold mt-2 mb-1">Reset Link:</p>
                    <p className="mb-1">You can use this link directly to reset your password:</p>
                    {forgotPasswordStatus.resetUrl ? (
                      <a
                        href={forgotPasswordStatus.resetUrl}
                        className="underline break-all"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {forgotPasswordStatus.resetUrl}
                      </a>
                    ) : (
                      <p className="text-red-600">No reset link available</p>
                    )}

                    <div className="mt-3 text-xs text-gray-600">
                      <p>If you're not receiving emails, please check:</p>
                      <ol className="list-decimal pl-5 mt-1">
                        <li>Your spam/junk folder</li>
                        <li>The email address is correct</li>
                        <li>Server logs for SMTP errors</li>
                        <li>Gmail app password is correct and not expired</li>
                        <li>Network connectivity to SMTP server</li>
                      </ol>
                    </div>
                  </div>
                )}

                <form onSubmit={handleForgotPassword}>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ta' ? 'மின்னஞ்சல்' : 'Email'}
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder={language === 'ta' ? 'உங்கள் நிர்வாக மின்னஞ்சலை உள்ளிடவும்' : 'Enter your admin email'}
                      disabled={isSendingResetEmail}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                      disabled={isSendingResetEmail}
                    >
                      {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-black bg-yellow-400 rounded-md hover:bg-yellow-500 flex items-center"
                      disabled={isSendingResetEmail}
                    >
                      {isSendingResetEmail ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black mr-2"></div>
                          {language === 'ta' ? 'அனுப்புகிறது...' : 'Sending...'}
                        </>
                      ) : (
                        language === 'ta' ? 'அனுப்பு' : 'Send'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-600">
            <p className="text-center text-white text-xs sm:text-sm mb-2">
              {language === 'ta' ? 'நீங்கள் ஒரு சப்ளையரா?' : 'Are you a supplier?'}
            </p>
            <a
              href="/supplier/login"
              className="block w-full text-center bg-yellow-600 text-white font-semibold py-2 sm:py-3 rounded-lg hover:bg-yellow-700 transition duration-300"
            >
              {language === 'ta' ? 'சப்ளையர் உள்நுழைவு' : 'Supplier Login'}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
