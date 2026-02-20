const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const quizRoutes = require('./routes/quizRoutes');
const eventLoggerRoutes = require('./routes/eventLoggerRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/events', eventLoggerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AetherMint Education Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 AetherMint Education Backend running on port ${PORT}`);
  console.log(`📚 Quiz Management API available at /api/quizzes`);
  console.log(`📊 Event Logger API available at /api/events`);
  console.log(`🏥 Health check available at /api/health`);
});

module.exports = app;
