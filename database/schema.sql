-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(80),
    last_name VARCHAR(80),
    user_type VARCHAR(20) DEFAULT 'tourist',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Treks Table
CREATE TABLE IF NOT EXISTS treks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20),
    duration_days INT,
    distance_km FLOAT,
    dzongkhag VARCHAR(50) NOT NULL,
    altitude_start INT,
    altitude_end INT,
    best_season VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trek Stops Table
CREATE TABLE IF NOT EXISTS trek_stops (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trek_id INT NOT NULL,
    stop_name VARCHAR(120) NOT NULL,
    stop_order INT,
    altitude INT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trek_id) REFERENCES treks(id)
);

-- Accommodations Table
CREATE TABLE IF NOT EXISTS accommodations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_id INT NOT NULL,
    trek_stop_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    phone VARCHAR(20),
    rating FLOAT DEFAULT 0.0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (trek_stop_id) REFERENCES trek_stops(id)
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    accommodation_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(50),
    capacity INT NOT NULL,
    price_per_night FLOAT NOT NULL,
    amenities TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accommodation_id) REFERENCES accommodations(id)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    accommodation_id INT NOT NULL,
    check_in_date DATETIME NOT NULL,
    check_out_date DATETIME NOT NULL,
    number_of_guests INT NOT NULL,
    total_price FLOAT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    special_requests TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (accommodation_id) REFERENCES accommodations(id)
);

-- Master Images Table
CREATE TABLE IF NOT EXISTS master_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    image_name VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    section VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);