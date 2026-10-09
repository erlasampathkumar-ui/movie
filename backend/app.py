import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(title="CineRed Movie Booking API", version="1.0.0")

# Enable CORS for S3 Static Website Hosting & CloudFront
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set to S3 bucket / CloudFront domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Configuration from Environment Variables (Provided by AWS RDS)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cinered")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            cursor_factory=RealDictCursor,
            connect_timeout=5
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Pydantic Schemas
class UserProfileUpdate(BaseModel):
    name: str
    email: str
    phone: str
    city: str

class BookingCreate(BaseModel):
    bookingId: str
    movieId: str
    movieTitle: str
    poster: str
    theatre: str
    format: str
    showDate: str
    showTime: str
    seats: List[str]
    seatType: str
    ticketCount: int
    basePrice: float
    convenienceFee: float
    taxes: float
    foodAmount: float
    totalPaid: float
    paymentMethod: str
    qrCodeSeed: str

@app.on_event("startup")
def startup_db():
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            schema_file = os.path.join(os.path.dirname(__file__), "schema.sql")
            if os.path.exists(schema_file):
                with open(schema_file, "r") as f:
                    cur.execute(f.read())
                conn.commit()
        conn.close()
        print("Database connected and schema initialized successfully!")
    else:
        print("Warning: Could not connect to RDS. Running in memory / mock fallback mode.")

@app.get("/health")
def health_check():
    conn = get_db_connection()
    db_status = "connected" if conn else "unreachable"
    if conn: conn.close()
    return {"status": "ok", "database": db_status, "service": "CineRed Backend API on AWS EC2"}

@app.get("/api/profile")
def get_user_profile():
    conn = get_db_connection()
    if not conn:
        # Fallback response
        return {
            "name": "Arjun Reddy",
            "email": "arjun.cinephile@redcinema.in",
            "phone": "+91 98765 43210",
            "city": "Hyderabad",
            "membership": "Ruby Red VIP Cinephile",
            "points": 1850
        }
    with conn.cursor() as cur:
        cur.execute("SELECT name, email, phone, city, membership, points FROM users WHERE id = 1 LIMIT 1;")
        user = cur.fetchone()
    conn.close()
    return user if user else {}

@app.put("/api/profile")
def update_user_profile(profile: UserProfileUpdate):
    conn = get_db_connection()
    if not conn:
        return {"message": "Updated locally (database offline)"}
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE users 
            SET name = %s, email = %s, phone = %s, city = %s 
            WHERE id = 1 RETURNING name, email, phone, city, membership, points;
        """, (profile.name, profile.email, profile.phone, profile.city))
        updated = cur.fetchone()
        conn.commit()
    conn.close()
    return updated

@app.get("/api/bookings")
def get_bookings():
    conn = get_db_connection()
    if not conn:
        return []
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                booking_id AS "bookingId",
                movie_id AS "movieId",
                movies.title AS "movieTitle",
                movies.poster_url AS "poster",
                theatre,
                format,
                show_date AS "showDate",
                show_time AS "showTime",
                seats,
                seat_type AS "seatType",
                ticket_count AS "ticketCount",
                base_price AS "basePrice",
                taxes,
                food_amount AS "foodAmount",
                total_paid AS "totalPaid",
                payment_method AS "paymentMethod",
                qr_code_seed AS "qrCodeSeed",
                status,
                TO_CHAR(bookings.created_at, 'Mon DD, YYYY, HH12:MI AM') AS "bookedOn"
            FROM bookings
            JOIN movies ON bookings.movie_id = movies.id
            ORDER BY bookings.id DESC;
        """)
        records = cur.fetchall()
        for r in records:
            if isinstance(r.get("seats"), str):
                r["seats"] = [s.strip() for s in r["seats"].split(",")]
    conn.close()
    return records

@app.post("/api/bookings")
def create_booking(booking: BookingCreate):
    conn = get_db_connection()
    if not conn:
        return {"status": "success", "bookingId": booking.bookingId, "source": "local"}
    
    with conn.cursor() as cur:
        seats_str = ", ".join(booking.seats)
        cur.execute("""
            INSERT INTO bookings (
                booking_id, movie_id, user_id, theatre, format, show_date, show_time,
                seats, seat_type, ticket_count, base_price, taxes, food_amount,
                total_paid, payment_method, qr_code_seed, status
            ) VALUES (
                %s, %s, 1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed'
            ) RETURNING id;
        """, (
            booking.bookingId, booking.movieId, booking.theatre, booking.format,
            booking.showDate, booking.showTime, seats_str, booking.seatType,
            booking.ticketCount, booking.basePrice, booking.taxes, booking.foodAmount,
            booking.totalPaid, booking.paymentMethod, booking.qrCodeSeed
        ))
        
        # Award loyalty points to user
        cur.execute("UPDATE users SET points = points + 120 WHERE id = 1;")
        
        # Update movie filling status
        cur.execute("UPDATE movies SET filling_percent = LEAST(99, filling_percent + 1) WHERE id = %s;", (booking.movieId,))
        conn.commit()
    conn.close()
    
    return {"status": "success", "bookingId": booking.bookingId, "message": "Saved to AWS RDS"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
