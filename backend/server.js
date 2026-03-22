require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./models/db');

const { verifyJWT, checkRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"]
    }
  }
})); 
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // Serve frontend static

// Routes
app.use('/api/auth', authRoutes); // public
app.use('/api', verifyJWT, studentRoutes); // student protected
app.use('/api/admin', [verifyJWT, checkRole(['ADMIN'])], adminRoutes); // admin

// Root - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend/index.html'));
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'OK', db: 'connected' });
  } catch (err) {
    res.status(500).json({ error: 'DB connection failed' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// 404 for static not found
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const startServer = async () => {
  try {
    await db.query('SELECT 1'); // Test DB
    console.log('DB connected');
    app.listen(PORT, () => console.log(`Server on port ${PORT}`));
  } catch (err) {
    console.error('DB connect fail:', err);
  }
};

startServer();

module.exports = app;

