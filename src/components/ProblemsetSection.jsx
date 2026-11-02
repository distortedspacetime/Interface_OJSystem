import { useState, useEffect } from 'react'
import {
  getGroupProblemsets,
  getProblemsetProblems,
} from '../api/groupApi'

export default function ProblemsetSection({ groupId, onSelectProblem }) {
  const [problemsets, setProblemsets] = useState([])
  const [selectedSetId, setSelectedSetId] = useState(null)
  const [setProblems, setSetProblems] = useState([])
  const [loadingSets, setLoadingSets] = useState(false)
  const [loadingProblems, setLoadingProblems] = useState(false)
  const [errorSets, setErrorSets] = useState(null)
  const [errorProblems, setErrorProblems] = useState(null)

  // 그룹 문제집 목록 조회
  useEffect(() => {
    if (!groupId) return
    let ignore = false
    const fetchSets = async () => {
      setLoadingSets(true)
      setErrorSets(null)
      try {
        const data = await getGroupProblemsets(groupId)
        if (!ignore) {
          setProblemsets(data)
          if (data.length > 0) setSelectedSetId(data[0].setId)
          else setSelectedSetId(null)
        }
      } catch (err) {
        if (!ignore) {
          setErrorSets(err.message)
          setProblemsets([])
          setSelectedSetId(null)
        }
      } finally {
        if (!ignore) setLoadingSets(false)
      }
    }
    fetchSets()
    return () => {
      ignore = true
    }
  }, [groupId])

  // 선택된 문제집의 문제 목록 조회
  useEffect(() => {
    let ignore = false
    const fetchProblemsInSet = async () => {
      if (!selectedSetId) {
        return
      }
      setLoadingProblems(true)
      setErrorProblems(null)
      try {
        const data = await getProblemsetProblems(selectedSetId)
        if (!ignore) setSetProblems(data)
      } catch (err) {
        if (!ignore) {
          setErrorProblems(err.message)
          setSetProblems([])
        }
      } finally {
        if (!ignore) setLoadingProblems(false)
      }
    }
    fetchProblemsInSet()
    return () => {
      ignore = true
    }
  }, [selectedSetId])

  const displayedProblems = selectedSetId ? setProblems : []

  return (
    <section>
      <h3>문제집 목록</h3>

      {loadingSets && <p>문제집 목록을 불러오는 중...</p>}

      {errorSets && <p>문제집 목록 조회 오류: {errorSets}</p>}

      {!loadingSets && !errorSets && problemsets.length === 0 && (
        <p>해당 그룹에 등록된 문제집이 없습니다.</p>
      )}

      {!loadingSets && problemsets.length > 0 && (
        <div>
          <label htmlFor="problemset-select">문제집 선택: </label>
          <select
            id="problemset-select"
            value={selectedSetId || ''}
            onChange={(e) => setSelectedSetId(Number(e.target.value))}
          >
            {problemsets.map((s) => (
              <option key={s.setId} value={s.setId}>
                [{s.status || '진행'}] {s.name} {s.startDate ? `(${s.startDate} ~ ${s.endDate})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedSetId && (
        <div>
          <h4>문제집 수록 문제</h4>

          {loadingProblems && <p>문제집의 문제를 불러오는 중...</p>}

          {errorProblems && <p>문제 목록 조회 오류: {errorProblems}</p>}

          {!loadingProblems && !errorProblems && displayedProblems.length === 0 && (
            <p>이 문제집에 연결된 문제가 없습니다.</p>
          )}

          {!loadingProblems && !errorProblems && displayedProblems.length > 0 && (
            <table border="1" cellPadding="5">
              <thead>
                <tr>
                  <th>문제 번호</th>
                  <th>문제 제목</th>
                  <th>시간 제한</th>
                  <th>메모리 제한</th>
                  <th>이동</th>
                </tr>
              </thead>
              <tbody>
                {displayedProblems.map((p) => {
                  const pId = p.problemId || p.id
                  return (
                    <tr key={pId}>
                      <td>{pId}</td>
                      <td>{p.title}</td>
                      <td>{p.timeLimit ? `${p.timeLimit} ms` : '-'}</td>
                      <td>{p.memoryLimit ? `${p.memoryLimit} MB` : '-'}</td>
                      <td>
                        <button type="button" onClick={() => onSelectProblem(pId)}>
                          문제 풀기
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  )
}
