// Custom WebSocket close codes, in the 4000-4999 (application-defined) range.
const CLOSE_CODES = {
  PROTOCOL_ERROR: 4400,
  LIFETIME_EXCEEDED: 4408,
};

// Frame `type` values exchanged over the wire, named after the graphql-ws
// protocol messages they replace. The client opens with connection_init and
// waits for connection_ack; after that it manages subscriptions using ids it
// chooses itself:
//
//   client -> server: connection_init, subscribe, unsubscribe
//   server -> client: connection_ack, data, error
const FRAME_TYPES = {
  CONNECTION_INIT: 'connection_init',
  CONNECTION_ACK: 'connection_ack',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  DATA: 'data',
  ERROR: 'error',
};

export default class EventsConnection {
  constructor({ ws, pulseEngine, clients, monitor, socketAliveTimeoutMilliSeconds, connectionInitTimeoutMilliSeconds }) {
    this.ws = ws;
    this.pulseEngine = pulseEngine;
    this.clients = clients;
    this.monitor = monitor;
    // client-chosen subscription id -> pulse engine subscription id
    this.subscriptions = new Map();
    this.connectionInitReceived = false;

    this.lifetimeTimeout = setTimeout(() => {
      this.close(CLOSE_CODES.LIFETIME_EXCEEDED, 'Connection lifetime exceeded');
    }, socketAliveTimeoutMilliSeconds);

    this.connectionInitTimeout = setTimeout(() => {
      this.close(CLOSE_CODES.PROTOCOL_ERROR, 'Protocol error: no connection_init frame received');
    }, connectionInitTimeoutMilliSeconds);

    ws.on('message', data => this.onMessage(data));
    ws.on('close', closeCode => this.onClose(closeCode));
    ws.on('error', err => this.monitor.reportError(err));
  }

  send(frame) {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState !== this.ws.OPEN) {
        reject(new Error('Socket is not open'));
        return;
      }

      this.ws.send(JSON.stringify(frame), err => (err ? reject(err) : resolve()));
    });
  }

  sendError(fields) {
    return this.send({ type: FRAME_TYPES.ERROR, ...fields }).catch(() => {});
  }

  close(code, reason) {
    if (this.ws.readyState === this.ws.OPEN || this.ws.readyState === this.ws.CONNECTING) {
      this.ws.close(code, reason);
    }
  }

  async onMessage(data) {
    let frame;

    try {
      frame = JSON.parse(data.toString());
    } catch {
      this.close(CLOSE_CODES.PROTOCOL_ERROR, 'Protocol error: malformed JSON');
      return;
    }

    if (!frame || typeof frame.type !== 'string') {
      this.close(CLOSE_CODES.PROTOCOL_ERROR, 'Protocol error: missing frame type');
      return;
    }

    if (!this.connectionInitReceived) {
      if (frame.type !== FRAME_TYPES.CONNECTION_INIT) {
        this.close(CLOSE_CODES.PROTOCOL_ERROR, 'Protocol error: first frame must be connection_init');
        return;
      }
      await this.handleConnectionInit();
      return;
    }

    switch (frame.type) {
      case FRAME_TYPES.SUBSCRIBE:
        this.handleSubscribe(frame);
        break;
      case FRAME_TYPES.UNSUBSCRIBE:
        this.handleUnsubscribe(frame);
        break;
      default:
        await this.sendError({ code: 'ProtocolError', message: `Unknown frame type: ${frame.type}` });
    }
  }

  // TODO: the GraphQL subscription server this replaces required the
  // web:read-pulse scope, verified via an encrypted token sent with the init
  // frame. Restore that check (and the FE sending the token) before this
  // endpoint serves anything beyond the anonymous-readable pulse exchanges.
  handleConnectionInit() {
    clearTimeout(this.connectionInitTimeout);
    this.connectionInitReceived = true;
    this.monitor.log.websocketConnected({ clientId: 'anonymous' });

    return this.send({ type: FRAME_TYPES.CONNECTION_ACK }).catch(() => {});
  }

  handleSubscribe(frame) {
    const { id } = frame;

    if (typeof id !== 'string' || id === '' || this.subscriptions.has(id)) {
      this.sendError({ id, code: 'ProtocolError', message: 'subscribe requires a unique string id' });
      return;
    }

    let bindings;

    try {
      bindings = this.resolveBindings(frame);
    } catch (err) {
      // A malformed subscribe frame is a client error: reject it with an error
      // frame, but keep the connection.
      if (err.code === 'ProtocolError') {
        this.sendError({ id, code: 'ProtocolError', message: err.message });
        return;
      }

      this.monitor.reportError(err);
      this.sendError({ id, code: 'InternalError', message: 'Internal error resolving subscription' });
      return;
    }

    this.subscriptions.set(id, this.pulseEngine.subscribe(
      bindings,
      message => this.deliver(id, message),
      err => this.subscriptionError(id, err)
    ));
  }

  // Resolve a subscribe frame into the `{ exchange, pattern }` bindings the
  // pulse engine consumes. `kind` selects how the frame is interpreted:
  //   - 'raw' (or absent): `frame.bindings` are already resolved exchanges and
  //     patterns — used by the Pulse debugger, which binds arbitrary exchanges;
  //   - 'tasks': named task events scoped to a task group (`taskGroupId`),
  //     matching the tasksSubscriptions GraphQL subscription;
  //   - 'task': named task events scoped to a single task (`taskId`),
  //     matching the taskSubscriptions GraphQL subscription.
  resolveBindings(frame) {
    const kind = frame.kind ?? 'raw';

    switch (kind) {
      case 'raw':
        return frame.bindings;
      case 'tasks':
      case 'task': {
        const routingKey = kind === 'tasks'
          ? { taskGroupId: frame.taskGroupId }
          : { taskId: frame.taskId };

        return frame.subscriptions.map(eventName => {
          const method = eventName.replace('tasks', 'task');
          const binding = this.clients.queueEvents[method](routingKey);

          return { exchange: binding.exchange, pattern: binding.routingKeyPattern };
        });
      }
      default:
        throw Object.assign(new Error(`unknown subscribe kind: ${kind}`), { code: 'ProtocolError' });
    }
  }

  handleUnsubscribe({ id }) {
    if (this.subscriptions.has(id)) {
      this.pulseEngine.unsubscribe(this.subscriptions.get(id));
      this.subscriptions.delete(id);
    }
  }

  // The returned promise tells the pulse engine whether to ack or requeue the
  // message, so delivery failures must propagate rather than be swallowed.
  deliver(id, message) {
    return this.send({ type: FRAME_TYPES.DATA, id, message });
  }

  subscriptionError(id, err) {
    const error = err instanceof Error ? err : new Error(String(err));

    this.monitor.reportError(error);
    this.sendError({ id, code: 'SubscriptionError', message: error.message });
  }

  onClose(closeCode) {
    clearTimeout(this.lifetimeTimeout);
    clearTimeout(this.connectionInitTimeout);

    for (const subscriptionId of this.subscriptions.values()) {
      this.pulseEngine.unsubscribe(subscriptionId);
    }

    this.monitor.log.websocketClosed({ closeCode, openSubscriptions: this.subscriptions.size });
    this.subscriptions.clear();
  }
}
