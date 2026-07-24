import assert from 'node:assert';
import { createServer } from 'node:http';
import { once } from 'node:events';
import ws from 'ws';
import createEventWebSocketServer from '../src/servers/createEventWebSocketServer.js';

const WebSocket = ws;
const { CLOSED, OPEN } = ws;

const nextMessage = async socket => {
  const [data] = await once(socket, 'message');
  return JSON.parse(data.toString());
};

const sendMessage = async (socket, message) => {
  const response = nextMessage(socket);
  socket.send(JSON.stringify(message));
  return response;
};

suite('event WebSocket server', () => {
  let httpServer;
  let eventServer;
  let socket;
  let port;
  let grantedScopes;
  let nextPulseSubscription;
  let unsubscribedPulseSubscription;
  let pulseSubscriptionSequence;

  setup(async () => {
    grantedScopes = ['web:read-pulse'];
    nextPulseSubscription = null;
    unsubscribedPulseSubscription = null;
    pulseSubscriptionSequence = 0;
    httpServer = createServer((_request, response) => {
      response.writeHead(404);
      response.end();
    });

    const makeBinding = exchange => filters => ({
      exchange: `exchange/taskcluster-queue/v1/${exchange}`,
      routingKeyPattern: `primary.${filters.taskId || '*'}.*.*.*.*.*.*.${filters.taskGroupId || '*'}.#`,
    });
    const queueEvents = {
      taskDefined: makeBinding('task-defined'),
      taskPending: makeBinding('task-pending'),
      taskRunning: makeBinding('task-running'),
      taskCompleted: makeBinding('task-completed'),
      taskFailed: makeBinding('task-failed'),
      taskException: makeBinding('task-exception'),
      artifactCreated: makeBinding('artifact-created'),
    };
    const pulseEngine = {
      subscribe(bindings, handleMessage, handleError) {
        const pulseSubscriptionId = `pulse-${++pulseSubscriptionSequence}`;
        nextPulseSubscription = {
          pulseSubscriptionId,
          bindings,
          handleMessage,
          handleError,
        };
        return pulseSubscriptionId;
      },
      unsubscribe(pulseSubscriptionId) {
        unsubscribedPulseSubscription = pulseSubscriptionId;
      },
    };

    eventServer = createEventWebSocketServer({
      cfg: {
        server: {
          allowedCORSOrigins: ['https://allowed.example'],
          eventWebSocket: {
            enabled: true,
            authenticationTimeoutMilliseconds: 1000,
            heartbeatIntervalMilliseconds: 0,
            maximumLifetimeMilliseconds: 60000,
            maxMessageBytes: 4096,
            maxSubscriptionsPerConnection: 2,
            maxConnections: 10,
            maxSubscriptions: 20,
            maxBufferedBytes: 4096,
            shutdownGracePeriodMilliseconds: 100,
          },
        },
      },
      server: httpServer,
      authFactory: () => ({
        currentScopes: async () => ({ scopes: grantedScopes }),
      }),
      pulseEngine,
      queueEvents,
      monitor: {
        reportError() {},
      },
    });

    httpServer.listen(0, '127.0.0.1');
    await once(httpServer, 'listening');
    port = httpServer.address().port;
  });

  teardown(async () => {
    if (socket?.readyState === OPEN) {
      socket.close();
      await once(socket, 'close');
    }
    await eventServer.close();
    if (httpServer.listening) {
      httpServer.close();
      await once(httpServer, 'close');
    }
  });

  const connect = async () => {
    socket = new WebSocket(`ws://127.0.0.1:${port}/api/web-server/v1/events`, 'taskcluster-events-v1', {
      origin: 'https://allowed.example',
    });
    await once(socket, 'open');
    return socket;
  };

  const authenticate = async currentSocket =>
    sendMessage(currentSocket, {
      type: 'Authenticate',
      requestId: 'authenticate-1',
      payload: {
        credentials: {
          clientId: 'test-client',
          accessToken: 'test-access-token',
        },
      },
    });

  test('authenticates, creates an exchange binding, and delivers an event', async () => {
    const currentSocket = await connect();
    assert.deepEqual(await authenticate(currentSocket), {
      type: 'Ready',
      requestId: 'authenticate-1',
    });

    const subscribed = await sendMessage(currentSocket, {
      type: 'Subscribe',
      requestId: 'subscribe-1',
      payload: {
        exchange: 'task-running',
        filters: {
          taskId: 'task-123',
        },
      },
    });
    assert.equal(subscribed.type, 'Subscribed');
    assert.equal(subscribed.requestId, 'subscribe-1');
    assert.equal(subscribed.payload.exchange, 'task-running');
    assert.deepEqual(nextPulseSubscription.bindings, [
      {
        exchange: 'exchange/taskcluster-queue/v1/task-running',
        pattern: 'primary.task-123.*.*.*.*.*.*.*.#',
      },
    ]);

    const event = nextMessage(currentSocket);
    await nextPulseSubscription.handleMessage({
      routingKey: 'primary.task-123.0.worker-group.worker-id.provisioner.worker-type.scheduler.group-1._',
      payload: {
        status: {
          taskId: 'task-123',
          state: 'running',
        },
      },
    });
    assert.deepEqual(await event, {
      type: 'Event',
      subscriptionId: subscribed.subscriptionId,
      payload: {
        exchange: 'task-running',
        routingKey: 'primary.task-123.0.worker-group.worker-id.provisioner.worker-type.scheduler.group-1._',
        message: {
          status: {
            taskId: 'task-123',
            state: 'running',
          },
        },
      },
    });

    assert.deepEqual(
      await sendMessage(currentSocket, {
        type: 'Unsubscribe',
        requestId: 'unsubscribe-1',
        subscriptionId: subscribed.subscriptionId,
      }),
      {
        type: 'Unsubscribed',
        requestId: 'unsubscribe-1',
        subscriptionId: subscribed.subscriptionId,
      }
    );
    assert.equal(unsubscribedPulseSubscription, nextPulseSubscription.pulseSubscriptionId);
  });

  test('rejects exchanges outside the allow-list', async () => {
    const currentSocket = await connect();
    await authenticate(currentSocket);

    const response = await sendMessage(currentSocket, {
      type: 'Subscribe',
      requestId: 'subscribe-unsupported',
      payload: {
        exchange: 'some-arbitrary-exchange',
        filters: {
          taskId: 'task-123',
        },
      },
    });

    assert.equal(response.type, 'Error');
    assert.equal(response.requestId, 'subscribe-unsupported');
    assert.equal(response.payload.code, 'InvalidMessage');
    assert.equal(nextPulseSubscription, null);
  });

  test('requires a task or task-group filter', async () => {
    const currentSocket = await connect();
    await authenticate(currentSocket);

    const response = await sendMessage(currentSocket, {
      type: 'Subscribe',
      requestId: 'subscribe-unfiltered',
      payload: {
        exchange: 'task-running',
        filters: {},
      },
    });

    assert.equal(response.payload.code, 'InvalidMessage');
    assert.equal(nextPulseSubscription, null);
  });

  test('rejects authentication without web:read-pulse', async () => {
    grantedScopes = [];
    const currentSocket = await connect();
    const response = await authenticate(currentSocket);

    assert.equal(response.type, 'Error');
    assert.equal(response.payload.code, 'InsufficientScopes');
    if (currentSocket.readyState !== CLOSED) {
      await once(currentSocket, 'close');
    }
  });
});
