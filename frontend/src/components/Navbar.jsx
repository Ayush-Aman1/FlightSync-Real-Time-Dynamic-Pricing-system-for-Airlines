import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, User, LogOut, Menu } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">FlightSync</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/search" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Search Flights
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/bookings" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                  My Bookings
                </Link>
                <Link to="/loyalty" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                  Loyalty
                </Link>
              </>
            ) : null}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="flex items-center space-x-2 text-gray-700 hover:text-primary-600">
                  <div className="bg-primary-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className="hidden md:inline font-medium">{user?.fname}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-600 hover:text-primary-600 font-medium">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
