import { MonitorManager } from '@taskcluster/lib-monitor';

MonitorManager.register({
  name: 'createCredentials',
  title: 'Credentials Created',
  type: 'create-credentials',
  version: 1,
  level: 'info',
  description: 'A client has been issued Taskcluster credentials',
  fields: {
    clientId: 'The clientId of the issued credentials',
    userIdentity: 'The identity of the user to which the credentials were issued',
    expires: 'Date time when the issued credentials expires.',
  },
});

MonitorManager.register({
  name: 'bindPulseSubscription',
  title: 'Bind a Pulse Subscription',
  type: 'bind-pulse-subscription',
  version: 1,
  level: 'debug',
  description: `
    The PulseEngine has created a queue and bound it to one or more exchanges in
    response to a live-event subscription request.`,
  fields: {
    subscriptionId: 'The subscriptionId, which will also appear in the AMQP queue name',
  },
});

MonitorManager.register({
  name: 'unbindPulseSubscription',
  title: 'Unbind a Pulse Subscription',
  type: 'unbind-pulse-subscription',
  version: 1,
  level: 'debug',
  description: `
    The PulseEngine has deleted a queue bound to one or more exchanges in
    response to termination of a live-event subscription request.`,
  fields: {
    subscriptionId: 'The subscriptionId, which will also appear in the AMQP queue name',
  },
});

MonitorManager.register({
  name: 'eventWebSocketConnection',
  title: 'Event WebSocket Connection Changed',
  type: 'event-websocket-connection',
  version: 1,
  level: 'info',
  description: 'A connection to the versioned event WebSocket endpoint was opened or closed.',
  fields: {
    connected: 'True when the connection opened and false when it closed.',
  },
});

MonitorManager.register({
  name: 'eventWebSocketSubscription',
  title: 'Event WebSocket Subscription Changed',
  type: 'event-websocket-subscription',
  version: 1,
  level: 'debug',
  description: 'An exchange subscription was created or removed from an event WebSocket connection.',
  fields: {
    action: 'Either created or removed.',
    exchange: 'The public allow-listed exchange name.',
  },
});

MonitorManager.register({
  name: 'requestReceived',
  title: 'Request Received',
  type: 'request-received',
  version: 1,
  level: 'notice',
  description:
    'A GraphQL request has been received. The traceId/request is at the top-level of the log message, above these fields.',
  fields: {
    query: 'The graphQL query string',
    operationName: `
      The name of the graphql query performed. If the operation is anonymous
      (i.e., the operation is query { ... } instead of query NamedQuery { ... })
      , then operationName is null.`,
  },
});
