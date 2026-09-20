package worker

import (
	"fmt"

	"judge_server/internal/compiler"
	"judge_server/internal/evaluator"
	"judge_server/internal/executor"
	"judge_server/internal/model"
	"judge_server/internal/queue"
	"judge_server/internal/reporter"
	"judge_server/internal/sandbox"
)

const queueSize = 100

type Worker struct {
	executor  *executor.Executor
	compiler  *compiler.Compiler
	evaluator *evaluator.Evaluator
	reporter  *reporter.Reporter
	queue     *queue.Queue
	sandbox   *sandbox.Sandbox
}

func New() *Worker {
	return &Worker{
		executor:  executor.New(),
		compiler:  compiler.New(),
		evaluator: evaluator.New(),
		reporter:  reporter.New(),
		queue:     queue.New(queueSize),
		sandbox:   sandbox.New(),
	}
}

// Run은 Queue에서 제출을 기다린다.
// Job이 들어오면 채점을 수행하고 최종 결과를 웹서버에 보고한다.
func (w *Worker) Run() error {
	fmt.Println("Worker is running")

	for {
		job := w.queue.Pop()

		result, err := w.process(job)

		// 채점 시스템 내부에서 오류가 발생한 경우 Judge Error로 처리한다.
		if err != nil {
			result = "JE"
		}

		// 채점 결과는 Job당 한 번만 웹서버에 보고한다.
		if err := w.report(job.SubmissionID, result); err != nil {
			return fmt.Errorf(
				"failed to report submission %d: %w",
				job.SubmissionID,
				err,
			)
		}
	}
}

// Push는 외부에서 전달받은 Job을 Worker의 Queue에 추가한다.
// 이후 HTTP endpoint가 이 함수를 호출하게 된다.
func (w *Worker) Push(job model.Job) {
	w.queue.Push(job)
}

// 테스트에서 Reporter가 사용할 HTTP 서버 주소를 변경한다.
func (w *Worker) SetReporterURL(url string) {
	w.reporter.SetURL(url)
}
