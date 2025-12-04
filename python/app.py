
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
from datetime import datetime, date
import jwt
import os

from config import config
from services import (
    CustomerService, FlightService, BookingService,
    PaymentService, ReviewService, AnalyticsService
)
from models import (
    CustomerCreate, CustomerUpdate, FlightSearchRequest,
    BookingCreate, PaymentCreate, ReviewCreate, BookingClass, PaymentMethod
)
from pricing_engine import DynamicPricingEngine, PricingRecommendationEngine

app = Flask(__name__)
app.config['SECRET_KEY'] = config.secret_key
CORS(app)

customer_service = CustomerService()
flight_service = FlightService()
booking_service = BookingService()
payment_service = PaymentService()
review_service = ReviewService()
analytics_service = AnalyticsService()
pricing_engine = DynamicPricingEngine()
recommendation_engine = PricingRecommendationEngine()


# ============================================================================
# AUTHENTICATION MIDDLEWARE
# ============================================================================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data['cust_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated


ADMIN_EMAIL = 'admin@flightsync.com'


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data['cust_id']
            
            customer = customer_service.get_customer(current_user)
            if not customer or customer.get('email') != ADMIN_EMAIL:
                return jsonify({'error': 'Admin access required. Only the admin account can access this feature.'}), 403
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated


def generate_token(cust_id: int) -> str:
    import datetime as dt
    payload = {
        'cust_id': cust_id,
        'exp': dt.datetime.utcnow() + dt.timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'FlightSync API',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        customer_data = CustomerCreate(**data)
        customer = customer_service.create_customer(customer_data)
        token = generate_token(customer['cust_id'])
        
        return jsonify({
            'message': 'Registration successful',
            'customer': customer,
            'token': token
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        customer = customer_service.authenticate(email, password)
        
        if customer:
            token = generate_token(customer['cust_id'])
            return jsonify({
                'message': 'Login successful',
                'customer': customer,
                'token': token
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============================================================================
# CUSTOMER ENDPOINTS
# ============================================================================

@app.route('/api/customers/me', methods=['GET'])
@token_required
def get_current_customer(cust_id):
    customer = customer_service.get_customer(cust_id)
    if customer:
        return jsonify(customer)
    return jsonify({'error': 'Customer not found'}), 404


@app.route('/api/customers/me', methods=['PUT'])
@token_required
def update_customer(cust_id):
    try:
        data = request.get_json()
        update_data = CustomerUpdate(**data)
        customer = customer_service.update_customer(cust_id, update_data)
        return jsonify(customer)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/customers/me/dashboard', methods=['GET'])
@token_required
def get_dashboard(cust_id):
    dashboard = customer_service.get_dashboard(cust_id)
    return jsonify(dashboard.model_dump())


@app.route('/api/customers/me/bookings', methods=['GET'])
@token_required
def get_booking_history(cust_id):
    bookings = customer_service.get_booking_history(cust_id)
    return jsonify(bookings)


@app.route('/api/customers/me/loyalty', methods=['GET'])
@token_required
def get_loyalty_history(cust_id):
    limit = request.args.get('limit', 20, type=int)
    history = customer_service.get_loyalty_history(cust_id, limit)
    return jsonify(history)


@app.route('/api/customers/me/loyalty/redeem', methods=['POST'])
@token_required
def redeem_loyalty_points(cust_id):
    try:
        data = request.get_json()
        points = data.get('points')
        description = data.get('description', 'Points redemption')
        result = customer_service.redeem_points(cust_id, points, description)
        return jsonify({'message': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============================================================================
# FLIGHT ENDPOINTS
# ============================================================================

@app.route('/api/flights/search', methods=['GET', 'POST'])
def search_flights():
    try:
        if request.method == 'POST':
            data = request.get_json()
        else:
            data = {
                'origin': request.args.get('origin'),
                'destination': request.args.get('destination'),
                'travel_date': request.args.get('date'),
                'passengers': request.args.get('passengers', 1, type=int)
            }
        
        if isinstance(data.get('travel_date'), str):
            data['travel_date'] = datetime.strptime(data['travel_date'], '%Y-%m-%d').date()
        
        search_request = FlightSearchRequest(**data)
        flights = flight_service.search_flights(search_request)
        
        return jsonify({
            'count': len(flights),
            'flights': [f.model_dump() for f in flights]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/flights/<int:flight_id>', methods=['GET'])
def get_flight(flight_id):
    flight = flight_service.get_flight_details(flight_id)
    if flight:
        return jsonify(flight)
    return jsonify({'error': 'Flight not found'}), 404


@app.route('/api/flights/<int:flight_id>/price-history', methods=['GET'])
def get_flight_price_history(flight_id):
    days = request.args.get('days', 7, type=int)
    history = flight_service.get_price_history(flight_id, days)
    return jsonify(history)


@app.route('/api/flights/routes/<path:route>/pricing', methods=['GET'])
def get_route_pricing(route):
    parts = route.split('-')
    if len(parts) < 2:
        return jsonify({'error': 'Invalid route format. Use: origin-destination'}), 400
    
    origin = parts[0]
    destination = '-'.join(parts[1:])
    pricing = flight_service.get_route_pricing(origin, destination)
    return jsonify(pricing)


# ============================================================================
# BOOKING ENDPOINTS
# ============================================================================

@app.route('/api/bookings', methods=['POST'])
@token_required
def create_booking(cust_id):
    try:
        data = request.get_json()
        
        if 'booking_class' in data and isinstance(data['booking_class'], str):
            data['booking_class'] = BookingClass(data['booking_class'])
        
        booking_data = BookingCreate(**data)
        booking = booking_service.create_booking(cust_id, booking_data)
        
        return jsonify({
            'message': 'Booking created successfully',
            'booking': booking
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/bookings/<int:booking_id>', methods=['GET'])
@token_required
def get_booking(cust_id, booking_id):
    booking = booking_service.get_booking(booking_id)
    
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    if booking['cust_id'] != cust_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(booking)


@app.route('/api/bookings/upcoming', methods=['GET'])
@token_required
def get_upcoming_bookings(cust_id):
    bookings = booking_service.get_upcoming_bookings(cust_id)
    return jsonify(bookings)


@app.route('/api/bookings/<int:booking_id>/cancel', methods=['POST'])
@token_required
def cancel_booking(cust_id, booking_id):
    try:
        booking = booking_service.get_booking(booking_id)
        if not booking or booking['cust_id'] != cust_id:
            return jsonify({'error': 'Booking not found or unauthorized'}), 404
        
        data = request.get_json() or {}
        reason = data.get('reason')
        result = booking_service.cancel_booking(booking_id, reason)
        
        return jsonify({'message': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================

@app.route('/api/payments', methods=['POST'])
@token_required
def process_payment(cust_id):
    try:
        data = request.get_json()
        
        if 'payment_method' in data and isinstance(data['payment_method'], str):
            data['payment_method'] = PaymentMethod(data['payment_method'])
        
        payment_data = PaymentCreate(**data)
        payment = payment_service.process_payment(cust_id, payment_data)
        
        return jsonify({
            'message': 'Payment processed successfully',
            'payment': payment
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/payments/<int:payment_id>', methods=['GET'])
@token_required
def get_payment(cust_id, payment_id):
    payment = payment_service.get_payment(payment_id)
    
    if not payment:
        return jsonify({'error': 'Payment not found'}), 404
    
    if payment['cust_id'] != cust_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(payment)


# ============================================================================
# REVIEW ENDPOINTS
# ============================================================================

@app.route('/api/reviews', methods=['POST'])
@token_required
def submit_review(cust_id):
    try:
        data = request.get_json()
        review_data = ReviewCreate(**data)
        result = review_service.submit_review(cust_id, review_data)
        return jsonify({'message': result}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/flights/<int:flight_id>/reviews', methods=['GET'])
def get_flight_reviews(flight_id):
    reviews = review_service.get_flight_reviews(flight_id)
    summary = review_service.get_reviews_summary(flight_id)
    
    return jsonify({
        'summary': summary,
        'reviews': reviews
    })


@app.route('/api/reviews/<int:review_id>/helpful', methods=['POST'])
def mark_review_helpful(review_id):
    result = review_service.mark_helpful(review_id)
    if result:
        return jsonify({'message': 'Marked as helpful'})
    return jsonify({'error': 'Review not found'}), 404


# ============================================================================
# ADMIN FLIGHT MANAGEMENT ENDPOINTS
# ============================================================================

@app.route('/api/admin/flights', methods=['GET'])
@admin_required
def admin_get_all_flights(current_user):
    try:
        flights = flight_service.get_all_flights()
        return jsonify(flights)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/flights', methods=['POST'])
@admin_required
def admin_add_flight(current_user):
    try:
        data = request.get_json()
        
        required = ['flight_code', 'origin', 'destination', 'dep_time', 'arr_time', 'base_price', 'total_seats']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        result = flight_service.add_flight(
            flight_code=data['flight_code'],
            origin=data['origin'],
            destination=data['destination'],
            dep_time=data['dep_time'],
            arr_time=data['arr_time'],
            aircraft_id=data.get('aircraft_id'),
            base_price=float(data['base_price']),
            total_seats=int(data['total_seats'])
        )
        
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/admin/flights/<int:flight_id>/cancel', methods=['POST'])
@admin_required
def admin_cancel_flight(current_user, flight_id):
    try:
        data = request.get_json()
        reason = data.get('reason', 'Administrative cancellation')
        
        result = flight_service.cancel_flight(flight_id, reason)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/admin/flights/<int:flight_id>', methods=['PUT'])
@admin_required
def admin_update_flight(current_user, flight_id):
    try:
        data = request.get_json()
        result = flight_service.update_flight(flight_id, data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============================================================================
# PRICING ENDPOINTS (Admin)
# ============================================================================

@app.route('/api/admin/pricing/refresh/<int:flight_id>', methods=['POST'])
def refresh_flight_price(flight_id):
    try:
        result = pricing_engine.update_flight_price(flight_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/admin/pricing/refresh-all', methods=['POST'])
def refresh_all_prices():
    try:
        results = pricing_engine.batch_update_prices()
        return jsonify({
            'message': 'Prices refreshed',
            'updated_count': len(results),
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/pricing/insights/<int:flight_id>', methods=['GET'])
def get_pricing_insights(flight_id):
    try:
        insights = recommendation_engine.generate_insights(flight_id)
        insights['generated_at'] = insights['generated_at'].isoformat()
        insights['expires_at'] = insights['expires_at'].isoformat()
        return jsonify(insights)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============================================================================
# ANALYTICS ENDPOINTS (Admin)
# ============================================================================

@app.route('/api/admin/analytics/revenue', methods=['GET'])
def get_revenue_analytics():
    start = request.args.get('start', (date.today() - timedelta(days=30)).isoformat())
    end = request.args.get('end', date.today().isoformat())
    
    start_date = datetime.strptime(start, '%Y-%m-%d').date()
    end_date = datetime.strptime(end, '%Y-%m-%d').date()
    
    report = analytics_service.get_revenue_report(start_date, end_date)
    return jsonify(report)


@app.route('/api/admin/analytics/routes', methods=['GET'])
def get_route_analytics():
    limit = request.args.get('limit', 10, type=int)
    routes = analytics_service.get_top_routes(limit)
    return jsonify(routes)


@app.route('/api/admin/analytics/routes/performance', methods=['GET'])
def get_routes_performance():
    performance = analytics_service.get_route_performance()
    return jsonify(performance)


@app.route('/api/admin/analytics/loyalty', methods=['GET'])
def get_loyalty_analytics():
    analytics = analytics_service.get_loyalty_analytics()
    return jsonify(analytics)


@app.route('/api/admin/analytics/payments', methods=['GET'])
def get_payment_analytics():
    days = request.args.get('days', 30, type=int)
    summary = analytics_service.get_payment_summary(days)
    return jsonify(summary)


@app.route('/api/admin/analytics/abandoned-carts', methods=['GET'])
def get_abandoned_carts():
    hours = request.args.get('hours', 24, type=int)
    carts = analytics_service.get_abandoned_carts(hours)
    return jsonify(carts)


@app.route('/api/admin/analytics/price-trends', methods=['GET'])
def get_price_trends():
    route = request.args.get('route')
    days = request.args.get('days', 30, type=int)
    trends = analytics_service.get_price_trends(route, days)
    return jsonify(trends)


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad request', 'message': str(e)}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                    FlightSync API Server                      ║
    ║     Real-Time Dynamic Pricing System for Airlines             ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Running on: http://localhost:{port}                           ║
    ║  Debug mode: {debug}                                           ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
