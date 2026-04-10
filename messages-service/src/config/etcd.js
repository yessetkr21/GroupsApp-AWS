const { Etcd3 } = require('etcd3');
const logger = require('./logger');

const SERVICE_NAME = 'messages-service';
const SERVICE_KEY  = `groupsapp/services/${SERVICE_NAME}`;
const LEASE_TTL    = 15; // seconds — etcd will auto-remove the key if keepalive stops

let lease  = null;
let client = null;

/**
 * Register this service instance in etcd with a TTL lease.
 * If etcd is unreachable the service keeps running; the backend falls back to
 * MESSAGES_SERVICE_ADDR env var.
 */
async function register() {
  try {
    const hosts = (process.env.ETCD_HOSTS || 'http://localhost:2379').split(',');
    client = new Etcd3({ hosts });

    const port = process.env.MESSAGES_SERVICE_PORT || '50051';
    // HOSTNAME is set by Docker to the container name (= Kubernetes pod name)
    const host = process.env.HOSTNAME || SERVICE_NAME;
    const addr = `${host}:${port}`;

    lease = client.lease(LEASE_TTL);
    await lease.put(SERVICE_KEY).value(addr);
    logger.info(`etcd: registered ${SERVICE_NAME} → ${addr}`);

    // Automatic re-registration if the lease expires (network partition / etcd restart)
    lease.on('lost', () => {
      logger.warn('etcd: lease lost — re-registering in 2 s...');
      lease = null;
      setTimeout(register, 2000);
    });
  } catch (err) {
    logger.warn('etcd: registration failed (app works via env-var addresses)', {
      error: err.message,
    });
  }
}

/**
 * Revoke the lease on graceful shutdown so the key disappears immediately.
 */
async function deregister() {
  try {
    if (lease) {
      await lease.revoke();
      lease = null;
      logger.info(`etcd: deregistered ${SERVICE_NAME}`);
    }
  } catch (err) {
    logger.warn('etcd: deregistration error', { error: err.message });
  }
}

module.exports = { register, deregister };
