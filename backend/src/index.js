const path = require('path');
// In Docker, env vars come from the container environment.
// Locally, load from the project-root .env two levels up.
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { setupSocket } = require('./socket');
const logger = require('./config/logger');
const rabbitmq = require('./config/rabbitmq');
const redis = require('./config/redis');
const etcd = require('./config/etcd');
const { initClients } = require('./grpc/clients');
const { register, httpRequestDuration, httpRequestTotal } = require('./config/metrics');

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const fileRoutes = require('./routes/files');
const contactRoutes = require('./routes/contacts');

const app = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost')
  .split(',')
  .map(o => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limit on auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes, intenta más tarde' },
});

// HTTP request duration + logging middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = { method: req.method, route: req.path, status_code: res.statusCode };
    end(labels);
    httpRequestTotal.inc(labels);
    logger.http(`${req.method} ${req.path} ${res.statusCode}`, { ip: req.ip });
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/contacts', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
setupSocket(server);

// ── RabbitMQ connection (non-blocking — app works without it) ─────────────────
rabbitmq.connect().catch((err) => {
  logger.error('RabbitMQ initial connect error', { error: err.message });
});

// ── Redis connection (non-blocking — app works without it) ────────────────────
redis.connect().catch((err) => {
  logger.error('Redis initial connect error', { error: err.message });
});

// ── etcd + gRPC service discovery (non-blocking) ─────────────────────────────
etcd.connect().then(() => initClients()).catch((err) => {
  logger.warn('etcd/gRPC init error', { error: err.message });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`GroupsApp backend running on port ${PORT}`);
  logger.info('WebSocket server ready');
});
