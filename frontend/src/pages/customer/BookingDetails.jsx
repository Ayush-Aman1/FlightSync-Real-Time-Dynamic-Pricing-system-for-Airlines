import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingAPI, paymentAPI, reviewAPI } from '../../services/api';
import { Plane, Calendar, Clock, MapPin, CreditCard, AlertCircle, CheckCircle, Star, X } from 'lucide-react';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [review, setReview] = useState({ rating: 5, title: '', comment: '' });

  useEffect(() => { loadBooking(); }, [id]);

  const loadBooking = async () => {
    try {
      const response = await bookingAPI.get(id);
      setBooking(response.data);
    } catch (err) {
      console.error('Failed to load booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await bookingAPI.cancel(id, 'Customer requested cancellation');
      loadBooking();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleReviewSubmit = async () => {
    try {
      await reviewAPI.submit({ flight_id: booking.flight_id, booking_id: parseInt(id), ...review });
      setShowReviewModal(false);
      alert('Review submitted! You earned 25 bonus points.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review');
    }
  };

  const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!booking) return <div className="card text-center py-12"><AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-semibold">Booking Not Found</h3><button onClick={() => navigate('/bookings')} className="btn-primary mt-4">Back to Bookings</button></div>;

  const canCancel = ['CONFIRMED', 'PENDING'].includes(booking.status) && new Date(booking.dep_time) > new Date();
  const canReview = booking.status === 'COMPLETED' || (booking.status === 'CONFIRMED' && new Date(booking.arr_time) < new Date());

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Booking #{booking.booking_id}</h1>
        <span className={`badge ${booking.status === 'CONFIRMED' ? 'badge-success' : booking.status === 'CANCELLED' ? 'badge-danger' : 'badge-info'}`}>{booking.status}</span>
      </div>

      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-primary-100 p-3 rounded-xl"><Plane className="h-8 w-8 text-primary-600" /></div>
          <div><h2 className="text-xl font-bold text-gray-900">{booking.flight_code}</h2><p className="text-gray-600">{booking.origin} → {booking.destination}</p></div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 border-y border-gray-200">
          <div><p className="text-sm text-gray-500 mb-1">Departure</p><p className="font-semibold">{formatDateTime(booking.dep_time)}</p></div>
          <div><p className="text-sm text-gray-500 mb-1">Arrival</p><p className="font-semibold">{formatDateTime(booking.arr_time)}</p></div>
          <div><p className="text-sm text-gray-500 mb-1">Seats</p><p className="font-semibold">{booking.seats_booked}</p></div>
          <div><p className="text-sm text-gray-500 mb-1">Class</p><p className="font-semibold">{booking.booking_class}</p></div>
        </div>

        <div className="pt-6">
          <div className="flex justify-between text-lg"><span className="text-gray-600">Total Amount</span><span className="font-bold text-primary-600">₹{booking.total_cost.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm text-gray-500 mt-2"><span>Payment Status</span><span className={booking.payment_status === 'SUCCESS' ? 'text-green-600' : 'text-yellow-600'}>{booking.payment_status || 'Pending'}</span></div>
        </div>
      </div>

      <div className="flex space-x-4">
        {canCancel && <button onClick={handleCancel} disabled={cancelling} className="flex-1 btn-danger">{cancelling ? 'Cancelling...' : 'Cancel Booking'}</button>}
        {canReview && <button onClick={() => setShowReviewModal(true)} className="flex-1 btn-secondary flex items-center justify-center space-x-2"><Star className="h-5 w-5" /><span>Write Review</span></button>}
        <button onClick={() => navigate('/bookings')} className="flex-1 btn-secondary">Back to Bookings</button>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Write a Review</h3>
              <button onClick={() => setShowReviewModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex space-x-2">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setReview({...review, rating: n})} className={`p-2 ${n <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}><Star className="h-6 w-6 fill-current" /></button>)}</div>
              </div>
              <div><label className="block text-sm font-medium mb-2">Title</label><input type="text" className="input-field" value={review.title} onChange={(e) => setReview({...review, title: e.target.value})} placeholder="Summarize your experience" /></div>
              <div><label className="block text-sm font-medium mb-2">Comment</label><textarea className="input-field h-24" value={review.comment} onChange={(e) => setReview({...review, comment: e.target.value})} placeholder="Share your experience..." /></div>
              <button onClick={handleReviewSubmit} className="w-full btn-primary">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetails;
