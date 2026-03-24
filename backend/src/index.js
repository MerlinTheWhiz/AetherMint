const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const quizRoutes = require('./routes/quizRoutes');
const eventLoggerRoutes = require('./routes/eventLoggerRoutes');
const syncRoutes = require('./routes/syncRoutes');
const contentRoutes = require('./routes/content');
const transactionRoutes = require('./routes/transactions');
const searchRoutes = require('./routes/search');

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
app.use('/api/sync', syncRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/search', searchRoutes());

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

// Initialize Transaction Queue System
const transactionQueue = require('./services/transactionQueue');
const transactionProcessor = require('./workers/transactionProcessor');
const transactionEvents = require('./events/transactionEvents');

// Start server
const PORT = process.env.PORT || 3001;

async function startServer () {
  try {
    // Initialize transaction system components
    await transactionQueue.initialize();
    await transactionProcessor.initialize();
    await transactionEvents.initialize();

    // Start transaction processing
    await transactionQueue.startProcessing();
    await transactionProcessor.start();
    await transactionEvents.startListening();

    app.listen(PORT, () => {
      console.log(`🚀 AetherMint Education Backend running on port ${PORT}`);
      console.log(`📚 Quiz Management API available at /api/quizzes`);
      console.log(`📊 Event Logger API available at /api/events`);
      console.log(`🔄 Sync API available at /api/sync`);
      console.log(`📁 Content Management API available at /api/content`);
      console.log(`💰 Transaction Queue API available at /api/transactions`);
      console.log(`🔎 Search and Discovery API available at /api/search`);
      console.log(`🏥 Health check available at /api/health`);
      console.log(`✅ Transaction Queue System initialized successfully`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await transactionQueue.stopProcessing();
  await transactionProcessor.stop();
  await transactionEvents.stopListening();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await transactionQueue.stopProcessing();
  await transactionProcessor.stop();
  await transactionEvents.stopListening();
  process.exit(0);
});

startServer();

module.exports = app;
