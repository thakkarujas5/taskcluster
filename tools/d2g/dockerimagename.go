package d2g

import (
	"github.com/taskcluster/shell"

	"github.com/taskcluster/taskcluster/v68/tools/d2g/genericworker"
)

func (din *DockerImageName) FileMounts() ([]genericworker.FileMount, error) {
	return []genericworker.FileMount{}, nil
}

func (din *DockerImageName) String(tool string) (string, error) {
	return shell.Escape(string(*din)), nil
}

func (din *DockerImageName) LoadCommands(tool string) []string {
	return []string{}
}
