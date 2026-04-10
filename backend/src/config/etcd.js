const { Etcd3 } = require('etcd3');
const logger = require('./logger');

const PREFIX = 'groupsapp/services/';
let client = null;

function getClient() {
  if (!client) {
    const hosts = (process.env.ETCD_HOSTS || 'http://localhost:2379').split(',');
    client = new Etcd3({ hosts });
  }
  return client;
}

/**
 * Connect to etcd and verify reachability.
 * Non-fatal — the app works without etcd (falls back to env vars).
 */
async function connect() {
  try {
    await getClient().getAll().prefix(PREFIX).keys();
    logger.info('etcd: connected');
  } catch (err) {
    logger.warn('etcd: connection failed (service discovery disabled)', { error: err.message });
  }
}

/**
 * Look up a service address registered under groupsapp/services/<name>.
 * Returns the address string (e.g. "messages-service:50051") or null.
 */
async function discoverService(name) {
  try {
    const value = await getClient().get(`${PREFIX}${name}`).string();
    if (value) {
      logger.debug(`etcd: discovered ${name} → ${value}`);
    }
    return value || null;
  } catch (err) {
    logger.warn(`etcd: discoverService(${name}) failed`, { error: err.message });
    return null;
  }
}

module.exports = { connect, discoverService };
