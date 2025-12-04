import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plane, Users, TrendingUp, DollarSign, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

const AdminDashboard = () => {
  const [revenue, setRevenue] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [revenueRes, routesRes, paymentsRes] = await Promise.all([
        adminAPI.getRevenueAnalytics(thirtyDaysAgo, today),
        adminAPI.getRouteAnalytics(5),
        adminAPI.getPaymentAnalytics(7)
      ]);
      
      setRevenue(revenueRes.data || []);
      setRoutes(routesRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const response = await adminAPI.refreshAllPrices();
      alert(`Prices refreshed! ${response.data.updated_count} flights updated.`);
    } catch (err) {
      alert('Failed to refresh prices');
    } finally {
      setRefreshing(false);
    }
  };

  const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0);
  const totalBookings = revenue.reduce((sum, r) => sum + parseInt(r.total_bookings || 0), 0);
  const totalSeats = revenue.reduce((sum, r) => sum + parseInt(r.total_seats || 0), 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of FlightSync operations</p>
        </div>
        <button onClick={handleRefreshPrices} disabled={refreshing} className="btn-primary flex items-center space-x-2 disabled:opacity-50">
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh All Prices'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg"><DollarSign className="h-6 w-6 text-green-600" /></div>
            <span className="text-sm text-gray-500">30 Days</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg"><Plane className="h-6 w-6 text-blue-600" /></div>
            <span className="text-sm text-gray-500">30 Days</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalBookings}</p>
          <p className="text-sm text-gray-600">Total Bookings</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg"><Users className="h-6 w-6 text-purple-600" /></div>
            <span className="text-sm text-gray-500">30 Days</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalSeats}</p>
          <p className="text-sm text-gray-600">Seats Sold</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg"><TrendingUp className="h-6 w-6 text-yellow-600" /></div>
            <span className="text-sm text-gray-500">Average</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{totalBookings ? Math.round(totalRevenue / totalBookings).toLocaleString() : 0}</p>
          <p className="text-sm text-gray-600">Per Booking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <Link to="/admin/analytics" className="text-primary-600 text-sm flex items-center space-x-1"><span>View Details</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenue.slice(-14)}>
                <XAxis dataKey="report_date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis />
                <Tooltip formatter={(v) => [`₹${parseFloat(v).toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-12">No data available</p>}
        </div>

        {/* Top Routes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Routes by Revenue</h3>
            <Link to="/admin/analytics" className="text-primary-600 text-sm flex items-center space-x-1"><span>View All</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
          {routes.length > 0 ? (
            <div className="space-y-4">
              {routes.map((route, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: COLORS[i % COLORS.length] }}>{i + 1}</div>
                    <div>
                      <p className="font-medium text-gray-900">{route.route}</p>
                      <p className="text-sm text-gray-500">{route.total_bookings} bookings</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">₹{parseFloat(route.total_revenue || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-center py-12">No data available</p>}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/flights" className="card-hover flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-lg"><Plane className="h-6 w-6 text-blue-600" /></div>
          <div><p className="font-semibold text-gray-900">Flight Management</p><p className="text-sm text-gray-600">View and manage flights</p></div>
        </Link>
        <Link to="/admin/pricing" className="card-hover flex items-center space-x-4">
          <div className="bg-green-100 p-3 rounded-lg"><TrendingUp className="h-6 w-6 text-green-600" /></div>
          <div><p className="font-semibold text-gray-900">Dynamic Pricing</p><p className="text-sm text-gray-600">Manage pricing rules</p></div>
        </Link>
        <Link to="/admin/customers" className="card-hover flex items-center space-x-4">
          <div className="bg-purple-100 p-3 rounded-lg"><Users className="h-6 w-6 text-purple-600" /></div>
          <div><p className="font-semibold text-gray-900">Customers</p><p className="text-sm text-gray-600">View customer analytics</p></div>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
