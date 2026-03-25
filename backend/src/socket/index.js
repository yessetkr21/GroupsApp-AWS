const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setupChatHandlers } = require('./chat');
const { setupPresenceHandlers } = require('./presence');

let ioInstance = null;

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174'],
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
    console.log(`User connected: ${socket.user.username} (${socket.user.id})`);

    setupPresenceHandlers(io, socket);
    setupChatHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });

  return io;
}

function getIO() {
  return ioInstance;
}

module.exports = { setupSocket, getIO };
