package worker

import (
	"fmt"

	"judge_server/internal/model"
)

// runTestCase는 하나의 테스트케이스를 실행하고 채점 결과를 반환한다.
//
// 반환 가능한 정상 결과:
// AC  - 테스트케이스 통과
// WA  - 출력 불일치
// RE  - 프로그램 비정상 종료
// TLE - 시간 제한 초과
//
// 채점 시스템 내부 오류가 발생하면 error를 반환한다.
func (w *Worker) runTestCase(
	job model.Job,
	problemRoot string,
	testCaseID int,
	executionRequest model.ExecuteRequest,
) (string, error) {

	input, err := readTestCaseInput(problemRoot, testCaseID)
	if err != nil {
		return "", err
	}

	executionRequest.Stdin = string(input)

	executionResult, err := w.execute(executionRequest)
	if err != nil {
		return "", fmt.Errorf(
			"failed to execute submission: %w",
			err,
		)
	}

	if executionResult.TimeOut {
		return "TLE", nil
	}

	if executionResult.ExitCode != 0 {
		return "RE", nil
	}

	evaluateResult, err := w.evaluate(
		job.ProblemID,
		testCaseID,
		executionResult.Stdout,
	)
	if err != nil {
		return "", fmt.Errorf(
			"failed to evaluate testcase %d: %w",
			testCaseID,
			err,
		)
	}

	if !evaluateResult.Result {
		return "WA", nil
	}

	return "AC", nil
}
