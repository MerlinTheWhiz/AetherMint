const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/index');

// Mock external dependencies
jest.mock('@stellar/stellar-sdk');
jest.mock('ipfs-http-client');
jest.mock('redis');

let mongoServer;

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB for testing
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.STELLAR_NETWORK = 'testnet';
});

// Global test teardown
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Database cleanup between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  // Create authenticated request
  authenticatedRequest: (token) => {
    return request(app)
      .set('Authorization', `Bearer ${token}`);
  },
  
  // Generate test JWT token
  generateTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { 
        userId: 'test-user-id', 
        address: 'GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP',
        ...payload 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
  
  // Generate test Stellar address
  generateStellarAddress: () => {
    return 'GD' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15).toUpperCase();
  },
  
  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock IPFS response
  mockIPFSResponse: (data) => ({
    cid: 'QmTest123456789',
    size: JSON.stringify(data).length,
    data: Buffer.from(JSON.stringify(data))
  }),
  
  // Mock Stellar transaction
  mockStellarTransaction: () => ({
    toXDR: () => 'mock-transaction-xdr',
    hash: () => 'mock-transaction-hash',
    sign: jest.fn(),
    submit: jest.fn().mockResolvedValue({ successful: true })
  })
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
