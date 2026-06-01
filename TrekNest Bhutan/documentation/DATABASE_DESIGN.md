# DATABASE DESIGN

## Overview

The database design for the TrekNest Bhutan platform is structured to support the core functionalities of the application, including user management, trekking routes, accommodations, and bookings. The design follows a relational database model using MySQL.

## Entity-Relationship Diagram (ERD)

[Insert ERD diagram here if available]

## Database Tables

### 1. Users Table

- **Table Name**: `users`
- **Description**: Stores user information for both tourists and guest house owners.

| Column Name     | Data Type      | Constraints          |
|------------------|----------------|----------------------|
| id               | INT            | PRIMARY KEY, AUTO_INCREMENT |
| username         | VARCHAR(50)    | UNIQUE, NOT NULL     |
| password_hash    | VARCHAR(255)   | NOT NULL             |
| email            | VARCHAR(100)   | UNIQUE, NOT NULL     |
| role             | ENUM('tourist', 'host', 'admin') | NOT NULL |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP |
| updated_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### 2. Treks Table

- **Table Name**: `treks`
- **Description**: Contains information about trekking routes.

| Column Name     | Data Type      | Constraints          |
|------------------|----------------|----------------------|
| id               | INT            | PRIMARY KEY, AUTO_INCREMENT |
| name             | VARCHAR(100)   | NOT NULL             |
| description      | TEXT           | NOT NULL             |
| difficulty       | ENUM('easy', 'medium', 'hard') | NOT NULL |
| duration         | INT            | NOT NULL             |
| dzongkhag        | VARCHAR(50)    | NOT NULL             |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP |
| updated_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### 3. Accommodations Table

- **Table Name**: `accommodations`
- **Description**: Stores information about guest houses and their availability.

| Column Name     | Data Type      | Constraints          |
|------------------|----------------|----------------------|
| id               | INT            | PRIMARY KEY, AUTO_INCREMENT |
| name             | VARCHAR(100)   | NOT NULL             |
| owner_id         | INT            | FOREIGN KEY REFERENCES users(id) |
| description      | TEXT           | NOT NULL             |
| price            | DECIMAL(10, 2) | NOT NULL             |
| capacity         | INT            | NOT NULL             |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP |
| updated_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### 4. Bookings Table

- **Table Name**: `bookings`
- **Description**: Manages room reservations made by users.

| Column Name     | Data Type      | Constraints          |
|------------------|----------------|----------------------|
| id               | INT            | PRIMARY KEY, AUTO_INCREMENT |
| user_id          | INT            | FOREIGN KEY REFERENCES users(id) |
| accommodation_id  | INT            | FOREIGN KEY REFERENCES accommodations(id) |
| start_date       | DATE           | NOT NULL             |
| end_date         | DATE           | NOT NULL             |
| status           | ENUM('confirmed', 'pending', 'canceled') | NOT NULL |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP |
| updated_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### 5. Master Images Table

- **Table Name**: `master_images`
- **Description**: Stores images for dynamic content management.

| Column Name     | Data Type      | Constraints          |
|------------------|----------------|----------------------|
| id               | INT            | PRIMARY KEY, AUTO_INCREMENT |
| image_name       | VARCHAR(255)   | NOT NULL             |
| image_path       | VARCHAR(255)   | NOT NULL             |
| section          | ENUM('homepage', 'route', 'dzongkhag', 'accommodation') | NOT NULL |
| is_active        | BOOLEAN        | DEFAULT TRUE         |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP |
| updated_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

## Conclusion

This database design provides a solid foundation for the TrekNest Bhutan platform, ensuring efficient data management and retrieval for all core functionalities. Future enhancements may include additional tables or modifications to existing structures as the application evolves.