import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RegistrationData } from '../../types/auth';
import toast from 'react-hot-toast';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaSave, FaEdit, FaShieldAlt, FaArrowRight, FaArrowLeft, FaUsers } from 'react-icons/fa';
import api from '../../services/api';

const RegisterForm = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationData>({
    defaultValues: {
      accountType: 'FREE',
    }
  });

  const onSubmit = async (data: RegistrationData) => {
    setLoading(true);
    try {
      const myHeaders = new Headers();
      myHeaders.append("accept", "*/*");
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        "username": data.username,
        "password": data.password,
        "email": data.email,
        "firstName": data.firstName,
        "lastName": data.lastName,
        "phone": data.phone,
        "company": data.company || "",
        "role": data.role || "",
        "department": data.department || "subscribed",
        "accountType": data.accountType || "FREE",
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw
      };

      const response = await fetch(process.env.REACT_APP_API_URL+"/api/auth/register", requestOptions);
      const result = await response.text();
      
      if (response.ok) {
        const newUser = JSON.parse(result);
      try {
        await api.post(`/api/mobile-apps${newUser.id}`,{"appNameId": newUser.username, "userId": newUser.id});
        await api.put(`/api/auth/admin/users/${newUser.id}/verify`);
        console.log('User auto-verified after registration');
      } catch (verifyError: any) {
        console.warn('Auto-verification failed:', verifyError);
        // Don't fail registration if verification fails
      }
        toast.success('Registration successful! Welcome to FileVault.');
        navigate('/studio/dashboard');
      } else {
        toast.error('Registration failed: ' + result);
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

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
            <FaUsers className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            Join FileVault
          </h1>
          <p className="text-xl text-white/80 font-medium">
            Create your secure account
          </p>
          <p className="text-sm text-white/60 mt-2">
            Step {step} of 2
          </p>
        </div>

        {/* Registration Form */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white/90 mb-6">Personal Information</h3>
                
                {/* Username Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-white/60 group-focus-within:text-purple-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      {...register('username', { 
                        required: 'Username is required',
                        minLength: { value: 3, message: 'Username must be at least 3 characters' }
                      })}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your username"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                  </div>
                  {errors.username && <p className="text-sm text-red-300">{errors.username.message}</p>}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaEnvelope className="h-5 w-5 text-white/60 group-focus-within:text-purple-400 transition-colors" />
                    </div>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email' }
                      })}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your email"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                  </div>
                  {errors.email && <p className="text-sm text-red-300">{errors.email.message}</p>}
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/90">First Name</label>
                    <input
                      type="text"
                      {...register('firstName', { required: 'First name is required' })}
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="First name"
                    />
                    {errors.firstName && <p className="text-sm text-red-300">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/90">Last Name</label>
                    <input
                      type="text"
                      {...register('lastName', { required: 'Last name is required' })}
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Last name"
                    />
                    {errors.lastName && <p className="text-sm text-red-300">{errors.lastName.message}</p>}
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Phone</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaPhone className="h-5 w-5 text-white/60 group-focus-within:text-purple-400 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      {...register('phone', { required: 'Phone is required' })}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your phone number"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                  </div>
                  {errors.phone && <p className="text-sm text-red-300">{errors.phone.message}</p>}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaShieldAlt className="h-5 w-5 text-white/60 group-focus-within:text-purple-400 transition-colors" />
                    </div>
                    <input
                      type="password"
                      {...register('password', { 
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' }
                      })}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your password"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                  </div>
                  {errors.password && <p className="text-sm text-red-300">{errors.password.message}</p>}
                </div>

                {/* Next Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="group relative w-full flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    <div className="flex items-center">
                      <FaArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      Next
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white/90 mb-6">Business Information</h3>
                
                {/* Company Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Company (Optional)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaBuilding className="h-5 w-5 text-white/60 group-focus-within:text-purple-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      {...register('company')}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your company name"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                  </div>
                </div>

                {/* Role Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Role (Optional)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-white/60 group-focus-within:text-purple-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      {...register('role')}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your role"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                  </div>
                </div>

                {/* Department Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Department (Optional)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaBuilding className="h-5 w-5 text-white/60 group-focus-within:text-purple-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      {...register('department')}
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter your department"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 group flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-white/10 border border-white/20 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 backdrop-blur-sm"
                  >
                    <div className="flex items-center">
                      <FaArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      Previous
                    </div>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 group flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <FaSave className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                        Create Account
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-white/70">
            Already have an account?{' '}
            <a href="/login" className="font-semibold text-purple-300 hover:text-purple-200 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
