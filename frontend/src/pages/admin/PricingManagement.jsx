import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import { TrendingUp, RefreshCw, Zap, Info, DollarSign } from 'lucide-react';

const PricingManagement = () => {
  const [flightId, setFlightId] = useState('');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);

  const handleGetInsights = async () => {
    if (!flightId) return;
    setLoading(true);
    try {
      const response = await adminAPI.getPricingInsights(flightId);
      setInsights(response.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to get insights');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrice = async () => {
    if (!flightId) return;
    setRefreshing(true);
    try {
      const response = await adminAPI.refreshPrice(flightId);
      setRefreshResult(response.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to refresh price');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const response = await adminAPI.refreshAllPrices();
      alert(`Successfully refreshed ${response.data.updated_count} flights!`);
    } catch (err) {
      alert('Failed to refresh all prices');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing Management</h1>
          <p className="text-gray-600 mt-1">Control and monitor the pricing engine</p>
        </div>
        <button onClick={handleRefreshAll} disabled={refreshing} className="btn-primary flex items-center space-x-2">
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh All Prices</span>
        </button>
      </div>

      {/* Pricing Algorithm Info */}
      <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <div className="flex items-start space-x-4">
          <Info className="h-6 w-6 text-primary-600 mt-1" />
          <div>
            <h3 className="font-semibold text-primary-900">Dynamic Pricing Algorithm</h3>
            <p className="text-primary-700 mt-1">Prices are calculated using: <strong>Base Price × Surge Multiplier</strong></p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="bg-white/50 p-2 rounded"><span className="text-primary-600">&lt;30%</span><br/>0.85x (Discount)</div>
              <div className="bg-white/50 p-2 rounded"><span className="text-primary-600">30-50%</span><br/>1.00x (Normal)</div>
              <div className="bg-white/50 p-2 rounded"><span className="text-primary-600">50-70%</span><br/>1.25x (Moderate)</div>
              <div className="bg-white/50 p-2 rounded"><span className="text-primary-600">70-85%</span><br/>1.50x (High)</div>
              <div className="bg-white/50 p-2 rounded"><span className="text-primary-600">&gt;85%</span><br/>2.00x+ (Premium)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Flight Pricing */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Price Refresh</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Flight ID</label>
              <input type="number" className="input-field" placeholder="Enter flight ID (e.g., 1)" value={flightId} onChange={(e) => setFlightId(e.target.value)} />
            </div>
            <div className="flex space-x-3">
              <button onClick={handleRefreshPrice} disabled={!flightId || refreshing} className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50">
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Price</span>
              </button>
              <button onClick={handleGetInsights} disabled={!flightId || loading} className="flex-1 btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50">
                <Zap className="h-5 w-5" />
                <span>Get AI Insights</span>
              </button>
            </div>
          </div>

          {refreshResult && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Price Updated!</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Flight:</span> <strong>{refreshResult.flight_code}</strong></div>
                <div><span className="text-gray-600">Old Price:</span> <strong>₹{refreshResult.old_price?.toLocaleString()}</strong></div>
                <div><span className="text-gray-600">New Price:</span> <strong className="text-green-600">₹{refreshResult.new_price?.toLocaleString()}</strong></div>
                <div><span className="text-gray-600">Surge:</span> <strong>{refreshResult.new_surge}x</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Pricing Insights</h3>
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : insights ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Flight</p>
                <p className="font-semibold">{insights.flight_code} - {insights.route?.origin} → {insights.route?.destination}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Optimal Price</p>
                  <p className="text-xl font-bold text-blue-800">₹{insights.predictions?.optimal_price?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Expected Demand</p>
                  <p className="text-xl font-bold text-green-800">{insights.predictions?.expected_demand} seats</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">Recommended Surge</p>
                  <p className="text-xl font-bold text-yellow-800">{insights.predictions?.recommended_surge}x</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Sell-out Probability</p>
                  <p className="text-xl font-bold text-purple-800">{(insights.predictions?.sell_out_probability * 100).toFixed(0)}%</p>
                </div>
              </div>
              {insights.recommendations?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-900 mb-2">Recommendations</p>
                  {insights.recommendations.map((rec, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg mb-2">
                      <p className="font-medium text-gray-900">{rec.action}</p>
                      <p className="text-sm text-gray-600">{rec.reason}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${rec.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{rec.priority} priority</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Enter a flight ID and click "Get AI Insights"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingManagement;
