package model

import "time"

type EvaluateResult struct {
	Result  bool
	Verdict string
}

type EvaluateRequest struct {
	ProblemID  int
	TestCaseID int
	SandboxID  string
}

type ExecutionConfig struct {
	ContainerID string
	Command     string
	Args        []string
	WorkDir     string
	TimeLimit   time.Duration
}
