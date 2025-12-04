import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Plane,
  Ticket,
  Gift,
  User,
  Settings,
  BarChart3,
  DollarSign,
  Users,
  TrendingUp
} from 'lucide-react';

const Sidebar = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const customerLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/search', icon: Plane, label: 'Search Flights' },
    { to: '/bookings', icon: Ticket, label: 'My Bookings' },
    { to: '/loyalty', icon: Gift, label: 'Loyalty Program' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/flights', icon: Plane, label: 'Flight Management' },
    { to: '/admin/pricing', icon: DollarSign, label: 'Dynamic Pricing' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/customers', icon: Users, label: 'Customers' },
  ];

  const links = isAdmin ? adminLinks : customerLinks;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 text-white">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-800">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">FlightSync</span>
          </Link>
        </div>

        {/* User Type Badge */}
        <div className="px-4 py-3">
          <span className={`badge ${isAdmin ? 'bg-purple-600' : 'bg-primary-600'} text-white px-3 py-1`}>
            {isAdmin ? '👑 Admin Panel' : '✈️ Customer Portal'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <link.icon className="h-5 w-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 text-gray-400">
            <TrendingUp className="h-5 w-5" />
            <div className="text-sm">
              <p className="font-medium text-white">FlightSync v1.0</p>
              <p className="text-xs">Dynamic Pricing System</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
