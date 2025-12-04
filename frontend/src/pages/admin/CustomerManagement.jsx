import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Users, Gift, TrendingUp, Award } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CustomerManagement = () => {
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const response = await adminAPI.getLoyaltyAnalytics();
      setLoyalty(response.data);
    } catch (err) {
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = { 'Bronze': '#CD7F32', 'Silver': '#C0C0C0', 'Gold': '#FFD700', 'Platinum': '#E5E4E2' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  const tierData = loyalty?.tier_distribution?.map(t => ({ name: t.loyalty_tier, value: t.customer_count })) || [];
  const totalCustomers = tierData.reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <p className="text-gray-600 mt-1">Loyalty program analytics and customer insights</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{totalCustomers}</p><p className="text-sm text-gray-500">Total Customers</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-100 p-3 rounded-lg"><Gift className="h-6 w-6 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold">{loyalty?.summary?.total_points_issued?.toLocaleString() || 0}</p><p className="text-sm text-gray-500">Points Issued</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-lg"><TrendingUp className="h-6 w-6 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{loyalty?.summary?.total_points_redeemed?.toLocaleString() || 0}</p><p className="text-sm text-gray-500">Points Redeemed</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-3 rounded-lg"><Award className="h-6 w-6 text-purple-600" /></div>
            <div><p className="text-2xl font-bold">{loyalty?.summary?.total_points_outstanding?.toLocaleString() || 0}</p><p className="text-sm text-gray-500">Points Outstanding</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Tier Distribution</h3>
          {tierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={tierData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {tierData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#999'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-12">No tier data available</p>}
        </div>

        {/* Tier Details */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Breakdown</h3>
          <div className="space-y-4">
            {loyalty?.tier_distribution?.map((tier) => (
              <div key={tier.loyalty_tier} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[tier.loyalty_tier] }}></div>
                    <span className="font-semibold text-gray-900">{tier.loyalty_tier}</span>
                  </div>
                  <span className="text-lg font-bold">{tier.customer_count} customers</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Total Points:</span> <strong>{tier.total_points?.toLocaleString()}</strong></div>
                  <div><span className="text-gray-500">Avg Points:</span> <strong>{Math.round(tier.avg_points || 0).toLocaleString()}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Customers */}
      {loyalty?.top_customers?.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Loyalty Points</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Rank</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Tier</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loyalty.top_customers.map((customer, i) => (
                  <tr key={customer.cust_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">{i + 1}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{customer.fname} {customer.lname}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        customer.loyalty_tier === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                        customer.loyalty_tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                        customer.loyalty_tier === 'Silver' ? 'bg-gray-200 text-gray-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>{customer.loyalty_tier}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary-600">{customer.loyalty_pts?.toLocaleString()}</td>
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

export default CustomerManagement;
