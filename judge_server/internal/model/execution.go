package model

import "time"

//result
type ExecuteResult struct {
	Stdout    string
	Stderr    string
	ExitCode  int
	TimeOut   bool
	OOMKilled bool
	Duration  time.Duration
}

type ExecuteRequest struct {
	ContainerID string
	Command     string
	Args        []string
	WorkDir     string
	Stdin       string
	TimeLimit   time.Duration
}
