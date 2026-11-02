import { useState, useEffect, useCallback } from 'react'
import { getProblem } from '../api/problemApi'

export default function ProblemDetail({ problemId, onBack }) {
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDetail = useCallback(async () => {
    if (!problemId) return
    setLoading(true)
    setError(null)

    try {
      const data = await getProblem(problemId)
      if (!data) {
        throw new Error('존재하지 않는 문제입니다.')
      }
      setProblem(data)
    } catch (err) {
      setError(err.message)
      setProblem(null)
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
        const data = await getProblem(problemId)
        if (!ignore) {
          if (!data) throw new Error('존재하지 않는 문제입니다.')
          setProblem(data)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
          setProblem(null)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [problemId])

  return (
    <section>
      {onBack && (
        <button type="button" onClick={onBack}>
          ← 목록으로 돌아가기
        </button>
      )}

      <h3>문제 상세 정보</h3>

      {loading && <p>문제 정보를 불러오는 중입니다...</p>}

      {error && (
        <div>
          <p>오류 안내: {error}</p>
          <button type="button" onClick={fetchDetail}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && problem && (
        <div>
          <h4>
            [{problem.problemId || problem.id}번] {problem.title}
          </h4>

          <table border="1" cellPadding="5">
            <tbody>
              <tr>
                <th>시간 제한</th>
                <td>{problem.timeLimit ? `${problem.timeLimit} ms` : '-'}</td>
                <th>메모리 제한</th>
                <td>{problem.memoryLimit ? `${problem.memoryLimit} MB` : '-'}</td>
                <th>출력 제한</th>
                <td>{problem.outputLimit ? `${problem.outputLimit} KB` : '-'}</td>
              </tr>
            </tbody>
          </table>

          <div>
            <h5>[문제 설명]</h5>
            <p>{problem.description || '설명이 없습니다.'}</p>
          </div>

          <div>
            <h5>[입력 설명]</h5>
            <p>{problem.inputDescription || '입력 설명이 없습니다.'}</p>
          </div>

          <div>
            <h5>[출력 설명]</h5>
            <p>{problem.outputDescription || '출력 설명이 없습니다.'}</p>
          </div>
        </div>
      )}
    </section>
  )
}
