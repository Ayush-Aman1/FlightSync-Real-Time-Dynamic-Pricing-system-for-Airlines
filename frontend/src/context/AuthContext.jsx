import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, customerAPI } from '../services/api';

const AuthContext = createContext(null);

const ADMIN_EMAIL = 'admin@flightsync.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAdmin(userData.email === ADMIN_EMAIL);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, customer } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(customer));
      setUser(customer);
      setIsAdmin(email === ADMIN_EMAIL);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, customer } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(customer));
      setUser(customer);
      setIsAdmin(false);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAdmin(false);
  };

  const refreshUser = async () => {
    try {
      const response = await customerAPI.getProfile();
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      setIsAdmin(response.data.email === ADMIN_EMAIL);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin,
      login, 
      register, 
      logout,
      refreshUser,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
