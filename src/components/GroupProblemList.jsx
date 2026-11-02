import { useState, useEffect, useCallback } from 'react'
import { getGroupProblems } from '../api/problemApi'

export default function GroupProblemList({ groupId, onSelectProblem }) {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSolved, setFilterSolved] = useState('all') // 'all' | 'solved' | 'unsolved'

  const fetchProblems = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getGroupProblems(groupId)
      setProblems(data)
    } catch (err) {
      setError(err.message)
      setProblems([])
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!groupId) return
      setLoading(true)
      setError(null)
      try {
        const data = await getGroupProblems(groupId)
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
  }, [groupId])

  // 필터링 적용
  const filteredProblems = problems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    if (filterSolved === 'solved') {
      return p.isSolved === true
    } else if (filterSolved === 'unsolved') {
      return p.isSolved !== true
    }
    return true
  })

  return (
    <section>
      <h3>문제 목록</h3>

      <div>
        <label htmlFor="search-title">문제 제목 검색: </label>
        <input
          type="text"
          id="search-title"
          placeholder="검색할 문제 제목 입력"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {' | '}
        <label htmlFor="filter-solved">해결 여부 필터: </label>
        <select
          id="filter-solved"
          value={filterSolved}
          onChange={(e) => setFilterSolved(e.target.value)}
        >
          <option value="all">전체 문제</option>
          <option value="solved">해결 완료 (AC)</option>
          <option value="unsolved">미해결</option>
        </select>
        {' '}
        <button type="button" onClick={fetchProblems} disabled={loading}>
          새로고침
        </button>
      </div>

      <br />

      {loading && <p>문제 목록을 불러오는 중...</p>}

      {error && <p>문제 목록 불러오기 오류: {error}</p>}

      {!loading && !error && filteredProblems.length === 0 && (
        <p>조건에 맞는 문제가 없습니다.</p>
      )}

      {!loading && !error && filteredProblems.length > 0 && (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>문제 번호</th>
              <th>해결 상태</th>
              <th>문제 제목</th>
              <th>시간 제한</th>
              <th>메모리 제한</th>
              <th>문제 풀기</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((p) => {
              const pId = p.problemId || p.id
              return (
                <tr key={pId}>
                  <td>{pId}</td>
                  <td>{p.isSolved ? '해결 (AC)' : '미해결'}</td>
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
