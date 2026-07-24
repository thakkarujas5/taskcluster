const exchanges = new Map([
  ['task-defined', 'taskDefined'],
  ['task-pending', 'taskPending'],
  ['task-running', 'taskRunning'],
  ['task-completed', 'taskCompleted'],
  ['task-failed', 'taskFailed'],
  ['task-exception', 'taskException'],
  ['artifact-created', 'artifactCreated'],
]);

export const supportedEventExchanges = [...exchanges.keys()];

export const eventExchangeBinding = ({ queueEvents, exchange, filters }) => {
  const method = exchanges.get(exchange);
  if (!method) {
    throw new Error(`Unsupported event exchange: ${exchange}`);
  }

  const binding = queueEvents[method](filters);

  return {
    exchange: binding.exchange,
    pattern: binding.routingKeyPattern,
  };
};
