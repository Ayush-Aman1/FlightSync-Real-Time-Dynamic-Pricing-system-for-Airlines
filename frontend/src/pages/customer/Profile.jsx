import React, { useState, useEffect } from 'react';
import { customerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Calendar, Save, CheckCircle } from 'lucide-react';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ fname: '', lname: '', phone: '', dob: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const response = await customerAPI.getProfile();
      setProfile(response.data);
      setFormData({
        fname: response.data.fname || '',
        lname: response.data.lname || '',
        phone: response.data.phone || '',
        dob: response.data.dob || ''
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await customerAPI.updateProfile(formData);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your personal information</p>
      </div>

      {/* Profile Header */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="bg-primary-100 p-4 rounded-full">
            <User className="h-12 w-12 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile?.fname} {profile?.lname}</h2>
            <p className="text-gray-600">{profile?.email}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
              profile?.loyalty_tier === 'Platinum' ? 'bg-purple-100 text-purple-800' :
              profile?.loyalty_tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
              profile?.loyalty_tier === 'Silver' ? 'bg-gray-200 text-gray-800' :
              'bg-amber-100 text-amber-800'
            }`}>{profile?.loyalty_tier} Member</span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit Profile</h3>
        
        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" className="input-field pl-10" value={formData.fname} onChange={(e) => setFormData({...formData, fname: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input type="text" className="input-field" value={formData.lname} onChange={(e) => setFormData({...formData, lname: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="email" className="input-field pl-10 bg-gray-50" value={profile?.email || ''} disabled />
            </div>
            <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="tel" className="input-field pl-10" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Enter phone number" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="date" className="input-field pl-10" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2 disabled:opacity-50">
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>
      </div>

      {/* Account Stats */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Member Since</p>
            <p className="text-lg font-semibold text-gray-900">{new Date(profile?.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Loyalty Points</p>
            <p className="text-lg font-semibold text-primary-600">{profile?.loyalty_pts?.toLocaleString() || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Wallet Balance</p>
            <p className="text-lg font-semibold text-green-600">₹{profile?.balance?.toLocaleString() || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Customer ID</p>
            <p className="text-lg font-semibold text-gray-900">#{profile?.cust_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
