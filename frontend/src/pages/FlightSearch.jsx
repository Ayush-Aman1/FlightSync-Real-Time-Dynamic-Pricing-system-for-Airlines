import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { flightAPI } from '../services/api';
import { 
  Plane, Search, Clock, Users, TrendingUp, TrendingDown, 
  Minus, Filter, ArrowRight, AlertCircle 
} from 'lucide-react';

const FlightSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [searchData, setSearchData] = useState({
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    travel_date: searchParams.get('date') || '',
    passengers: parseInt(searchParams.get('passengers')) || 1
  });
  
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Auto-search if params provided
  useEffect(() => {
    if (searchData.origin && searchData.destination && searchData.travel_date) {
      handleSearch();
    }
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!searchData.origin || !searchData.destination || !searchData.travel_date) {
      setError('Please fill in all search fields');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const response = await flightAPI.search(searchData);
      setFlights(response.data.flights || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search flights');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriceTierBadge = (tier) => {
    const badges = {
      'DISCOUNTED': { bg: 'bg-green-100', text: 'text-green-800', icon: TrendingDown, label: 'Discounted' },
      'NORMAL': { bg: 'bg-gray-100', text: 'text-gray-800', icon: Minus, label: 'Normal' },
      'MODERATE_DEMAND': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: TrendingUp, label: 'Moderate Demand' },
      'HIGH_DEMAND': { bg: 'bg-orange-100', text: 'text-orange-800', icon: TrendingUp, label: 'High Demand' },
      'PREMIUM': { bg: 'bg-red-100', text: 'text-red-800', icon: TrendingUp, label: 'Premium' },
    };
    return badges[tier] || badges['NORMAL'];
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Search Form */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Search Flights</h2>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">From</label>
                <input
                  type="text"
                  placeholder="Departure City"
                  className="input-field"
                  value={searchData.origin}
                  onChange={(e) => setSearchData({ ...searchData, origin: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">To</label>
                <input
                  type="text"
                  placeholder="Destination City"
                  className="input-field"
                  value={searchData.destination}
                  onChange={(e) => setSearchData({ ...searchData, destination: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={searchData.travel_date}
                  onChange={(e) => setSearchData({ ...searchData, travel_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Passengers</label>
                <select
                  className="input-field"
                  value={searchData.passengers}
                  onChange={(e) => setSearchData({ ...searchData, passengers: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full btn-primary py-2.5 flex items-center justify-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {flights.length} Flight{flights.length !== 1 ? 's' : ''} Found
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Sorted by price</span>
              </div>
            </div>

            {flights.length === 0 ? (
              <div className="card text-center py-12">
                <Plane className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Flights Found</h3>
                <p className="text-gray-600">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {flights.map((flight) => {
                  const priceBadge = getPriceTierBadge(flight.price_tier);
                  
                  return (
                    <div 
                      key={flight.flight_id}
                      className="card-hover cursor-pointer"
                      onClick={() => navigate(`/flights/${flight.flight_id}`)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        {/* Flight Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="bg-primary-100 p-2 rounded-lg">
                              <Plane className="h-6 w-6 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{flight.flight_code}</p>
                              <p className="text-sm text-gray-500">{flight.aircraft_model || 'Standard Aircraft'}</p>
                            </div>
                          </div>

                          {/* Route & Time */}
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{formatTime(flight.departure)}</p>
                              <p className="text-sm text-gray-600">{flight.origin.split('(')[0].trim()}</p>
                              <p className="text-xs text-gray-400">{formatDate(flight.departure)}</p>
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center px-4">
                              <div className="flex items-center w-full">
                                <div className="h-px bg-gray-300 flex-1"></div>
                                <Plane className="h-4 w-4 text-gray-400 mx-2 transform rotate-90" />
                                <div className="h-px bg-gray-300 flex-1"></div>
                              </div>
                              <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatDuration(flight.duration_hours)}</span>
                              </div>
                            </div>

                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{formatTime(flight.arrival)}</p>
                              <p className="text-sm text-gray-600">{flight.destination.split('(')[0].trim()}</p>
                              <p className="text-xs text-gray-400">{formatDate(flight.arrival)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Price & Book */}
                        <div className="mt-6 md:mt-0 md:ml-8 md:pl-8 md:border-l border-gray-200 text-right">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${priceBadge.bg} ${priceBadge.text} mb-2`}>
                            <priceBadge.icon className="h-3 w-3" />
                            <span>{priceBadge.label}</span>
                          </div>
                          <p className="text-3xl font-bold text-gray-900">
                            ₹{flight.current_price.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 mb-4">per person</p>
                          
                          <div className="flex items-center justify-end space-x-2 text-sm text-gray-600 mb-4">
                            <Users className="h-4 w-4" />
                            <span>{flight.available_seats} seats left</span>
                          </div>

                          <button className="btn-primary flex items-center space-x-2">
                            <span>Select Flight</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!loading && !searched && (
          <div className="card text-center py-12">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Search for Flights</h3>
            <p className="text-gray-600">Enter your travel details above to find available flights</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightSearch;
