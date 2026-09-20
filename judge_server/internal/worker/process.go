package worker

import (
	"fmt"
	"path/filepath"
	"strconv"
	"time"

	"judge_server/internal/model"
)

const (
	workDir = "sandboxes"
)

// process는 제출 하나에 대한 채점을 수행하고 최종 상태 코드를 반환한다.
//
// 정상적인 채점 결과:
// AC  - Accepted
// WA  - Wrong Answer
// CE  - Compile Error
// RE  - Runtime Error
// TLE - Time Limit Exceeded
//
// 채점 시스템 자체에서 오류가 발생한 경우 error를 반환하며,
// Run에서 해당 제출을 JE(Judge Error)로 처리한다.
func (w *Worker) process(job model.Job) (string, error) {
	compileResult, err := w.compile(job, workDir)
	if err != nil {
		return "", fmt.Errorf("failed to compile submission: %w", err)
	}

	if !compileResult.Success {
		return "CE", nil
	}

	problemRoot := filepath.Join(
		"data/problems",
		strconv.Itoa(job.ProblemID),
	)

	limits, err := loadLimits(problemRoot)
	if err != nil {
		return "", fmt.Errorf("failed to load limits: %w", err)
	}

	executionRequest := model.ExecuteRequest{
		Command:   compileResult.Command,
		Args:      compileResult.Args,
		WorkDir:   compileResult.WorkDir,
		TimeLimit: time.Duration(limits.TimeLimitMs) * time.Millisecond,
	}

	testcaseCount, err := countTestCases(problemRoot)
	if err != nil {
		return "", fmt.Errorf("failed to count testcases: %w", err)
	}

	for testCaseID := 1; testCaseID <= testcaseCount; testCaseID++ {
		result, err := w.runTestCase(
			job,
			problemRoot,
			testCaseID,
			executionRequest,
		)
		if err != nil {
			return "", err
		}

		if result != "AC" {
			return result, nil
		}
	}

	return "AC", nil
}
