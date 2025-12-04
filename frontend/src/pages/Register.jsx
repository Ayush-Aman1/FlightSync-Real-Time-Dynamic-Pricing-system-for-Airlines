import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, Mail, Lock, User, Phone, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const result = await register({
      fname: formData.fname,
      lname: formData.lname,
      email: formData.email,
      phone: formData.phone,
      dob: formData.dob || null,
      password: formData.password
    });

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 py-12 px-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Plane className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold text-white">Create Account</h2>
          <p className="text-primary-200 mt-2">Join FlightSync and start booking smarter</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="fname"
                    className="input-field pl-10"
                    placeholder="John"
                    value={formData.fname}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Last Name</label>
                <input
                  type="text"
                  name="lname"
                  className="input-field"
                  placeholder="Doe"
                  value={formData.lname}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  className="input-field pl-10"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* DOB */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="dob"
                  className="input-field pl-10"
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    className="input-field pl-10"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="input-field"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="text-sm text-gray-500 space-y-1">
              <div className="flex items-center space-x-2">
                <CheckCircle className={`h-4 w-4 ${formData.password.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className={`h-4 w-4 ${formData.password === formData.confirmPassword && formData.password ? 'text-green-500' : 'text-gray-300'}`} />
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
