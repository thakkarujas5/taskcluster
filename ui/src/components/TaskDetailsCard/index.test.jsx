import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskDetailsCard from './index';

it('should render TaskDetailsCard', () => {
  const { asFragment } = render(
    <MemoryRouter keyLength={0}>
      <TaskDetailsCard
        task={{
          taskId: 'taskId',
          status: {
            taskId: 'taskId',
            taskGroupId: 'tg1',
            state: 'running',
            retriesLeft: 5,
            runs: [],
          },
          taskQueueId: 'task/queue/id',
          created: '2022-02-15T12:00:00.000Z',
          deadline: '2022-05-15T12:00:00.000Z',
          expires: '2023-02-15T12:00:00.000Z',
          priority: 'high',
          requires: 'all-completed',
          scopes: ['scopes'],
          routes: [],
          dependencies: [],
          payload: {
            command: [
              '/bin/bash',
              '-c',
              'for ((i=1;i<=60;i++)); do echo $i; sleep 1; done',
            ],
            image: 'ubuntu:latest',
            maxRunTime: 90,
          },
          metadata: {
            source: 'https://test.taskcluster-dev.net/task/taskId',
          },
          extra: {},
        }}
        dependents={[]}
        onDependentsNextPage={vi.fn()}
        onDependentsPreviousPage={vi.fn()}
        objectContent={{}}
      />
    </MemoryRouter>
  );

  expect(asFragment()).toMatchSnapshot();
});
