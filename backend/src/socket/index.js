const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setupChatHandlers } = require('./chat');
const { setupPresenceHandlers } = require('./presence');
const logger = require('../config/logger');

let ioInstance = null;

function setupSocket(server) {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost')
    .split(',')
    .map(o => o.trim());

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  ioInstance = io;

  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token requerido'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.username}`, { user_id: socket.user.id });

    setupPresenceHandlers(io, socket);
    setupChatHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.username}`, { user_id: socket.user.id });
    });
  });

  return io;
}

function getIO() {
  return ioInstance;
}

module.exports = { setupSocket, getIO };
