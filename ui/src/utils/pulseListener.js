// Hook bindings use `routingKeyPattern`; the PulseMessages view uses `pattern`.
// Both are normalized to the `{ exchange, pattern }` shape the events server expects.
const toSubscriptions = bindings =>
  bindings.map(({ exchange, pattern, routingKeyPattern }) => ({
    exchange,
    pattern: pattern ?? routingKeyPattern,
  }));

const getEventsWsUrl = () => {
  // Resolves against the current origin when relative (dev: '/events', proxied
  // by Vite) and is used as-is when absolute (deployed: 'https://host/events').
  const endpoint = window.env?.EVENT_WEBSOCKET_ENDPOINT || '/events';
  const url = new URL(endpoint, window.location.href);

  // http(s) -> ws(s); a same-origin relative path inherits the page protocol.
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return url.toString();
};

// Subscription ids are chosen by the client; the server only requires them to
// be unique per connection. A counter keeps them readable in frame logs.
let nextSubscriptionId = 1;

/**
 * Open the events WebSocket, and once the connection is acknowledged send the
 * given subscribe frame. Handles the connection_init/ack handshake, delivery,
 * errors, and teardown that every subscription shape shares. Returns a teardown
 * function that unsubscribes.
 */
const openEventsSubscription = (subscribeFrame, { onMessage, onError }) => {
  const ws = new WebSocket(getEventsWsUrl());
  const id = `sub-${nextSubscriptionId}`;
  let torn = false;

  nextSubscriptionId += 1;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'connection_init' }));
  };

  ws.onmessage = ({ data }) => {
    let frame;

    try {
      frame = JSON.parse(data);
    } catch {
      return;
    }

    switch (frame.type) {
      case 'connection_ack':
        ws.send(JSON.stringify({ ...subscribeFrame, id }));
        break;
      case 'data':
        if (frame.id === id) {
          onMessage(frame.message);
        }

        break;
      case 'error':
        onError(new Error(frame.message ?? 'Pulse subscription error'));
        break;
      default:
        break;
    }
  };

  ws.onerror = () => {
    if (!torn) {
      onError(new Error('WebSocket connection error'));
    }
  };

  ws.onclose = event => {
    if (!torn && !event.wasClean) {
      onError(new Error(`WebSocket closed unexpectedly (code ${event.code})`));
    }
  };

  return () => {
    torn = true;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', id }));
    }

    ws.close();
  };
};

/**
 * Subscribe to Pulse messages arriving on the given raw bindings (each an
 * `{ exchange, pattern }` or `{ exchange, routingKeyPattern }`) via the native
 * WebSocket events endpoint. Used by the Pulse debugger views, which bind
 * arbitrary exchanges directly. Returns a teardown function that unsubscribes.
 */
const subscribeToPulseMessages = (bindings, handlers) =>
  openEventsSubscription(
    { type: 'subscribe', kind: 'raw', bindings: toSubscriptions(bindings) },
    handlers
  );

/**
 * Subscribe to task events within a task group, mirroring the
 * tasksSubscriptions GraphQL subscription: pass a `taskGroupId` and a
 * non-empty `subscriptions` array of event names (e.g. `['tasksDefined',
 * 'tasksCompleted']`); the server resolves them to the matching exchanges and
 * builds the routing key from the taskGroupId internally. Returns a teardown
 * function that unsubscribes.
 */
const subscribeToTaskGroupEvents = ({ taskGroupId, subscriptions }, handlers) =>
  openEventsSubscription(
    { type: 'subscribe', kind: 'tasks', taskGroupId, subscriptions },
    handlers
  );

/**
 * Subscribe to events for a single task, mirroring the taskSubscriptions
 * GraphQL subscription: pass a `taskId` and a non-empty `subscriptions` array
 * of event names (e.g. `['tasksDefined', 'tasksCompleted']`); the server
 * resolves them to the matching exchanges and builds the routing key from the
 * taskId internally. Returns a teardown function that unsubscribes.
 */
const subscribeToTaskEvents = ({ taskId, subscriptions }, handlers) =>
  openEventsSubscription(
    { type: 'subscribe', kind: 'task', taskId, subscriptions },
    handlers
  );

export default subscribeToPulseMessages;
export {
  subscribeToPulseMessages,
  subscribeToTaskGroupEvents,
  subscribeToTaskEvents,
};
