import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaLock, FaUser, FaShieldAlt, FaArrowRight, FaEnvelope, FaPhone } from 'react-icons/fa';
import api from '../services/api';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loginMode, setLoginMode] = useState<'password' | 'emailOtp' | 'phoneOtp'>('emailOtp');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(true);
  const [showPhoneOtp, setShowPhoneOtp] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, requestLoginOtp, verifyLoginOtp, user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Handle redirect based on user type after successful login or if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      // console.log('LoginPage - User authenticated, user data:', user);
      // console.log('LoginPage - User account type:', user.accountType);
      // console.log('LoginPage - Redirecting to:', user.accountType === 'ADMIN' ? '/admin' : '/dashboard');
      
      if (user.accountType === 'ADMIN') {
        console.log('LoginPage - Redirecting admin user to /admin');
        navigate('/admin');
      } else {
        console.log('LoginPage - Redirecting regular user to /studio/dashboard');
        navigate('/studio/dashboard');
      }
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await api.get<{ flags?: Array<{ name: string; value: boolean }> }>('/api/flags');
        const flags = Array.isArray(res.data?.flags) ? res.data.flags : [];
        const emailFlag = flags.find((x) => x.name === 'isEmail');
        const phoneFlag = flags.find((x) => x.name === 'isPhone');
        const canEmail = emailFlag?.value ?? true;
        const canPhone = phoneFlag?.value ?? true;
        setShowEmailOtp(canEmail);
        setShowPhoneOtp(canPhone);
        if (loginMode === 'emailOtp' && !canEmail) setLoginMode(canPhone ? 'phoneOtp' : 'password');
        if (loginMode === 'phoneOtp' && !canPhone) setLoginMode(canEmail ? 'emailOtp' : 'password');
      } catch {
        setShowEmailOtp(true);
        setShowPhoneOtp(true);
      }
    };
    fetchFlags();
  }, [loginMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      toast.success('Welcome back!');
      
      // The login function will update the user state
      // We'll handle the redirect in a useEffect when user changes
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (loginMode === 'emailOtp') {
        if (!email.trim()) {
          toast.error('Please enter email');
          return;
        }
        await requestLoginOtp({ email: email.trim() });
      } else {
        if (!phone.trim()) {
          toast.error('Please enter phone number');
          return;
        }
        await requestLoginOtp({ phone: phone.trim(), });
      }
      setOtpRequested(true);
      toast.success('OTP sent successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!otp.trim()) {
        toast.error('Please enter OTP');
        return;
      }
      if (loginMode === 'emailOtp') {
        await verifyLoginOtp({ email: email.trim(), otp: otp.trim() });
      } else {
        await verifyLoginOtp({ phone: phone.trim(), otp: otp.trim() });
      }
      toast.success('Login successful');
    } catch (error: any) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Debug: Log loading state
  // console.log('LoginPage - isLoading:', isLoading, 'user:', user);

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('LoginPage - Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-white/10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl mb-6">
            <FaShieldAlt className="h-10 w-10 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            Welcome Back
          </h1>
          <p className="text-xl text-white/80 font-medium">
            Sign in to your secure account
          </p>
          <p className="text-sm text-white/60 mt-2">
            Access your files and cloud services
          </p>
        </div>

        {/* Login Form */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-3xl"></div>
          <div className="relative z-10">
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setOtpRequested(false); setOtp(''); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${loginMode === 'password' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
            >
              Username
            </button>
            {showEmailOtp && (
              <button
                type="button"
                onClick={() => { setLoginMode('emailOtp'); setOtpRequested(false); setOtp(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${loginMode === 'emailOtp' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
              >
                Email OTP
              </button>
            )}
            {showPhoneOtp && (
              <button
                type="button"
                onClick={() => { setLoginMode('phoneOtp'); setOtpRequested(false); setOtp(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${loginMode === 'phoneOtp' ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
              >
                Mobile OTP
              </button>
            )}
          </div>

          {loginMode === 'password' ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-white/90">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-white group-focus-within:text-purple-200 transition-colors drop-shadow-lg" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-white/90">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-white group-focus-within:text-purple-200 transition-colors drop-shadow-lg" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <button
                    type="button"
                    className="text-white hover:text-purple-200 transition-colors duration-200 drop-shadow-lg"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-5 w-5" />
                    ) : (
                      <FaEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-purple-500 focus:ring-purple-400 border-white/30 rounded bg-white/10"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white/80">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-purple-300 hover:text-purple-200 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FaArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    Sign in
                  </div>
                )}
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-white/70">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-purple-300 hover:text-purple-200 transition-colors">
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
          ) : (
            <form className="space-y-6" onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}>
              <div className="space-y-2">
                <label htmlFor={loginMode === 'emailOtp' ? 'email-login' : 'phone-login'} className="block text-sm font-semibold text-white/90">
                  {loginMode === 'emailOtp' ? 'Email' : 'Mobile number'}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {loginMode === 'emailOtp' ? (
                      <FaEnvelope className="h-5 w-5 text-white group-focus-within:text-purple-200 transition-colors drop-shadow-lg" />
                    ) : (
                      <FaPhone className="h-5 w-5 text-white group-focus-within:text-purple-200 transition-colors drop-shadow-lg" />
                    )}
                  </div>
                  <input
                    id={loginMode === 'emailOtp' ? 'email-login' : 'phone-login'}
                    name={loginMode === 'emailOtp' ? 'email' : 'phone'}
                    type={loginMode === 'emailOtp' ? 'email' : 'tel'}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder={loginMode === 'emailOtp' ? 'Enter your email' : 'Enter your mobile number'}
                    value={loginMode === 'emailOtp' ? email : phone}
                    onChange={(e) => loginMode === 'emailOtp' ? setEmail(e.target.value) : setPhone(e.target.value)}
                    disabled={otpRequested}
                  />
                </div>
              </div>

              {otpRequested && (
                <div className="space-y-2">
                  <label htmlFor="otp" className="block text-sm font-semibold text-white/90">
                    Verification OTP
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      {otpRequested ? 'Verifying...' : 'Sending OTP...'}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <FaArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      {otpRequested ? 'Verify OTP & Sign in' : 'Send OTP'}
                    </div>
                  )}
                </button>

                {otpRequested && (
                  <button
                    type="button"
                    onClick={() => setOtpRequested(false)}
                    className="w-full py-2 text-sm text-white/80 hover:text-white transition-colors"
                  >
                    Change {loginMode === 'emailOtp' ? 'email' : 'mobile'}
                  </button>
                )}
              </div>
            </form>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-white/50">
            By signing in, you agree to our{' '}
            <button type="button" className="text-purple-300 hover:text-purple-200 transition-colors">Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-purple-300 hover:text-purple-200 transition-colors">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
