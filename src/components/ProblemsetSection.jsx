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
          setSelectedSetId(null)
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
    if (!selectedSetId) {
      return
    }
    let ignore = false
    const fetchProblemsInSet = async () => {
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

  const selectedSet = problemsets.find((s) => s.setId === selectedSetId)
  const displayedProblems = selectedSetId ? setProblems : []

  return (
    <section>
      <h3>문제집 목록</h3>

      {loadingSets && <p>문제집 목록을 불러오는 중...</p>}

      {errorSets && <p>문제집 목록 조회 오류: {errorSets}</p>}

      {!loadingSets && !errorSets && problemsets.length === 0 && (
        <p>해당 그룹에 등록된 문제집이 없습니다.</p>
      )}

      {/* 문제집 목록 테이블 */}
      {!loadingSets && problemsets.length > 0 && (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>문제집 번호</th>
              <th>문제집 이름</th>
              <th>진행 상태</th>
              <th>진행 기간</th>
              <th>수록 문제 보기</th>
            </tr>
          </thead>
          <tbody>
            {problemsets.map((s) => {
              const isSelected = selectedSetId === s.setId
              return (
                <tr key={s.setId}>
                  <td>{s.setId}</td>
                  <td>{s.name}</td>
                  <td>{s.status || '-'}</td>
                  <td>
                    {s.startDate && s.endDate
                      ? `${s.startDate} ~ ${s.endDate}`
                      : '-'}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSetId(isSelected ? null : s.setId)
                      }
                    >
                      {isSelected ? '닫기' : '문제 목록 보기'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* 선택한 문제집 수록 문제 목록 */}
      {selectedSet && (
        <div>
          <h4>[{selectedSet.name}] 수록 문제 목록</h4>

          {loadingProblems && <p>문제 목록을 불러오는 중...</p>}

          {errorProblems && <p>문제 목록 조회 오류: {errorProblems}</p>}

          {!loadingProblems && !errorProblems && displayedProblems.length === 0 && (
            <p>이 문제집에 수록된 문제가 없습니다.</p>
          )}

          {!loadingProblems && !errorProblems && displayedProblems.length > 0 && (
            <table border="1" cellPadding="5">
              <thead>
                <tr>
                  <th>문제 번호</th>
                  <th>문제 제목</th>
                  <th>시간 제한</th>
                  <th>메모리 제한</th>
                  <th>문제 풀기</th>
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
