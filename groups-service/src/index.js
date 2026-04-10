const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const logger = require('./config/logger');
const etcd = require('./config/etcd');

const groupHandlers   = require('./handlers/groups');
const contactHandlers = require('./handlers/contacts');

const PROTO_PATH = path.join(__dirname, '../proto/groups.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { groups } = grpc.loadPackageDefinition(packageDef);

function main() {
  const server = new grpc.Server();

  server.addService(groups.GroupsService.service, {
    // Groups
    CreateGroup:  groupHandlers.createGroup,
    GetGroups:    groupHandlers.getGroups,
    GetGroup:     groupHandlers.getGroup,
    UpdateGroup:  groupHandlers.updateGroup,
    DeleteGroup:  groupHandlers.deleteGroup,
    // Members
    GetMembers:   groupHandlers.getMembers,
    AddMember:    groupHandlers.addMember,
    RemoveMember: groupHandlers.removeMember,
    // Channels
    GetChannels:   groupHandlers.getChannels,
    CreateChannel: groupHandlers.createChannel,
    DeleteChannel: groupHandlers.deleteChannel,
    // Contacts
    GetContacts:  contactHandlers.getContacts,
    AddContact:   contactHandlers.addContact,
    DeleteContact:contactHandlers.deleteContact,
    SearchUsers:  contactHandlers.searchUsers,
  });

  const PORT = process.env.GROUPS_SERVICE_PORT || '50052';
  const addr = `0.0.0.0:${PORT}`;

  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      logger.error('Failed to bind gRPC server', { error: err.message });
      process.exit(1);
    }
    logger.info(`gRPC server running on port ${port}`);
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
