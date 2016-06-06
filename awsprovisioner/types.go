// This source code file is AUTO-GENERATED by github.com/taskcluster/jsonschema2go

package awsprovisioner

import (
	"encoding/json"
	"errors"

	"github.com/taskcluster/taskcluster-client-go/tcclient"
)

type (
	// Backend Status Response
	//
	// See http://schemas.taskcluster.net/aws-provisioner/v1/backend-status-response.json#
	BackendStatusResponse struct {

		// A date when the provisioner backend process last completed an iteration.
		// This does not imply success, rather it is to make sure that the process
		// is alive
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/backend-status-response.json#/properties/lastCheckedIn
		LastCheckedIn tcclient.Time `json:"lastCheckedIn"`

		// A string from Deadman's Snitch which describes the status.  See
		// https://deadmanssnitch.com/docs/api/v1#listing-your-snitches for an
		// explanation of this value
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/backend-status-response.json#/properties/status
		Status string `json:"status"`
	}

	// A worker launchSpecification and required metadata
	//
	// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#
	CreateWorkerTypeRequest struct {

		// True if this worker type is allowed on demand instances.  Currently
		// ignored
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/canUseOndemand
		CanUseOndemand bool `json:"canUseOndemand,omitempty"`

		// True if this worker type is allowed spot instances.  Currently ignored
		// as all instances are Spot
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/canUseSpot
		CanUseSpot bool `json:"canUseSpot,omitempty"`

		// A string which describes what this image is for and hints on using it
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/description
		Description string `json:"description"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes
		InstanceTypes []struct {

			// This number represents the number of tasks that this instance type
			// is capable of running concurrently.  This is used by the provisioner
			// to know how many pending tasks to offset a pending instance of this
			// type by
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes/items/properties/capacity
			Capacity float64 `json:"capacity"`

			// InstanceType name for Amazon.
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes/items/properties/instanceType
			InstanceType string `json:"instanceType"`

			// LaunchSpecification entries unique to this InstanceType
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes/items/properties/launchSpec
			LaunchSpec json.RawMessage `json:"launchSpec"`

			// Scopes which should be included for this InstanceType.  Scopes must
			// be composed of printable ASCII characters and spaces.
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes/items/properties/scopes
			Scopes []string `json:"scopes"`

			// Static Secrets unique to this InstanceType
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes/items/properties/secrets
			Secrets json.RawMessage `json:"secrets"`

			// UserData entries unique to this InstanceType
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes/items/properties/userData
			UserData json.RawMessage `json:"userData"`

			// This number is a relative measure of performance between two instance
			// types.  It is multiplied by the spot price from Amazon to figure out
			// which instance type is the cheapest one
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/instanceTypes/items/properties/utility
			Utility float64 `json:"utility"`
		} `json:"instanceTypes"`

		// Launch Specification entries which are used in all regions and all instance types
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/launchSpec
		LaunchSpec json.RawMessage `json:"launchSpec"`

		// Maximum number of capacity units to be provisioned.
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/maxCapacity
		MaxCapacity float64 `json:"maxCapacity"`

		// Maximum price we'll pay.  Like minPrice, this takes into account the
		// utility factor when figuring out what the actual SpotPrice submitted
		// to Amazon will be
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/maxPrice
		MaxPrice float64 `json:"maxPrice"`

		// Minimum number of capacity units to be provisioned.  A capacity unit
		// is an abstract unit of capacity, where one capacity unit is roughly
		// one task which should be taken off the queue
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/minCapacity
		MinCapacity float64 `json:"minCapacity,omitempty"`

		// Minimum price to pay for an instance.  A Price is considered to be the
		// Amazon Spot Price multiplied by the utility factor of the InstantType
		// as specified in the instanceTypes list.  For example, if the minPrice
		// is set to $0.5 and the utility factor is 2, the actual minimum bid
		// used will be $0.25
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/minPrice
		MinPrice float64 `json:"minPrice"`

		// A string which identifies the owner of this worker type
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/owner
		Owner string `json:"owner"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/regions
		Regions []struct {

			// LaunchSpecification entries unique to this Region
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/regions/items/properties/launchSpec
			LaunchSpec struct {

				// Per-region AMI ImageId
				//
				// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/regions/items/properties/launchSpec/properties/ImageId
				ImageID string `json:"ImageId"`
			} `json:"launchSpec"`

			// The Amazon AWS Region being configured.  Example: us-west-1
			//
			// Possible values:
			//   * "us-west-2"
			//   * "us-east-1"
			//   * "us-west-1"
			//   * "eu-central-1"
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/regions/items/properties/region
			Region string `json:"region"`

			// Scopes which should be included for this Region.  Scopes must be
			// composed of printable ASCII characters and spaces.
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/regions/items/properties/scopes
			Scopes []string `json:"scopes"`

			// Static Secrets unique to this Region
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/regions/items/properties/secrets
			Secrets json.RawMessage `json:"secrets"`

			// UserData entries unique to this Region
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/regions/items/properties/userData
			UserData json.RawMessage `json:"userData"`
		} `json:"regions"`

		// A scaling ratio of `0.2` means that the provisioner will attempt to keep
		// the number of pending tasks around 20% of the provisioned capacity.
		// This results in pending tasks waiting 20% of the average task execution
		// time before starting to run.
		// A higher scaling ratio often results in better utilization and longer
		// waiting times. For workerTypes running long tasks a short scaling ratio
		// may be prefered, but for workerTypes running quick tasks a higher scaling
		// ratio may increase utilization without major delays.
		// If using a scaling ratio of 0, the provisioner will attempt to keep the
		// capacity of pending spot requests equal to the number of pending tasks.
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/scalingRatio
		ScalingRatio float64 `json:"scalingRatio"`

		// Scopes to issue credentials to for all regions Scopes must be composed of
		// printable ASCII characters and spaces.
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/scopes
		Scopes []string `json:"scopes"`

		// Static secrets entries which are used in all regions and all instance types
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/secrets
		Secrets json.RawMessage `json:"secrets"`

		// UserData entries which are used in all regions and all instance types
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-worker-type-request.json#/properties/userData
		UserData json.RawMessage `json:"userData"`
	}

	// All of the launch specifications for a worker type
	//
	// See http://schemas.taskcluster.net/aws-provisioner/v1/get-launch-specs-response.json#
	GetAllLaunchSpecsResponse json.RawMessage

	// A Secret
	//
	// See http://schemas.taskcluster.net/aws-provisioner/v1/create-secret-request.json#
	GetSecretRequest struct {

		// The date at which the secret is no longer guarunteed to exist
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-secret-request.json#/properties/expiration
		Expiration tcclient.Time `json:"expiration"`

		// List of strings which are scopes for temporary credentials to give
		// to the worker through the secret system.  Scopes must be composed of
		// printable ASCII characters and spaces.
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-secret-request.json#/properties/scopes
		Scopes []string `json:"scopes"`

		// Free form object which contains the secrets stored
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-secret-request.json#/properties/secrets
		Secrets json.RawMessage `json:"secrets"`

		// A Slug ID which is the uniquely addressable token to access this
		// set of secrets
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-secret-request.json#/properties/token
		Token string `json:"token"`

		// A string describing what the secret will be used for
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/create-secret-request.json#/properties/workerType
		WorkerType string `json:"workerType"`
	}

	// Secrets from the provisioner
	//
	// See http://schemas.taskcluster.net/aws-provisioner/v1/get-secret-response.json#
	GetSecretResponse struct {

		// Generated Temporary credentials from the Provisioner
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-secret-response.json#/properties/credentials
		Credentials struct {

			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-secret-response.json#/properties/credentials/properties/accessToken
			AccessToken string `json:"accessToken"`

			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-secret-response.json#/properties/credentials/properties/certificate
			Certificate string `json:"certificate"`

			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-secret-response.json#/properties/credentials/properties/clientId
			ClientID string `json:"clientId"`
		} `json:"credentials,omitempty"`

		// Free-form object which contains secrets from the worker type definition
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-secret-response.json#/properties/data
		Data json.RawMessage `json:"data,omitempty"`
	}

	// A worker launchSpecification and required metadata
	//
	// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#
	GetWorkerTypeResponse struct {

		// True if this worker type is allowed on demand instances.  Currently
		// ignored
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/canUseOndemand
		CanUseOndemand bool `json:"canUseOndemand,omitempty"`

		// True if this worker type is allowed spot instances.  Currently ignored
		// as all instances are Spot
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/canUseSpot
		CanUseSpot bool `json:"canUseSpot,omitempty"`

		// A string which describes what this image is for and hints on using it
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/description
		Description string `json:"description"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes
		InstanceTypes []struct {

			// This number represents the number of tasks that this instance type
			// is capable of running concurrently.  This is used by the provisioner
			// to know how many pending tasks to offset a pending instance of this
			// type by
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes/items/properties/capacity
			Capacity float64 `json:"capacity"`

			// InstanceType name for Amazon.
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes/items/properties/instanceType
			InstanceType string `json:"instanceType"`

			// LaunchSpecification entries unique to this InstanceType
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes/items/properties/launchSpec
			LaunchSpec json.RawMessage `json:"launchSpec"`

			// Scopes which should be included for this InstanceType.  Scopes must
			// be composed of printable ASCII characters and spaces.
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes/items/properties/scopes
			Scopes []string `json:"scopes"`

			// Static Secrets unique to this InstanceType
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes/items/properties/secrets
			Secrets json.RawMessage `json:"secrets"`

			// UserData entries unique to this InstanceType
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes/items/properties/userData
			UserData json.RawMessage `json:"userData"`

			// This number is a relative measure of performance between two instance
			// types.  It is multiplied by the spot price from Amazon to figure out
			// which instance type is the cheapest one
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/instanceTypes/items/properties/utility
			Utility float64 `json:"utility"`
		} `json:"instanceTypes"`

		// ISO Date string (e.g. new Date().toISOString()) which represents the time
		// when this worker type definition was last altered (inclusive of creation)
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/lastModified
		LastModified tcclient.Time `json:"lastModified"`

		// Launch Specification entries which are used in all regions and all instance types
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/launchSpec
		LaunchSpec json.RawMessage `json:"launchSpec"`

		// Maximum number of capacity units to be provisioned.
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/maxCapacity
		MaxCapacity float64 `json:"maxCapacity"`

		// Maximum price we'll pay.  Like minPrice, this takes into account the
		// utility factor when figuring out what the actual SpotPrice submitted
		// to Amazon will be
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/maxPrice
		MaxPrice float64 `json:"maxPrice"`

		// Minimum number of capacity units to be provisioned.  A capacity unit
		// is an abstract unit of capacity, where one capacity unit is roughly
		// one task which should be taken off the queue
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/minCapacity
		MinCapacity float64 `json:"minCapacity"`

		// Minimum price to pay for an instance.  A Price is considered to be the
		// Amazon Spot Price multiplied by the utility factor of the InstantType
		// as specified in the instanceTypes list.  For example, if the minPrice
		// is set to $0.5 and the utility factor is 2, the actual minimum bid
		// used will be $0.25
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/minPrice
		MinPrice float64 `json:"minPrice"`

		// A string which identifies the owner of this worker type
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/owner
		Owner string `json:"owner"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/regions
		Regions []struct {

			// LaunchSpecification entries unique to this Region
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/regions/items/properties/launchSpec
			LaunchSpec struct {

				// Per-region AMI ImageId
				//
				// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/regions/items/properties/launchSpec/properties/ImageId
				ImageID string `json:"ImageId"`
			} `json:"launchSpec"`

			// The Amazon AWS Region being configured.  Example: us-west-1
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/regions/items/properties/region
			Region string `json:"region"`

			// Scopes which should be included for this Region.  Scopes must be
			// composed of printable ASCII characters and spaces.
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/regions/items/properties/scopes
			Scopes []string `json:"scopes"`

			// Static Secrets unique to this Region
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/regions/items/properties/secrets
			Secrets json.RawMessage `json:"secrets"`

			// UserData entries unique to this Region
			//
			// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/regions/items/properties/userData
			UserData json.RawMessage `json:"userData"`
		} `json:"regions"`

		// A scaling ratio of `0.2` means that the provisioner will attempt to keep
		// the number of pending tasks around 20% of the provisioned capacity.
		// This results in pending tasks waiting 20% of the average task execution
		// time before starting to run.
		// A higher scaling ratio often results in better utilization and longer
		// waiting times. For workerTypes running long tasks a short scaling ratio
		// may be prefered, but for workerTypes running quick tasks a higher scaling
		// ratio may increase utilization without major delays.
		// If using a scaling ratio of 0, the provisioner will attempt to keep the
		// capacity of pending spot requests equal to the number of pending tasks.
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/scalingRatio
		ScalingRatio float64 `json:"scalingRatio"`

		// Scopes to issue credentials to for all regions.  Scopes must be composed
		// of printable ASCII characters and spaces.
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/scopes
		Scopes []string `json:"scopes"`

		// Static secrets entries which are used in all regions and all instance types
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/secrets
		Secrets json.RawMessage `json:"secrets"`

		// UserData entries which are used in all regions and all instance types
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/userData
		UserData json.RawMessage `json:"userData"`

		// The ID of the workerType
		//
		// Syntax:     ^[A-Za-z0-9+/=_-]{1,22}$
		//
		// See http://schemas.taskcluster.net/aws-provisioner/v1/get-worker-type-response.json#/properties/workerType
		WorkerType string `json:"workerType"`
	}

	// See http://schemas.taskcluster.net/aws-provisioner/v1/list-worker-types-summaries-response.json#
	ListWorkerTypeSummariesResponse []WorkerTypeSummary

	// See http://schemas.taskcluster.net/aws-provisioner/v1/list-worker-types-response.json#
	ListWorkerTypes []string

	// A summary of a worker type's current state, expresed in terms of capacity.
	//
	// See http://schemas.taskcluster.net/aws-provisioner/v1/worker-type-summary.json#
	WorkerTypeSummary struct {

		// See http://schemas.taskcluster.net/aws-provisioner/v1/worker-type-summary.json#/properties/maxCapacity
		MaxCapacity int `json:"maxCapacity"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/worker-type-summary.json#/properties/minCapacity
		MinCapacity int `json:"minCapacity"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/worker-type-summary.json#/properties/pendingCapacity
		PendingCapacity int `json:"pendingCapacity"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/worker-type-summary.json#/properties/requestedCapacity
		RequestedCapacity int `json:"requestedCapacity"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/worker-type-summary.json#/properties/runningCapacity
		RunningCapacity int `json:"runningCapacity"`

		// See http://schemas.taskcluster.net/aws-provisioner/v1/worker-type-summary.json#/properties/workerType
		WorkerType string `json:"workerType"`
	}
)

// MarshalJSON calls json.RawMessage method of the same name. Required since
// GetAllLaunchSpecsResponse is of type json.RawMessage...
func (this *GetAllLaunchSpecsResponse) MarshalJSON() ([]byte, error) {
	x := json.RawMessage(*this)
	return (&x).MarshalJSON()
}

// UnmarshalJSON is a copy of the json.RawMessage implementation.
func (this *GetAllLaunchSpecsResponse) UnmarshalJSON(data []byte) error {
	if this == nil {
		return errors.New("GetAllLaunchSpecsResponse: UnmarshalJSON on nil pointer")
	}
	*this = append((*this)[0:0], data...)
	return nil
}
