import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerAPI, bookingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Plane, Ticket, Gift, TrendingUp, Calendar, 
  ArrowRight, Star, Clock, MapPin
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, bookingsRes] = await Promise.all([
        customerAPI.getDashboard(),
        bookingAPI.getUpcoming()
      ]);
      setDashboard(dashRes.data);
      setUpcomingBookings(bookingsRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      'Bronze': 'from-amber-600 to-amber-800',
      'Silver': 'from-gray-400 to-gray-600',
      'Gold': 'from-yellow-400 to-yellow-600',
      'Platinum': 'from-purple-400 to-purple-600'
    };
    return colors[tier] || colors['Bronze'];
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fname}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your account</p>
        </div>
        <Link to="/search" className="btn-primary mt-4 md:mt-0 flex items-center space-x-2">
          <Plane className="h-5 w-5" />
          <span>Book a Flight</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Loyalty Card */}
        <div className={`rounded-xl p-6 text-white bg-gradient-to-br ${getTierColor(dashboard?.loyalty_tier)}`}>
          <div className="flex items-center justify-between mb-4">
            <Gift className="h-8 w-8 opacity-80" />
            <span className="text-sm font-medium opacity-80">{dashboard?.loyalty_tier} Member</span>
          </div>
          <p className="text-3xl font-bold">{dashboard?.loyalty_points?.toLocaleString() || 0}</p>
          <p className="text-sm opacity-80">Loyalty Points</p>
        </div>

        {/* Total Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Ticket className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboard?.total_bookings || 0}</p>
          <p className="text-sm text-gray-600">Bookings Made</p>
        </div>

        {/* Upcoming Flights */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Upcoming</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboard?.upcoming_flights || 0}</p>
          <p className="text-sm text-gray-600">Scheduled Flights</p>
        </div>

        {/* Total Spent */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Lifetime</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{(dashboard?.total_spent || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Amount Spent</p>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Flights</h2>
          <Link to="/bookings" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.slice(0, 3).map((booking) => (
              <Link 
                key={booking.booking_id}
                to={`/bookings/${booking.booking_id}`}
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary-100 p-2 rounded-lg">
                      <Plane className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{booking.flight_code}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span>{booking.origin} → {booking.destination}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatDate(booking.departure)}</p>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(booking.departure)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Plane className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No upcoming flights</p>
            <Link to="/search" className="btn-primary mt-4 inline-block">
              Book Your Next Trip
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/search" className="card-hover flex items-center space-x-4">
          <div className="bg-primary-100 p-3 rounded-lg">
            <Plane className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Search Flights</p>
            <p className="text-sm text-gray-600">Find your next destination</p>
          </div>
        </Link>

        <Link to="/loyalty" className="card-hover flex items-center space-x-4">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <Gift className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Loyalty Program</p>
            <p className="text-sm text-gray-600">View & redeem points</p>
          </div>
        </Link>

        <Link to="/profile" className="card-hover flex items-center space-x-4">
          <div className="bg-green-100 p-3 rounded-lg">
            <Star className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">My Profile</p>
            <p className="text-sm text-gray-600">Update your details</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
