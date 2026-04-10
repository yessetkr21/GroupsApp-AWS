const amqp = require('amqplib');
const logger = require('./logger');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://groupsapp:groupsapp123@localhost:5672';

// Exchange and queue names
const EXCHANGES = {
  MESSAGES: 'messages.events',    // fanout — message sent/read events
  PRESENCE: 'presence.events',    // fanout — user online/offline events
};

const QUEUES = {
  MESSAGES_SENT:   'messages.sent',
  MESSAGES_READ:   'messages.read',
  PRESENCE_ONLINE:  'presence.online',
  PRESENCE_OFFLINE: 'presence.offline',
};

let connection = null;
let channel = null;

async function connect(retries = 10, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Declare exchanges (durable = survive broker restart)
      await channel.assertExchange(EXCHANGES.MESSAGES, 'fanout', { durable: true });
      await channel.assertExchange(EXCHANGES.PRESENCE, 'fanout', { durable: true });

      // Declare queues
      await channel.assertQueue(QUEUES.MESSAGES_SENT,   { durable: true });
      await channel.assertQueue(QUEUES.MESSAGES_READ,   { durable: true });
      await channel.assertQueue(QUEUES.PRESENCE_ONLINE,  { durable: true });
      await channel.assertQueue(QUEUES.PRESENCE_OFFLINE, { durable: true });

      // Bind queues to exchanges
      await channel.bindQueue(QUEUES.MESSAGES_SENT,   EXCHANGES.MESSAGES, '');
      await channel.bindQueue(QUEUES.MESSAGES_READ,   EXCHANGES.MESSAGES, '');
      await channel.bindQueue(QUEUES.PRESENCE_ONLINE,  EXCHANGES.PRESENCE, '');
      await channel.bindQueue(QUEUES.PRESENCE_OFFLINE, EXCHANGES.PRESENCE, '');

      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        channel = null;
        connection = null;
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed — reconnecting in 5s');
        channel = null;
        connection = null;
        setTimeout(() => connect(), 5000);
      });

      logger.info('RabbitMQ connected', { url: RABBITMQ_URL.replace(/:[^:@]+@/, ':***@') });
      return;
    } catch (err) {
      logger.warn(`RabbitMQ connect attempt ${i}/${retries} failed`, { error: err.message });
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  logger.error('RabbitMQ: all connection attempts failed — running without MOM');
}

// Publish a JSON message to a queue (persistent delivery)
function publish(queue, payload) {
  if (!channel) {
    logger.warn('RabbitMQ channel unavailable — dropping message', { queue });
    return false;
  }
  try {
    const content = Buffer.from(JSON.stringify(payload));
    channel.sendToQueue(queue, content, { persistent: true });
    return true;
  } catch (err) {
    logger.error('RabbitMQ publish error', { queue, error: err.message });
    return false;
  }
}

// Convenience publishers
function publishMessageSent(message) {
  return publish(QUEUES.MESSAGES_SENT, { event: 'message.sent', ...message, ts: Date.now() });
}

function publishMessageRead(data) {
  return publish(QUEUES.MESSAGES_READ, { event: 'message.read', ...data, ts: Date.now() });
}

function publishUserOnline(data) {
  return publish(QUEUES.PRESENCE_ONLINE, { event: 'user.online', ...data, ts: Date.now() });
}

function publishUserOffline(data) {
  return publish(QUEUES.PRESENCE_OFFLINE, { event: 'user.offline', ...data, ts: Date.now() });
}

module.exports = {
  connect,
  publish,
  publishMessageSent,
  publishMessageRead,
  publishUserOnline,
  publishUserOffline,
  QUEUES,
  EXCHANGES,
};
