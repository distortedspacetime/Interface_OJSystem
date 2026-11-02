import { useState, useEffect, useCallback } from 'react'
import { getRecentSubmissions, getVerdictLabel } from '../api/submissionApi'

export default function RecentSubmissions({ problemId, refreshTrigger }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRecent = useCallback(async () => {
    if (!problemId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getRecentSubmissions(problemId)
      setSubmissions(data)
    } catch (err) {
      console.warn('최근 제출 조회 실패:', err.message)
      setError(err.message)
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [problemId])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!problemId) return
      setLoading(true)
      setError(null)
      try {
        const data = await getRecentSubmissions(problemId)
        if (!ignore) setSubmissions(data)
      } catch (err) {
        if (!ignore) {
          console.warn('최근 제출 조회 실패:', err.message)
          setError(err.message)
          setSubmissions([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [problemId, refreshTrigger])

  return (
    <section>
      <h4>최근 제출 기록</h4>

      <button type="button" onClick={fetchRecent} disabled={loading}>
        제출 이력 새로고침
      </button>

      {loading && <p>제출 기록을 불러오는 중...</p>}

      {error && <p>제출 기록 조회 안내: {error}</p>}

      {!loading && submissions.length === 0 && (
        <p>최근 제출 기록이 없습니다.</p>
      )}

      {!loading && submissions.length > 0 && (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>제출 ID</th>
              <th>언어</th>
              <th>결과</th>
              <th>제출 일시</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.submissionId || sub.id}>
                <td>{sub.submissionId || sub.id}</td>
                <td>{sub.language || '-'}</td>
                <td>{getVerdictLabel(sub.verdict || sub.status || sub.result)}</td>
                <td>{sub.createdAt || sub.submittedAt || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
