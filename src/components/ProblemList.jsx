import { useState, useEffect, useCallback } from 'react'
import { getProblems } from '../api/problemApi'

export default function ProblemList({ onSelectProblem }) {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProblemList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProblems()
      setProblems(data)
    } catch (err) {
      setError(err.message)
      setProblems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getProblems()
        if (!ignore) setProblems(data)
      } catch (err) {
        if (!ignore) {
          setError(err.message)
          setProblems([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <section>
      <h2>전체 문제 목록</h2>
      <button type="button" onClick={fetchProblemList} disabled={loading}>
        새로고침
      </button>

      {loading && <p>데이터를 불러오는 중입니다...</p>}

      {error && (
        <div>
          <p>오류 발생 (요청 실패): {error}</p>
          <button type="button" onClick={fetchProblemList}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && problems.length === 0 && (
        <p>등록된 문제가 없습니다.</p>
      )}

      {!loading && !error && problems.length > 0 && (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>문제 번호</th>
              <th>문제 제목</th>
              <th>시간 제한</th>
              <th>메모리 제한</th>
              <th>선택</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => {
              const pId = p.problemId || p.id
              return (
                <tr key={pId}>
                  <td>{pId}</td>
                  <td>{p.title}</td>
                  <td>{p.timeLimit ? `${p.timeLimit} ms` : '-'}</td>
                  <td>{p.memoryLimit ? `${p.memoryLimit} MB` : '-'}</td>
                  <td>
                    <button type="button" onClick={() => onSelectProblem(pId)}>
                      문제 보기 및 제출
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
