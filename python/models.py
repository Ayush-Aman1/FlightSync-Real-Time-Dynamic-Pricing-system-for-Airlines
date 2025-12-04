"""
FlightSync - Data Models
Pydantic models for type validation and serialization
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, validator


# ============================================================================
# ENUMS
# ============================================================================

class LoyaltyTier(str, Enum):
    BRONZE = "Bronze"
    SILVER = "Silver"
    GOLD = "Gold"
    PLATINUM = "Platinum"


class FlightStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    BOARDING = "BOARDING"
    DEPARTED = "DEPARTED"
    ARRIVED = "ARRIVED"
    CANCELLED = "CANCELLED"
    DELAYED = "DELAYED"


class BookingStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    REFUNDED = "REFUNDED"


class BookingClass(str, Enum):
    ECONOMY = "ECONOMY"
    PREMIUM_ECONOMY = "PREMIUM_ECONOMY"
    BUSINESS = "BUSINESS"
    FIRST = "FIRST"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    UPI = "UPI"
    NET_BANKING = "NET_BANKING"
    WALLET = "WALLET"
    LOYALTY_POINTS = "LOYALTY_POINTS"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class TransactionType(str, Enum):
    EARNED = "EARNED"
    REDEEMED = "REDEEMED"
    EXPIRED = "EXPIRED"
    BONUS = "BONUS"


class PricingTier(str, Enum):
    DISCOUNTED = "DISCOUNTED"
    NORMAL = "NORMAL"
    MODERATE_DEMAND = "MODERATE_DEMAND"
    HIGH_DEMAND = "HIGH_DEMAND"
    PREMIUM = "PREMIUM"


# ============================================================================
# CUSTOMER MODELS
# ============================================================================

class CustomerBase(BaseModel):
    fname: str = Field(..., min_length=1, max_length=50)
    lname: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=15)
    dob: Optional[date] = None


class CustomerCreate(CustomerBase):
    password: str = Field(..., min_length=8)


class CustomerUpdate(BaseModel):
    fname: Optional[str] = Field(None, max_length=50)
    lname: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=15)
    dob: Optional[date] = None


class Customer(CustomerBase):
    cust_id: int
    balance: Decimal = Decimal("0.00")
    loyalty_pts: int = 0
    loyalty_tier: LoyaltyTier = LoyaltyTier.BRONZE
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerDashboard(BaseModel):
    customer_name: str
    email: str
    loyalty_tier: LoyaltyTier
    loyalty_points: int
    wallet_balance: Decimal
    total_bookings: int
    upcoming_flights: int
    total_spent: Decimal


# ============================================================================
# AIRCRAFT MODELS
# ============================================================================

class AircraftBase(BaseModel):
    aircraft_no: str = Field(..., max_length=20)
    model: str = Field(..., max_length=50)
    manufacturer: Optional[str] = Field(None, max_length=50)
    capacity: int = Field(..., gt=0)


class Aircraft(AircraftBase):
    aircraft_id: int
    status: str = "ACTIVE"

    class Config:
        from_attributes = True


# ============================================================================
# FLIGHT MODELS
# ============================================================================

class FlightBase(BaseModel):
    flight_code: str = Field(..., max_length=10)
    origin: str = Field(..., max_length=100)
    destination: str = Field(..., max_length=100)
    dep_time: datetime
    arr_time: datetime
    total_seats: int = Field(..., gt=0)

    @validator('arr_time')
    def arrival_after_departure(cls, v, values):
        if 'dep_time' in values and v <= values['dep_time']:
            raise ValueError('Arrival time must be after departure time')
        return v


class FlightCreate(FlightBase):
    aircraft_id: Optional[int] = None
    base_price: Decimal = Field(..., gt=0)


class Flight(FlightBase):
    flight_id: int
    aircraft_id: Optional[int]
    available_seats: int
    status: FlightStatus = FlightStatus.SCHEDULED
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FlightSearch(BaseModel):
    flight_id: int
    flight_code: str
    origin: str
    destination: str
    departure: datetime
    arrival: datetime
    duration_hours: float
    available_seats: int
    current_price: Decimal
    price_tier: PricingTier
    aircraft_model: Optional[str]


class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    travel_date: date
    passengers: int = Field(1, ge=1, le=9)
    booking_class: Optional[BookingClass] = BookingClass.ECONOMY


# ============================================================================
# PRICE MODELS
# ============================================================================

class PriceBase(BaseModel):
    base_price: Decimal = Field(..., gt=0)
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None


class Price(PriceBase):
    price_id: int
    flight_id: int
    current_price: Decimal
    surge_multiplier: Decimal = Decimal("1.00")
    last_updated: datetime

    class Config:
        from_attributes = True


class PriceSnapshot(BaseModel):
    """For MongoDB price history"""
    timestamp: datetime
    base_price: Decimal
    current_price: Decimal
    surge_multiplier: Decimal
    available_seats: int
    total_seats: int
    occupancy_rate: float
    triggered_by: str


# ============================================================================
# BOOKING MODELS
# ============================================================================

class BookingCreate(BaseModel):
    flight_id: int
    seats_booked: int = Field(1, ge=1, le=9)
    booking_class: BookingClass = BookingClass.ECONOMY
    special_requests: Optional[str] = None


class Booking(BaseModel):
    booking_id: int
    cust_id: int
    flight_id: int
    seats_booked: int
    total_cost: Decimal
    booking_date: datetime
    status: BookingStatus
    booking_class: BookingClass
    special_requests: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookingDetail(BaseModel):
    booking_id: int
    flight_code: str
    origin: str
    destination: str
    departure: datetime
    arrival: datetime
    seats_booked: int
    booking_class: BookingClass
    total_cost: Decimal
    status: BookingStatus
    payment_status: Optional[PaymentStatus]


# ============================================================================
# PAYMENT MODELS
# ============================================================================

class PaymentCreate(BaseModel):
    booking_id: int
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod


class Payment(BaseModel):
    payment_id: int
    booking_id: int
    cust_id: int
    amount: Decimal
    payment_method: PaymentMethod
    transaction_id: Optional[str]
    status: PaymentStatus
    payment_date: datetime

    class Config:
        from_attributes = True


# ============================================================================
# REVIEW MODELS
# ============================================================================

class ReviewCreate(BaseModel):
    flight_id: int
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=100)
    comment: Optional[str] = None
    meal_rating: Optional[int] = Field(None, ge=1, le=5)
    service_rating: Optional[int] = Field(None, ge=1, le=5)
    comfort_rating: Optional[int] = Field(None, ge=1, le=5)


class Review(BaseModel):
    review_id: int
    flight_id: int
    cust_id: int
    booking_id: Optional[int]
    rating: int
    title: Optional[str]
    comment: Optional[str]
    meal_rating: Optional[int]
    service_rating: Optional[int]
    comfort_rating: Optional[int]
    helpful_count: int
    review_date: datetime
    status: str

    class Config:
        from_attributes = True


class ReviewDetail(BaseModel):
    review_id: int
    customer_name: str
    rating: int
    title: Optional[str]
    comment: Optional[str]
    meal_rating: Optional[int]
    service_rating: Optional[int]
    comfort_rating: Optional[int]
    helpful_count: int
    review_date: datetime


# ============================================================================
# LOYALTY MODELS
# ============================================================================

class LoyaltyTransaction(BaseModel):
    transaction_id: int
    cust_id: int
    points: int
    transaction_type: TransactionType
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoyaltyRedemption(BaseModel):
    points: int = Field(..., gt=0)
    description: str


# ============================================================================
# ANALYTICS MODELS
# ============================================================================

class RevenueReport(BaseModel):
    report_date: date
    total_bookings: int
    total_seats: int
    total_revenue: Decimal
    avg_booking_value: Decimal
    cancellation_count: int


class RoutePerformance(BaseModel):
    route: str
    flight_count: int
    total_bookings: int
    total_revenue: Decimal
    avg_occupancy: float


class FlightReviewSummary(BaseModel):
    flight_id: int
    flight_code: str
    origin: str
    destination: str
    total_reviews: int
    avg_rating: float
    avg_meal_rating: Optional[float]
    avg_service_rating: Optional[float]
    avg_comfort_rating: Optional[float]
    positive_reviews: int
    negative_reviews: int


# ============================================================================
# MONGODB MODELS (For NoSQL collections)
# ============================================================================

class CustomerActivity(BaseModel):
    """Single activity in customer behavior log"""
    action: str
    timestamp: datetime
    details: Optional[dict] = None


class CustomerBehavior(BaseModel):
    """Customer behavior document for MongoDB"""
    customer_id: int
    session_id: str
    device_info: Optional[dict] = None
    activities: List[CustomerActivity] = []
    search_history: List[dict] = []
    abandoned_carts: List[dict] = []
    session_start: datetime
    session_end: Optional[datetime] = None
    is_active: bool = True


class AIPricingInsight(BaseModel):
    """AI pricing insight document for MongoDB"""
    flight_id: int
    flight_code: str
    route: dict
    predictions: dict
    market_factors: dict
    historical_analysis: dict
    recommendations: List[dict] = []
    model_version: str
    generated_at: datetime
    expires_at: datetime


class CachedFlight(BaseModel):
    """Cached flight data for MongoDB"""
    cache_key: str
    flight_id: int
    flight_code: str
    data: dict
    search_metadata: dict
    created_at: datetime
    ttl: datetime
