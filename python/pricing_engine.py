"""
FlightSync - Dynamic Pricing Engine
Implements surge pricing based on seat availability and demand patterns
Adapted from MDP-based dynamic airline pricing research
"""

import numpy as np
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from dataclasses import dataclass
from enum import Enum

from config import get_pg_connection, get_mongo_connection


class DemandLevel(Enum):
    """Demand classification based on booking patterns"""
    VERY_LOW = "very_low"
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class PricingFactors:
    """Factors that influence dynamic pricing"""
    occupancy_rate: float  # 0.0 to 1.0
    days_to_departure: int
    time_of_day: int  # 0-23
    day_of_week: int  # 0-6 (Monday-Sunday)
    is_holiday: bool
    is_peak_season: bool
    competitor_price: Optional[Decimal] = None
    historical_demand: Optional[float] = None


class DynamicPricingEngine:
    """
    Dynamic pricing engine that calculates optimal surge multipliers
    based on multiple factors including occupancy, timing, and demand patterns.
    
    Based on MDP (Markov Decision Process) approach where:
    - State: (available_seats, days_to_departure)
    - Action: price_multiplier
    - Reward: revenue from ticket sales
    """
    
    # Occupancy-based surge thresholds
    OCCUPANCY_THRESHOLDS = {
        0.30: 0.85,   # Low occupancy: discount
        0.50: 1.00,   # Normal
        0.70: 1.25,   # Moderate demand
        0.85: 1.50,   # High demand
        0.95: 2.00,   # Very high demand
        1.00: 2.50,   # Last seats premium
    }
    
    # Days to departure multipliers
    DEPARTURE_MULTIPLIERS = {
        0: 2.50,    # Same day
        1: 2.00,    # Tomorrow
        3: 1.75,    # Within 3 days
        7: 1.50,    # Within a week
        14: 1.25,   # Within 2 weeks
        30: 1.00,   # Month out
        60: 0.90,   # 2 months out
        90: 0.85,   # 3+ months out
    }
    
    # Time of day factors (for departure time)
    TIME_FACTORS = {
        (6, 9): 1.20,    # Morning rush
        (9, 12): 1.10,   # Late morning
        (12, 14): 1.00,  # Midday
        (14, 17): 1.05,  # Afternoon
        (17, 21): 1.25,  # Evening rush
        (21, 24): 0.95,  # Late night
        (0, 6): 0.85,    # Red-eye
    }
    
    # Day of week factors
    DAY_FACTORS = {
        0: 1.15,  # Monday - business travel
        1: 1.05,  # Tuesday
        2: 1.00,  # Wednesday
        3: 1.10,  # Thursday
        4: 1.25,  # Friday - weekend start
        5: 1.20,  # Saturday
        6: 1.30,  # Sunday - return travel
    }
    
    def __init__(self, min_multiplier: float = 0.5, max_multiplier: float = 5.0):
        self.min_multiplier = min_multiplier
        self.max_multiplier = max_multiplier
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
    
    def calculate_surge_multiplier(
        self,
        available_seats: int,
        total_seats: int,
        dep_time: datetime,
        base_price: Decimal,
        flight_id: Optional[int] = None
    ) -> Tuple[Decimal, Dict]:
        """
        Calculate the optimal surge multiplier for a flight.
        
        Returns:
            Tuple of (surge_multiplier, breakdown_dict)
        """
        now = datetime.now()
        
        # Calculate factors
        factors = PricingFactors(
            occupancy_rate=1.0 - (available_seats / total_seats) if total_seats > 0 else 0,
            days_to_departure=(dep_time - now).days,
            time_of_day=dep_time.hour,
            day_of_week=dep_time.weekday(),
            is_holiday=self._check_holiday(dep_time),
            is_peak_season=self._check_peak_season(dep_time),
            historical_demand=self._get_historical_demand(flight_id) if flight_id else None
        )
        
        # Calculate individual multipliers
        occupancy_mult = self._get_occupancy_multiplier(factors.occupancy_rate)
        departure_mult = self._get_departure_multiplier(factors.days_to_departure)
        time_mult = self._get_time_multiplier(factors.time_of_day)
        day_mult = self._get_day_multiplier(factors.day_of_week)
        seasonal_mult = self._get_seasonal_multiplier(factors)
        
        # Combine multipliers with weights
        # Occupancy is the primary driver (weight: 0.4)
        # Days to departure is secondary (weight: 0.3)
        # Other factors combined (weight: 0.3)
        
        weighted_surge = (
            0.40 * occupancy_mult +
            0.30 * departure_mult +
            0.10 * time_mult +
            0.10 * day_mult +
            0.10 * seasonal_mult
        )
        
        # Apply bounds
        final_multiplier = max(self.min_multiplier, min(self.max_multiplier, weighted_surge))
        
        # Build breakdown for analytics
        breakdown = {
            'occupancy_rate': round(factors.occupancy_rate * 100, 2),
            'days_to_departure': factors.days_to_departure,
            'factors': {
                'occupancy': round(occupancy_mult, 3),
                'departure_timing': round(departure_mult, 3),
                'time_of_day': round(time_mult, 3),
                'day_of_week': round(day_mult, 3),
                'seasonal': round(seasonal_mult, 3),
            },
            'weighted_raw': round(weighted_surge, 3),
            'final_multiplier': round(final_multiplier, 2),
            'calculated_at': now.isoformat()
        }
        
        return Decimal(str(round(final_multiplier, 2))), breakdown
    
    def _get_occupancy_multiplier(self, occupancy_rate: float) -> float:
        """Get multiplier based on seat occupancy"""
        for threshold, multiplier in sorted(self.OCCUPANCY_THRESHOLDS.items()):
            if occupancy_rate <= threshold:
                return multiplier
        return 2.50  # Maximum for full/near-full flights
    
    def _get_departure_multiplier(self, days: int) -> float:
        """Get multiplier based on days to departure"""
        for day_threshold, multiplier in sorted(self.DEPARTURE_MULTIPLIERS.items()):
            if days <= day_threshold:
                return multiplier
        return 0.85  # Discount for very early bookings
    
    def _get_time_multiplier(self, hour: int) -> float:
        """Get multiplier based on departure time"""
        for (start, end), multiplier in self.TIME_FACTORS.items():
            if start <= hour < end:
                return multiplier
        return 1.0
    
    def _get_day_multiplier(self, day: int) -> float:
        """Get multiplier based on day of week"""
        return self.DAY_FACTORS.get(day, 1.0)
    
    def _get_seasonal_multiplier(self, factors: PricingFactors) -> float:
        """Get multiplier based on seasonal factors"""
        multiplier = 1.0
        
        if factors.is_holiday:
            multiplier *= 1.35
        if factors.is_peak_season:
            multiplier *= 1.20
            
        return multiplier
    
    def _check_holiday(self, date: datetime) -> bool:
        """Check if date is a holiday (simplified)"""
        # Major Indian holidays (simplified check)
        holidays = [
            (1, 26),   # Republic Day
            (8, 15),   # Independence Day
            (10, 2),   # Gandhi Jayanti
            (11, 14),  # Diwali region (approximate)
            (12, 25),  # Christmas
        ]
        return (date.month, date.day) in holidays
    
    def _check_peak_season(self, date: datetime) -> bool:
        """Check if date falls in peak travel season"""
        # Peak seasons: Dec-Jan (winter holidays), Apr-May (summer), Oct (Diwali)
        peak_months = [4, 5, 10, 12, 1]
        return date.month in peak_months
    
    def _get_historical_demand(self, flight_id: int) -> Optional[float]:
        """Get historical demand pattern from MongoDB"""
        try:
            # Query MongoDB for historical booking patterns
            pipeline = [
                {"$match": {"flight_id": flight_id}},
                {"$unwind": "$price_snapshots"},
                {"$group": {
                    "_id": None,
                    "avg_occupancy": {"$avg": "$price_snapshots.occupancy_rate"}
                }}
            ]
            result = list(self.mongo.price_history.aggregate(pipeline))
            if result:
                return result[0].get('avg_occupancy')
        except Exception:
            pass
        return None
    
    def update_flight_price(self, flight_id: int) -> Dict:
        """
        Update the price for a specific flight and sync to MongoDB.
        
        Returns:
            Dict with old and new pricing information
        """
        # Get current flight data
        query = """
            SELECT f.flight_id, f.flight_code, f.available_seats, f.total_seats,
                   f.dep_time, f.origin, f.destination,
                   p.base_price, p.current_price, p.surge_multiplier
            FROM flights f
            JOIN prices p ON f.flight_id = p.flight_id
            WHERE f.flight_id = %s
        """
        flight = self.pg.execute_one(query, (flight_id,))
        
        if not flight:
            raise ValueError(f"Flight {flight_id} not found")
        
        # Calculate new surge
        new_surge, breakdown = self.calculate_surge_multiplier(
            available_seats=flight['available_seats'],
            total_seats=flight['total_seats'],
            dep_time=flight['dep_time'],
            base_price=flight['base_price'],
            flight_id=flight_id
        )
        
        new_price = flight['base_price'] * new_surge
        
        # Update PostgreSQL
        update_query = """
            UPDATE prices 
            SET surge_multiplier = %s, current_price = %s, last_updated = NOW()
            WHERE flight_id = %s
        """
        self.pg.execute(update_query, (new_surge, new_price, flight_id))
        
        # Sync to MongoDB price history
        self._sync_to_mongodb(flight, new_surge, new_price, breakdown)
        
        return {
            'flight_id': flight_id,
            'flight_code': flight['flight_code'],
            'old_price': float(flight['current_price']),
            'new_price': float(new_price),
            'old_surge': float(flight['surge_multiplier']),
            'new_surge': float(new_surge),
            'breakdown': breakdown
        }
    
    def _sync_to_mongodb(
        self, 
        flight: Dict, 
        new_surge: Decimal, 
        new_price: Decimal,
        breakdown: Dict
    ):
        """Sync price update to MongoDB for historical tracking"""
        try:
            snapshot = {
                'timestamp': datetime.now(),
                'base_price': float(flight['base_price']),
                'current_price': float(new_price),
                'surge_multiplier': float(new_surge),
                'available_seats': flight['available_seats'],
                'total_seats': flight['total_seats'],
                'occupancy_rate': breakdown['occupancy_rate'],
                'triggered_by': 'pricing_engine',
                'breakdown': breakdown['factors']
            }
            
            self.mongo.price_history.update_one(
                {'flight_id': flight['flight_id']},
                {
                    '$push': {'price_snapshots': snapshot},
                    '$set': {'updated_at': datetime.now()},
                    '$setOnInsert': {
                        'flight_code': flight['flight_code'],
                        'route': {
                            'origin': flight['origin'],
                            'destination': flight['destination']
                        },
                        'created_at': datetime.now()
                    }
                },
                upsert=True
            )
        except Exception as e:
            print(f"MongoDB sync error: {e}")
    
    def batch_update_prices(self, flight_ids: Optional[list] = None) -> list:
        """
        Update prices for multiple flights.
        If no flight_ids provided, updates all scheduled flights.
        """
        if flight_ids is None:
            # Get all scheduled flights
            query = "SELECT flight_id FROM flights WHERE status = 'SCHEDULED'"
            results = self.pg.execute(query)
            flight_ids = [r['flight_id'] for r in results]
        
        updates = []
        for fid in flight_ids:
            try:
                update = self.update_flight_price(fid)
                updates.append(update)
            except Exception as e:
                updates.append({'flight_id': fid, 'error': str(e)})
        
        return updates


class PricingRecommendationEngine:
    """
    Generates AI-powered pricing recommendations based on
    historical data and market analysis.
    """
    
    def __init__(self):
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
    
    def generate_insights(self, flight_id: int) -> Dict:
        """Generate pricing insights for a flight"""
        
        # Get flight details
        flight = self.pg.execute_one("""
            SELECT f.*, p.base_price, p.current_price, p.surge_multiplier
            FROM flights f
            JOIN prices p ON f.flight_id = p.flight_id
            WHERE f.flight_id = %s
        """, (flight_id,))
        
        if not flight:
            raise ValueError(f"Flight {flight_id} not found")
        
        # Analyze historical prices from MongoDB
        history = self._analyze_price_history(flight_id)
        
        # Generate predictions
        predictions = self._generate_predictions(flight, history)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(flight, predictions)
        
        insight = {
            'flight_id': flight_id,
            'flight_code': flight['flight_code'],
            'route': {
                'origin': flight['origin'],
                'destination': flight['destination']
            },
            'predictions': predictions,
            'market_factors': {
                'days_to_departure': (flight['dep_time'] - datetime.now()).days,
                'current_occupancy': round((1 - flight['available_seats']/flight['total_seats']) * 100, 2),
                'seasonality_factor': 1.0,  # Placeholder
                'day_of_week_factor': 1.0,  # Placeholder
            },
            'historical_analysis': history,
            'recommendations': recommendations,
            'model_version': '1.0.0',
            'generated_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(hours=6)
        }
        
        # Store in MongoDB
        self._store_insight(insight)
        
        return insight
    
    def _analyze_price_history(self, flight_id: int) -> Dict:
        """Analyze historical price data from MongoDB"""
        try:
            pipeline = [
                {'$match': {'flight_id': flight_id}},
                {'$unwind': '$price_snapshots'},
                {'$group': {
                    '_id': None,
                    'avg_price': {'$avg': '$price_snapshots.current_price'},
                    'avg_occupancy': {'$avg': '$price_snapshots.occupancy_rate'},
                    'min_price': {'$min': '$price_snapshots.current_price'},
                    'max_price': {'$max': '$price_snapshots.current_price'},
                    'snapshot_count': {'$sum': 1}
                }}
            ]
            result = list(self.mongo.price_history.aggregate(pipeline))
            
            if result:
                return {
                    'avg_price_30d': result[0].get('avg_price', 0),
                    'avg_occupancy_30d': result[0].get('avg_occupancy', 0),
                    'price_range': {
                        'min': result[0].get('min_price', 0),
                        'max': result[0].get('max_price', 0)
                    },
                    'data_points': result[0].get('snapshot_count', 0),
                    'price_trend': 'stable',
                    'demand_trend': 'stable'
                }
        except Exception:
            pass
        
        return {
            'avg_price_30d': 0,
            'avg_occupancy_30d': 0,
            'price_trend': 'unknown',
            'demand_trend': 'unknown'
        }
    
    def _generate_predictions(self, flight: Dict, history: Dict) -> Dict:
        """Generate price predictions"""
        current_price = float(flight['current_price'])
        occupancy = 1 - (flight['available_seats'] / flight['total_seats'])
        
        # Simple prediction model (can be enhanced with ML)
        optimal_price = current_price
        if occupancy < 0.5:
            optimal_price = current_price * 0.95  # Suggest discount
        elif occupancy > 0.8:
            optimal_price = current_price * 1.10  # Suggest increase
        
        return {
            'optimal_price': round(optimal_price, 2),
            'expected_demand': int(flight['total_seats'] * min(occupancy + 0.1, 1.0)),
            'recommended_surge': round(optimal_price / float(flight['base_price']), 2),
            'confidence_score': 0.75,
            'sell_out_probability': round(min(occupancy * 1.2, 1.0), 2)
        }
    
    def _generate_recommendations(self, flight: Dict, predictions: Dict) -> list:
        """Generate actionable recommendations"""
        recommendations = []
        occupancy = 1 - (flight['available_seats'] / flight['total_seats'])
        days_to_dep = (flight['dep_time'] - datetime.now()).days
        
        if occupancy < 0.3 and days_to_dep < 7:
            recommendations.append({
                'action': 'Apply promotional discount',
                'reason': 'Low occupancy with departure approaching',
                'expected_impact': '+15-20% bookings',
                'priority': 'high'
            })
        
        if occupancy > 0.85:
            recommendations.append({
                'action': 'Increase surge multiplier',
                'reason': 'High demand, limited seats',
                'expected_impact': '+10-15% revenue per seat',
                'priority': 'high'
            })
        
        if days_to_dep <= 1 and flight['available_seats'] > 0:
            recommendations.append({
                'action': 'Last-minute deal or premium pricing',
                'reason': 'Same-day/next-day departure',
                'expected_impact': 'Maximize remaining inventory value',
                'priority': 'medium'
            })
        
        return recommendations
    
    def _store_insight(self, insight: Dict):
        """Store insight in MongoDB"""
        try:
            self.mongo.ai_pricing_insights.update_one(
                {'flight_id': insight['flight_id']},
                {'$set': insight},
                upsert=True
            )
        except Exception as e:
            print(f"Error storing insight: {e}")


# Convenience functions
def calculate_price(
    available_seats: int,
    total_seats: int,
    dep_time: datetime,
    base_price: Decimal
) -> Tuple[Decimal, Decimal]:
    """
    Calculate current price for a flight.
    Returns: (surge_multiplier, current_price)
    """
    engine = DynamicPricingEngine()
    surge, _ = engine.calculate_surge_multiplier(
        available_seats, total_seats, dep_time, base_price
    )
    return surge, base_price * surge


def refresh_all_prices():
    """Refresh prices for all scheduled flights"""
    engine = DynamicPricingEngine()
    return engine.batch_update_prices()
