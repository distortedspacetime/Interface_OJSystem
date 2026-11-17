import { useEffect, useState } from 'react'
import { getProblem } from '../api/getProblem'
import { AsyncState, Button, CopyButton, StatusBadge } from '../design/ui'

function ProblemDetail({ problemId, userId, isSolved = false, onSubmit, onBack, backLabel = '문제 목록' }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getProblem(problemId, userId, controller.signal).then(
      (problem) => {
        if (!controller.signal.aborted) setResult({ problem })
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ error: error.message })
      },
    )

    return () => controller.abort()
  }, [problemId, userId, attempt])

  const { problem, error } = result ?? {}

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

  return (
    <section aria-labelledby="problem-detail-title">
      <div className="intro">
        <div>
          <span className="eyebrow">PROBLEM {problemId}</span>
          <h1 id="problem-detail-title">{problem ? `${problem.problemId}. ${problem.title}` : '문제 상세'}</h1>
          {problem && <StatusBadge solved={isSolved} />}
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={onBack}>{backLabel}</Button>
          {problem && <Button onClick={() => onSubmit(problem)}>코드 제출</Button>}
        </div>
      </div>

      <AsyncState loading={!result} error={error} onRetry={retry} />

      {problem && (
        <>
          <div className="limit-chips" aria-label="문제 제한">
            <span className="limit-chip">시간 제한 <strong>{problem.limits.timeLimitMs} ms</strong></span>
            <span className="limit-chip">메모리 제한 <strong>{problem.limits.memoryLimitMb} MB</strong></span>
            <span className="limit-chip">출력 제한 <strong>{problem.limits.outputLimitKb} KB</strong></span>
          </div>

          <div className="panel">
            <section className="detail-section">
              <h2>문제</h2>
              <p className="problem-prose">{problem.description}</p>
            </section>
            <section className="detail-section">
              <h2>입력</h2>
              <p className="problem-prose">{problem.input}</p>
            </section>
            <section className="detail-section">
              <h2>출력</h2>
              <p className="problem-prose">{problem.output}</p>
            </section>
            <section className="detail-section">
              <h2>예제 입출력</h2>
              {problem.examples.length === 0 && <p className="subtitle">등록된 예제가 없습니다.</p>}
              {problem.examples.map((example, index) => (
                <div className="sample-grid" key={index}>
                  <div className="sample">
                    <div className="sample-head">
                      <h3>예제 입력 {index + 1}</h3>
                      <CopyButton text={example.input} label={`예제 입력 ${index + 1}`} />
                    </div>
                    <pre>{example.input}</pre>
                  </div>
                  <div className="sample">
                    <div className="sample-head">
                      <h3>예제 출력 {index + 1}</h3>
                      <CopyButton text={example.output} label={`예제 출력 ${index + 1}`} />
                    </div>
                    <pre>{example.output}</pre>
                  </div>
                </div>
              ))}
            </section>
          </div>
          <div className="actions detail-actions">
            <Button variant="secondary" onClick={onBack}>{backLabel}으로 돌아가기</Button>
            <Button onClick={() => onSubmit(problem)}>코드 제출</Button>
          </div>
        </>
      )}
    </section>
  )
}

export default ProblemDetail
