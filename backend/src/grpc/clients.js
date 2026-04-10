const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_DIR = path.join(__dirname, '../../proto');

const LOADER_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// ── Load protos ───────────────────────────────────────────────────────────────

const messagesDef = protoLoader.loadSync(path.join(PROTO_DIR, 'messages.proto'), LOADER_OPTIONS);
const messagesProto = grpc.loadPackageDefinition(messagesDef).messages;

const groupsDef = protoLoader.loadSync(path.join(PROTO_DIR, 'groups.proto'), LOADER_OPTIONS);
const groupsProto = grpc.loadPackageDefinition(groupsDef).groups;

// ── Service addresses (resolved from etcd, fall back to env vars) ─────────────

let _messagesAddr = process.env.MESSAGES_SERVICE_ADDR || 'localhost:50051';
let _groupsAddr   = process.env.GROUPS_SERVICE_ADDR   || 'localhost:50052';

let _messagesClient = new messagesProto.MessagesService(_messagesAddr, grpc.credentials.createInsecure());
let _groupsClient   = new groupsProto.GroupsService(_groupsAddr, grpc.credentials.createInsecure());

// ── etcd-based discovery (called once at startup) ─────────────────────────────

/**
 * Attempt to refresh gRPC client addresses via etcd service discovery.
 * Falls back silently to env-var addresses if etcd is unavailable.
 */
async function initClients() {
  try {
    const etcd = require('../config/etcd');
    const logger = require('../config/logger');

    const [mAddr, gAddr] = await Promise.all([
      etcd.discoverService('messages-service'),
      etcd.discoverService('groups-service'),
    ]);

    if (mAddr && mAddr !== _messagesAddr) {
      _messagesAddr   = mAddr;
      _messagesClient = new messagesProto.MessagesService(mAddr, grpc.credentials.createInsecure());
    }
    if (gAddr && gAddr !== _groupsAddr) {
      _groupsAddr   = gAddr;
      _groupsClient = new groupsProto.GroupsService(gAddr, grpc.credentials.createInsecure());
    }

    logger.info('gRPC clients ready', { messages: _messagesAddr, groups: _groupsAddr });
  } catch (_) {
    // Non-fatal — env-var addresses stay in use
  }
}

// ── Helper: promisify a gRPC unary call ───────────────────────────────────────

function call(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = {
  get messagesClient() { return _messagesClient; },
  get groupsClient()   { return _groupsClient;   },
  call,
  initClients,
};
