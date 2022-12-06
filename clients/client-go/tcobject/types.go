// This source code file is AUTO-GENERATED by github.com/taskcluster/jsonschema2go

package tcobject

import (
	"encoding/json"
	"errors"

	tcclient "github.com/taskcluster/taskcluster/v45/clients/client-go"
)

type (
	// A request to begin an upload, containing proposed upload methods to which the
	// server may agree to or reject.
	CreateUploadRequest struct {

		// Date at which this entry expires from the object table.  The expiration cannot
		// be changed in subsequent calls to the same method.
		Expires tcclient.Time `json:"expires"`

		// Hashes of the content of this object.  These values will be verified by
		// well-behaved downloaders.  The format is `{alogrithm: value}`.
		//
		// Multiple calls to `createUpload` or `finishUpload` for the same object
		// can specify additional hashes, but existing hashes cannot be changed;
		// this allows "amending" an upload with hashes after the data has been
		// transferred, for example.
		//
		// At least one non-deprecated algorithm must be included, preferably the
		// most advanced (SHA512).  Deprecated algorithms may also be included.
		//
		// Defined properties:
		//
		//  struct {
		//
		//  	// Syntax:     ^[a-z0-9]{64}$
		//  	//
		//		//  	Sha256 string `json:"sha256,omitempty"`
		//
		//  	// Syntax:     ^[a-z0-9]{128}$
		//  	//
		//		//  	Sha512 string `json:"sha512,omitempty"`
		//  }
		//
		// Additional properties allowed
		Hashes json.RawMessage `json:"hashes,omitempty"`

		// Project identifier.
		//
		// Syntax:     ^([a-zA-Z0-9._/-]*)$
		// Min length: 1
		// Max length: 500
		ProjectID string `json:"projectId"`

		// Upload methods, with details, that the caller is prepared to execute.  If
		// this object is empty, then the server will reject the request but still
		// create the upload with the given `uploadId`, `projectId`, and `expires`,
		// so any subsequent calls must share those values.  The server may choose
		// any of the proposed methods at its discretion.
		ProposedUploadMethods ProposedUploadMethods `json:"proposedUploadMethods"`

		// Unique identifier for this upload.   Once an object is created with an uploadId,
		// uploads of the same object with different uploadIds will be rejected.  Callers
		// should pass a randomly-generated slugid here.
		//
		// Syntax:     ^[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$
		UploadID string `json:"uploadId"`
	}

	// A response from the `createUpload` method, either agreeing to an upload method or
	// rejecting the proposal.
	CreateUploadResponse struct {
		Expires tcclient.Time `json:"expires"`

		// Syntax:     ^([a-zA-Z0-9._/-]*)$
		// Min length: 1
		// Max length: 500
		ProjectID string `json:"projectId"`

		// Syntax:     ^[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$
		UploadID string `json:"uploadId"`

		// The selected upload method, from those contained in the request.  At most one
		// property will be set, indicating the selected method.  If no properties are set,
		// then none of the proposed methods were selected.
		UploadMethod SelectedUploadMethodOrNone `json:"uploadMethod"`
	}

	// Upload data included directly in the request.  The data has a fixed maximum length, so this should
	// be used only for value that are known to be of constant, fairly small size to avoid surprises as
	// the payload grows. In general, this is useful for testing and for metadata objects such as
	// separate cryptographic signatures.
	DataInlineUploadRequest struct {

		// Content-type to be returned when downloading this data
		ContentType string `json:"contentType"`

		// Base64-encoded byte data, with decoded size at most 8k.
		//
		// Max length: 10926
		ObjectData string `json:"objectData"`
	}

	// See [Download Methods](https://docs.taskcluster.net/docs/docs/reference/platform/object/download-methods) for details.
	DownloadObjectRequest struct {

		// Download methods that the caller can suport, together with parameters for each method.
		// The server will choose one method and make the corresponding response.
		AcceptDownloadMethods SupportedDownloadMethods `json:"acceptDownloadMethods"`
	}

	// See [Download Methods](https://docs.taskcluster.net/docs/docs/reference/platform/object/download-methods) for details.
	//
	// One of:
	//   * SimpleDownloadResponse
	//   * GetURLDownloadResponse
	DownloadObjectResponse json.RawMessage

	FinishUploadRequest struct {

		// Hashes of the content of this object.  These values will be verified by
		// well-behaved downloaders.  The format is `{alogrithm: value}`.
		//
		// Multiple calls to `createUpload` or `finishUpload` for the same object
		// can specify additional hashes, but existing hashes cannot be changed;
		// this allows "amending" an upload with hashes after the data has been
		// transferred, for example.
		//
		// At least one non-deprecated algorithm must be included, preferably the
		// most advanced (SHA512).  Deprecated algorithms may also be included.
		//
		// Defined properties:
		//
		//  struct {
		//
		//  	// Syntax:     ^[a-z0-9]{64}$
		//  	//
		//		//  	Sha256 string `json:"sha256,omitempty"`
		//
		//  	// Syntax:     ^[a-z0-9]{128}$
		//  	//
		//		//  	Sha512 string `json:"sha512,omitempty"`
		//  }
		//
		// Additional properties allowed
		Hashes json.RawMessage `json:"hashes,omitempty"`

		// Project identifier.
		//
		// Syntax:     ^([a-zA-Z0-9._/-]*)$
		// Min length: 1
		// Max length: 500
		ProjectID string `json:"projectId"`

		// Unique identifier for this upload.
		//
		// Syntax:     ^[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$
		UploadID string `json:"uploadId"`
	}

	// This download method returns a URL from which the data may be fetched with an HTTP GET request.
	//
	// The client should begin a GET request as soon as possible after receiving the reponse.
	// The server will respond with a 200 OK containing the data, or with a 4xx or 5xx error response.
	// It will _not_ redirect to another URL (3xx), and the client should not follow any such redirects.
	//
	// The client can use standard Range requests to download portions of the object or to resume an interrupted download.
	// Per the HTTP standard, servers may return more data than requested by the Range header.
	//
	// If retrying a failed or interrupted download, and the `expires` field is in the past, the client should call `startDownload` again to get an updated `url`.
	// The client can assume that the object data and `hashes` will be the same for all calls to `startDownload`.
	//
	// The client can use standard Accept-Encoding headers to indicate the encodings it can accept.
	// However, in a deviation from standard HTTP, the client _must_ accept at least `identity` and `gzip` encodings.
	// If the HTTP response has a `Content-Encoding` header, the client should decode the body before verifying its hashes and returning it to the application.
	//
	// The client _must_ verify that the resulting data matches the supplied hashes.
	// The object service does not, itself, validate object data and relies on clients to do so.
	GetURLDownloadResponse struct {

		// The time after which `url` is no longer valid.
		// If the client wishes to begin an HTTP GET request after this time, it should first call `startDownload` again to get a fresh URL.
		Expires tcclient.Time `json:"expires"`

		// Hashes of the content of this object.  The caller should verify all
		// hashes present for recognized algorithms, and verify that at least one
		// non-deprecated hash is present.
		//
		// Defined properties:
		//
		//  struct {
		//
		//  	// Syntax:     ^[a-z0-9]{64}$
		//  	//
		//		//  	Sha256 string `json:"sha256,omitempty"`
		//
		//  	// Syntax:     ^[a-z0-9]{128}$
		//  	//
		//		//  	Sha512 string `json:"sha512,omitempty"`
		//  }
		//
		// Additional properties allowed
		Hashes json.RawMessage `json:"hashes"`

		// Constant value: "getUrl"
		Method string `json:"method"`

		// The URL to which the client should make a GET request.
		URL string `json:"url"`
	}

	// Hashes of the content of this object.  These values will be verified by
	// well-behaved downloaders.  The format is `{alogrithm: value}`.
	//
	// Multiple calls to `createUpload` or `finishUpload` for the same object
	// can specify additional hashes, but existing hashes cannot be changed;
	// this allows "amending" an upload with hashes after the data has been
	// transferred, for example.
	//
	// At least one non-deprecated algorithm must be included, preferably the
	// most advanced (SHA512).  Deprecated algorithms may also be included.
	//
	// Defined properties:
	//
	//  struct {
	//
	//  	// Syntax:     ^[a-z0-9]{64}$
	//  	//
	//	//  	Sha256 string `json:"sha256,omitempty"`
	//
	//  	// Syntax:     ^[a-z0-9]{128}$
	//  	//
	//	//  	Sha512 string `json:"sha512,omitempty"`
	//  }
	//
	// Additional properties allowed
	ObjectContentHashes json.RawMessage

	// Hashes of the content of this object.  The caller should verify all
	// hashes present for recognized algorithms, and verify that at least one
	// non-deprecated hash is present.
	//
	// Defined properties:
	//
	//  struct {
	//
	//  	// Syntax:     ^[a-z0-9]{64}$
	//  	//
	//	//  	Sha256 string `json:"sha256,omitempty"`
	//
	//  	// Syntax:     ^[a-z0-9]{128}$
	//  	//
	//	//  	Sha512 string `json:"sha512,omitempty"`
	//  }
	//
	// Additional properties allowed
	ObjectContentHashesForDownload json.RawMessage

	// Metadata about an object.
	ObjectMetadata struct {
		Expires tcclient.Time `json:"expires"`

		// Hashes of the content of this object.  The caller should verify all
		// hashes present for recognized algorithms, and verify that at least one
		// non-deprecated hash is present.
		//
		// Defined properties:
		//
		//  struct {
		//
		//  	// Syntax:     ^[a-z0-9]{64}$
		//  	//
		//		//  	Sha256 string `json:"sha256,omitempty"`
		//
		//  	// Syntax:     ^[a-z0-9]{128}$
		//  	//
		//		//  	Sha512 string `json:"sha512,omitempty"`
		//  }
		//
		// Additional properties allowed
		Hashes json.RawMessage `json:"hashes"`

		// Syntax:     ^([a-zA-Z0-9._/-]*)$
		// Min length: 1
		// Max length: 500
		ProjectID string `json:"projectId"`
	}

	// Upload methods, with details, that the caller is prepared to execute.  If
	// this object is empty, then the server will reject the request but still
	// create the upload with the given `uploadId`, `projectId`, and `expires`,
	// so any subsequent calls must share those values.  The server may choose
	// any of the proposed methods at its discretion.
	ProposedUploadMethods struct {

		// Upload data included directly in the request.  The data has a fixed maximum length, so this should
		// be used only for value that are known to be of constant, fairly small size to avoid surprises as
		// the payload grows. In general, this is useful for testing and for metadata objects such as
		// separate cryptographic signatures.
		DataInline DataInlineUploadRequest `json:"dataInline,omitempty"`

		// Request a URL to which a PUT request can be made.
		PutURL PutURLUploadRequest `json:"putUrl,omitempty"`
	}

	// Request a URL to which a PUT request can be made.
	PutURLUploadRequest struct {

		// Length, in bytes, of the uploaded data.
		ContentLength int64 `json:"contentLength"`

		// Content-type of the data to be uploaded.
		ContentType string `json:"contentType"`
	}

	// Response containing a URL to which to PUT the data.
	PutURLUploadResponse struct {

		// Expiration time for the URL.  After this time, the client must
		// call `createUpload` again to get a fresh URL.
		Expires tcclient.Time `json:"expires"`

		// Headers which must be included with the PUT request.  In many
		// cases, these are included in a signature embedded in the URL,
		// and must be provided verbatim.
		//
		// The `Content-Length` header may be included here.  Many HTTP client
		// libraries will also set this directly when the length is known.  In
		// this case, the values should be identical, and the header should only
		// be specified once.
		//
		// Map entries:
		Headers map[string]string `json:"headers"`

		// URL to which a PUT request should be made.
		URL string `json:"url"`
	}

	// The selected upload method, from those contained in the request.  At most one
	// property will be set, indicating the selected method.  If no properties are set,
	// then none of the proposed methods were selected.
	SelectedUploadMethodOrNone struct {

		// Indication that the data has been uploaded.
		//
		// Constant value: %!q(bool=true)
		DataInline bool `json:"dataInline,omitempty"`

		// Response containing a URL to which to PUT the data.
		PutURL PutURLUploadResponse `json:"putUrl,omitempty"`
	}

	// A simple download returns a URL to which the caller should make a GET request.
	// See [Simple Downloads](https://docs.taskcluster.net/docs/docs/reference/platform/object/simple-downloads) for details.
	SimpleDownloadResponse struct {

		// Constant value: "simple"
		Method string `json:"method"`

		URL string `json:"url"`
	}

	// Download methods that the caller can suport, together with parameters for each method.
	// The server will choose one method and make the corresponding response.
	SupportedDownloadMethods struct {

		// Constant value: %!q(bool=true)
		GetURL bool `json:"getUrl,omitempty"`

		// Constant value: %!q(bool=true)
		Simple bool `json:"simple,omitempty"`
	}
)

// MarshalJSON calls json.RawMessage method of the same name. Required since
// DownloadObjectResponse is of type json.RawMessage...
func (this *DownloadObjectResponse) MarshalJSON() ([]byte, error) {
	x := json.RawMessage(*this)
	return (&x).MarshalJSON()
}

// UnmarshalJSON is a copy of the json.RawMessage implementation.
func (this *DownloadObjectResponse) UnmarshalJSON(data []byte) error {
	if this == nil {
		return errors.New("DownloadObjectResponse: UnmarshalJSON on nil pointer")
	}
	*this = append((*this)[0:0], data...)
	return nil
}

// MarshalJSON calls json.RawMessage method of the same name. Required since
// ObjectContentHashes is of type json.RawMessage...
func (this *ObjectContentHashes) MarshalJSON() ([]byte, error) {
	x := json.RawMessage(*this)
	return (&x).MarshalJSON()
}

// UnmarshalJSON is a copy of the json.RawMessage implementation.
func (this *ObjectContentHashes) UnmarshalJSON(data []byte) error {
	if this == nil {
		return errors.New("ObjectContentHashes: UnmarshalJSON on nil pointer")
	}
	*this = append((*this)[0:0], data...)
	return nil
}

// MarshalJSON calls json.RawMessage method of the same name. Required since
// ObjectContentHashesForDownload is of type json.RawMessage...
func (this *ObjectContentHashesForDownload) MarshalJSON() ([]byte, error) {
	x := json.RawMessage(*this)
	return (&x).MarshalJSON()
}

// UnmarshalJSON is a copy of the json.RawMessage implementation.
func (this *ObjectContentHashesForDownload) UnmarshalJSON(data []byte) error {
	if this == nil {
		return errors.New("ObjectContentHashesForDownload: UnmarshalJSON on nil pointer")
	}
	*this = append((*this)[0:0], data...)
	return nil
}
