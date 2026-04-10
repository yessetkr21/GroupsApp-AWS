const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { getGroupMessages, getChannelMessages, getDirectMessages } = require('./handlers/messages');
const rabbitmq = require('./config/rabbitmq');
const etcd = require('./config/etcd');
const logger = require('./config/logger');

const PROTO_PATH = path.join(__dirname, '../proto/messages.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { messages } = grpc.loadPackageDefinition(packageDef);

function main() {
  const server = new grpc.Server();

  server.addService(messages.MessagesService.service, {
    GetGroupMessages:   getGroupMessages,
    GetChannelMessages: getChannelMessages,
    GetDirectMessages:  getDirectMessages,
  });

  const PORT = process.env.MESSAGES_SERVICE_PORT || '50051';
  const addr = `0.0.0.0:${PORT}`;

  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      logger.error('Failed to bind gRPC server', { error: err.message });
      process.exit(1);
    }
    logger.info(`gRPC server running on port ${port}`);
  });

  // Connect to RabbitMQ (non-blocking)
  rabbitmq.connect().catch((err) => {
    logger.error('RabbitMQ initial connect error', { error: err.message });
  });

  // Register in etcd for service discovery (non-blocking)
  etcd.register().catch((err) => {
    logger.warn('etcd: register error', { error: err.message });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await etcd.deregister();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await etcd.deregister();
    process.exit(0);
  });
}

main();
