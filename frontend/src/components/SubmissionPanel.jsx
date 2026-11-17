import { useEffect, useRef, useState } from 'react'
import { submitCode, subscribeToSubmission } from '../api/submissions'
import { Button, StatusBadge } from '../design/ui'

const LANGUAGES = ['C', 'C++', 'Java', 'Python']
const FILE_NAMES = { C: 'main.c', 'C++': 'main.cpp', Java: 'Main.java', Python: 'main.py' }
const VERDICTS = {
  PENDING: ['채점 대기 중', '제출이 접수되었습니다. 채점 결과를 기다리고 있습니다.'],
  JUDGING: ['채점 중', '제출한 코드를 채점하고 있습니다.'],
  AC: ['맞았습니다', '모든 테스트 케이스를 통과했습니다.'],
  WA: ['틀렸습니다', '출력 결과가 정답과 다릅니다. 코드를 확인해 주세요.'],
  CE: ['컴파일 오류', '코드를 컴파일하지 못했습니다. 문법과 선택한 언어를 확인해 주세요.'],
  TLE: ['시간 초과', '문제의 시간 제한을 초과했습니다.'],
  MLE: ['메모리 초과', '문제의 메모리 제한을 초과했습니다.'],
  RE: ['런타임 오류', '코드를 실행하는 중 오류가 발생했습니다.'],
  OLE: ['출력 초과', '문제의 출력 제한을 초과했습니다.'],
  JE: ['채점 오류', '채점을 완료하지 못했습니다. 잠시 후 다시 제출해 주세요.'],
}
const liveSubmission = { submitCode, subscribeToSubmission }

function SubmissionPanel({ problemId, userId, problem, transport = liveSubmission, onBackToList, onBackToDetail, onSubmissionChange, onShowSubmissions }) {
  const [language, setLanguage] = useState('C++')
  const [source, setSource] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const resultStream = useRef(null)
  const active = useRef(true)
  const gutter = useRef(null)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      resultStream.current?.close()
    }
  }, [])

  useEffect(() => {
    if (!result?.submissionId || !result.result) return
    onSubmissionChange?.({
      userId, submissionId: result.submissionId, problemId,
      title: problem?.title ?? `문제 ${problemId}`, language,
      result: result.result, submittedAt: new Date().toISOString(),
    })
  }, [result, userId, problemId, problem?.title, language, onSubmissionChange])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!source.trim() || loading) return
    resultStream.current?.close()
    resultStream.current = null
    setLoading(true)
    setResult(null)

    try {
      const responseData = await transport.submitCode({ problemId, userId, language, source })
      if (!active.current) return
      setResult(responseData)
      if (responseData.result === 'PENDING') {
        resultStream.current = transport.subscribeToSubmission(
          responseData.submissionId,
          (update) => {
            if (!active.current) return
            setResult(update)
            if (update.result !== 'PENDING' && update.result !== 'JUDGING') resultStream.current = null
          },
          (error) => {
            if (!active.current) return
            setResult((currentResult) => ({ ...currentResult, error: error.message }))
          },
        )
      }
    } catch (error) {
      if (active.current) setResult({ error: error.message })
    } finally {
      if (active.current) setLoading(false)
    }
  }

  function editSource() {
    resultStream.current?.close()
    resultStream.current = null
    setResult(null)
  }

  const verdict = result?.result
  const pending = verdict === 'PENDING' || verdict === 'JUDGING'
  const failed = verdict && verdict !== 'AC' && !pending && Boolean(VERDICTS[verdict])
  const tone = verdict === 'AC' ? 'ac' : pending ? 'pending' : failed || result?.error ? 'failure' : 'neutral'
  const [verdictTitle, verdictDescription] = VERDICTS[verdict] ?? [
    verdict || '제출을 완료하지 못했습니다',
    verdict ? '서버에서 받은 채점 결과입니다.' : '오류 내용을 확인하고 다시 시도해 주세요.',
  ]
  const problemTitle = `${problemId}. ${problem?.title ?? '문제'}`

  return (
    <section aria-labelledby="submission-heading">
      <div className="intro">
        <div>
          <span className="eyebrow">SUBMIT SOLUTION</span>
          <h1 id="submission-heading">{result ? '채점 결과' : '코드 제출'}</h1>
          <p className="subtitle">
            {onBackToDetail
              ? <button type="button" className="text-link" onClick={onBackToDetail}>{problemTitle}</button>
              : problemTitle}
          </p>
        </div>
        {onBackToDetail && <div className="actions"><Button variant="secondary" onClick={onBackToDetail}>문제 상세</Button></div>}
      </div>
      <div className="panel">
        <div className="submission-context">
          <strong>제출 대상 · {problemTitle}</strong>
          {problem?.limits && (
            <div className="mini-limits">
              <span>시간 {problem.limits.timeLimitMs} ms</span>
              <span>메모리 {problem.limits.memoryLimitMb} MB</span>
            </div>
          )}
        </div>
        <form className="submit-form" onSubmit={handleSubmit} hidden={Boolean(result)} aria-busy={loading}>
          <div className="language-field">
            <label className="form-label" htmlFor="language">언어 선택</label>
            <select id="language" value={language} disabled={loading} onChange={(event) => setLanguage(event.target.value)}>
              {LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <label className="form-label" htmlFor="source">소스 코드 <span className="hint-text">— 코드 입력 또는 붙여넣기</span></label>
          <div className="editor">
            <div className="editor-bar">
              <span className="editor-dots" aria-hidden="true"><i /><i /><i /></span>
              <span>{FILE_NAMES[language]}</span>
            </div>
            <div className="editor-body">
              <pre className="line-numbers" aria-hidden="true" ref={gutter}>{Array.from({ length: Math.max(1, source.split('\n').length) }, (_, index) => index + 1).join('\n')}</pre>
              <textarea
                className="code-input"
                id="source"
                rows="15"
                placeholder="코드를 입력하세요"
                required
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                disabled={loading}
                value={source}
                onChange={(event) => setSource(event.target.value)}
                onScroll={(event) => { if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop }}
              />
            </div>
          </div>
          <div className="submit-footer">
            <p className="hint-text">코드를 제출하면 채점 진행 상태와 결과를 확인할 수 있습니다.</p>
            <Button type="submit" disabled={loading || !source.trim()}>{loading ? '제출 중...' : '코드 제출 →'}</Button>
          </div>
        </form>
        {result && (
          <div>
            <div className={`result-hero ${tone}`} role="status" aria-live="polite" aria-atomic="true">
              <span className="result-icon" aria-hidden="true">{verdict === 'AC' ? '✓' : pending ? '…' : '!'}</span>
              <h2 className="result-title">{transport.labels?.[verdict] ?? verdictTitle}</h2>
              <p className="result-description">{verdictDescription}</p>
            </div>
            {transport.isPreview && <p className="notice">화면 확인용 모의 채점입니다.</p>}
            {result.error && <p className="error-message" role="alert">{result.error}</p>}
            <div className="result-meta">
              <dl><dt>제출 ID</dt><dd>{result.submissionId ? `#${result.submissionId}` : '—'}</dd></dl>
              <dl><dt>언어</dt><dd>{language}</dd></dl>
              <dl><dt>채점 상태</dt><dd>{verdict ? <StatusBadge status={verdict} /> : '결과 없음'}</dd></dl>
            </div>
            <div className="result-actions">
              <Button onClick={editSource}>{pending ? '코드 수정' : '코드 수정 및 재제출'}</Button>
              {onShowSubmissions && <Button variant="secondary" onClick={onShowSubmissions}>내 제출 목록</Button>}
              {onBackToDetail && <Button variant="secondary" onClick={onBackToDetail}>문제 상세</Button>}
              {onBackToList && <Button variant="secondary" onClick={onBackToList}>문제 목록</Button>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default SubmissionPanel
