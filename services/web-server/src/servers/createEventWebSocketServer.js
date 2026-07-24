import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import Ajv from 'ajv';
import scopeUtils from 'taskcluster-lib-scopes';
import ws from 'ws';
import { eventExchangeBinding } from './eventExchanges.js';
import { isOriginAllowed, normalizeAllowedOrigins } from './origins.js';

const { OPEN, Server: WebSocketServer } = ws;

const protocol = 'taskcluster-events-v1';
const path = '/api/web-server/v1/events';
const requiredScopes = ['web:read-pulse'];
const schemaFiles = new Map([
  ['Authenticate', 'authenticate-message.json'],
  ['Subscribe', 'subscribe-message.json'],
  ['Unsubscribe', 'unsubscribe-message.json'],
  ['Ping', 'ping-message.json'],
]);

const compileMessageValidators = () => {
  const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
  const schemaRoot = new URL('../../schemas/v1/events/', import.meta.url);

  return new Map(
    [...schemaFiles].map(([type, filename]) => {
      const schema = JSON.parse(fs.readFileSync(new URL(filename, schemaRoot), 'utf8'));
      return [type, ajv.compile(schema)];
    })
  );
};

const messageValidators = compileMessageValidators();

const rejectUpgrade = (socket, statusCode, message) => {
  if (!socket.writable) {
    socket.destroy();
    return;
  }

  const body = `${message}\n`;
  socket.end(
    `HTTP/1.1 ${statusCode} ${message}\r\n` +
      'Connection: close\r\n' +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      '\r\n' +
      body
  );
};

export default ({
  cfg,
  server,
  authFactory,
  pulseEngine,
  queueEvents,
  monitor,
  endpointPath = path,
  subprotocol = protocol,
}) => {
  const settings = cfg.server.eventWebSocket;
  if (!settings?.enabled) {
    return {
      close: async () => {},
      path: endpointPath,
      protocol: subprotocol,
    };
  }

  const allowedOrigins = normalizeAllowedOrigins(cfg.server.allowedCORSOrigins);
  const connections = new Set();
  let subscriptionCount = 0;
  let draining = false;
  let closePromise;

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: settings.maxMessageBytes,
    handleProtocols: protocols => (protocols.includes(subprotocol) ? subprotocol : false),
  });

  const reportError = err => {
    if (monitor?.reportError) {
      monitor.reportError(err);
    }
  };

  const send = (socket, message) =>
    new Promise((resolve, reject) => {
      if (socket.readyState !== OPEN) {
        reject(new Error('WebSocket is not open'));
        return;
      }
      const serializedMessage = JSON.stringify(message);
      if (socket.bufferedAmount + Buffer.byteLength(serializedMessage) > settings.maxBufferedBytes) {
        reject(new Error('WebSocket outbound buffer limit exceeded'));
        return;
      }

      socket.send(serializedMessage, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

  const sendError = async (state, { code, message, requestId, subscriptionId }) => {
    try {
      await send(state.socket, {
        type: 'Error',
        ...(requestId ? { requestId } : {}),
        ...(subscriptionId ? { subscriptionId } : {}),
        payload: { code, message },
      });
    } catch {
      // The connection close path performs subscription cleanup.
    }
  };

  const removeSubscription = (state, subscriptionId) => {
    const subscription = state.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    state.subscriptions.delete(subscriptionId);
    subscriptionCount -= 1;
    pulseEngine.unsubscribe(subscription.pulseSubscriptionId);
    monitor?.log?.eventWebSocketSubscription({
      action: 'removed',
      exchange: subscription.exchange,
    });
    return true;
  };

  const cleanupConnection = state => {
    if (state.closed) {
      return;
    }

    state.closed = true;
    clearTimeout(state.authenticationTimer);
    clearTimeout(state.maximumLifetimeTimer);
    for (const subscriptionId of [...state.subscriptions.keys()]) {
      removeSubscription(state, subscriptionId);
    }
    connections.delete(state);
    monitor?.log?.eventWebSocketConnection({ connected: false });
  };

  const closeWithError = async (state, error, closeCode) => {
    await sendError(state, error);
    if (state.socket.readyState === OPEN) {
      state.socket.close(closeCode, error.code);
    }
  };

  const authenticate = async (state, message) => {
    if (state.authenticated) {
      await sendError(state, {
        code: 'AlreadyAuthenticated',
        message: 'This connection has already been authenticated.',
        requestId: message.requestId,
      });
      return;
    }

    try {
      const credentials = message.payload.credentials;
      const authClient = authFactory({ credentials });
      const response = await authClient.currentScopes();
      const scopes = response.scopes || [];

      if (!scopeUtils.scopesSatisfying(scopes, { AllOf: requiredScopes })) {
        await closeWithError(
          state,
          {
            code: 'InsufficientScopes',
            message: 'The connection requires the web:read-pulse scope.',
            requestId: message.requestId,
          },
          4403
        );
        return;
      }

      state.authenticated = true;
      state.scopes = scopes;
      clearTimeout(state.authenticationTimer);
      await send(state.socket, {
        type: 'Ready',
        requestId: message.requestId,
      });
    } catch {
      await closeWithError(
        state,
        {
          code: 'AuthenticationFailed',
          message: 'The supplied Taskcluster credentials could not be authenticated.',
          requestId: message.requestId,
        },
        4403
      );
    }
  };

  const subscribe = async (state, message) => {
    if (!state.authenticated) {
      await sendError(state, {
        code: 'NotAuthenticated',
        message: 'Authenticate before creating subscriptions.',
        requestId: message.requestId,
      });
      return;
    }
    if (state.subscriptions.size >= settings.maxSubscriptionsPerConnection) {
      await sendError(state, {
        code: 'ConnectionSubscriptionLimitExceeded',
        message: 'This connection has reached its subscription limit.',
        requestId: message.requestId,
      });
      return;
    }
    if (subscriptionCount >= settings.maxSubscriptions) {
      await sendError(state, {
        code: 'ServerSubscriptionLimitExceeded',
        message: 'The server has reached its subscription limit.',
        requestId: message.requestId,
      });
      return;
    }
    if (!scopeUtils.scopesSatisfying(state.scopes, { AllOf: requiredScopes })) {
      await sendError(state, {
        code: 'InsufficientScopes',
        message: 'This exchange requires the web:read-pulse scope.',
        requestId: message.requestId,
      });
      return;
    }

    const { exchange, filters } = message.payload;
    const binding = eventExchangeBinding({ queueEvents, exchange, filters });
    const subscriptionId = randomUUID();
    let pulseSubscriptionId;

    const handleMessage = async pulseMessage => {
      try {
        await send(state.socket, {
          type: 'Event',
          subscriptionId,
          payload: {
            exchange,
            routingKey: pulseMessage.routingKey,
            message: pulseMessage.payload,
          },
        });
      } catch (err) {
        removeSubscription(state, subscriptionId);
        if (state.socket.readyState === OPEN) {
          state.socket.close(4429, 'SlowConsumer');
        }
        throw err;
      }
    };

    const handleError = err => {
      queueMicrotask(async () => {
        removeSubscription(state, subscriptionId);
        await sendError(state, {
          code: 'PulseSubscriptionFailed',
          message: 'The Pulse subscription failed.',
          subscriptionId,
        });
        reportError(err instanceof Error ? err : new Error(String(err)));
      });
    };

    try {
      pulseSubscriptionId = pulseEngine.subscribe([binding], handleMessage, handleError);
      state.subscriptions.set(subscriptionId, {
        pulseSubscriptionId,
        exchange,
        filters,
      });
      subscriptionCount += 1;
      monitor?.log?.eventWebSocketSubscription({
        action: 'created',
        exchange,
      });

      await send(state.socket, {
        type: 'Subscribed',
        requestId: message.requestId,
        subscriptionId,
        payload: { exchange, filters },
      });
    } catch (err) {
      removeSubscription(state, subscriptionId);
      await sendError(state, {
        code: 'SubscriptionFailed',
        message: 'The event subscription could not be created.',
        requestId: message.requestId,
      });
      reportError(err);
    }
  };

  const unsubscribe = async (state, message) => {
    if (!state.authenticated) {
      await sendError(state, {
        code: 'NotAuthenticated',
        message: 'Authenticate before removing subscriptions.',
        requestId: message.requestId,
      });
      return;
    }
    if (!removeSubscription(state, message.subscriptionId)) {
      await sendError(state, {
        code: 'SubscriptionNotFound',
        message: 'The requested subscription does not exist.',
        requestId: message.requestId,
        subscriptionId: message.subscriptionId,
      });
      return;
    }

    await send(state.socket, {
      type: 'Unsubscribed',
      requestId: message.requestId,
      subscriptionId: message.subscriptionId,
    });
  };

  const handleMessage = async (state, data) => {
    if (Buffer.isBuffer(data)) {
      await closeWithError(
        state,
        {
          code: 'BinaryMessageNotSupported',
          message: 'Only UTF-8 JSON text messages are supported.',
        },
        4400
      );
      return;
    }

    let message;
    try {
      message = JSON.parse(data);
    } catch {
      await sendError(state, {
        code: 'InvalidJson',
        message: 'The message must contain valid JSON.',
      });
      return;
    }

    const validator = message && typeof message === 'object' ? messageValidators.get(message.type) : null;
    if (!validator?.(message)) {
      await sendError(state, {
        code: 'InvalidMessage',
        message: 'The message does not match the event protocol.',
        requestId: typeof message?.requestId === 'string' ? message.requestId : undefined,
      });
      return;
    }

    if (message.type === 'Authenticate') {
      await authenticate(state, message);
    } else if (message.type === 'Subscribe') {
      await subscribe(state, message);
    } else if (message.type === 'Unsubscribe') {
      await unsubscribe(state, message);
    } else if (message.type === 'Ping') {
      await send(state.socket, {
        type: 'Pong',
        requestId: message.requestId,
      });
    }
  };

  wss.on('connection', socket => {
    const state = {
      socket,
      authenticated: false,
      scopes: [],
      subscriptions: new Map(),
      closed: false,
      alive: true,
      commandChain: Promise.resolve(),
    };
    connections.add(state);
    monitor?.log?.eventWebSocketConnection({ connected: true });

    state.authenticationTimer = setTimeout(() => {
      closeWithError(
        state,
        {
          code: 'AuthenticationTimeout',
          message: 'The connection did not authenticate before the deadline.',
        },
        4401
      );
    }, settings.authenticationTimeoutMilliseconds);
    state.maximumLifetimeTimer = setTimeout(() => {
      if (socket.readyState === OPEN) {
        socket.close(1000, 'MaximumLifetimeReached');
      }
    }, settings.maximumLifetimeMilliseconds);
    state.authenticationTimer.unref?.();
    state.maximumLifetimeTimer.unref?.();

    socket.on('pong', () => {
      state.alive = true;
    });
    socket.on('message', data => {
      state.commandChain = state.commandChain
        .then(() => handleMessage(state, data))
        .catch(err => {
          reportError(err);
          if (socket.readyState === OPEN) {
            socket.close(1011, 'UnexpectedError');
          }
        });
    });
    socket.on('close', () => cleanupConnection(state));
    socket.on('error', () => cleanupConnection(state));
  });

  const heartbeat =
    settings.heartbeatIntervalMilliseconds > 0
      ? setInterval(() => {
          for (const state of connections) {
            if (state.socket.readyState !== OPEN) {
              cleanupConnection(state);
              continue;
            }
            if (!state.alive) {
              state.socket.terminate();
              cleanupConnection(state);
              continue;
            }
            state.alive = false;
            state.socket.ping();
          }
        }, settings.heartbeatIntervalMilliseconds)
      : null;
  heartbeat?.unref?.();

  const upgradeHandler = (request, socket, head) => {
    let requestUrl;
    try {
      requestUrl = new URL(request.url, 'http://localhost');
    } catch {
      return;
    }
    if (requestUrl.pathname !== endpointPath) {
      return;
    }
    if (draining) {
      rejectUpgrade(socket, 503, 'Service Unavailable');
      return;
    }
    if (requestUrl.search) {
      rejectUpgrade(socket, 400, 'Bad Request');
      return;
    }
    if (connections.size >= settings.maxConnections) {
      rejectUpgrade(socket, 503, 'Service Unavailable');
      return;
    }
    if (!isOriginAllowed(request.headers.origin, allowedOrigins)) {
      rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }

    const offeredProtocols = (request.headers['sec-websocket-protocol'] || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    if (!offeredProtocols.includes(subprotocol)) {
      rejectUpgrade(socket, 426, 'Upgrade Required');
      return;
    }

    wss.handleUpgrade(request, socket, head, upgradedSocket => {
      wss.emit('connection', upgradedSocket, request);
    });
  };

  server.on('upgrade', upgradeHandler);

  const close = async () => {
    if (closePromise) {
      return closePromise;
    }

    draining = true;
    server.removeListener('upgrade', upgradeHandler);
    if (heartbeat) {
      clearInterval(heartbeat);
    }

    closePromise = new Promise(resolve => {
      const forceCloseTimer = setTimeout(() => {
        for (const state of connections) {
          state.socket.terminate();
          cleanupConnection(state);
        }
        resolve();
      }, settings.shutdownGracePeriodMilliseconds);
      forceCloseTimer.unref?.();

      for (const state of connections) {
        send(state.socket, { type: 'Draining' })
          .catch(() => {})
          .finally(() => {
            cleanupConnection(state);
            if (state.socket.readyState === OPEN) {
              state.socket.close(1012, 'ServiceRestart');
            }
          });
      }

      wss.close(() => {
        clearTimeout(forceCloseTimer);
        resolve();
      });
    });

    return closePromise;
  };

  return {
    close,
    path: endpointPath,
    protocol: subprotocol,
    wss,
  };
};
