import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Redis } from 'ioredis';
import logger from './utils/logger';
import requestLogger from './middleware/requestLogger';
import { connectRedis } from './utils/redis';
import { initWebsocketService } from './services/websocketService';
import { setSyncWebsocketEmitter } from './services/syncService';
import { initCollaborationService } from './services/initCollaboration';
import SecureRealtimeCommunication from './services/secureRealtimeCommunication';

const transactionQueue = require('./services/transactionQueue');
const transactionProcessor = require('./workers/transactionProcessor');
const transactionEvents = require('./events/transactionEvents');

const {
  securityPerformanceTracker,
  checkBlacklist,
  ddosProtection,
  botDetection,
  advancedRestrictions,
  requestSanitizer,
} = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimiter');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

dotenv.config();
connectRedis();

const resolveRoute = (routeModule: any) => routeModule.default || routeModule;

const quizRoutes = resolveRoute(require('./routes/quizRoutes'));
const eventLoggerRoutes = resolveRoute(require('./routes/eventLoggerRoutes'));
const syncRoutes = resolveRoute(require('./routes/syncRoutes'));
const rbacRoutes = resolveRoute(require('./routes/rbacRoutes'));
const contentRoutes = require('./routes/content');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = resolveRoute(require('./routes/notificationRoutes'));
const collaborationRoutes = resolveRoute(require('./routes/collaborationRoutes'));
const holographicRoutes = resolveRoute(require('./routes/holographicRoutes'));
const secureCommRoutes = resolveRoute(require('./routes/secureCommRoutes'));
const acoRoutes = require('./routes/aco');
const federatedLearningRoutes = require('./routes/federatedLearning');
const swarmLearningRoutes = require('./routes/swarmLearning');
const smartWalletRoutes = resolveRoute(require('./routes/smartWallet'));
const agiTutorRoutes = require('./routes/agiTutorRoutes');
const analyticsRoutes = require('./routes/analytics');
const autonomousAgentsRoutes = require('./routes/autonomousAgents');
const gamificationRoutes = require('./routes/gamification');
const bridgeRoutes = require('./routes/bridge');
const timeLockCredentialsRoutes = require('./routes/timeLockCredentials');
const vrfRoutes = require('./routes/vrf');
const translationRoutes = require('./routes/translation');
const crossProtocolBridgeRoutes = require('./routes/crossProtocolBridge');

const app = express();
const server = createServer(app);
const websocketService = initWebsocketService(server);
const collaborationService = initCollaborationService(server);

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
});

const secureCommService = new SecureRealtimeCommunication(websocketService.io, redis);

setSyncWebsocketEmitter((userId, event, data) => {
  websocketService.emitToUser(userId, event, data);
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api/quizzes', quizRoutes);
app.use('/api/events', eventLoggerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/holographic', holographicRoutes);
app.use('/api/aco', acoRoutes);
app.use('/api/federated-learning', federatedLearningRoutes);
app.use('/api/swarm-learning', swarmLearningRoutes);
app.use('/api/smart-wallet', smartWalletRoutes);
app.use('/api/secure-comm', secureCommRoutes);
app.use('/api/agi-tutor', agiTutorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/autonomous-agents', autonomousAgentsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/time-lock', timeLockCredentialsRoutes);
app.use('/api/vrf', vrfRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/cross-protocol-bridge', crossProtocolBridgeRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AetherMint Education Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled application error', err);

  res.status(err?.status || 500).json({
    success: false,
    message: err?.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err?.stack }),
  });
});

const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  try {
    await transactionQueue.startProcessing();
    await transactionProcessor.start();
    await transactionEvents.startListening();

    server.listen(PORT, () => {
      logger.info('AetherMint Education Backend started', {
        port: PORT,
        routes: [
          '/api/quizzes',
          '/api/events',
          '/api/sync',
          '/api/content',
          '/api/transactions',
          '/api/collaboration',
          '/api/holographic',
          '/api/aco',
          '/api/federated-learning',
          '/api/agi-tutor',
          '/api/secure-comm',
          '/api/health',
        ],
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await transactionQueue.stopProcessing();
  await transactionProcessor.stop();
  await transactionEvents.stopListening();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.server = server;