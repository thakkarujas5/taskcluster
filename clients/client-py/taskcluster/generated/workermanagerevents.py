# coding=utf-8
#####################################################
# THIS FILE IS AUTOMATICALLY GENERATED. DO NOT EDIT #
#####################################################
# noqa: E128,E201
from ..client import BaseClient
from ..client import createApiClient
from ..client import config
from ..client import createTemporaryCredentials
from ..client import createSession
_defaultConfig = config


class WorkerManagerEvents(BaseClient):
    """
    These exchanges provide notifications when a worker pool is created or updated.This is so that the provisioner running in a differentprocess at the other end can synchronize to the changes. But you are ofcourse welcome to use these for other purposes, monitoring changes for example.
    """

    classOptions = {
        "exchangePrefix": "exchange/taskcluster-worker-manager/v1/",
    }
    serviceName = 'worker-manager'
    apiVersion = 'v1'

    def workerPoolCreated(self, *args, **kwargs):
        """
        Worker Pool Created Messages

        Whenever the api receives a request to create a
        worker pool, a message is posted to this exchange and
        a provider can act upon it.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider.

         * provisionerId: First part of the workerPoolId.

         * workerType: Second part of the workerPoolId.

         * workerGroup: Worker group of the worker (region or location)

         * workerId: Worker ID

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'worker-pool-created',
            'name': 'workerPoolCreated',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-worker-pool-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def workerPoolUpdated(self, *args, **kwargs):
        """
        Worker Pool Updated Messages

        Whenever the api receives a request to update a
        worker pool, a message is posted to this exchange and
        a provider can act upon it.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider.

         * provisionerId: First part of the workerPoolId.

         * workerType: Second part of the workerPoolId.

         * workerGroup: Worker group of the worker (region or location)

         * workerId: Worker ID

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'worker-pool-updated',
            'name': 'workerPoolUpdated',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-worker-pool-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def workerPoolError(self, *args, **kwargs):
        """
        Worker Pool Provisioning Error Messages

        Whenever a worker reports an error
        or provisioner encounters an error while
        provisioning a worker pool, a message is posted to this
        exchange.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider.

         * provisionerId: First part of the workerPoolId.

         * workerType: Second part of the workerPoolId.

         * workerGroup: Worker group of the worker (region or location)

         * workerId: Worker ID

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'worker-pool-error',
            'name': 'workerPoolError',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-worker-pool-error-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def workerRequested(self, *args, **kwargs):
        """
        Worker Requested Messages

        Whenever a worker is requested, a message is posted
        to this exchange.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider. (required)

         * provisionerId: First part of the workerPoolId. (required)

         * workerType: Second part of the workerPoolId. (required)

         * workerGroup: Worker group of the worker (region or location) (required)

         * workerId: Worker ID (required)

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'worker-requested',
            'name': 'workerRequested',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-worker-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def workerRunning(self, *args, **kwargs):
        """
        Worker Running Messages

        Whenever a worker has registered, a message is posted
        to this exchange. This means that worker started
        successfully and is ready to claim work.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider. (required)

         * provisionerId: First part of the workerPoolId. (required)

         * workerType: Second part of the workerPoolId. (required)

         * workerGroup: Worker group of the worker (region or location) (required)

         * workerId: Worker ID (required)

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'worker-running',
            'name': 'workerRunning',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-worker-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def workerStopped(self, *args, **kwargs):
        """
        Worker Stopped Messages

        Whenever a worker has stopped, a message is posted
        to this exchange. This means that instance was
        either terminated or stopped gracefully.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider. (required)

         * provisionerId: First part of the workerPoolId. (required)

         * workerType: Second part of the workerPoolId. (required)

         * workerGroup: Worker group of the worker (region or location) (required)

         * workerId: Worker ID (required)

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'worker-stopped',
            'name': 'workerStopped',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-worker-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def workerRemoved(self, *args, **kwargs):
        """
        Worker Removed Messages

        Whenever a worker is removed, a message is posted to this exchange.
        This occurs when a worker is requested to be removed via an API call
        or when a worker is terminated by the worker manager.
        The reason for the removal is included in the message.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider. (required)

         * provisionerId: First part of the workerPoolId. (required)

         * workerType: Second part of the workerPoolId. (required)

         * workerGroup: Worker group of the worker (region or location) (required)

         * workerId: Worker ID (required)

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'worker-removed',
            'name': 'workerRemoved',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-worker-removed-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def launchConfigCreated(self, *args, **kwargs):
        """
        Launch Config Created Messages

        Whenever a new launch configuration is created for a worker pool,
        a message is posted to this exchange.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider.

         * provisionerId: First part of the workerPoolId.

         * workerType: Second part of the workerPoolId.

         * workerGroup: Worker group of the worker (region or location)

         * workerId: Worker ID

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'launch-config-created',
            'name': 'launchConfigCreated',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-launch-config-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def launchConfigUpdated(self, *args, **kwargs):
        """
        Launch Config Updated Messages

        Whenever a launch configuration is updated for a worker pool,
        a message is posted to this exchange.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider.

         * provisionerId: First part of the workerPoolId.

         * workerType: Second part of the workerPoolId.

         * workerGroup: Worker group of the worker (region or location)

         * workerId: Worker ID

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'launch-config-updated',
            'name': 'launchConfigUpdated',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-launch-config-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    def launchConfigArchived(self, *args, **kwargs):
        """
        Launch Config Archived Messages

        Whenever a launch configuration is archived for a worker pool,
        a message is posted to this exchange.

        This exchange takes the following keys:

         * routingKeyKind: Identifier for the routing-key kind. This is always `'primary'` for the formalized routing key. (required)

         * providerId: Provider.

         * provisionerId: First part of the workerPoolId.

         * workerType: Second part of the workerPoolId.

         * workerGroup: Worker group of the worker (region or location)

         * workerId: Worker ID

         * launchConfigId: ID of the launch configuration

         * reserved: Space reserved for future routing-key entries, you should always match this entry with `#`. As automatically done by our tooling, if not specified.
        """

        ref = {
            'exchange': 'launch-config-archived',
            'name': 'launchConfigArchived',
            'routingKey': [
                {
                    'constant': 'primary',
                    'multipleWords': False,
                    'name': 'routingKeyKind',
                },
                {
                    'multipleWords': False,
                    'name': 'providerId',
                },
                {
                    'multipleWords': False,
                    'name': 'provisionerId',
                },
                {
                    'multipleWords': False,
                    'name': 'workerType',
                },
                {
                    'multipleWords': False,
                    'name': 'workerGroup',
                },
                {
                    'multipleWords': False,
                    'name': 'workerId',
                },
                {
                    'multipleWords': False,
                    'name': 'launchConfigId',
                },
                {
                    'multipleWords': True,
                    'name': 'reserved',
                },
            ],
            'schema': 'v1/pulse-launch-config-message.json#',
        }
        return self._makeTopicExchange(ref, *args, **kwargs)

    funcinfo = {
    }


__all__ = ['createTemporaryCredentials', 'config', '_defaultConfig', 'createApiClient', 'createSession', 'WorkerManagerEvents']
