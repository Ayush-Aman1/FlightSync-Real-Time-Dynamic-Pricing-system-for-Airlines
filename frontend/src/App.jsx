import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FlightSearch from './pages/FlightSearch';
import FlightDetails from './pages/FlightDetails';

import Dashboard from './pages/customer/Dashboard';
import MyBookings from './pages/customer/MyBookings';
import BookingDetails from './pages/customer/BookingDetails';
import Loyalty from './pages/customer/Loyalty';
import Profile from './pages/customer/Profile';

import AdminDashboard from './pages/admin/AdminDashboard';
import FlightManagement from './pages/admin/FlightManagement';
import PricingManagement from './pages/admin/PricingManagement';
import Analytics from './pages/admin/Analytics';
import CustomerManagement from './pages/admin/CustomerManagement';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <main className="p-6 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
};

const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

function AppRoutes() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/" element={
        <PublicLayout><Home /></PublicLayout>
      } />
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" /> : <PublicLayout><Login /></PublicLayout>
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" /> : <PublicLayout><Register /></PublicLayout>
      } />
      <Route path="/search" element={
        <PublicLayout><FlightSearch /></PublicLayout>
      } />
      <Route path="/flights/:id" element={
        <PublicLayout><FlightDetails /></PublicLayout>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AuthenticatedLayout>
            {isAdmin ? <AdminDashboard /> : <Dashboard />}
          </AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/bookings" element={
        <ProtectedRoute>
          <AuthenticatedLayout><MyBookings /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/bookings/:id" element={
        <ProtectedRoute>
          <AuthenticatedLayout><BookingDetails /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/loyalty" element={
        <ProtectedRoute>
          <AuthenticatedLayout><Loyalty /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <AuthenticatedLayout><Profile /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout><AdminDashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/flights" element={
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout><FlightManagement /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/pricing" element={
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout><PricingManagement /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout><Analytics /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/customers" element={
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout><CustomerManagement /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
