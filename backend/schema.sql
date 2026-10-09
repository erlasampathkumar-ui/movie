-- ==============================================================================
-- CineRed Movie Booking App - PostgreSQL / MySQL Database Schema
-- ==============================================================================

-- 1. Users & Profiles Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(50) DEFAULT 'Hyderabad',
    membership VARCHAR(50) DEFAULT 'Ruby Red VIP Cinephile',
    points INT DEFAULT 1850,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Movies Table
CREATE TABLE IF NOT EXISTS movies (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    telugu_title VARCHAR(150),
    rating VARCHAR(10),
    duration VARCHAR(20),
    certificate VARCHAR(20),
    synopsis TEXT,
    poster_url VARCHAR(255),
    backdrop_url VARCHAR(255),
    filling_percent INT DEFAULT 88,
    filling_status VARCHAR(50) DEFAULT 'FILLING FAST! 🔥'
);

-- 3. Bookings Table (Stores confirmed tickets)
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(50) UNIQUE NOT NULL,
    movie_id VARCHAR(50) REFERENCES movies(id),
    user_id INT REFERENCES users(id),
    theatre VARCHAR(150) NOT NULL,
    format VARCHAR(50) DEFAULT '4K DOLBY ATMOS',
    show_date VARCHAR(50) NOT NULL,
    show_time VARCHAR(20) NOT NULL,
    seats TEXT NOT NULL, -- e.g. "B6, B7"
    seat_type VARCHAR(50) DEFAULT 'Platinum Recliner',
    ticket_count INT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    taxes DECIMAL(10, 2) NOT NULL,
    food_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    qr_code_seed VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Initial Seed Data
INSERT INTO users (id, name, email, phone, city, membership, points)
VALUES (1, 'Arjun Reddy', 'arjun.cinephile@redcinema.in', '+91 98765 43210', 'Hyderabad', 'Ruby Red VIP Cinephile', 1850)
ON CONFLICT (id) DO NOTHING;

INSERT INTO movies (id, title, telugu_title, rating, duration, certificate, synopsis, poster_url, backdrop_url, filling_percent, filling_status)
VALUES 
('devara', 'Devara: Part 1', 'దేవర: పార్ట్ 1', '9.2', '2h 58m', 'U/A 16+', 'Set along a fierce and treacherous coastline, a fearless warrior named Devara rises to protect his people.', 'assets/images/devara.jpg', 'assets/images/devara_backdrop.webp', 88, 'FILLING FAST! 🔥'),
('aravinda-sametha', 'Aravinda Sametha Veera Raghava', 'అరవింద సమేత వీర రాఘవ', '8.9', '2h 42m', 'U/A', 'Haunted by decades of violent faction feuds in Rayalaseema, a young prince of vengeance embarks on a journey of peace.', 'assets/images/aravinda_sametha.jpg', 'assets/images/aravinda_backdrop.jpg', 94, 'ALMOST FULL! ⚡')
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Bookings
INSERT INTO bookings (booking_id, movie_id, user_id, theatre, format, show_date, show_time, seats, seat_type, ticket_count, base_price, taxes, food_amount, total_paid, payment_method, qr_code_seed, status)
VALUES 
('RED-DVR-98214', 'devara', 1, 'AMB Cinemas: Screen 1 VIP, Gachibowli', 'IMAX 2D (Telugu)', 'Yesterday, Oct 7', '06:45 PM', 'B6, B7', 'Platinum Recliner', 2, 700.00, 95.00, 240.00, 1035.00, 'UPI (Google Pay)', 'RED-DVR-98214-AMB-B6B7', 'Completed'),
('RED-ASV-51208', 'aravinda-sametha', 1, 'Prasads Multiplex: Large Screen, Khairatabad', '4K DOLBY ATMOS', 'Oct 4, 2026', '10:15 PM', 'E9, E10, E11', 'Gold Prime', 3, 750.00, 132.00, 0.00, 882.00, 'HDFC Credit Card (•••• 4920)', 'RED-ASV-51208-PRASADS-E9E10E11', 'Completed')
ON CONFLICT (booking_id) DO NOTHING;
