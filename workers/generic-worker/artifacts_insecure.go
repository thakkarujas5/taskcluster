//go:build insecure

package main

import "github.com/taskcluster/taskcluster/v83/workers/generic-worker/process"

func gwCopyToTempFile(filePath string, pd *process.PlatformData) (string, error) {
	return filePath, nil
}
