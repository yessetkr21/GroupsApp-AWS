const client = require('prom-client');

const register = new client.Registry();

// Collect default Node.js metrics (event loop lag, memory, GC, etc.)
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// HTTP request counter
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active WebSocket connections
const wsConnectionsGauge = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// Total messages sent
const messagesSentTotal = new client.Counter({
  name: 'messages_sent_total',
  help: 'Total messages sent via WebSocket',
  labelNames: ['type'],
  registers: [register],
});

// gRPC call counter
const grpcCallsTotal = new client.Counter({
  name: 'grpc_calls_total',
  help: 'Total gRPC calls made to internal services',
  labelNames: ['service', 'method', 'status'],
  registers: [register],
});

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  wsConnectionsGauge,
  messagesSentTotal,
  grpcCallsTotal,
};
