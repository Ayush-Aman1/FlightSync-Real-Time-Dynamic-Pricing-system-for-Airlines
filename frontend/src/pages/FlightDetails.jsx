import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { flightAPI, bookingAPI, reviewAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Plane,
  Clock,
  Users,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ThumbsUp,
  User,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const FlightDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [flight, setFlight] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [reviews, setReviews] = useState({ summary: null, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingData, setBookingData] = useState({
    seats: 1,
    booking_class: "ECONOMY",
  });
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    loadFlightData();
  }, [id]);

  const loadFlightData = async () => {
    try {
      setLoading(true);
      const [flightRes, priceRes, reviewRes] = await Promise.all([
        flightAPI.getDetails(id),
        flightAPI.getPriceHistory(id, 7).catch(() => ({ data: [] })),
        reviewAPI
          .getFlightReviews(id)
          .catch(() => ({ data: { summary: null, reviews: [] } })),
      ]);
      setFlight(flightRes.data);
      setPriceHistory(priceRes.data || []);
      setReviews(reviewRes.data);
    } catch (err) {
      setError("Failed to load flight details");
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setBooking(true);
    setError("");
    try {
      const response = await bookingAPI.create({
        flight_id: parseInt(id),
        seats_booked: bookingData.seats,
        booking_class: bookingData.booking_class,
      });
      setBookingSuccess(response.data.booking);
    } catch (err) {
      setError(err.response?.data?.error || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  // --- REPLACE THESE FUNCTIONS ---

  const getClassMultiplier = (cls) =>
    ({ ECONOMY: 1, PREMIUM_ECONOMY: 1.5, BUSINESS: 2.5, FIRST: 4 }[cls] || 1);

  const calculateTotal = () =>
    flight
      ? flight.current_price *
        bookingData.seats *
        getClassMultiplier(bookingData.booking_class)
      : 0;

  // SAFE DATE FORMATTERS
  const formatTime = (dateStr) => {
    if (!dateStr) return "--:--";
    try {
      return new Date(dateStr).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      console.error("Invalid time:", dateStr);
      return "--:--";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Date Unavailable";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      console.error("Invalid date:", dateStr);
      return "Date Unavailable";
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  if (!flight)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Flight Not Found</h2>
          <button
            onClick={() => navigate("/search")}
            className="btn-primary mt-4"
          >
            Back to Search
          </button>
        </div>
      </div>
    );

  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 mb-6">
            Your flight has been booked successfully.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Booking ID</span>
              <span className="font-semibold">
                #{bookingSuccess.booking_id}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Flight</span>
              <span className="font-semibold">{flight.flight_code}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Seats</span>
              <span className="font-semibold">
                {bookingSuccess.seats_booked}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-bold text-primary-600">
                ₹{bookingSuccess.total_cost.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(`/bookings/${bookingSuccess.booking_id}`)}
              className="flex-1 btn-primary"
            >
              View Booking
            </button>
            <button
              onClick={() => navigate("/bookings")}
              className="flex-1 btn-secondary"
            >
              My Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="card mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <div className="bg-primary-100 p-3 rounded-xl">
                <Plane className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {flight.flight_code}
                </h1>
                <p className="text-gray-600">
                  {flight.aircraft_model || "Standard Aircraft"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Starting from</p>
              <p className="text-3xl font-bold text-primary-600">
                ₹{flight.current_price.toLocaleString()}
              </p>
              <div
                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  flight.pricing_tier === "DISCOUNTED"
                    ? "bg-green-100 text-green-800"
                    : flight.pricing_tier === "PREMIUM"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                <span>
                  {flight.pricing_tier?.replace("_", " ") || "NORMAL"}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {formatTime(flight.dep_time)}
              </p>
              <p className="text-lg font-medium text-gray-700">
                {flight.origin}
              </p>
              <p className="text-sm text-gray-500">
                {formatDate(flight.dep_time)}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center w-full">
                <div className="h-px bg-gray-300 flex-1"></div>
                <div className="mx-4 flex items-center space-x-2 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>
                    {Math.round(flight.duration_hours)}h{" "}
                    {Math.round((flight.duration_hours % 1) * 60)}m
                  </span>
                </div>
                <div className="h-px bg-gray-300 flex-1"></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Direct Flight</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {formatTime(flight.arr_time)}
              </p>
              <p className="text-lg font-medium text-gray-700">
                {flight.destination}
              </p>
              <p className="text-sm text-gray-500">
                {formatDate(flight.arr_time)}
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="h-5 w-5" />
                <span>{flight.available_seats} seats available</span>
              </div>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${flight.occupancy_percentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500">
                {flight.occupancy_percentage}% booked
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Price History (Last 7 Days)
              </h3>
              {priceHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={priceHistory}>
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(val) =>
                        new Date(val).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      }
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        `₹${value.toLocaleString()}`,
                        "Price",
                      ]}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleString()
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="current_price"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No price history available
                </p>
              )}
            </div>
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                {reviews.summary && (
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="font-semibold">
                      {/* SAFE FIX: Convert to Number() first */}
                      {reviews.summary.avg_rating
                        ? Number(reviews.summary.avg_rating).toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-gray-500">
                      ({reviews.summary.total_reviews} reviews)
                    </span>
                  </div>
                )}
              </div>
              {reviews.reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.reviews.slice(0, 3).map((review) => (
                    <div
                      key={review.review_id}
                      className="border-b border-gray-100 pb-4 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="bg-gray-100 p-2 rounded-full">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {review.customer_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.title && (
                        <p className="font-medium text-gray-900">
                          {review.title}
                        </p>
                      )}
                      {review.comment && (
                        <p className="text-gray-600 text-sm mt-1">
                          {review.comment}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>
                          {new Date(review.review_date).toLocaleDateString()}
                        </span>
                        <button className="flex items-center space-x-1 hover:text-primary-600">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{review.helpful_count} helpful</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No reviews yet</p>
              )}
            </div>
          </div>

          <div>
            <div className="card sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Book This Flight
              </h3>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Passengers
                  </label>
                  <select
                    className="input-field"
                    value={bookingData.seats}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        seats: parseInt(e.target.value),
                      })
                    }
                  >
                    {[...Array(Math.min(9, flight.available_seats))].map(
                      (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} Passenger{i > 0 ? "s" : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Class
                  </label>
                  <select
                    className="input-field"
                    value={bookingData.booking_class}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        booking_class: e.target.value,
                      })
                    }
                  >
                    <option value="ECONOMY">Economy (1x)</option>
                    <option value="PREMIUM_ECONOMY">
                      Premium Economy (1.5x)
                    </option>
                    <option value="BUSINESS">Business (2.5x)</option>
                    <option value="FIRST">First Class (4x)</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Base fare × {bookingData.seats}</span>
                    <span>
                      ₹
                      {(
                        flight.current_price * bookingData.seats
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Class multiplier</span>
                    <span>
                      ×{getClassMultiplier(bookingData.booking_class)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-primary-600">
                      ₹{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleBooking}
                  disabled={booking || flight.available_seats === 0}
                  className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {booking
                    ? "Processing..."
                    : flight.available_seats === 0
                    ? "Sold Out"
                    : "Book Now"}
                </button>
                {!isAuthenticated && (
                  <p className="text-sm text-gray-500 text-center">
                    You'll need to login to complete booking
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightDetails;
