import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FaLock, FaShieldAlt, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenFromUrl.trim()) {
      toast.error('Invalid or missing reset link. Please use the link from your email.');
      return;
    }
    if (!newPassword.trim()) {
      toast.error('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        token: tokenFromUrl.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccess(true);
      toast.success('Your password has been reset. You can sign in with your new password.');
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error as Error)?.message ||
        'Failed to reset password. The link may have expired.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!tokenFromUrl.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
            <FaShieldAlt className="mx-auto h-16 w-16 text-white/80 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid reset link</h1>
            <p className="text-white/80 mb-6">
              This page requires a valid reset link. Please use the link sent to your email, or request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 font-semibold text-purple-300 hover:text-purple-200"
            >
              Request new link
            </Link>
            <span className="text-white/50 mx-2">·</span>
            <Link to="/login" className="inline-flex items-center gap-2 font-semibold text-purple-300 hover:text-purple-200">
              <FaArrowLeft /> Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-green-500/30 mb-6">
              <FaShieldAlt className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password reset</h1>
            <p className="text-white/80 mb-6">You can now sign in with your new password.</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <FaArrowLeft /> Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl mb-6">
            <FaShieldAlt className="h-10 w-10 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            Reset Password
          </h1>
          <p className="text-white/80">Enter your new password below.</p>
        </div>

        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-3xl" />
          <div className="relative z-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-white/90">
                  New password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-white group-focus-within:text-purple-200 transition-colors" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
                    placeholder="Enter new password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white/90">
                  Confirm new password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-white group-focus-within:text-purple-200 transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/30 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                    Resetting...
                  </div>
                ) : (
                  'Reset password'
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 hover:text-purple-200 transition-colors"
                >
                  <FaArrowLeft /> Back to Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
