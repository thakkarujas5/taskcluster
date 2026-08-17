import { getLatestArtifactUrl } from './getArtifactUrl';

// The actions the UI can run are the `task` and `hook` kinds; the remaining
// kinds are either legacy or not actionable from a browser.
const TASK_ACTION_KINDS = new Set(['task', 'hook']);
const isContextSize = (context, n) =>
  Array.isArray(context) && context.length === n;

/**
 * Filter the actions of an actions.json by where they are being offered:
 *   - 'task'  (single-task view): context must be a non-empty array, so that
 *     the action applies to a specific task rather than the whole group
 *   - 'group' (task-group view): context has 0 or 1 entries
 */
export const filterTaskActions = (actions, contextScope) =>
  actions.filter(action => {
    if (!TASK_ACTION_KINDS.has(action.kind)) {
      return false;
    }

    return contextScope === 'group'
      ? isContextSize(action.context, 0) || isContextSize(action.context, 1)
      : !isContextSize(action.context, 0);
  });

/**
 * Fetch the `public/actions.json` artifact of a task group's decision task and
 * return its filtered actions.
 *
 * Resolves to null when the group has no actions to offer: the artifact is
 * missing, is an error artifact, or is not something we can download.
 */
export default async function getTaskActions({
  taskGroupId,
  user,
  contextScope = 'task',
}) {
  const url = getLatestArtifactUrl({
    user,
    taskId: taskGroupId,
    name: 'public/actions.json',
  });
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const raw = await response.json();

  if (!raw?.actions) {
    return null;
  }

  return {
    ...raw,
    actions: filterTaskActions(raw.actions, contextScope),
  };
}
