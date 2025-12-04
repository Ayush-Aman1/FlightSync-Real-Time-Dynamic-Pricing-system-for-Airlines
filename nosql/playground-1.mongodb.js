// ============================================================================
// FlightSync - MongoDB Collection Schemas
// NoSQL structure for analytics, behavior tracking, and caching
// ============================================================================

// ============================================================================
// 1. PRICE HISTORY COLLECTION
// Stores historical price snapshots for trend analysis
// ============================================================================

db.createCollection("price_history", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["flight_id", "flight_code", "price_snapshots"],
      properties: {
        flight_id: {
          bsonType: "int",
          description: "Reference to SQL flights table",
        },
        flight_code: {
          bsonType: "string",
          description: "Flight code for quick lookup",
        },
        route: {
          bsonType: "object",
          properties: {
            origin: { bsonType: "string" },
            destination: { bsonType: "string" },
          },
        },
        price_snapshots: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["timestamp", "current_price", "available_seats"],
            properties: {
              timestamp: { bsonType: "date" },
              base_price: { bsonType: "decimal" },
              current_price: { bsonType: "decimal" },
              surge_multiplier: { bsonType: "decimal" },
              available_seats: { bsonType: "int" },
              total_seats: { bsonType: "int" },
              occupancy_rate: { bsonType: "decimal" },
              triggered_by: { bsonType: "string" },
            },
          },
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
      },
    },
  },
});

// Indexes for price_history
db.price_history.createIndex({ flight_id: 1 }, { unique: true });
db.price_history.createIndex({ flight_code: 1 });
db.price_history.createIndex({ "route.origin": 1, "route.destination": 1 });
db.price_history.createIndex({ "price_snapshots.timestamp": -1 });

// ============================================================================
// 2. CUSTOMER BEHAVIOR LOGS COLLECTION
// Tracks user interactions for personalization and analytics
// ============================================================================

db.createCollection("customer_behavior", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customer_id", "session_id"],
      properties: {
        customer_id: {
          bsonType: "int",
          description: "Reference to SQL customers table",
        },
        session_id: {
          bsonType: "string",
          description: "Unique session identifier",
        },
        device_info: {
          bsonType: "object",
          properties: {
            device_type: { bsonType: "string" },
            browser: { bsonType: "string" },
            os: { bsonType: "string" },
            ip_address: { bsonType: "string" },
          },
        },
        activities: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["action", "timestamp"],
            properties: {
              action: {
                bsonType: "string",
                enum: [
                  "search",
                  "view_flight",
                  "add_to_cart",
                  "remove_from_cart",
                  "abandoned_booking",
                  "completed_booking",
                  "view_price",
                  "filter_applied",
                  "sort_applied",
                  "page_view",
                ],
              },
              timestamp: { bsonType: "date" },
              details: {
                bsonType: "object",
                properties: {
                  flight_id: { bsonType: "int" },
                  flight_code: { bsonType: "string" },
                  origin: { bsonType: "string" },
                  destination: { bsonType: "string" },
                  search_date: { bsonType: "date" },
                  passengers: { bsonType: "int" },
                  price_seen: { bsonType: "decimal" },
                  time_spent_seconds: { bsonType: "int" },
                  filters: { bsonType: "object" },
                },
              },
            },
          },
        },
        search_history: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              origin: { bsonType: "string" },
              destination: { bsonType: "string" },
              travel_date: { bsonType: "date" },
              passengers: { bsonType: "int" },
              searched_at: { bsonType: "date" },
              results_count: { bsonType: "int" },
            },
          },
        },
        abandoned_carts: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              flight_id: { bsonType: "int" },
              flight_code: { bsonType: "string" },
              price_at_abandonment: { bsonType: "decimal" },
              seats_selected: { bsonType: "int" },
              abandoned_at: { bsonType: "date" },
              step_abandoned: { bsonType: "string" },
            },
          },
        },
        session_start: { bsonType: "date" },
        session_end: { bsonType: "date" },
        is_active: { bsonType: "bool" },
      },
    },
  },
});

// Indexes for customer_behavior
db.customer_behavior.createIndex({ customer_id: 1 });
db.customer_behavior.createIndex({ session_id: 1 }, { unique: true });
db.customer_behavior.createIndex({ "activities.timestamp": -1 });
db.customer_behavior.createIndex({ is_active: 1 });
db.customer_behavior.createIndex({ "abandoned_carts.flight_id": 1 });

// ============================================================================
// 3. FLIGHT REVIEWS COLLECTION
// Stores user-submitted reviews with flexible schema for detailed feedback
// ============================================================================

db.createCollection("flight_reviews", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["flight_id", "customer_id", "rating"],
      properties: {
        flight_id: {
          bsonType: "int",
          description: "Reference to SQL flights table",
        },
        customer_id: {
          bsonType: "int",
          description: "Reference to SQL customers table",
        },
        booking_id: {
          bsonType: "int",
          description: "Reference to SQL bookings table",
        },
        rating: {
          bsonType: "int",
          minimum: 1,
          maximum: 5,
        },
        review: {
          bsonType: "object",
          properties: {
            title: { bsonType: "string" },
            comment: { bsonType: "string" },
            pros: { bsonType: "array", items: { bsonType: "string" } },
            cons: { bsonType: "array", items: { bsonType: "string" } },
            travel_type: {
              bsonType: "string",
              enum: ["business", "leisure", "family", "solo"],
            },
            would_recommend: { bsonType: "bool" },
          },
        },
        category_ratings: {
          bsonType: "object",
          properties: {
            meal: { bsonType: "int", minimum: 1, maximum: 5 },
            service: { bsonType: "int", minimum: 1, maximum: 5 },
            comfort: { bsonType: "int", minimum: 1, maximum: 5 },
            cleanliness: { bsonType: "int", minimum: 1, maximum: 5 },
            entertainment: { bsonType: "int", minimum: 1, maximum: 5 },
            value_for_money: { bsonType: "int", minimum: 1, maximum: 5 },
          },
        },
        flight_details: {
          bsonType: "object",
          properties: {
            flight_code: { bsonType: "string" },
            route: { bsonType: "string" },
            travel_date: { bsonType: "date" },
            booking_class: { bsonType: "string" },
          },
        },
        media: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              type: { bsonType: "string", enum: ["image", "video"] },
              url: { bsonType: "string" },
              caption: { bsonType: "string" },
            },
          },
        },
        helpful_votes: { bsonType: "int" },
        reported: { bsonType: "bool" },
        status: {
          bsonType: "string",
          enum: ["pending", "published", "hidden", "flagged"],
        },
        sentiment_score: { bsonType: "decimal" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
      },
    },
  },
});

// Indexes for flight_reviews
db.flight_reviews.createIndex({ flight_id: 1 });
db.flight_reviews.createIndex({ customer_id: 1 });
db.flight_reviews.createIndex({ rating: -1 });
db.flight_reviews.createIndex({ status: 1 });
db.flight_reviews.createIndex({ helpful_votes: -1 });
db.flight_reviews.createIndex({ created_at: -1 });
db.flight_reviews.createIndex(
  { customer_id: 1, booking_id: 1 },
  { unique: true }
);

// ============================================================================
// 4. AI PRICING INSIGHTS COLLECTION
// Stores outputs from ML models for price recommendations
// ============================================================================

db.createCollection("ai_pricing_insights", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["flight_id", "generated_at"],
      properties: {
        flight_id: {
          bsonType: "int",
          description: "Reference to SQL flights table",
        },
        flight_code: { bsonType: "string" },
        route: {
          bsonType: "object",
          properties: {
            origin: { bsonType: "string" },
            destination: { bsonType: "string" },
          },
        },
        predictions: {
          bsonType: "object",
          properties: {
            optimal_price: { bsonType: "decimal" },
            expected_demand: { bsonType: "int" },
            recommended_surge: { bsonType: "decimal" },
            confidence_score: { bsonType: "decimal" },
            price_elasticity: { bsonType: "decimal" },
            sell_out_probability: { bsonType: "decimal" },
          },
        },
        market_factors: {
          bsonType: "object",
          properties: {
            competitor_prices: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  airline: { bsonType: "string" },
                  price: { bsonType: "decimal" },
                },
              },
            },
            seasonality_factor: { bsonType: "decimal" },
            day_of_week_factor: { bsonType: "decimal" },
            days_to_departure: { bsonType: "int" },
            holiday_indicator: { bsonType: "bool" },
            event_indicator: { bsonType: "string" },
          },
        },
        historical_analysis: {
          bsonType: "object",
          properties: {
            avg_price_30d: { bsonType: "decimal" },
            avg_occupancy_30d: { bsonType: "decimal" },
            price_trend: {
              bsonType: "string",
              enum: ["rising", "falling", "stable"],
            },
            demand_trend: {
              bsonType: "string",
              enum: ["increasing", "decreasing", "stable"],
            },
          },
        },
        recommendations: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              action: { bsonType: "string" },
              reason: { bsonType: "string" },
              expected_impact: { bsonType: "string" },
              priority: { bsonType: "string", enum: ["high", "medium", "low"] },
            },
          },
        },
        model_version: { bsonType: "string" },
        generated_at: { bsonType: "date" },
        expires_at: { bsonType: "date" },
      },
    },
  },
});

// Indexes for ai_pricing_insights
db.ai_pricing_insights.createIndex({ flight_id: 1 });
db.ai_pricing_insights.createIndex({ flight_code: 1 });
db.ai_pricing_insights.createIndex({ generated_at: -1 });
db.ai_pricing_insights.createIndex(
  { expires_at: 1 },
  { expireAfterSeconds: 0 }
);

// ============================================================================
// 5. CACHED FLIGHT DATA COLLECTION
// Fast read-layer cache for frequently accessed flight details
// ============================================================================

db.createCollection("cached_flights", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["cache_key", "data", "created_at", "ttl"],
      properties: {
        cache_key: {
          bsonType: "string",
          description: "Unique cache key (e.g., route_date combination)",
        },
        flight_id: { bsonType: "int" },
        flight_code: { bsonType: "string" },
        data: {
          bsonType: "object",
          properties: {
            origin: { bsonType: "string" },
            destination: { bsonType: "string" },
            dep_time: { bsonType: "date" },
            arr_time: { bsonType: "date" },
            duration_minutes: { bsonType: "int" },
            available_seats: { bsonType: "int" },
            total_seats: { bsonType: "int" },
            current_price: { bsonType: "decimal" },
            base_price: { bsonType: "decimal" },
            surge_multiplier: { bsonType: "decimal" },
            aircraft_model: { bsonType: "string" },
            status: { bsonType: "string" },
            amenities: { bsonType: "array", items: { bsonType: "string" } },
            avg_rating: { bsonType: "decimal" },
            review_count: { bsonType: "int" },
          },
        },
        search_metadata: {
          bsonType: "object",
          properties: {
            route: { bsonType: "string" },
            date: { bsonType: "date" },
            search_count: { bsonType: "int" },
            last_searched: { bsonType: "date" },
          },
        },
        created_at: { bsonType: "date" },
        ttl: { bsonType: "date" },
      },
    },
  },
});

// Indexes for cached_flights
db.cached_flights.createIndex({ cache_key: 1 }, { unique: true });
db.cached_flights.createIndex({ flight_id: 1 });
db.cached_flights.createIndex({ flight_code: 1 });
db.cached_flights.createIndex({ "search_metadata.route": 1 });
db.cached_flights.createIndex({ ttl: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ============================================================================
// SAMPLE QUERIES FOR NOSQL OPERATIONS
// ============================================================================

// 1. Insert price snapshot
// db.price_history.updateOne(
//    { flight_id: 1 },
//    {
//       $push: {
//          price_snapshots: {
//             timestamp: new Date(),
//             current_price: NumberDecimal("4750.00"),
//             base_price: NumberDecimal("4500.00"),
//             surge_multiplier: NumberDecimal("1.05"),
//             available_seats: 145,
//             total_seats: 180,
//             occupancy_rate: NumberDecimal("19.44"),
//             triggered_by: "booking"
//          }
//       },
//       $set: { updated_at: new Date() },
//       $setOnInsert: {
//          flight_code: "FS101",
//          route: { origin: "Bengaluru (BLR)", destination: "Mumbai (BOM)" },
//          created_at: new Date()
//       }
//    },
//    { upsert: true }
// );

// 2. Log customer activity
// db.customer_behavior.updateOne(
//    { session_id: "sess_123456" },
//    {
//       $push: {
//          activities: {
//             action: "view_flight",
//             timestamp: new Date(),
//             details: {
//                flight_id: 1,
//                flight_code: "FS101",
//                origin: "Bengaluru",
//                destination: "Mumbai",
//                price_seen: NumberDecimal("4500.00")
//             }
//          }
//       },
//       $set: { updated_at: new Date(), is_active: true }
//    }
// );

// 3. Get price trend for a flight
// db.price_history.aggregate([
//    { $match: { flight_id: 1 } },
//    { $unwind: "$price_snapshots" },
//    { $sort: { "price_snapshots.timestamp": -1 } },
//    { $limit: 10 },
//    { $project: {
//       timestamp: "$price_snapshots.timestamp",
//       price: "$price_snapshots.current_price",
//       occupancy: "$price_snapshots.occupancy_rate"
//    }}
// ]);

// 4. Get abandoned carts for remarketing
// db.customer_behavior.aggregate([
//    { $match: { "abandoned_carts": { $exists: true, $ne: [] } } },
//    { $unwind: "$abandoned_carts" },
//    { $match: {
//       "abandoned_carts.abandoned_at": {
//          $gte: new Date(Date.now() - 24*60*60*1000)
//       }
//    }},
//    { $lookup: {
//       from: "cached_flights",
//       localField: "abandoned_carts.flight_id",
//       foreignField: "flight_id",
//       as: "flight_info"
//    }}
// ]);

print("MongoDB collections and indexes created successfully!");
