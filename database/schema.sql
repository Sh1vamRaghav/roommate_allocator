-- =============================================================================
-- schema.sql
-- Data Layer — Database Schema
--
-- Requirement Traceability:
--   REQ-1  → USERS table              — stores registered user accounts
--   REQ-2  → USERS.password_hash      — hashed credentials for login
--   REQ-3  → USERS.role               — STUDENT/ADMIN drives RBAC in middleware
--   REQ-5  → USERS (name, email)      — personal information displayed to student
--   REQ-6  → PREFERENCES table        — lifestyle preference data
--   REQ-8  → PREFERENCES table        — preferences updated by student
--   REQ-11 → PREFERENCES + ROOMS      — inputs to the allocation algorithm
--   REQ-12 → ALLOCATIONS table        — stores allocation results
--   REQ-13 → ALLOCATIONS + ROOMS      — student views their assigned room
--
-- Design Traceability:
--   D-DB-01  → Exact tables specified in SDD Section 7.3
--   D-CL-01  → User class attributes → USERS columns
--   D-CL-01  → Preference class attributes → PREFERENCES columns
--   D-CL-02  → Room.checkAvailability() → ROOMS.capacity constraint
--   D-CL-02  → Allocation.assignRoom() → ALLOCATIONS INSERT
--   D-SEC-02 → All FK constraints and UNIQUE constraints enforce data integrity
-- =============================================================================

-- ── REQ-1 / REQ-2 / REQ-3 / D-CL-01 / D-DB-01 ──────────────────────────────
-- USERS: stores authentication credentials and role for all system users.
-- D-CL-01: corresponds to User class (user_id, name, email, password, role)
-- D-SEC-01: password stored as bcrypt hash (password_hash), never plain text
CREATE TABLE USERS (
    user_id       SERIAL PRIMARY KEY,                              -- D-CL-01: User.user_id
    name          VARCHAR(255) NOT NULL,                           -- D-CL-01: User.name
    email         VARCHAR(255) UNIQUE NOT NULL,                    -- D-CL-01: User.email; UNIQUE enforces REQ-1
    password_hash VARCHAR(255) NOT NULL,                           -- D-SEC-01: bcrypt hash of password
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('STUDENT', 'ADMIN'))  -- REQ-3 / D-CL-01: User.role
);

-- ── REQ-6 / REQ-8 / REQ-11 / D-CL-01 (Preference class) / D-DB-01 ──────────
-- PREFERENCES: one row per student storing all five lifestyle preference fields.
-- D-CL-01: corresponds to Preference class attributes
-- Used as input to the similarity scoring algorithm (REQ-11 / D-CL-02)
CREATE TABLE PREFERENCES (
    preference_id              SERIAL PRIMARY KEY,
    user_id                    INTEGER REFERENCES USERS(user_id) ON DELETE CASCADE UNIQUE,  -- FK → USERS; UNIQUE = one row per user
    sleep_time                 TIME,                -- D-CL-01: Preference.sleep_time
    wake_time                  TIME,                -- D-CL-01: Preference.wake_time
    preferred_study_noise_level INTEGER,            -- D-CL-01: Preference.study_noise_level (0–10)
    guest_visits_per_month     INTEGER,             -- D-CL-01: Preference.guest_visits_per_month (0–31)
    preferred_room_temperature INTEGER              -- D-CL-01: Preference.preferred_temp (15–30)
);

-- ── REQ-11 / REQ-12 / REQ-13 / D-CL-02 (Room class) / D-DB-01 ──────────────
-- ROOMS: pre-seeded with 25 rooms of varying capacity.
-- D-CL-02: Room.room_id, Room.capacity, Room.checkAvailability()
-- Capacity drives how many students the allocation algorithm assigns per room (REQ-11)
CREATE TABLE ROOMS (
    room_id  SERIAL PRIMARY KEY,
    capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 4)  -- D-CL-02: capacity ∈ {1,2,3,4}
);

-- REQ-11 / D-DB-01: Seed 25 sample rooms (10×double, 8×triple, 7×quad) — total 72 beds
INSERT INTO ROOMS (capacity) VALUES
(2),(2),(2),(2),(2),(2),(2),(2),(2),(2),   -- 10 double rooms
(3),(3),(3),(3),(3),(3),(3),(3),            --  8 triple rooms
(4),(4),(4),(4),(4),(4),(4);               --  7 quad rooms

-- ── REQ-12 / REQ-13 / D-CL-02 (Allocation class) / D-DB-01 ─────────────────
-- ALLOCATIONS: stores the output of the allocation algorithm.
-- D-CL-02: Allocation.allocation_id, Allocation.assignRoom(), Allocation.removeAllocation()
-- UNIQUE(user_id) ensures each student is assigned to at most one room (REQ-11 invariant)
CREATE TABLE ALLOCATIONS (
    allocation_id SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES USERS(user_id) ON DELETE CASCADE,  -- FK → USERS
    room_id       INTEGER REFERENCES ROOMS(room_id) ON DELETE CASCADE,  -- FK → ROOMS
    UNIQUE(user_id)                                                      -- one room per student
);

-- ── Performance Indexes / D-DB-01 ───────────────────────────────────────────
-- Support fast lookups in all JOIN and WHERE clauses used by controllers
CREATE INDEX idx_users_email        ON USERS(email);           -- REQ-1/REQ-2: login lookup
CREATE INDEX idx_preferences_user   ON PREFERENCES(user_id);  -- REQ-6/REQ-8: preference fetch
CREATE INDEX idx_allocations_user   ON ALLOCATIONS(user_id);  -- REQ-13: my-room lookup
CREATE INDEX idx_allocations_room   ON ALLOCATIONS(room_id);  -- REQ-11: room fill check