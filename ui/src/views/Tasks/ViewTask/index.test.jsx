import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { subscribeToTaskEvents } from '../../../utils/pulseListener';
import { TaskclusterClientContext } from '../../../utils/TaskclusterClient';
import ViewTask from './index';

vi.mock('../../../utils/pulseListener', () => ({
  default: vi.fn(() => vi.fn()),
  subscribeToPulseMessages: vi.fn(() => vi.fn()),
  subscribeToTaskEvents: vi.fn(() => vi.fn()),
}));
vi.mock('../../../utils/taskActions', () => ({
  default: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../utils/db', () => ({
  default: { taskIdsHistory: { put: vi.fn() } },
}));

const taskId = 'eR1kMya2SruyMaRMZguROg';
const task = {
  taskGroupId: 'tg1',
  taskQueueId: 'test/test',
  schedulerId: 'test-scheduler',
  projectId: 'none',
  created: '2022-02-03T14:41:19.706Z',
  deadline: '2022-02-04T14:41:19.706Z',
  expires: '2023-02-03T14:41:19.706Z',
  priority: 'high',
  requires: 'all-completed',
  retries: 5,
  dependencies: [],
  scopes: [],
  routes: [],
  tags: {},
  extra: {},
  payload: {},
  metadata: {
    name: 'task name',
    description: 'task description',
    owner: 'someone@example.com',
    source: 'https://example.com/source',
  },
};
const makeStatus = (runCount = 1) => ({
  taskId,
  taskGroupId: 'tg1',
  state: 'completed',
  retriesLeft: 5,
  runs: Array.from({ length: runCount }, (_, runId) => ({
    runId,
    state: 'completed',
    reasonCreated: 'scheduled',
    reasonResolved: 'completed',
    scheduled: '2022-02-03T14:41:19.706Z',
    started: '2022-02-03T14:43:54.086Z',
    resolved: '2022-02-03T14:45:28.396Z',
    workerGroup: 'us-east1',
    workerId: 'worker-1',
  })),
});

const makeClient = (overrides = {}) => ({
  task: vi.fn().mockResolvedValue(task),
  status: vi.fn().mockResolvedValue({ status: makeStatus() }),
  listArtifacts: vi.fn().mockResolvedValue({ artifacts: [] }),
  listDependentTasks: vi.fn().mockResolvedValue({ tasks: [] }),
  ...overrides,
});

const renderViewTask = (client, params = { taskId }) =>
  render(
    <MemoryRouter keyLength={0}>
      <TaskclusterClientContext.Provider value={() => client}>
        <ViewTask match={{ params }} />
      </TaskclusterClientContext.Provider>
    </MemoryRouter>
  );

describe('ViewTask page', () => {
  it('should load the task, its status, artifacts and dependents over REST', async () => {
    const client = makeClient();

    renderViewTask(client);

    await waitFor(() => expect(client.listArtifacts).toHaveBeenCalled());

    expect(client.task).toHaveBeenCalledWith(taskId);
    expect(client.status).toHaveBeenCalledWith(taskId);
    // no runId in the URL, so the latest run is shown
    expect(client.listArtifacts).toHaveBeenCalledWith(
      taskId,
      0,
      expect.objectContaining({ limit: expect.any(Number) })
    );
    expect(client.listDependentTasks).toHaveBeenCalledWith(
      taskId,
      expect.objectContaining({ limit: expect.any(Number) })
    );
  });

  it('should load the artifacts of the run given in the URL', async () => {
    const client = makeClient({
      status: vi.fn().mockResolvedValue({ status: makeStatus(3) }),
    });

    renderViewTask(client, { taskId, runId: '1' });

    await waitFor(() =>
      expect(client.listArtifacts).toHaveBeenCalledWith(
        taskId,
        1,
        expect.anything()
      )
    );
  });

  it('should subscribe to this task’s events and apply what they publish', async () => {
    const client = makeClient();

    renderViewTask(client);

    await waitFor(() => expect(subscribeToTaskEvents).toHaveBeenCalled());

    const [frame, handlers] = subscribeToTaskEvents.mock.calls[0];

    expect(frame.routingKey).toEqual({ taskId });
    expect(frame.subscriptions).toContain('taskRunning');

    const artifactCalls = client.listArtifacts.mock.calls.length;

    // a status published on the socket is applied without asking the queue
    // for it again, but the artifacts of the new run are fetched
    handlers.onMessage({ payload: { status: makeStatus(2) } });

    await waitFor(() =>
      expect(client.listArtifacts.mock.calls.length).toBeGreaterThan(
        artifactCalls
      )
    );
    expect(client.status).toHaveBeenCalledTimes(1);
    expect(client.listArtifacts).toHaveBeenLastCalledWith(
      taskId,
      1,
      expect.anything()
    );
  });

  it('should not crash when the task cannot be fetched', async () => {
    const client = makeClient({
      task: vi.fn().mockRejectedValue(new Error('no such task')),
      status: vi.fn().mockRejectedValue(new Error('no such task')),
    });

    renderViewTask(client);

    await waitFor(() => expect(client.task).toHaveBeenCalled());
    expect(client.listArtifacts).not.toHaveBeenCalled();
  });
});
