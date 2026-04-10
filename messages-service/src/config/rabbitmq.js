const amqp = require('amqplib');
const logger = require('./logger');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://groupsapp:groupsapp123@localhost:5672';

const QUEUES = {
  MESSAGES_SENT:    'messages.sent',
  MESSAGES_READ:    'messages.read',
  PRESENCE_ONLINE:  'presence.online',
  PRESENCE_OFFLINE: 'presence.offline',
};

const EXCHANGES = {
  MESSAGES: 'messages.events',
  PRESENCE: 'presence.events',
};

let connection = null;
let channel = null;

// ── Handlers for consumed events ──────────────────────────────────────────────

function handleMessageSent(payload) {
  logger.info('Event received: message.sent', {
    id:         payload.id,
    sender_id:  payload.sender_id,
    group_id:   payload.group_id   || null,
    channel_id: payload.channel_id || null,
    receiver_id:payload.receiver_id|| null,
    type:       payload.message_type,
  });
  // Future: analytics, push notifications, search indexing, etc.
}

function handleMessageRead(payload) {
  logger.info('Event received: message.read', {
    reader_id:   payload.reader_id,
    message_ids: payload.message_ids,
  });
}

function handlePresenceOnline(payload) {
  logger.info('Event received: user.online', { user_id: payload.user_id });
}

function handlePresenceOffline(payload) {
  logger.info('Event received: user.offline', {
    user_id:  payload.user_id,
    last_seen: payload.last_seen,
  });
}

// ── Connection and queue setup ────────────────────────────────────────────────

async function connect(retries = 15, delayMs = 4000) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      channel.prefetch(10);

      // Ensure exchanges/queues exist (idempotent)
      await channel.assertExchange(EXCHANGES.MESSAGES, 'fanout', { durable: true });
      await channel.assertExchange(EXCHANGES.PRESENCE, 'fanout', { durable: true });
      await channel.assertQueue(QUEUES.MESSAGES_SENT,    { durable: true });
      await channel.assertQueue(QUEUES.MESSAGES_READ,    { durable: true });
      await channel.assertQueue(QUEUES.PRESENCE_ONLINE,  { durable: true });
      await channel.assertQueue(QUEUES.PRESENCE_OFFLINE, { durable: true });
      await channel.bindQueue(QUEUES.MESSAGES_SENT,    EXCHANGES.MESSAGES, '');
      await channel.bindQueue(QUEUES.MESSAGES_READ,    EXCHANGES.MESSAGES, '');
      await channel.bindQueue(QUEUES.PRESENCE_ONLINE,  EXCHANGES.PRESENCE, '');
      await channel.bindQueue(QUEUES.PRESENCE_OFFLINE, EXCHANGES.PRESENCE, '');

      // Consume queues
      channel.consume(QUEUES.MESSAGES_SENT, (msg) => {
        if (!msg) return;
        try {
          handleMessageSent(JSON.parse(msg.content.toString()));
          channel.ack(msg);
        } catch (err) {
          logger.error('Error processing messages.sent', { error: err.message });
          channel.nack(msg, false, false); // discard malformed
        }
      });

      channel.consume(QUEUES.MESSAGES_READ, (msg) => {
        if (!msg) return;
        try {
          handleMessageRead(JSON.parse(msg.content.toString()));
          channel.ack(msg);
        } catch (err) {
          logger.error('Error processing messages.read', { error: err.message });
          channel.nack(msg, false, false);
        }
      });

      channel.consume(QUEUES.PRESENCE_ONLINE, (msg) => {
        if (!msg) return;
        try {
          handlePresenceOnline(JSON.parse(msg.content.toString()));
          channel.ack(msg);
        } catch (err) {
          logger.error('Error processing presence.online', { error: err.message });
          channel.nack(msg, false, false);
        }
      });

      channel.consume(QUEUES.PRESENCE_OFFLINE, (msg) => {
        if (!msg) return;
        try {
          handlePresenceOffline(JSON.parse(msg.content.toString()));
          channel.ack(msg);
        } catch (err) {
          logger.error('Error processing presence.offline', { error: err.message });
          channel.nack(msg, false, false);
        }
      });

      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        channel = null; connection = null;
      });
      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed — reconnecting in 5s');
        channel = null; connection = null;
        setTimeout(() => connect(), 5000);
      });

      logger.info('RabbitMQ consumer connected and listening');
      return;
    } catch (err) {
      logger.warn(`RabbitMQ connect attempt ${i}/${retries} failed`, { error: err.message });
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  logger.error('RabbitMQ: all connection attempts failed — running without MOM');
}

module.exports = { connect, QUEUES, EXCHANGES };
