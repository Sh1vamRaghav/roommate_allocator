# Roommate Compatibility & Automatic Room Allocation System

A three-tier web application built for the Software Engineering course project.  
**Architecture:** Presentation Layer (HTML/CSS/JS) → Application Layer (Node.js/Express) → Data Layer (PostgreSQL)

---

## Requirements Implemented

| REQ ID | Description | Module |
|--------|-------------|--------|
| REQ-1  | User registration | `authController.js` → `register()` |
| REQ-2  | User login with JWT | `authController.js` → `login()` |
| REQ-3  | Prevent unauthorized access (RBAC) | `middleware/auth.js` → `verifyJWT`, `checkRole` |
| REQ-4  | Display login error messages | `authController.js` + `login.html` |
| REQ-5  | Display personal information | `studentController.js` → `getProfile()` |
| REQ-6  | Display preference information | `studentController.js` → `getPreferences()` |
| REQ-7  | Update personal information | `studentController.js` → `updateProfile()` |
| REQ-8  | Update preference information | `studentController.js` → `updatePreferences()` |
| REQ-9  | Validate updated information | `express-validator` in `authController`, `studentController` |
| REQ-10 | Admin initiates allocation | `routes/admin.js` → `POST /run-allocation` |
| REQ-11 | Assign students to rooms (greedy algorithm) | `allocationService.js` → `runAllocation()` |
| REQ-12 | Store allocation results | `allocationService.js` — committed transactionally to `ALLOCATIONS` |
| REQ-13 | Students view assigned room | `studentController.js` → `getMyRoom()` |

---

## Known Limitations

- No email verification — registration accepts any well-formed email address (not an SRS requirement)
- No password reset flow — passwords must be changed directly in the database
- JWT tokens expire after 7 days; there is no refresh token mechanism
- Allocation is all-or-nothing — if there are more students than available beds, the overflow students remain unallocated
- The system is a course project and has not been hardened for production use (no rate limiting, no HTTPS termination, no monitoring)

---

## System Requirements

| Dependency | Version | Notes |
|------------|---------|-------|
| Node.js    | ≥ 18    | Required |
| npm        | ≥ 9     | Comes with Node.js |
| PostgreSQL | ≥ 14    | Must be running before starting the app |
| ngrok      | any     | Only needed to share the app over the internet |

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd <project-folder>
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Set up the database

Create a PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE roommate_db;"
```

Run the schema (creates all tables and seeds 25 rooms):

```bash
psql -U postgres -d roommate_db -f database/schema.sql
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` — the only value you must change is `JWT_SECRET`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=roommate_db
DB_USER=postgres
DB_PASS=your_postgres_password
JWT_SECRET=change_this_to_any_long_random_string
PORT=3000
```

### 5. Start the server

```bash
npm start
```

The app is now running at **http://localhost:3000**

---

## Sharing via ngrok

To share the running app with the evaluating team over the internet:

### First time only — authenticate ngrok

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```
Get your token from https://dashboard.ngrok.com/get-started/your-authtoken (free account).

### Start the tunnel

```bash
ngrok http 3000
```

ngrok will print a public URL like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

Share that URL with the evaluating team. The app works identically through ngrok — all routes, login, allocation, everything.

> **Note:** Keep both the `npm start` terminal and the `ngrok` terminal running at the same time. If you restart ngrok, you get a new URL.

---

## Test Credentials

There are no pre-seeded accounts — register fresh accounts using the UI:

| Step | Action |
|------|--------|
| 1 | Go to `/register`, create a **Student** account (leave "Register as Admin" unchecked) |
| 2 | Go to `/register`, create an **Admin** account (check "Register as Admin") |
| 3 | Log in as the student → go to **Preferences** → fill in all five fields → Save |
| 4 | Log in as the admin → click **Run allocation** |
| 5 | Log in as the student → go to **My Room** → see assigned room |

Repeat step 1 with multiple students for a more meaningful allocation result.

---

## Feature Walkthrough

### Student flow
1. **Register** — name, email, password (min 6 chars)
2. **Login** — redirected automatically to student dashboard
3. **Profile** — view and update name/email
4. **Preferences** — set sleep time, wake time, noise level (0–10), guest visits/month (0–31), room temperature (15–30°C)
5. **My Room** — view assigned room number, capacity, and roommates after admin runs allocation

### Admin flow
1. **Login** with an admin account — redirected to admin dashboard
2. **All Students** table — view every registered student with their submitted preferences
3. **Run Allocation** — clears existing assignments, runs greedy similarity algorithm, shows result summary
4. **Current Allocations** table — view all room assignments grouped by room

---

## API Reference

All protected routes require `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register new account |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/student/profile` | Student | Fetch own profile |
| PUT | `/api/student/profile` | Student | Update name/email |
| GET | `/api/student/preferences` | Student | Fetch own preferences |
| PUT | `/api/student/preferences` | Student | Save preferences |
| GET | `/api/student/my-room` | Student | View assigned room |
| GET | `/api/admin/students` | Admin | List all students + preferences |
| GET | `/api/admin/allocations` | Admin | List all allocations |
| POST | `/api/admin/run-allocation` | Admin | Clear and re-run allocation |

---

## Project Structure

```
├── backend/
│   ├── controllers/
│   │   ├── authController.js      # REQ-1, REQ-2, REQ-4, REQ-9
│   │   ├── studentController.js   # REQ-5, REQ-6, REQ-7, REQ-8, REQ-9, REQ-13
│   │   └── adminController.js     # REQ-10, REQ-11, REQ-12
│   ├── middleware/
│   │   └── auth.js                # REQ-3 (verifyJWT, checkRole)
│   ├── models/
│   │   └── db.js                  # PostgreSQL connection pool
│   ├── routes/
│   │   ├── auth.js                # /api/auth/*
│   │   ├── student.js             # /api/student/*
│   │   └── admin.js               # /api/admin/* (ADMIN only)
│   ├── services/
│   │   └── allocationService.js   # REQ-11 greedy algorithm, REQ-12 transaction
│   └── .env.example
├── database/
│   └── schema.sql                 # D-DB-01: all tables, constraints, indexes
└── frontend/
    ├── index.html
    ├── login.html
    ├── register.html
    ├── student-dashboard.html
    ├── admin-dashboard.html
    ├── script.js
    └── style.css
```

---

## Tech Stack

- **Backend:** Node.js, Express, pg, bcryptjs, jsonwebtoken, express-validator, helmet, dotenv
- **Frontend:** Vanilla HTML/CSS/JS, localStorage for JWT
- **Database:** PostgreSQL 14+
- **Sharing:** ngrok

---

*University of Delhi — Department of Computer Science & Engineering — SE Project 2026*