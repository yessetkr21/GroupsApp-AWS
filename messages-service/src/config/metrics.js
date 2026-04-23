const http = require('http');
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const grpcCallsTotal = new client.Counter({
  name: 'grpc_calls_total',
  help: 'Total gRPC calls handled',
  labelNames: ['method', 'status'],
  registers: [register],
});

const grpcCallDuration = new client.Histogram({
  name: 'grpc_call_duration_seconds',
  help: 'Duration of gRPC calls in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const amqpMessagesConsumed = new client.Counter({
  name: 'amqp_messages_consumed_total',
  help: 'Total AMQP messages consumed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

function startMetricsServer(port = 9091) {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else if (req.url === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
  server.listen(port, '0.0.0.0');
  return server;
}

module.exports = {
  register,
  grpcCallsTotal,
  grpcCallDuration,
  amqpMessagesConsumed,
  startMetricsServer,
};
