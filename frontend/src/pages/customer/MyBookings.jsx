import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerAPI } from '../../services/api';
import { Plane, Calendar, Clock, MapPin, CreditCard, Filter } from 'lucide-react';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    try {
      const response = await customerAPI.getBookingHistory();
      setBookings(response.data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'CONFIRMED': 'badge-success',
      'COMPLETED': 'badge-info',
      'CANCELLED': 'badge-danger',
      'REFUNDED': 'badge-warning',
      'PENDING': 'badge-warning'
    };
    return badges[status] || 'badge-info';
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return new Date(b.dep_time) > new Date() && b.booking_status === 'CONFIRMED';
    if (filter === 'completed') return b.booking_status === 'COMPLETED';
    if (filter === 'cancelled') return b.booking_status === 'CANCELLED' || b.booking_status === 'REFUNDED';
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">View and manage your flight bookings</p>
        </div>
        <Link to="/search" className="btn-primary mt-4 md:mt-0">Book New Flight</Link>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <Filter className="h-5 w-5 text-gray-400" />
        {['all', 'upcoming', 'completed', 'cancelled'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Link key={booking.booking_id} to={`/bookings/${booking.booking_id}`} className="card-hover block">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-100 p-3 rounded-lg">
                    <Plane className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <p className="font-semibold text-gray-900">{booking.flight_code}</p>
                      <span className={getStatusBadge(booking.booking_status)}>{booking.booking_status}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.origin} → {booking.destination}</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(booking.dep_time)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(booking.dep_time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 lg:mt-0 lg:text-right">
                  <p className="text-2xl font-bold text-gray-900">₹{booking.total_cost.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{booking.seats_booked} seat{booking.seats_booked > 1 ? 's' : ''} • {booking.booking_class}</p>
                  <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1 lg:justify-end">
                    <CreditCard className="h-4 w-4" />
                    <span>{booking.payment_method || 'Pending'}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Plane className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
          <p className="text-gray-600 mb-4">{filter === 'all' ? "You haven't made any bookings yet" : `No ${filter} bookings`}</p>
          <Link to="/search" className="btn-primary">Search Flights</Link>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
