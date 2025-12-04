import React, { useState, useEffect } from 'react';
import { customerAPI } from '../../services/api';
import { Gift, TrendingUp, TrendingDown, Award, Star, ArrowRight } from 'lucide-react';

const Loyalty = () => {
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemData, setRedeemData] = useState({ points: '', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dashRes, histRes] = await Promise.all([
        customerAPI.getDashboard(),
        customerAPI.getLoyaltyHistory(30)
      ]);
      setDashboard(dashRes.data);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error('Failed to load loyalty data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!redeemData.points || !redeemData.description) return;
    setRedeeming(true);
    try {
      const response = await customerAPI.redeemPoints(redeemData);
      alert(response.data.message);
      setRedeemData({ points: '', description: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  const getTierInfo = (tier) => {
    const tiers = {
      'Bronze': { color: 'from-amber-600 to-amber-800', next: 'Silver', pointsNeeded: 2000, icon: '🥉' },
      'Silver': { color: 'from-gray-400 to-gray-600', next: 'Gold', pointsNeeded: 5000, icon: '🥈' },
      'Gold': { color: 'from-yellow-400 to-yellow-600', next: 'Platinum', pointsNeeded: 10000, icon: '🥇' },
      'Platinum': { color: 'from-purple-400 to-purple-600', next: null, pointsNeeded: null, icon: '👑' }
    };
    return tiers[tier] || tiers['Bronze'];
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  const tierInfo = getTierInfo(dashboard?.loyalty_tier);
  const progressToNext = tierInfo.pointsNeeded ? Math.min((dashboard?.loyalty_points / tierInfo.pointsNeeded) * 100, 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
        <p className="text-gray-600 mt-1">Earn points on every booking and unlock exclusive rewards</p>
      </div>

      {/* Tier Card */}
      <div className={`rounded-2xl p-8 text-white bg-gradient-to-br ${tierInfo.color}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">{tierInfo.icon}</span>
            <div>
              <p className="text-2xl font-bold">{dashboard?.loyalty_tier} Member</p>
              <p className="opacity-80">{dashboard?.customer_name}</p>
            </div>
          </div>
          <Award className="h-12 w-12 opacity-50" />
        </div>
        <div className="text-center py-6">
          <p className="text-5xl font-bold">{dashboard?.loyalty_points?.toLocaleString() || 0}</p>
          <p className="text-lg opacity-80">Available Points</p>
        </div>
        {tierInfo.next && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to {tierInfo.next}</span>
              <span>{dashboard?.loyalty_points} / {tierInfo.pointsNeeded}</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${progressToNext}%` }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redeem Points */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Redeem Points</h3>
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Points to Redeem</label>
              <input type="number" className="input-field" placeholder="Enter points" value={redeemData.points} onChange={(e) => setRedeemData({...redeemData, points: e.target.value})} max={dashboard?.loyalty_points} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Redemption For</label>
              <select className="input-field" value={redeemData.description} onChange={(e) => setRedeemData({...redeemData, description: e.target.value})}>
                <option value="">Select option</option>
                <option value="Flight Discount">Flight Discount</option>
                <option value="Seat Upgrade">Seat Upgrade</option>
                <option value="Lounge Access">Lounge Access</option>
                <option value="Extra Baggage">Extra Baggage</option>
              </select>
            </div>
            <button type="submit" disabled={redeeming || !redeemData.points || !redeemData.description} className="w-full btn-primary disabled:opacity-50">{redeeming ? 'Processing...' : 'Redeem Points'}</button>
          </form>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">💡 <strong>Tip:</strong> 100 points = ₹100 discount</p>
          </div>
        </div>

        {/* How to Earn */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Earn Points</h3>
          <div className="space-y-4">
            {[
              { action: 'Book a Flight', points: '1 point per ₹100 spent', icon: '✈️' },
              { action: 'Write a Review', points: '25 bonus points', icon: '⭐' },
              { action: 'Birthday Bonus', points: '200 points', icon: '🎂' },
              { action: 'Refer a Friend', points: '500 points', icon: '👥' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.action}</span>
                </div>
                <span className="text-primary-600 font-semibold">{item.points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Points History</h3>
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((txn, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${txn.type === 'EARNED' || txn.type === 'BONUS' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {txn.type === 'EARNED' || txn.type === 'BONUS' ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{txn.description}</p>
                    <p className="text-sm text-gray-500">{new Date(txn.transaction_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-bold ${txn.type === 'EARNED' || txn.type === 'BONUS' ? 'text-green-600' : 'text-red-600'}`}>
                  {txn.type === 'EARNED' || txn.type === 'BONUS' ? '+' : '-'}{txn.points}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        )}
      </div>
    </div>
  );
};

export default Loyalty;
