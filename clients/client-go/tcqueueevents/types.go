// This source code file is AUTO-GENERATED by github.com/taskcluster/jsonschema2go

package tcqueueevents

import (
	tcclient "github.com/taskcluster/taskcluster/v68/clients/client-go"
)

type (
	// Information about the artifact that was created
	Artifact struct {

		// Expected content-type of the artifact.  This is informational only:
		// it is suitable for use to choose an icon for the artifact, for example.
		// The accurate content-type of the artifact can only be determined by
		// downloading it.
		//
		// Max length: 255
		ContentType string `json:"contentType"`

		// Date and time after which the artifact created will be automatically
		// deleted by the queue.
		Expires tcclient.Time `json:"expires"`

		// Name of the artifact that was created, this is useful if you want to
		// attempt to fetch the artifact. But keep in mind that just because an
		// artifact is created doesn't mean that it's immediately available.
		//
		// Max length: 1024
		Name string `json:"name"`

		// This is the `storageType` for the request that was used to create the
		// artifact.  Note that artifacts with the `s3` storage type do not produce
		// this message.
		//
		// Possible values:
		//   * "reference"
		//   * "link"
		//   * "error"
		//   * "object"
		StorageType string `json:"storageType"`
	}

	// Message reporting a new artifact has been created for a given task.
	ArtifactCreatedMessage struct {

		// Information about the artifact that was created
		Artifact Artifact `json:"artifact"`

		// Id of the run on which artifact was created.
		//
		// Mininum:    0
		// Maximum:    1000
		RunID int64 `json:"runId"`

		// A representation of **task status** as known by the queue
		Status TaskStatusStructure `json:"status"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`

		// Identifier for the worker-group within which the run with the created
		// artifacted is running.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerGroup string `json:"workerGroup"`

		// Identifier for the worker within which the run with the created artifact
		// is running.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerID string `json:"workerId"`
	}

	// JSON object with information about a run
	RunInformation struct {

		// Reason for the creation of this run,
		// **more reasons may be added in the future**.
		//
		// Possible values:
		//   * "scheduled"
		//   * "retry"
		//   * "task-retry"
		//   * "rerun"
		//   * "exception"
		ReasonCreated string `json:"reasonCreated"`

		// Reason that run was resolved, this is mainly
		// useful for runs resolved as `exception`.
		// Note, **more reasons may be added in the future**, also this
		// property is only available after the run is resolved. Some of these
		// reasons, notably `intermittent-task`, `worker-shutdown`, and
		// `claim-expired`, will trigger an automatic retry of the task.
		// Note that 'superseded' is here only for compatibility, as that
		// functionality has been removed.
		//
		// Possible values:
		//   * "completed"
		//   * "failed"
		//   * "deadline-exceeded"
		//   * "canceled"
		//   * "claim-expired"
		//   * "worker-shutdown"
		//   * "malformed-payload"
		//   * "resource-unavailable"
		//   * "internal-error"
		//   * "intermittent-task"
		//   * "superseded"
		ReasonResolved string `json:"reasonResolved,omitempty"`

		// Date-time at which this run was resolved, ie. when the run changed
		// state from `running` to either `completed`, `failed` or `exception`.
		// This property is only present after the run as been resolved.
		Resolved tcclient.Time `json:"resolved,omitempty"`

		// Id of this task run, `run-id`s always starts from `0`
		//
		// Mininum:    0
		// Maximum:    1000
		RunID int64 `json:"runId"`

		// Date-time at which this run was scheduled, ie. when the run was
		// created in state `pending`.
		Scheduled tcclient.Time `json:"scheduled"`

		// Date-time at which this run was claimed, ie. when the run changed
		// state from `pending` to `running`. This property is only present
		// after the run has been claimed.
		Started tcclient.Time `json:"started,omitempty"`

		// State of this run
		//
		// Possible values:
		//   * "pending"
		//   * "running"
		//   * "completed"
		//   * "failed"
		//   * "exception"
		State string `json:"state"`

		// Time at which the run expires and is resolved as `failed`, if the
		// run isn't reclaimed. Note, only present after the run has been
		// claimed.
		TakenUntil tcclient.Time `json:"takenUntil,omitempty"`

		// Identifier for group that worker who executes this run is a part of,
		// this identifier is mainly used for efficient routing.
		// Note, this property is only present after the run is claimed.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerGroup string `json:"workerGroup,omitempty"`

		// Identifier for worker evaluating this run within given
		// `workerGroup`. Note, this property is only available after the run
		// has been claimed.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerID string `json:"workerId,omitempty"`
	}

	// Link to source of this task, should specify a file, revision and
	// repository. This should be place someone can go an do a git/hg blame
	// to who came up with recipe for this task.
	//
	// Syntax:     ^(https?://|ssh://|git@)
	// Max length: 4096
	Source string

	// Link to source of this task, should specify a file, revision and
	// repository. This should be place someone can go an do a git/hg blame
	// to who came up with recipe for this task.
	//
	// Syntax:     ^(https?://|ssh://|git@)
	// Max length: 4096
	Source1 string

	// Subset of a task definition
	Task struct {

		// Arbitrary key-value tags (only strings limited to 4k). These can be used
		// to attach informal metadata to a task. Use this for informal tags that
		// tasks can be classified by. You can also think of strings here as
		// candidates for formal metadata. Something like
		// `purpose: 'build' || 'test'` is a good example.
		//
		// Default:    {}
		//
		// Map entries:
		// Max length: 4096
		Tags map[string]string `json:"tags"`
	}

	// Message reporting that a task has complete successfully.
	TaskCompletedMessage struct {

		// Id of the run that completed the task
		//
		// Mininum:    0
		// Maximum:    1000
		RunID int64 `json:"runId"`

		// A representation of **task status** as known by the queue
		Status TaskStatusStructure `json:"status"`

		// Subset of a task definition containing values that are useful for determining
		// whether a message is interesting to the receiver. Where the full task
		// definition is required, the receiver should call queue.task to download that
		// definition.
		Task Var `json:"task,omitempty"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`

		// Identifier for the worker-group within which this run ran.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerGroup string `json:"workerGroup"`

		// Identifier for the worker that executed this run.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerID string `json:"workerId"`
	}

	// Message reporting that a task has been defined. The task may or may not be
	// _scheduled_ too.
	TaskDefinedMessage struct {

		// A representation of **task status** as known by the queue
		Status TaskStatusStructure `json:"status"`

		// Subset of a task definition containing values that are useful for determining
		// whether a message is interesting to the receiver. Where the full task
		// definition is required, the receiver should call queue.task to download that
		// definition.
		Task Var `json:"task,omitempty"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`
	}

	// Message reporting that Taskcluster have failed to run a task.
	TaskExceptionMessage struct {

		// Id of the last run for the task, not provided if `deadline`
		// was exceeded before a run was started.
		//
		// Mininum:    0
		// Maximum:    1000
		RunID int64 `json:"runId,omitempty"`

		// A representation of **task status** as known by the queue
		Status TaskStatusStructure `json:"status"`

		// Subset of a task definition containing values that are useful for determining
		// whether a message is interesting to the receiver. Where the full task
		// definition is required, the receiver should call queue.task to download that
		// definition.
		Task Var `json:"task,omitempty"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`

		// Identifier for the worker-group within which the last attempt of the task
		// ran. Not provided, if `deadline` was exceeded before a run was started.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerGroup string `json:"workerGroup,omitempty"`

		// Identifier for the last worker that failed to report, causing the task
		// to fail. Not provided, if `deadline` was exceeded before a run
		// was started.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerID string `json:"workerId,omitempty"`
	}

	// Message reporting that a task failed to complete successfully.
	TaskFailedMessage struct {

		// Id of the run that failed.
		//
		// Mininum:    0
		// Maximum:    1000
		RunID int64 `json:"runId"`

		// A representation of **task status** as known by the queue
		Status TaskStatusStructure `json:"status"`

		// Subset of a task definition containing values that are useful for determining
		// whether a message is interesting to the receiver. Where the full task
		// definition is required, the receiver should call queue.task to download that
		// definition.
		Task Var `json:"task,omitempty"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`

		// Identifier for the worker-group within which this run ran.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerGroup string `json:"workerGroup"`

		// Identifier for the worker that executed this run.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerID string `json:"workerId"`
	}

	// Message written once a task group has been sealed or resolved.
	TaskGroupChangedMessage struct {

		// Date and time after the last expiration of any task in the task group.
		// For the unsealed task group this could change to a later date.
		Expires tcclient.Time `json:"expires"`

		// All tasks in a task group must have the same `schedulerId`. This is used for several purposes:
		//
		// * it can represent the entity that created the task;
		// * it can limit addition of new tasks to a task group: the caller of
		//     `createTask` must have a scope related to the `schedulerId` of the task
		//     group;
		// * it controls who can manipulate tasks, again by requiring
		//     `schedulerId`-related scopes; and
		// * it appears in the routing key for Pulse messages about the task.
		//
		// Default:    "-"
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		SchedulerID string `json:"schedulerId"`

		// Empty or date and time when task group was sealed.
		Sealed tcclient.Time `json:"sealed,omitempty"`

		// Identifier for the task-group.
		//
		// Syntax:     ^[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$
		TaskGroupID string `json:"taskGroupId"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`
	}

	// Required task metadata
	TaskMetadata struct {

		// Human readable description of the task, please **explain** what the
		// task does. A few lines of documentation is not going to hurt you.
		//
		// Max length: 32768
		Description string `json:"description"`

		// Human readable name of task, used to very briefly given an idea about
		// what the task does.
		//
		// Max length: 255
		Name string `json:"name"`

		// Entity who caused this task, not necessarily a person with email who did
		// `hg push` as it could be automation bots as well. The entity we should
		// contact to ask why this task is here.
		//
		// Max length: 255
		Owner string `json:"owner"`

		// Link to source of this task, should specify a file, revision and
		// repository. This should be place someone can go an do a git/hg blame
		// to who came up with recipe for this task.
		//
		// Syntax:     ^(https?://|ssh://|git@)
		// Max length: 4096
		// Any of:
		//   * Source
		//   * Source1
		Source string `json:"source"`
	}

	// Message reporting that a task is now pending
	TaskPendingMessage struct {

		// Id of run that became pending, `run-id`s always starts from 0
		//
		// Mininum:    0
		// Maximum:    1000
		RunID int64 `json:"runId"`

		// A representation of **task status** as known by the queue
		Status TaskStatusStructure `json:"status"`

		// Subset of a task definition
		Task Task `json:"task,omitempty"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`
	}

	// Message reporting that a given run of a task have started
	TaskRunningMessage struct {

		// Id of the run that just started, always starts from 0
		//
		// Mininum:    0
		// Maximum:    1000
		RunID int64 `json:"runId"`

		// A representation of **task status** as known by the queue
		Status TaskStatusStructure `json:"status"`

		// Time at which the run expires and is resolved as `failed`, if the run
		// isn't reclaimed.
		TakenUntil tcclient.Time `json:"takenUntil"`

		// Message version
		//
		// Possible values:
		//   * 1
		Version int64 `json:"version"`

		// Identifier for the worker-group within which this run started.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerGroup string `json:"workerGroup"`

		// Identifier for the worker executing this run.
		//
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		WorkerID string `json:"workerId"`
	}

	// A representation of **task status** as known by the queue
	TaskStatusStructure struct {

		// Deadline of the task, by which this task must be complete. `pending` and
		// `running` runs are resolved as **exception** if not resolved by other means
		// before the deadline. After the deadline, a task is immutable. Note,
		// deadline cannot be more than 5 days into the future
		Deadline tcclient.Time `json:"deadline"`

		// Task expiration, time at which task definition and
		// status is deleted. Notice that all artifacts for the task
		// must have an expiration that is no later than this.
		Expires tcclient.Time `json:"expires"`

		// The name for the "project" with which this task is associated.  This
		// value can be used to control permission to manipulate tasks as well as
		// for usage reporting.  Project ids are typically simple identifiers,
		// optionally in a hierarchical namespace separated by `/` characters.
		// This value defaults to `none`.
		//
		// Default:    "none"
		// Syntax:     ^([a-zA-Z0-9._/-]*)$
		// Min length: 1
		// Max length: 500
		ProjectID string `json:"projectId"`

		// Unique identifier for a provisioner, that can supply specified
		// `workerType`. Deprecation is planned for this property as it
		// will be replaced, together with `workerType`, by the new
		// identifier `taskQueueId`.
		//
		// Syntax:     ^[a-zA-Z0-9-_]{1,38}$
		ProvisionerID string `json:"provisionerId"`

		// Number of retries left for the task in case of infrastructure issues
		//
		// Mininum:    0
		// Maximum:    999
		RetriesLeft int64 `json:"retriesLeft"`

		// List of runs, ordered so that index `i` has `runId == i`
		Runs []RunInformation `json:"runs"`

		// All tasks in a task group must have the same `schedulerId`. This is used for several purposes:
		//
		// * it can represent the entity that created the task;
		// * it can limit addition of new tasks to a task group: the caller of
		//     `createTask` must have a scope related to the `schedulerId` of the task
		//     group;
		// * it controls who can manipulate tasks, again by requiring
		//     `schedulerId`-related scopes; and
		// * it appears in the routing key for Pulse messages about the task.
		//
		// Default:    "-"
		// Syntax:     ^([a-zA-Z0-9-_]*)$
		// Min length: 1
		// Max length: 38
		SchedulerID string `json:"schedulerId"`

		// State of this task. This is just an auxiliary property derived from state
		// of latests run, or `unscheduled` if none.
		//
		// Possible values:
		//   * "unscheduled"
		//   * "pending"
		//   * "running"
		//   * "completed"
		//   * "failed"
		//   * "exception"
		State string `json:"state"`

		// Identifier for a group of tasks scheduled together with this task.
		// Generally, all tasks related to a single event such as a version-control
		// push or a nightly build have the same `taskGroupId`.  This property
		// defaults to `taskId` if it isn't specified.  Tasks with `taskId` equal to
		// the `taskGroupId` are, [by convention](/docs/manual/using/task-graph),
		// decision tasks.
		//
		// Syntax:     ^[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$
		TaskGroupID string `json:"taskGroupId"`

		// Unique task identifier, this is UUID encoded as
		// [URL-safe base64](http://tools.ietf.org/html/rfc4648#section-5) and
		// stripped of `=` padding.
		//
		// Syntax:     ^[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$
		TaskID string `json:"taskId"`

		// Unique identifier for a task queue
		//
		// Syntax:     ^[a-zA-Z0-9-_]{1,38}/[a-z]([-a-z0-9]{0,36}[a-z0-9])?$
		TaskQueueID string `json:"taskQueueId"`

		// Unique identifier for a worker-type within a specific
		// provisioner. Deprecation is planned for this property as it will
		// be replaced, together with `provisionerId`, by the new
		// identifier `taskQueueId`.
		//
		// Syntax:     ^[a-z]([-a-z0-9]{0,36}[a-z0-9])?$
		WorkerType string `json:"workerType"`
	}

	// Subset of a task definition containing values that are useful for determining
	// whether a message is interesting to the receiver. Where the full task
	// definition is required, the receiver should call queue.task to download that
	// definition.
	Var struct {

		// Arbitrary key-value tags (only strings limited to 4k). These can be used
		// to attach informal metadata to a task. Use this for informal tags that
		// tasks can be classified by. You can also think of strings here as
		// candidates for formal metadata. Something like
		// `purpose: 'build' || 'test'` is a good example.
		//
		// Default:    {}
		//
		// Map entries:
		// Max length: 4096
		Tags map[string]string `json:"tags"`
	}
)
