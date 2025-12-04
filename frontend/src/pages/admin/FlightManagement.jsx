import React, { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import {
  Plane,
  Plus,
  X,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  Trash2,
  RefreshCw,
} from "lucide-react";

const FlightManagement = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [newFlight, setNewFlight] = useState({
    flight_code: "",
    origin: "",
    destination: "",
    dep_time: "",
    arr_time: "",
    aircraft_no: "",
    base_price: "",
    total_seats: "",
  });

  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadFlights();
  }, []);

  const loadFlights = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllFlights();
      setFlights(response.data || []);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load flights" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlight = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await adminAPI.addFlight(newFlight);
      setMessage({
        type: "success",
        text: `Flight ${response.data.flight_code} added successfully!`,
      });
      setShowAddModal(false);
      setNewFlight({
        flight_code: "",
        origin: "",
        destination: "",
        dep_time: "",
        arr_time: "",
        aircraft_no: "",
        base_price: "",
        total_seats: "",
      });
      loadFlights();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to add flight",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelFlight = async () => {
    if (!selectedFlight || !cancelReason) return;
    setActionLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await adminAPI.cancelFlight(selectedFlight.flight_id, cancelReason);
      setMessage({
        type: "success",
        text: `Flight ${selectedFlight.flight_code} cancelled successfully!`,
      });
      setShowCancelModal(false);
      setSelectedFlight(null);
      setCancelReason("");
      loadFlights();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to cancel flight",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      SCHEDULED: "bg-blue-100 text-blue-800",
      BOARDING: "bg-yellow-100 text-yellow-800",
      DEPARTED: "bg-purple-100 text-purple-800",
      ARRIVED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
      DELAYED: "bg-orange-100 text-orange-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const filteredFlights = flights.filter((flight) => {
    const matchesSearch =
      flight.flight_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.destination?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || flight.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Flight Management
          </h1>
          <p className="text-gray-600 mt-1">
            Add, view, and manage all flights
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={loadFlights}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Flight</span>
          </button>
        </div>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ type: "", text: "" })}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by flight code, origin, or destination..."
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="BOARDING">Boarding</option>
              <option value="DEPARTED">Departed</option>
              <option value="ARRIVED">Arrived</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DELAYED">Delayed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{flights.length}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-600">
            {flights.filter((f) => f.status === "SCHEDULED").length}
          </p>
          <p className="text-sm text-gray-500">Scheduled</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">
            {flights.filter((f) => f.status === "ARRIVED").length}
          </p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">
            {flights.filter((f) => f.status === "CANCELLED").length}
          </p>
          <p className="text-sm text-gray-500">Cancelled</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-600">
            {flights.filter((f) => f.status === "DELAYED").length}
          </p>
          <p className="text-sm text-gray-500">Delayed</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Flight
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Departure
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Arrival
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Seats
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFlights.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Plane className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No flights found</p>
                  </td>
                </tr>
              ) : (
                filteredFlights.map((flight) => (
                  <tr key={flight.flight_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary-100 p-2 rounded-lg">
                          <Plane className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {flight.flight_code}
                          </p>
                          <p className="text-sm text-gray-500">
                            {flight.aircraft_model || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>
                          {flight.origin} → {flight.destination}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {formatDateTime(flight.dep_time)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {formatDateTime(flight.arr_time)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>
                          {flight.available_seats}/{flight.total_seats}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">
                        ₹{flight.current_price?.toLocaleString() || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Base: ₹{flight.base_price?.toLocaleString() || "N/A"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          flight.status
                        )}`}
                      >
                        {flight.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {flight.status !== "CANCELLED" &&
                        flight.status !== "ARRIVED" && (
                          <button
                            onClick={() => {
                              setSelectedFlight(flight);
                              setShowCancelModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Cancel Flight"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Add New Flight</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddFlight} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flight Code *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., FS101"
                    value={newFlight.flight_code}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        flight_code: e.target.value.toUpperCase(),
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aircraft Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., VT-ABC"
                    value={newFlight.aircraft_no}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        aircraft_no: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origin *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Bengaluru (BLR)"
                    value={newFlight.origin}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, origin: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Mumbai (BOM)"
                    value={newFlight.destination}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        destination: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Time *
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={newFlight.dep_time}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, dep_time: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arrival Time *
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={newFlight.arr_time}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, arr_time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 5000"
                    value={newFlight.base_price}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, base_price: e.target.value })
                    }
                    min="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Seats *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 180"
                    value={newFlight.total_seats}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        total_seats: e.target.value,
                      })
                    }
                    min="1"
                    max="500"
                    required
                  />
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Dynamic pricing will automatically
                  calculate current price based on demand.
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 btn-primary py-3 disabled:opacity-50"
                >
                  {actionLoading ? "Adding..." : "Add Flight"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn-secondary py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && selectedFlight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Cancel Flight</h3>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedFlight(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">
                    Warning: Cannot be undone
                  </p>
                  <p className="text-sm text-red-600">
                    All bookings will be automatically refunded.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <Plane className="h-6 w-6 text-gray-600" />
                <span className="font-semibold">
                  {selectedFlight.flight_code}
                </span>
              </div>
              <p className="text-gray-600">
                {selectedFlight.origin} → {selectedFlight.destination}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatDateTime(selectedFlight.dep_time)}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <select
                className="input-field"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              >
                <option value="">Select a reason</option>
                <option value="Weather conditions">Weather conditions</option>
                <option value="Technical issues">Technical issues</option>
                <option value="Operational reasons">Operational reasons</option>
                <option value="Low demand">Low demand</option>
                <option value="Crew unavailability">Crew unavailability</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleCancelFlight}
                disabled={actionLoading || !cancelReason}
                className="flex-1 btn-danger py-3 disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedFlight(null);
                }}
                className="flex-1 btn-secondary py-3"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightManagement;
