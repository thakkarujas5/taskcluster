import { vi, describe, it, expect, beforeEach } from 'vitest';
import submitTaskAction from './submitTaskAction';
import { getClient } from '../../utils/client';

// Mock getClient to return a mock Queue instance
vi.mock('../../utils/client', () => ({
  getClient: vi.fn(),
}));
vi.mock('@taskcluster/client-web', () => ({
  Auth: vi.fn(),
  Hooks: vi.fn(),
  Queue: vi.fn(),
}));
// Mock validateActionsJson to avoid fetch in test environment
vi.mock('../../utils/validateActionsJson', () => ({
  default: vi.fn().mockResolvedValue(() => true),
}));

const taskDef = JSON.stringify({
  taskQueueId: 'test/test',
  created: '2024-01-01T00:00:00.000Z',
  deadline: '2024-01-02T00:00:00.000Z',
  expires: '2024-12-31T00:00:00.000Z',
  payload: {},
  metadata: {
    name: 'test',
    description: 'test',
    owner: 'test@test.com',
    source: 'http://test',
  },
});

describe('submitTaskAction', () => {
  const user = {
    credentials: { clientId: 'test', accessToken: 'secret' },
  };
  const mockCreateTask = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    getClient.mockReturnValue({ createTask: mockCreateTask });
  });

  it('action.kind=task: calls Queue.createTask directly', async () => {
    const task = {
      taskId: 'abc123',
      taskGroupId: 'abc123',
      scopes: ['queue:create-task:*'],
      taskActions: {
        variables: {},
        actions: [
          {
            kind: 'task',
            name: 'test-action',
            title: 'Test Action',
            context: [],
            schema: {},
            task: taskDef,
            description: 'Test action',
          },
        ],
        version: 1,
      },
    };
    const action = task.taskActions.actions[0];

    await submitTaskAction({
      task,
      taskActions: task.taskActions,
      form: '{}',
      action,
      user,
    });

    // Queue.createTask should be called directly
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
  });

  it('action.kind=task: passes authorizedScopes from taskGroup.scopes', async () => {
    const scopes = ['queue:create-task:proj-test/test-worker'];
    const task = {
      taskId: 'abc123',
      taskGroupId: 'abc123',
      scopes,
      taskActions: {
        variables: {},
        actions: [],
        version: 1,
      },
    };
    const action = {
      kind: 'task',
      name: 'retrigger',
      title: 'Retrigger',
      context: [],
      schema: {},
      task: taskDef,
      description: 'Retrigger task',
    };

    await submitTaskAction({
      task,
      taskActions: {
        variables: {},
        actions: [action],
        version: 1,
      },
      form: '{}',
      action,
      user,
    });

    expect(getClient).toHaveBeenCalledWith(
      expect.objectContaining({
        user,
        authorizedScopes: scopes,
      })
    );
  });

  it('action.kind=hook: expands scopes and triggers the hook over REST', async () => {
    const expandScopes = vi
      .fn()
      .mockResolvedValue({ scopes: ['in-tree:hook-action:proj-test/action'] });
    const triggerHook = vi.fn().mockResolvedValue({ taskId: 'newTaskId' });

    getClient.mockReturnValue({ expandScopes, triggerHook });

    const task = {
      taskId: 'abc123',
      taskGroupId: 'abc123',
      scopes: ['assume:repo:test'],
    };
    const action = {
      kind: 'hook',
      name: 'action',
      title: 'Action',
      context: [],
      schema: {},
      hookGroupId: 'proj-test',
      hookId: 'action',
      hookPayload: { foo: 'bar' },
      description: 'Hook action',
    };

    const taskId = await submitTaskAction({
      task,
      taskActions: { variables: {}, actions: [action], version: 1 },
      form: '{}',
      action,
      user,
    });

    expect(expandScopes).toHaveBeenCalledWith({ scopes: task.scopes });
    expect(triggerHook).toHaveBeenCalledWith('proj-test', 'action', {
      foo: 'bar',
    });
    expect(taskId).toBe('newTaskId');
  });
});
