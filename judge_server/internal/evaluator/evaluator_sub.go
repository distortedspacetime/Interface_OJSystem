package evaluator

import (
	"fmt"
	"judge_server/internal/executor"
	"judge_server/internal/filereader"
	"judge_server/internal/model"
)

// Judge가 준비한 실행 환경 정보.

type Evaluator struct {
	filereader *filereader.FileReader
	checker    *Checker
	executor   *executor.Executor
}

func New(root string) *Evaluator {
	return &Evaluator{
		filereader: filereader.New(root),
		checker:    NewChecker(),
		executor:   executor.New(),
	}
}

func (e *Evaluator) Evaluate(
	request model.EvaluateRequest,
	config model.ExecutionConfig,
) (model.EvaluateResult, error) {

	res := model.EvaluateResult{
		Result: false,
	}

	testcaseCount, err := e.filereader.CountTestCases(
		request.ProblemID,
	)
	if err != nil {
		return res, err
	}

	if testcaseCount <= 0 {
		return res, fmt.Errorf(
			"no testcases found for problem %d",
			request.ProblemID,
		)
	}

	// 테스트케이스별 실행 및 판정.
	for i := 1; i <= testcaseCount; i++ {

		input, expectedOutput, err := e.filereader.ReadTestcase(
			request.ProblemID,
			i,
		)
		if err != nil {
			return res, fmt.Errorf(
				"failed to read testcase %d in problem %d: %w",
				i,
				request.ProblemID,
				err,
			)
		}

		// Judge에서 전달받은 실행 환경을 사용한다.
		// 테스트케이스마다 Stdin만 변경한다.
		executeRequest := model.ExecuteRequest{
			ContainerID: config.ContainerID,
			Command:     config.Command,
			Args:        config.Args,
			WorkDir:     config.WorkDir,
			TimeLimit:   config.TimeLimit,
			Stdin:       input,
		}

		executeResult, err := e.executor.Execute(executeRequest)
		if err != nil {
			return res, fmt.Errorf(
				"failed to execute testcase %d: %w",
				i,
				err,
			)
		}

		// 시간 초과.
		if executeResult.TimeOut {
			res.Verdict = "TLE"
			return res, nil
		}

		// TODO:
		// 테스트케이스별 OOM 감지 기능을 연결한 뒤
		// ExecuteResult.OOMKilled 기반으로 MLE 판정 추가.

		// 비정상 종료.
		if executeResult.ExitCode != 0 {
			res.Verdict = "RE"
			return res, nil
		}

		// 출력 비교.
		if !e.checker.CheckSame(
			expectedOutput,
			executeResult.Stdout,
		) {
			res.Verdict = "WA"
			return res, nil
		}
	}

	// 모든 테스트케이스 통과.
	res.Result = true
	res.Verdict = "AC"

	return res, nil
}
