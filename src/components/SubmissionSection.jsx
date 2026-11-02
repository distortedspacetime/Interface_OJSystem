import { useState, useEffect, useRef } from 'react'
import { submitCode, getSubmission, getVerdictLabel } from '../api/submissionApi'

const LANGUAGES = ['C', 'C++', 'Java', 'Python']

export default function SubmissionSection({ problemId, onSubmissionComplete }) {
  const [language, setLanguage] = useState('C++')
  const [source, setSource] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [judging, setJudging] = useState(false)
  const [submissionId, setSubmissionId] = useState(null)
  const [status, setStatus] = useState(null)
  const [verdict, setVerdict] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const pollingTimerRef = useRef(null)
  const retryCountRef = useRef(0)

  // 컴포넌트 언마운트 시 폴링 타이머 정리
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
      }
    }
  }, [])

  // 채점 결과 폴링 함수
  const startPolling = (subId) => {
    setJudging(true)
    setStatus('PENDING')
    retryCountRef.current = 0

    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
    }

    const checkResult = async () => {
      try {
        const data = await getSubmission(subId)
        if (data) {
          const currentStatus = data.status
          const currentVerdict = data.verdict || (['AC', 'WA', 'CE', 'RE', 'TLE', 'MLE', 'OLE', 'JE'].includes(currentStatus) ? currentStatus : null)
          setStatus(currentStatus)
          setVerdict(currentVerdict)

          // 채점이 완료되었거나 상태가 판정 코드인 경우 폴링 종료
          if (currentStatus === 'DONE' || currentVerdict || ['AC', 'WA', 'CE', 'RE', 'TLE', 'MLE', 'OLE', 'JE'].includes(currentStatus)) {
            setJudging(false)
            if (pollingTimerRef.current) {
              clearInterval(pollingTimerRef.current)
              pollingTimerRef.current = null
            }
            if (onSubmissionComplete) {
              onSubmissionComplete()
            }
          }
        }
      } catch (err) {
        retryCountRef.current += 1
        console.warn(`제출 상태 조회 실패 (${retryCountRef.current}회):`, err.message)

        // 3회 이상 연속 실패 시 폴링 중단 및 실제 오류 노출
        if (retryCountRef.current >= 3) {
          setJudging(false)
          setErrorMessage(`채점 결과 조회 오류: ${err.message}`)
          if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current)
            pollingTimerRef.current = null
          }
        }
      }
    }

    // 1.5초마다 폴링
    pollingTimerRef.current = setInterval(checkResult, 1500)
    checkResult()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!source.trim()) {
      alert('소스 코드를 입력해주세요.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSubmissionId(null)
    setStatus(null)
    setVerdict(null)

    try {
      const response = await submitCode({
        problemId,
        language,
        source,
      })

      const subId = response.submissionId
      setSubmissionId(subId)

      // 백엔드가 즉시 판정(AC 등)을 반환하는 경우
      const directVerdict = response.verdict || response.result || (response.status !== 'PENDING' ? response.status : null)

      if (directVerdict && ['AC', 'WA', 'CE', 'RE', 'TLE', 'MLE', 'OLE', 'JE'].includes(directVerdict)) {
        setStatus('DONE')
        setVerdict(directVerdict)
        setJudging(false)
        if (onSubmissionComplete) onSubmissionComplete()
      } else {
        // 비동기 채점인 경우 GET /api/submissions/:id 폴링 시작
        startPolling(subId)
      }
    } catch (err) {
      setErrorMessage(`제출 실패: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h3>코드 제출</h3>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="submit-lang">언어 선택: </label>
          <select
            id="submit-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={submitting || judging}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <br />

        <div>
          <label htmlFor="submit-source">소스 코드 입력:</label>
          <br />
          <textarea
            id="submit-source"
            rows="12"
            cols="80"
            placeholder="제출할 소스 코드를 여기에 작성하세요"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={submitting || judging}
          />
        </div>

        <br />

        <button type="submit" disabled={submitting || judging}>
          {submitting ? '제출 요청 중...' : judging ? '채점 중...' : '코드 제출하기'}
        </button>
      </form>

      {/* 상태 및 결과 영역 */}
      <div>
        <h4>제출 상태 및 결과 안내</h4>

        {submitting && <p>서버로 코드를 전송하고 있습니다...</p>}

        {judging && (
          <p>
            [채점 진행중] 제출 ID: {submissionId} 번 코드를 채점 서버에서 채점하고 있습니다...
          </p>
        )}

        {errorMessage && (
          <div>
            <p>오류 발생: {errorMessage}</p>
          </div>
        )}

        {submissionId && !errorMessage && (
          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>제출 번호 (submissionId)</th>
                <th>채점 상태 (status)</th>
                <th>최종 판정 (verdict)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{submissionId}</td>
                <td>{judging ? '채점 중 (PENDING)' : status || 'DONE'}</td>
                <td>
                  <strong>
                    {judging ? '채점 진행 중...' : getVerdictLabel(verdict || status)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
