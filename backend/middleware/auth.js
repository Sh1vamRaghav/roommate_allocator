const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied. Please log in.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { user_id, role }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
};

const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { verifyJWT, checkRole };
