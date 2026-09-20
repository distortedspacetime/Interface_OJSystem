package worker

import (
	"judge_server/internal/model"
)

// compile은 Job을 CompileRequest로 변환하고 Compiler에 전달한다.
func (w *Worker) compile(
	job model.Job,
	dir string,
) (model.CompileResult, error) {

	request := model.CompileRequest{
		Language: job.Language,
		Source:   job.Source,
		WorkDir:  dir,
	}

	return w.compiler.Compile(request)
}

// execute는 실행 요청을 Executor에 전달한다.
func (w *Worker) execute(
	request model.ExecuteRequest,
) (model.ExecuteResult, error) {

	return w.executor.Execute(request)
}

// evaluate는 실행 결과를 EvaluateRequest로 변환하고 Evaluator에 전달한다.
func (w *Worker) evaluate(
	problemID int,
	testCaseID int,
	actualOutput string,
) (model.EvaluateResult, error) {

	request := model.EvaluateRequest{
		ProblemID:    problemID,
		TestCaseID:   testCaseID,
		ActualOutput: actualOutput,
	}

	return w.evaluator.Evaluate(request)
}

// report는 채점 결과를 ReportRequest로 변환하고 Reporter에 전달한다.
func (w *Worker) report(
	submissionID int,
	result string,
) error {

	request := model.ReportRequest{
		SubmissionID: submissionID,
		Result:       result,
	}

	return w.reporter.Report(request)
}

func (w *Worker) sandboxCreate(request) {
	sandboxState := model.SandboxRequest{}
}
