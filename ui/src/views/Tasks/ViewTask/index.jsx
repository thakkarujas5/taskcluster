import React, { Component, Fragment } from 'react';
import { omit, pathOr, mergeRight } from 'ramda';
import cloneDeep from 'lodash.clonedeep';
import { withStyles } from '@material-ui/core/styles';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Checkbox from '@material-ui/core/Checkbox';
import jsonSchemaDefaults from 'json-schema-defaults';
import { dump } from 'js-yaml';
import { PurgeCache, Queue } from '@taskcluster/client-web';
import HammerIcon from 'mdi-react/HammerIcon';
import CreationIcon from 'mdi-react/CreationIcon';
import PencilIcon from 'mdi-react/PencilIcon';
import ClockOutlineIcon from 'mdi-react/ClockOutlineIcon';
import ShovelIcon from 'mdi-react/ShovelIcon';
import CloseIcon from 'mdi-react/CloseIcon';
import FlashIcon from 'mdi-react/FlashIcon';
import ConsoleLineIcon from 'mdi-react/ConsoleLineIcon';
import RestartIcon from 'mdi-react/RestartIcon';
import ChartIcon from 'mdi-react/ChartBarIcon';
import SortIcon from 'mdi-react/SortIcon';
import Spinner from '../../../components/Spinner';
import Dashboard from '../../../components/Dashboard';
import Markdown from '../../../components/Markdown';
import TaskDetailsCard from '../../../components/TaskDetailsCard';
import TaskRunsCard from '../../../components/TaskRunsCard';
import Helmet from '../../../components/Helmet';
import HelpView from '../../../components/HelpView';
import Search from '../../../components/Search';
import SpeedDial from '../../../components/SpeedDial';
import SpeedDialAction from '../../../components/SpeedDialAction';
import DialogAction from '../../../components/DialogAction';
import ChangeTaskPriorityDialog from '../../../components/ChangeTaskPriorityDialog';
import TaskActionForm from '../../../components/TaskActionForm';
import Breadcrumbs from '../../../components/Breadcrumbs';
import {
  ARTIFACTS_PAGE_SIZE,
  DEPENDENTS_PAGE_SIZE,
  VALID_TASK,
  TASK_POLL_INTERVAL,
  UI_SCHEDULER_ID,
  API_TASK_STATE,
} from '../../../utils/constants';
import db from '../../../utils/db';
import ErrorPanel from '../../../components/ErrorPanel';
import formatError from '../../../utils/formatError';
import parameterizeTask from '../../../utils/parameterizeTask';
import { nice } from '../../../utils/slugid';
import Link from '../../../utils/Link';
import { changeTaskPriority } from '../../../utils/client';
import { subscribeToTaskEvents } from '../../../utils/pulseListener';
import getTaskActions from '../../../utils/taskActions';
import { withTaskclusterClient } from '../../../utils/TaskclusterClient';
import { AuthContext } from '../../../utils/Auth';
import submitTaskAction from '../submitTaskAction';

// Every event that changes a task's status; the events server expands these
// into the matching queue exchanges, filtered on this task's taskId.
const TASK_EVENTS = [
  'taskDefined',
  'taskPending',
  'taskRunning',
  'taskCompleted',
  'taskFailed',
  'taskException',
];

const updateTaskIdHistory = (id, task, status) => {
  if (!VALID_TASK.test(id)) {
    return;
  }

  db.taskIdsHistory.put({
    taskId: id,
    name: task?.metadata?.name,
    source: task?.metadata?.source,
    taskQueueId: task?.taskQueueId,
    created: task?.created,
    deadline: task?.deadline,
    state: status?.state,
    viewedAt: Date.now(),
  });
};

const taskInContext = (tagSetList, taskTags) =>
  tagSetList.some(tagSet =>
    Object.keys(tagSet).every(
      tag => taskTags[tag] && taskTags[tag] === tagSet[tag]
    )
  );
const getCachesFromTask = task =>
  Object.keys(pathOr({}, ['payload', 'cache'], task));

@withStyles(theme => ({
  title: {
    marginBottom: theme.spacing(1),
  },
  divider: {
    margin: `${theme.spacing(3)}px 0`,
  },
  tag: {
    margin: `${theme.spacing(1)}px ${theme.spacing(1)}px 0 0`,
  },
  dialogListItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  link: {
    ...theme.mixins.link,
  },
}))
@withTaskclusterClient
export default class ViewTask extends Component {
  static contextType = AuthContext;

  state = {
    task: null,
    status: null,
    taskActions: null,
    // the task group's decision task, whose scopes actions are run with
    decisionTask: null,
    loading: true,
    error: null,
    subscriptionError: null,
    artifacts: [],
    artifactsLoading: false,
    artifactsPage: 0,
    hasNextArtifactsPage: false,
    dependents: [],
    dependentsLoading: false,
    dependentsPage: 0,
    hasNextDependentsPage: false,
    selectedAction: null,
    dialogOpen: false,
    actionLoading: false,
    dialogActionProps: null,
    dialogError: null,
    changePriorityDialogOpen: false,
    caches: null,
    selectedCaches: null,
    formInputs: null,
  };

  mounted = true;

  listener = null;

  pollInterval = null;

  // Continuation tokens of the pages already visited; the token at index N
  // opens page N. The queue's tokens only ever point forwards, so paging back
  // means replaying a token we have already seen.
  artifactTokens = [null];

  dependentTokens = [null];

  componentDidMount() {
    this.loadTask();
    this.pollInterval = setInterval(this.refreshStatus, TASK_POLL_INTERVAL);
  }

  componentDidUpdate(prevProps) {
    const { taskId, runId } = this.props.match.params;

    if (prevProps.match.params.taskId !== taskId) {
      this.loadTask();
    } else if (prevProps.match.params.runId !== runId) {
      // artifact pages are per-run, so start the new run at its first page
      this.artifactTokens = [null];
      this.loadArtifacts();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    this.unsubscribe();
    clearInterval(this.pollInterval);
  }

  get queue() {
    return this.props.createTaskclusterClient({ Class: Queue });
  }

  get taskId() {
    return this.props.match.params.taskId;
  }

  /**
   * The run being displayed: the one in the URL, or the latest one.
   */
  getSelectedRunId(status = this.state.status) {
    const { runId } = this.props.match.params;

    if (runId !== undefined) {
      return parseInt(runId, 10);
    }

    return Math.max((status?.runs?.length ?? 0) - 1, 0);
  }

  /**
   * Ignore a response that arrived after the user moved on to another task.
   */
  isCurrent(taskId) {
    return this.mounted && this.taskId === taskId;
  }

  async loadTask() {
    const { taskId } = this;

    this.setState({
      loading: true,
      error: null,
      task: null,
      status: null,
      taskActions: null,
      decisionTask: null,
      artifacts: [],
      artifactsPage: 0,
      hasNextArtifactsPage: false,
      dependents: [],
      dependentsPage: 0,
      hasNextDependentsPage: false,
      dialogOpen: false,
    });
    this.artifactTokens = [null];
    this.dependentTokens = [null];

    try {
      const { queue } = this;
      const [task, { status }] = await Promise.all([
        queue.task(taskId),
        queue.status(taskId),
      ]);

      if (!this.isCurrent(taskId)) {
        return;
      }

      const caches = getCachesFromTask(task);

      this.setState({
        task,
        status,
        loading: false,
        caches,
        selectedCaches: new Set(caches),
      });
      updateTaskIdHistory(taskId, task, status);
      this.subscribe(taskId);
      this.loadArtifacts(status);
      this.loadDependents();
      this.loadTaskActions(task);
    } catch (error) {
      if (this.isCurrent(taskId)) {
        this.setState({ error, loading: false });
      }
    }
  }

  /**
   * Load the actions.json of the task group's decision task, along with the
   * decision task itself: running an action needs its scopes.
   */
  async loadTaskActions(task) {
    const { taskId } = this;
    const { taskGroupId } = task;
    const { user } = this.context;

    const [taskActions, decisionTask] = await Promise.all([
      getTaskActions({ taskGroupId, user, contextScope: 'task' }).catch(
        () => null
      ),
      taskGroupId === taskId
        ? Promise.resolve(null)
        : // a task without a decision task is normal; fall back to null
          this.queue.task(taskGroupId).catch(() => null),
    ]);

    if (this.isCurrent(taskId)) {
      this.setState({ taskActions, decisionTask });
    }
  }

  async loadArtifacts(status = this.state.status, page = 0) {
    const { taskId } = this;
    const runId = this.getSelectedRunId(status);

    if (!status?.runs?.length || !status.runs[runId]) {
      this.setState({ artifacts: [], hasNextArtifactsPage: false });

      return;
    }

    this.setState({ artifactsLoading: true });

    try {
      const { artifacts, continuationToken } = await this.queue.listArtifacts(
        taskId,
        runId,
        {
          limit: ARTIFACTS_PAGE_SIZE,
          ...(this.artifactTokens[page]
            ? { continuationToken: this.artifactTokens[page] }
            : null),
        }
      );

      if (!this.isCurrent(taskId)) {
        return;
      }

      this.artifactTokens[page + 1] = continuationToken;
      this.setState({
        artifacts,
        artifactsPage: page,
        artifactsLoading: false,
        hasNextArtifactsPage: Boolean(continuationToken),
      });
    } catch (error) {
      if (this.isCurrent(taskId)) {
        // artifacts are secondary to the task itself: surface the failure
        // without tearing down the page
        this.setState({
          artifacts: [],
          artifactsLoading: false,
          hasNextArtifactsPage: false,
          error,
        });
      }
    }
  }

  async loadDependents(page = 0) {
    const { taskId } = this;

    this.setState({ dependentsLoading: true });

    try {
      const { tasks, continuationToken } = await this.queue.listDependentTasks(
        taskId,
        {
          limit: DEPENDENTS_PAGE_SIZE,
          ...(this.dependentTokens[page]
            ? { continuationToken: this.dependentTokens[page] }
            : null),
        }
      );

      if (!this.isCurrent(taskId)) {
        return;
      }

      this.dependentTokens[page + 1] = continuationToken;
      this.setState({
        dependents: tasks.map(({ task, status }) => ({
          taskId: status.taskId,
          name: task?.metadata?.name ?? status.taskId,
          state: status.state,
        })),
        dependentsPage: page,
        dependentsLoading: false,
        hasNextDependentsPage: Boolean(continuationToken),
      });
    } catch (error) {
      if (this.isCurrent(taskId)) {
        this.setState({
          dependents: [],
          dependentsLoading: false,
          hasNextDependentsPage: false,
          error,
        });
      }
    }
  }

  refreshStatus = async () => {
    const { taskId } = this;

    if (!taskId || !this.state.task) {
      return;
    }

    try {
      const { status } = await this.queue.status(taskId);

      if (this.isCurrent(taskId)) {
        this.applyStatus(status);
      }
    } catch {
      // a failed poll is not worth reporting; the next one may succeed
    }
  };

  /**
   * Show a newly fetched or newly published status, and refresh the artifacts
   * that go with it. A run appearing or resolving invalidates the artifact
   * pages we are holding, so paging starts over in that case.
   */
  applyStatus(status) {
    const runsChanged =
      (status.runs?.length ?? 0) !== (this.state.status?.runs?.length ?? 0);
    const page = runsChanged ? 0 : this.state.artifactsPage;

    if (runsChanged) {
      this.artifactTokens = [null];
    }

    this.setState({ status });
    this.loadArtifacts(status, page);
  }

  subscribe(taskId) {
    if (this.listener) {
      if (this.listener.taskId === taskId) {
        return this.listener;
      }

      this.unsubscribe();
    }

    const unsubscribe = subscribeToTaskEvents(
      { subscriptions: TASK_EVENTS, routingKey: { taskId } },
      {
        onMessage: this.handleTaskEvent,
        onError: this.handleSubscriptionError,
      }
    );

    this.listener = { taskId, unsubscribe };
  }

  unsubscribe() {
    if (!this.listener) {
      return;
    }

    this.listener.unsubscribe();
    this.listener = null;
  }

  handleTaskEvent = message => {
    const status = message?.payload?.status;

    if (!status || !this.isCurrent(status.taskId)) {
      return;
    }

    // the event carries the full status, so apply it directly rather than
    // going back to the queue for it
    this.setState({ subscriptionError: null });
    this.applyStatus(status);
  };

  handleSubscriptionError = subscriptionError => {
    if (this.mounted) {
      this.setState({ subscriptionError });
    }
  };

  getTaskActionsData() {
    const taskActions = [];
    const actionInputs = {};
    const actionData = {};
    const { task, taskActions: actions } = this.state;

    if (Array.isArray(actions?.actions)) {
      actions.actions.forEach(action => {
        // if an action with this name has already been selected,
        // don't consider this version
        if (
          task?.tags &&
          taskInContext(action.context, task.tags) &&
          !taskActions.some(({ name }) => name === action.name)
        ) {
          taskActions.push(action);
        } else {
          return;
        }

        const schema = action.schema || {};

        actionInputs[action.name] = dump(jsonSchemaDefaults(schema) || {});
        actionData[action.name] = { action };
      });
    }

    return { taskActions, actionInputs, actionData };
  }

  /**
   * The task as the action machinery expects it: the definition, with the
   * fields that only exist alongside it.
   */
  getActionTask() {
    const { task, decisionTask } = this.state;

    return { taskId: this.taskId, ...task, decisionTask };
  }

  handleActionClick = name => () => {
    const { actionData, actionInputs } = this.getTaskActionsData();
    const { action } = actionData[name];

    this.setState({
      dialogError: null,
      dialogOpen: true,
      selectedAction: action,
      formInputs: actionInputs[name] ?? '',
    });
  };

  handleActionComplete = action => taskId => {
    this.handleActionDialogClose();
    this.handleActionTaskComplete(action, taskId);
  };

  handleActionDialogClose = () => {
    this.setState({
      dialogOpen: false,
      selectedAction: null,
      dialogActionProps: null,
      dialogError: null,
      actionLoading: false,
    });
  };

  handleActionTaskComplete = (action, taskId) => {
    switch (action.name) {
      case 'create-interactive':
        this.props.history.push(`/tasks/${taskId}/connect`);
        break;
      default:
        this.props.history.push(`/tasks/${taskId}`);
    }
  };

  handleActionTaskSubmit =
    ({ name }) =>
    async () => {
      this.preRunningAction();

      const { formInputs, taskActions } = this.state;
      const { actionData } = this.getTaskActionsData();
      const { action } = actionData[name];
      const taskId = await submitTaskAction({
        task: this.getActionTask(),
        taskActions,
        form: formInputs,
        action,
        user: this.context.user,
      });

      return taskId;
    };

  handleArtifactsNextPage = () => {
    this.loadArtifacts(this.state.status, this.state.artifactsPage + 1);
  };

  handleArtifactsPreviousPage = () => {
    this.loadArtifacts(
      this.state.status,
      Math.max(this.state.artifactsPage - 1, 0)
    );
  };

  handleDependentsNextPage = () => {
    this.loadDependents(this.state.dependentsPage + 1);
  };

  handleDependentsPreviousPage = () => {
    this.loadDependents(Math.max(this.state.dependentsPage - 1, 0));
  };

  // copy fields from the parent task, intentionally excluding some
  // fields which might cause confusion if left unchanged
  handleCloneTask = () =>
    mergeRight(
      omit(
        ['routes', 'taskGroupId', 'schedulerId', 'priority', 'requires'],
        cloneDeep(this.state.task)
      ),
      { schedulerId: UI_SCHEDULER_ID }
    );

  handleRerunComplete = () => {
    this.handleActionDialogClose();
    this.refreshStatus();
  };

  handleCancelComplete = () => {
    this.handleActionDialogClose();
    this.refreshStatus();
  };

  handleCreateInteractiveComplete = taskId => {
    this.handleActionDialogClose();
    this.props.history.push(`/tasks/${taskId}/connect`);
  };

  handleRetriggerComplete = taskId => {
    this.handleActionDialogClose();
    this.props.history.push(`/tasks/${taskId}`);
  };

  handleCreateInteractiveTaskClick = () => {
    const title = 'Create with SSH/VNC';

    this.setState({
      dialogOpen: true,
      dialogActionProps: {
        fullScreen: false,
        body: (
          <Fragment>
            <Typography variant="body2">
              This will duplicate the task and create it under a different{' '}
              <code>taskId</code>.
            </Typography>
            <Typography variant="body2">
              The new task will be altered to:
            </Typography>
            <ul>
              <li>
                <Typography variant="body2">
                  Set <code>task.payload.features.interactive = true</code>
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Strip <code>task.payload.caches</code> to avoid poisoning
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Ensures <code>task.payload.maxRunTime</code> is minimum of 60
                  minutes
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Strip <code>task.routes</code> to avoid side-effects
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Set the environment variable{' '}
                  <code>TASKCLUSTER_INTERACTIVE=true</code>
                </Typography>
              </li>
            </ul>
            <Typography variant="body2">
              Note: this may not work with all tasks. You may not have the
              scopes required to create the task.
            </Typography>
          </Fragment>
        ),
        title: `${title}?`,
        onSubmit: this.handleCreateLoaner,
        onComplete: this.handleCreateInteractiveComplete,
        confirmText: title,
      },
    });
  };

  handleCreateLoaner = async () => {
    const taskId = nice();
    const task = parameterizeTask(this.state.task);

    this.preRunningAction();

    try {
      await this.queue.createTask(taskId, task);

      return taskId;
    } catch (error) {
      this.postRunningFailedAction(formatError(error));
      throw error;
    }
  };

  handleEdit = task =>
    this.props.history.push({
      pathname: '/tasks/create',
      state: { task },
    });

  handleEditTaskClick = () => {
    const title = 'Edit';

    this.setState({
      dialogOpen: true,
      dialogActionProps: {
        fullScreen: false,
        body: (
          <Typography variant="body2">
            Note that the edited task will not be linked to other tasks nor have
            the same <code>task.routes</code> as other tasks, so this is not a
            way to fix a failing task in a larger task group. Note that you may
            also not have the scopes required to create the resulting task.
          </Typography>
        ),
        title: `${title}?`,
        onSubmit: this.handleCloneTask,
        onComplete: this.handleEditTaskComplete,
        confirmText: title,
      },
    });
  };

  handleEditTaskComplete = task => {
    this.handleActionDialogClose();
    this.handleEdit(task);
  };

  handleFormChange = value =>
    this.setState({
      formInputs: value,
    });

  handleOpenLogProfiler = () => {
    const { taskId } = this.props.match.params;
    const profileUrl = `${window.env.TASKCLUSTER_ROOT_URL}/api/web-server/v1/task/${taskId}/profile`;
    const profilerUrl = `https://profiler.firefox.com/from-url/${encodeURIComponent(
      profileUrl
    )}`;

    window.open(profilerUrl, '_blank');
  };

  handleChangePriorityClick = () => {
    this.setState({ changePriorityDialogOpen: true });
  };

  handleChangePriorityClose = () => {
    this.setState({ changePriorityDialogOpen: false });
  };

  handleChangePriorityComplete = () => {
    this.setState({ changePriorityDialogOpen: false });
    // refresh the task so the new priority is reflected immediately
    this.reloadTaskDefinition();
  };

  async reloadTaskDefinition() {
    const { taskId } = this;

    try {
      const task = await this.queue.task(taskId);

      if (this.isCurrent(taskId)) {
        this.setState({ task });
      }
    } catch (error) {
      if (this.isCurrent(taskId)) {
        this.setState({ error });
      }
    }
  }

  handlePurgeWorkerCacheClick = () => {
    const title = 'Purge Worker Cache';
    const { selectedCaches } = this.state;

    this.setState({
      dialogOpen: true,
      dialogActionProps: {
        fullScreen: false,
        body: this.renderPurgeWorkerCacheDialogBody(selectedCaches),
        title: `${title}?`,
        onSubmit: this.purgeWorkerCache,
        onComplete: this.handleActionDialogClose,
        confirmText: title,
      },
    });
  };

  handleCancelTaskClick = () => {
    const title = 'Cancel Task';

    this.setState({
      dialogOpen: true,
      dialogActionProps: {
        fullScreen: false,
        title: `${title}?`,
        onSubmit: this.cancelTask,
        onComplete: this.handleCancelComplete,
        confirmText: title,
      },
    });
  };

  handleRetriggerTaskClick = () => {
    const title = 'Retrigger';

    this.setState({
      dialogOpen: true,
      dialogActionProps: {
        fullScreen: false,
        body: (
          <Fragment>
            <Typography>
              This will duplicate the task and create it under a different{' '}
              <code>taskId</code>.
            </Typography>
            <Typography>
              The new task will be altered to:
              <ul>
                <li>
                  Update deadlines and other timestamps for the current time
                </li>
                <li>
                  Set number of <code>retries</code> to zero
                </li>
              </ul>
              <Typography>Note: this may not work with all tasks.</Typography>
            </Typography>
          </Fragment>
        ),
        title: `${title}?`,
        onSubmit: this.retriggerTask,
        onComplete: this.handleRetriggerComplete,
        confirmText: title,
      },
    });
  };

  handleRerunTaskClick = () => {
    const title = 'Rerun';

    this.setState({
      dialogOpen: true,
      dialogActionProps: {
        fullScreen: false,
        body: (
          <Typography variant="body2">
            This will cause a new run of the task to be created with the same{' '}
            <code>taskId</code>. It will only succeed if the task hasn&#39;t
            passed it&#39;s deadline. Notice that this may interfere with
            listeners who only expects this tasks to be resolved once.
          </Typography>
        ),
        title: `${title}?`,
        onSubmit: this.rerunTask,
        onComplete: this.handleRerunComplete,
        confirmText: title,
      },
    });
  };

  handleScheduleTaskClick = () => {
    const title = 'Schedule';

    this.setState({
      dialogOpen: true,
      dialogActionProps: {
        fullScreen: false,
        body: (
          <Typography variant="body2">
            This will <strong>overwrite any scheduling process</strong> taking
            place. If this task is part of a continuous integration process,
            scheduling this task may cause your commit to land with failing
            tests.
          </Typography>
        ),
        title: `${title}?`,
        onSubmit: this.scheduleTask,
        onComplete: this.handleActionDialogClose,
        confirmText: title,
      },
    });
  };

  handleSelectCacheClick = cache => () => {
    const selectedCaches = new Set([...this.state.selectedCaches]);

    if (selectedCaches.has(cache)) {
      selectedCaches.delete(cache);
    } else {
      selectedCaches.add(cache);
    }

    this.setState({
      selectedCaches,
      dialogActionProps: {
        ...this.state.dialogActionProps,
        body: this.renderPurgeWorkerCacheDialogBody(selectedCaches),
      },
    });
  };

  handleTaskActionError = e => {
    this.setState({ dialogError: e, actionLoading: false });
  };

  handleTaskSearchSubmit = taskId => {
    if (this.props.match.params.taskId !== taskId) {
      this.props.history.push(`/tasks/${taskId}`);
    }
  };

  postRunningFailedAction = error => {
    this.setState({ dialogError: error, actionLoading: false });
  };

  preRunningAction = () => {
    this.setState({ dialogError: null, actionLoading: true });
  };

  purgeWorkerCache = async () => {
    const { taskQueueId } = this.state.task;
    const { selectedCaches } = this.state;
    const purgeCache = this.props.createTaskclusterClient({
      Class: PurgeCache,
    });

    this.preRunningAction();

    try {
      await Promise.all(
        [...selectedCaches].map(cacheName =>
          purgeCache.purgeCache(taskQueueId, { cacheName })
        )
      );
    } catch (error) {
      this.postRunningFailedAction(error);
      throw error;
    }
  };

  rerunTask = async () => {
    const { taskId } = this.props.match.params;
    const { history, location } = this.props;

    this.preRunningAction();

    try {
      await this.queue.rerunTask(taskId);
      // make sure location doesn't include previous runId,
      // so the UI will show the latest run automatically
      history.push(`/tasks/${taskId}${location.hash}`);
    } catch (error) {
      this.postRunningFailedAction(error);
      throw error;
    }
  };

  cancelTask = async () => {
    const { taskId } = this.props.match.params;

    this.preRunningAction();

    try {
      await this.queue.cancelTask(taskId);
    } catch (error) {
      this.postRunningFailedAction(error);
      throw error;
    }
  };

  scheduleTask = async () => {
    const { taskId } = this.props.match.params;

    this.preRunningAction();

    try {
      await this.queue.scheduleTask(taskId);
    } catch (error) {
      this.postRunningFailedAction(error);
      throw error;
    }
  };

  retriggerTask = async () => {
    const taskId = nice();
    const task = cloneDeep(this.state.task);
    const now = Date.now();
    const created = Date.parse(task.created);

    Object.assign(task, {
      retries: 0,
      deadline: new Date(now + Date.parse(task.deadline) - created).toJSON(),
      expires: new Date(now + Date.parse(task.expires) - created).toJSON(),
      created: new Date(now).toJSON(),
    });

    this.preRunningAction();

    try {
      await this.queue.createTask(taskId, task);

      return taskId;
    } catch (error) {
      this.postRunningFailedAction(error);
      throw error;
    }
  };

  renderActionIcon = action => {
    if (/^(rerun|retrigger)/.test(action.name)) {
      return <RestartIcon />;
    }

    switch (action.name) {
      case 'create-interactive': {
        return <ConsoleLineIcon />;
      }

      case 'cancel': {
        return <CloseIcon />;
      }

      case 'purge-caches': {
        return <CreationIcon />;
      }

      case 'backfill': {
        return <ShovelIcon />;
      }

      default: {
        return <HammerIcon />;
      }
    }
  };

  renderPurgeWorkerCacheDialogBody = selectedCaches => {
    const { caches } = this.state;

    return (
      <Fragment>
        <Typography variant="body2">
          This will purge caches used in this task across all workers of this
          worker type.
        </Typography>
        <Typography variant="body2">Select the caches to purge:</Typography>
        <List>
          {caches.map(cache => (
            <ListItem
              className={this.props.classes.dialogListItem}
              onClick={this.handleSelectCacheClick(cache)}
              key={cache}>
              <Checkbox
                checked={selectedCaches.has(cache)}
                tabIndex={-1}
                disableRipple
              />
              <Typography variant="body2">{cache}</Typography>
            </ListItem>
          ))}
        </List>
      </Fragment>
    );
  };

  render() {
    const { classes, description, match } = this.props;
    const {
      task,
      status,
      loading,
      error,
      subscriptionError,
      artifacts,
      artifactsLoading,
      artifactsPage,
      hasNextArtifactsPage,
      dependents,
      dependentsLoading,
      dependentsPage,
      hasNextDependentsPage,
      dialogActionProps,
      selectedAction,
      dialogOpen,
      actionLoading,
      dialogError,
      formInputs,
    } = this.state;
    const { actionData, taskActions } = this.getTaskActionsData();
    const { taskId } = match.params;
    let tags;

    if (task) {
      tags = Object.entries(task.tags ?? {});
    }

    return (
      <Dashboard
        title={task ? `Task "${task.metadata.name}"` : 'Task'}
        helpView={<HelpView description={description} />}
        disableTitleFormatting
        search={
          <Search
            onSubmit={this.handleTaskSearchSubmit}
            defaultValue={match.params.taskId}
          />
        }>
        <Helmet state={status?.state} />
        {loading && (
          <Fragment>
            <Spinner loading />
            <br />
          </Fragment>
        )}
        <ErrorPanel fixed error={error} warning={Boolean(task)} />
        <ErrorPanel fixed warning error={subscriptionError} />
        {task && status && (
          <Fragment>
            <Breadcrumbs>
              <Link to={`/tasks/groups/${task.taskGroupId}`}>
                <Typography variant="body2" className={classes.link}>
                  Task Group
                </Typography>
              </Link>
              <Typography variant="body2" color="textSecondary">
                {task.metadata.name}
              </Typography>
            </Breadcrumbs>
            <br />
            <Typography variant="subtitle1">
              <Markdown>{task.metadata.description}</Markdown>
            </Typography>
            <div>
              <Chip
                className={classes.tag}
                label={
                  <Fragment>
                    owned by:&nbsp;&nbsp;
                    <em>{task.metadata.owner}</em>
                  </Fragment>
                }
              />

              {tags.map(([key, value]) => (
                <Chip
                  className={classes.tag}
                  key={key}
                  label={
                    <Fragment>
                      {key}
                      :&nbsp;&nbsp;
                      <em>{value}</em>
                    </Fragment>
                  }
                />
              ))}
            </div>
            <br />
            <br />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TaskDetailsCard
                  task={{ ...task, taskId, status }}
                  user={this.context.user}
                  dependents={dependents}
                  dependentsLoading={dependentsLoading}
                  dependentsPage={dependentsPage}
                  hasNextDependentsPage={hasNextDependentsPage}
                  hasPreviousDependentsPage={dependentsPage > 0}
                  onDependentsNextPage={this.handleDependentsNextPage}
                  onDependentsPreviousPage={this.handleDependentsPreviousPage}
                  onChangePriority={this.handleChangePriorityClick}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TaskRunsCard
                  taskId={taskId}
                  selectedRunId={this.getSelectedRunId()}
                  runs={status.runs}
                  taskQueueId={task.taskQueueId}
                  artifacts={artifacts}
                  artifactsLoading={artifactsLoading}
                  artifactsPage={artifactsPage}
                  hasNextArtifactsPage={hasNextArtifactsPage}
                  hasPreviousArtifactsPage={artifactsPage > 0}
                  onArtifactsNextPage={this.handleArtifactsNextPage}
                  onArtifactsPreviousPage={this.handleArtifactsPreviousPage}
                  // docker worker uses `task.payload.log` while
                  // generic worker uses `task.payload.logs.live`
                  liveLogName={task.payload?.logs?.live || task.payload?.log}
                />
              </Grid>
            </Grid>
            <SpeedDial>
              {!('cancel' in actionData) && (
                <SpeedDialAction
                  requiresAuth
                  tooltipOpen
                  FabProps={{
                    disabled: actionLoading,
                  }}
                  icon={<CloseIcon />}
                  tooltipTitle="Cancel"
                  onClick={this.handleCancelTaskClick}
                />
              )}
              {!('retrigger' in actionData) && (
                <SpeedDialAction
                  requiresAuth
                  tooltipOpen
                  FabProps={{
                    disabled: actionLoading,
                  }}
                  icon={<RestartIcon />}
                  tooltipTitle="Retrigger"
                  onClick={this.handleRetriggerTaskClick}
                />
              )}
              {!('rerun' in actionData) && (
                <SpeedDialAction
                  requiresAuth
                  tooltipOpen
                  FabProps={{
                    disabled: actionLoading,
                  }}
                  icon={<RestartIcon />}
                  tooltipTitle="Rerun"
                  onClick={this.handleRerunTaskClick}
                />
              )}
              {!('schedule' in actionData) && (
                <SpeedDialAction
                  requiresAuth
                  tooltipOpen
                  FabProps={{
                    disabled: actionLoading,
                  }}
                  icon={<ClockOutlineIcon />}
                  tooltipTitle="Schedule"
                  onClick={this.handleScheduleTaskClick}
                />
              )}
              {!('purge-caches' in actionData) && (
                <SpeedDialAction
                  requiresAuth
                  tooltipOpen
                  FabProps={{
                    disabled: actionLoading,
                  }}
                  icon={<FlashIcon />}
                  tooltipTitle="Purge Worker Cache"
                  onClick={this.handlePurgeWorkerCacheClick}
                />
              )}
              <SpeedDialAction
                requiresAuth
                tooltipOpen
                FabProps={{
                  disabled: actionLoading,
                }}
                icon={<SortIcon />}
                tooltipTitle="Change Priority"
                onClick={this.handleChangePriorityClick}
              />
              <SpeedDialAction
                requiresAuth
                tooltipOpen
                FabProps={{
                  disabled: actionLoading,
                }}
                icon={<PencilIcon />}
                tooltipTitle="Edit"
                onClick={this.handleEditTaskClick}
              />
              {!('create-interactive' in actionData) && (
                <SpeedDialAction
                  requiresAuth
                  tooltipOpen
                  FabProps={{
                    disabled: actionLoading,
                  }}
                  icon={<ConsoleLineIcon />}
                  tooltipTitle="Create with SSH/VNC"
                  onClick={this.handleCreateInteractiveTaskClick}
                />
              )}
              <SpeedDialAction
                tooltipOpen
                icon={<ChartIcon />}
                FabProps={{
                  disabled: [
                    API_TASK_STATE.PENDING,
                    API_TASK_STATE.RUNNING,
                    API_TASK_STATE.UNSCHEDULED,
                  ].includes(status.state),
                }}
                tooltipTitle="Profile Task Log"
                onClick={this.handleOpenLogProfiler}
              />
              {taskActions?.length &&
                taskActions.map(action => (
                  <SpeedDialAction
                    requiresAuth
                    tooltipOpen
                    key={action.title}
                    FabProps={{
                      disabled: actionLoading,
                    }}
                    icon={this.renderActionIcon(action)}
                    tooltipTitle={action.title}
                    onClick={this.handleActionClick(action.name)}
                  />
                ))}
            </SpeedDial>
            {dialogOpen && (
              <DialogAction
                {...(dialogActionProps || {
                  fullScreen: Boolean(selectedAction.schema),
                  onSubmit: this.handleActionTaskSubmit(selectedAction),
                  onComplete: this.handleActionComplete(selectedAction),
                  title: `${selectedAction.title}?`,
                  body: (
                    <TaskActionForm
                      action={selectedAction}
                      form={formInputs}
                      onFormChange={this.handleFormChange}
                    />
                  ),
                  confirmText: selectedAction.title,
                })}
                open={dialogOpen}
                error={dialogError}
                onError={this.handleTaskActionError}
                onClose={this.handleActionDialogClose}
              />
            )}
            {this.state.changePriorityDialogOpen && (
              <ChangeTaskPriorityDialog
                open={this.state.changePriorityDialogOpen}
                currentPriority={task.priority}
                onSubmit={priority =>
                  changeTaskPriority({
                    taskId: match.params.taskId,
                    priority,
                    user: this.context.user,
                  })
                }
                onClose={this.handleChangePriorityClose}
                onComplete={this.handleChangePriorityComplete}
              />
            )}
          </Fragment>
        )}
      </Dashboard>
    );
  }
}
