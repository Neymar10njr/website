-- SQL script to seed initial data for TrekNest Bhutan database

-- Insert initial users
INSERT INTO users (username, password, email, role, created_at, updated_at) VALUES
('tourist1', 'hashed_password1', 'tourist1@example.com', 'tourist', NOW(), NOW()),
('host1', 'hashed_password2', 'host1@example.com', 'host', NOW(), NOW()),
('admin', 'hashed_password3', 'admin@example.com', 'admin', NOW(), NOW());

-- Insert initial trekking routes
INSERT INTO treks (name, description, difficulty, duration, created_at, updated_at) VALUES
('Paro Taktsang Trek', 'A beautiful trek to the iconic Tiger’s Nest Monastery.', 'Moderate', '5 hours', NOW(), NOW()),
('Druk Path Trek', 'A scenic trek between Paro and Thimphu.', 'Moderate', '6 days', NOW(), NOW()),
('Jomolhari Trek', 'A stunning trek with views of Mount Jomolhari.', 'Challenging', '8 days', NOW(), NOW());

-- Insert initial accommodations
INSERT INTO accommodations (name, location, description, price_per_night, capacity, created_at, updated_at) VALUES
('Tashi Guest House', 'Paro', 'A cozy guest house with beautiful views.', 50, 10, NOW(), NOW()),
('Thimphu Lodge', 'Thimphu', 'Comfortable lodge in the heart of the city.', 70, 20, NOW(), NOW()),
('Punakha Retreat', 'Punakha', 'A peaceful retreat by the river.', 60, 15, NOW(), NOW());

-- Insert initial bookings
INSERT INTO bookings (user_id, accommodation_id, check_in_date, check_out_date, created_at, updated_at) VALUES
(1, 1, '2023-05-01', '2023-05-05', NOW(), NOW()),
(1, 2, '2023-06-10', '2023-06-15', NOW(), NOW()),
(2, 3, '2023-07-20', '2023-07-25', NOW(), NOW());

-- Insert initial images
INSERT INTO master_images (image_name, image_path, section, is_active, created_at, updated_at) VALUES
('Tiger Nest', '/uploads/tiger_nest.jpg', 'homepage', TRUE, NOW(), NOW()),
('Druk Path', '/uploads/druk_path.jpg', 'route', TRUE, NOW(), NOW()),
('Jomolhari', '/uploads/jomolhari.jpg', 'route', TRUE, NOW(), NOW());