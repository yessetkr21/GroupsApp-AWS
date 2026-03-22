const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const { setupSocket } = require('./socket');

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const fileRoutes = require('./routes/files');
const contactRoutes = require('./routes/contacts');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/contacts', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Setup WebSocket
const io = setupSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`GroupsApp server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
