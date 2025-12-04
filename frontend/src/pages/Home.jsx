import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Search, TrendingUp, Shield, Star, Clock, ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    origin: '',
    destination: '',
    date: '',
    passengers: 1
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchData);
    navigate(`/search?${params.toString()}`);
  };

  const features = [
    {
      icon: TrendingUp,
      title: 'Dynamic Pricing',
      description: 'Real-time price adjustments based on demand, ensuring you get the best deals.'
    },
    {
      icon: Shield,
      title: 'Secure Booking',
      description: 'Your transactions are protected with industry-standard security.'
    },
    {
      icon: Star,
      title: 'Loyalty Rewards',
      description: 'Earn points on every booking and unlock exclusive benefits.'
    },
    {
      icon: Clock,
      title: 'Instant Confirmation',
      description: 'Get immediate booking confirmation and e-tickets.'
    }
  ];

  const popularRoutes = [
    { from: 'Bengaluru', to: 'Mumbai', price: '₹4,500', image: '🏙️' },
    { from: 'Delhi', to: 'Bengaluru', price: '₹5,200', image: '🏛️' },
    { from: 'Mumbai', to: 'Dubai', price: '₹15,000', image: '🏜️' },
    { from: 'Chennai', to: 'Singapore', price: '₹22,000', image: '🌆' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Smart Flights, <span className="text-primary-200">Smart Prices</span>
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Experience dynamic pricing that adapts to your needs. Book flights at the right price, every time.
            </p>
          </div>

          {/* Search Form */}
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">From</label>
                  <input
                    type="text"
                    placeholder="Departure City"
                    className="input-field text-gray-900"
                    value={searchData.origin}
                    onChange={(e) => setSearchData({ ...searchData, origin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">To</label>
                  <input
                    type="text"
                    placeholder="Destination City"
                    className="input-field text-gray-900"
                    value={searchData.destination}
                    onChange={(e) => setSearchData({ ...searchData, destination: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    className="input-field text-gray-900"
                    value={searchData.date}
                    onChange={(e) => setSearchData({ ...searchData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Passengers</label>
                  <select
                    className="input-field text-gray-900"
                    value={searchData.passengers}
                    onChange={(e) => setSearchData({ ...searchData, passengers: e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="mt-6 w-full btn-primary py-4 text-lg flex items-center justify-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Search Flights</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose FlightSync?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our AI-powered dynamic pricing system ensures you always get competitive rates.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-hover text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-xl mb-4">
                  <feature.icon className="h-7 w-7 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Popular Routes</h2>
              <p className="text-gray-600">Most booked destinations this month</p>
            </div>
            <button 
              onClick={() => navigate('/search')}
              className="btn-secondary flex items-center space-x-2"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRoutes.map((route, index) => (
              <div 
                key={index} 
                className="card-hover cursor-pointer"
                onClick={() => navigate(`/search?origin=${route.from}&destination=${route.to}`)}
              >
                <div className="text-4xl mb-4">{route.image}</div>
                <div className="flex items-center space-x-2 text-gray-900 font-medium mb-2">
                  <span>{route.from}</span>
                  <Plane className="h-4 w-4 text-primary-600" />
                  <span>{route.to}</span>
                </div>
                <p className="text-2xl font-bold text-primary-600">{route.price}</p>
                <p className="text-sm text-gray-500 mt-1">Starting from</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-primary-100 mb-8">
            Join thousands of travelers who trust FlightSync for their bookings.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={() => navigate('/register')}
              className="bg-white text-primary-600 font-medium py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Create Account
            </button>
            <button 
              onClick={() => navigate('/search')}
              className="border-2 border-white text-white font-medium py-3 px-8 rounded-lg hover:bg-white/10 transition-colors"
            >
              Search Flights
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">FlightSync</span>
            </div>
            <div className="text-sm">
              <p>© 2025 FlightSync. DBMS Project - RV College of Engineering</p>
              <p className="mt-1">Team: Astitwa, Ayush, Animesh, Arpita</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
