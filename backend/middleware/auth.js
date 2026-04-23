/**
 * middleware/auth.js
 * Application Layer — Security Middleware
 *
 * Requirement Traceability:
 *   REQ-3  → verifyJWT()  — prevent unauthorized access to protected routes
 *   REQ-3  → checkRole()  — enforce role-based access control (RBAC)
 *
 * Design Traceability:
 *   D-SEC-01 → JWT verification (jsonwebtoken.verify against JWT_SECRET)
 *   D-SEC-01 → RBAC: role attribute in JWT payload drives access control decisions
 *   D-SQ-01  → Authentication Sequence: token validation step before any protected handler
 *
 * Applied in:
 *   routes/admin.js   → router.use(verifyJWT, checkRole(['ADMIN']))  — REQ-3, REQ-10
 *   routes/student.js → router.use(verifyJWT)                        — REQ-3
 */

const jwt = require('jsonwebtoken');

// ── REQ-3 / D-SEC-01: JWT Verification Middleware ───────────────────────────
// Extracts Bearer token from Authorization header, verifies signature and expiry.
// Attaches decoded payload { user_id, role } to req.user for downstream handlers.
const verifyJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // REQ-3: Reject any request that arrives without a token
  if (!token) return res.status(401).json({ error: 'Access denied. Please log in.' });

  try {
    // D-SEC-01: Verify token signature and expiry against JWT_SECRET from environment
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { user_id, role }
    next();
  } catch (err) {
    // REQ-3: Expired or tampered tokens are rejected — force re-login
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
};

// ── REQ-3 / D-SEC-01: Role-Based Access Control Middleware ──────────────────
// Called after verifyJWT. Checks that req.user.role is in the allowed roles array.
// Used on all admin routes: checkRole(['ADMIN'])
const checkRole = (roles) => (req, res, next) => {
  // D-SEC-01 RBAC: role embedded in JWT at login time — cannot be tampered client-side
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { verifyJWT, checkRole };