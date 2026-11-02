import { useState, useEffect } from 'react'
import { getGroups, getGroup } from '../api/groupApi'

export default function GroupSelect({ selectedGroupId, onSelectGroup }) {
  const [groups, setGroups] = useState([])
  const [groupDetail, setGroupDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getGroups()
        if (!ignore) {
          setGroups(data)
          if (data.length > 0 && !selectedGroupId) {
            onSelectGroup(data[0].groupId)
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
          setGroups([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [selectedGroupId, onSelectGroup])

  useEffect(() => {
    if (!selectedGroupId) return
    let ignore = false
    const loadDetail = async () => {
      try {
        const detail = await getGroup(selectedGroupId)
        if (!ignore) setGroupDetail(detail)
      } catch {
        if (!ignore) setGroupDetail(null)
      }
    }
    loadDetail()
    return () => {
      ignore = true
    }
  }, [selectedGroupId])

  return (
    <section>
      <h2>그룹 선택</h2>

      {loading && <p>그룹 목록을 불러오는 중...</p>}

      {error && <p>그룹 목록 조회 실패: {error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p>조회 가능한 그룹이 없습니다.</p>
      )}

      {!loading && groups.length > 0 && (
        <div>
          <label htmlFor="group-select">소속 그룹 선택: </label>
          <select
            id="group-select"
            value={selectedGroupId || ''}
            onChange={(e) => onSelectGroup(Number(e.target.value))}
          >
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>
                [{g.groupId}] {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 선택된 그룹 상단 소개 카드 */}
      {groupDetail && (
        <div>
          <h3>그룹 소개</h3>
          <table border="1" cellPadding="5">
            <tbody>
              <tr>
                <th>그룹 ID</th>
                <td>{groupDetail.groupId}</td>
                <th>그룹 이름</th>
                <td>{groupDetail.name}</td>
                <th>회원 수</th>
                <td>{groupDetail.memberCount ?? '-'}</td>
              </tr>
              {groupDetail.description && (
                <tr>
                  <th>그룹 설명</th>
                  <td colSpan="5">{groupDetail.description}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
