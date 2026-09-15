package model

type SandboxRequest struct {
	MemoryLimitsMb int
	TimeLimitsMs   int
	ProcessLimits  int
	SubmissionID   int
	Language       string
	WorkDir        string
	Command        string
	Args           []string
}

type SandboxResult struct {
	ContainerId string
}
