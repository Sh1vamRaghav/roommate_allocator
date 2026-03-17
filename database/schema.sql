-- USERS table
CREATE TABLE USERS (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN'))
);

-- PREFERENCES table
CREATE TABLE PREFERENCES (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES USERS(user_id) ON DELETE CASCADE,
    sleep_time TIME,
    wake_time TIME,
    preferred_study_noise_level INTEGER,
    guest_visits_per_month INTEGER,
    preferred_room_temperature INTEGER
);

-- ROOMS table (seed 25 rooms, cap 2-4)
CREATE TABLE ROOMS (
    room_id SERIAL PRIMARY KEY,
    capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 4)
);

-- Insert 25 sample rooms with capacities 2-4
INSERT INTO ROOMS (capacity) VALUES 
(2),(2),(2),(2),(2),(2),(2),(2),(2),(2),
(3),(3),(3),(3),(3),(3),(3),(3),
(4),(4),(4),(4),(4),(4),(4);

-- ALLOCATIONS table
CREATE TABLE ALLOCATIONS (
    allocation_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES USERS(user_id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES ROOMS(room_id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

-- Indexes for perf
CREATE INDEX idx_users_email ON USERS(email);
CREATE INDEX idx_preferences_user ON PREFERENCES(user_id);
CREATE INDEX idx_allocations_user ON ALLOCATIONS(user_id);
CREATE INDEX idx_allocations_room ON ALLOCATIONS(room_id);
