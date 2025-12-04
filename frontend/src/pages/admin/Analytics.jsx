import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, TrendingUp, Users, ShoppingCart } from 'lucide-react';

const Analytics = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [revenue, setRevenue] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDateRange({ start: thirtyDaysAgo, end: today });
    loadData(thirtyDaysAgo, today);
  }, []);

  const loadData = async (start, end) => {
    setLoading(true);
    try {
      const [revenueRes, routesRes, paymentsRes, cartsRes] = await Promise.all([
        adminAPI.getRevenueAnalytics(start, end),
        adminAPI.getRoutePerformance(),
        adminAPI.getPaymentAnalytics(30),
        adminAPI.getAbandonedCarts(48)
      ]);
      setRevenue(revenueRes.data || []);
      setRoutes(routesRes.data || []);
      setPayments(paymentsRes.data || []);
      setAbandonedCarts(cartsRes.data || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    if (dateRange.start && dateRange.end) loadData(dateRange.start, dateRange.end);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  const paymentMethodData = payments.reduce((acc, p) => {
    const existing = acc.find(x => x.name === p.payment_method);
    if (existing) existing.value += p.transaction_count;
    else acc.push({ name: p.payment_method || 'Unknown', value: p.transaction_count || 0 });
    return acc;
  }, []);

  const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0);
  const totalBookings = revenue.reduce((sum, r) => sum + parseInt(r.total_bookings || 0), 0);
  const totalCancellations = revenue.reduce((sum, r) => sum + parseInt(r.cancellation_count || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive business insights</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <input type="date" className="input-field" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
          <span className="text-gray-500">to</span>
          <input type="date" className="input-field" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
          <button onClick={handleDateChange} className="btn-primary">Apply</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-lg"><TrendingUp className="h-6 w-6 text-green-600" /></div>
            <div><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p><p className="text-sm text-gray-500">Total Revenue</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-lg"><Calendar className="h-6 w-6 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{totalBookings}</p><p className="text-sm text-gray-500">Total Bookings</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-lg"><ShoppingCart className="h-6 w-6 text-red-600" /></div>
            <div><p className="text-2xl font-bold">{totalCancellations}</p><p className="text-sm text-gray-500">Cancellations</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-100 p-3 rounded-lg"><Users className="h-6 w-6 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold">{abandonedCarts.length}</p><p className="text-sm text-gray-500">Abandoned Carts</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Trend</h3>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenue}>
                <XAxis dataKey="report_date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis />
                <Tooltip formatter={(v) => [`₹${parseFloat(v).toLocaleString()}`, 'Revenue']} labelFormatter={(l) => new Date(l).toLocaleDateString()} />
                <Line type="monotone" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-12">No revenue data available</p>}
        </div>

        {/* Bookings vs Cancellations */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings vs Cancellations</h3>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue.slice(-14)}>
                <XAxis dataKey="report_date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric' })} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_bookings" name="Bookings" fill="#3b82f6" />
                <Bar dataKey="cancellation_count" name="Cancellations" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-12">No booking data available</p>}
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods Distribution</h3>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {paymentMethodData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-12">No payment data available</p>}
        </div>

        {/* Route Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Performance</h3>
          {routes.length > 0 ? (
            <div className="space-y-3">
              {routes.slice(0, 6).map((route, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}>{i + 1}</div>
                    <div>
                      <p className="font-medium text-gray-900">{route.route}</p>
                      <p className="text-sm text-gray-500">{route.total_flights} flights • {route.total_bookings} bookings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{parseFloat(route.total_revenue || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{route.avg_occupancy?.toFixed(1)}% avg occupancy</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-center py-12">No route data available</p>}
        </div>
      </div>

      {/* Abandoned Carts */}
      {abandonedCarts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Abandoned Carts (Last 48 hours)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Flight</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Route</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {abandonedCarts.slice(0, 10).map((cart, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{cart.customer_name}</td>
                    <td className="px-4 py-3 font-medium">{cart.flight_code}</td>
                    <td className="px-4 py-3">{cart.origin} → {cart.destination}</td>
                    <td className="px-4 py-3 font-semibold text-primary-600">₹{cart.total_cost?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(cart.booking_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
