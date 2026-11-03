import { useState } from 'react'
import ProblemList from './components/ProblemList'
import ProblemDetail from './components/ProblemDetail'
import SubmissionSection from './components/SubmissionSection'
import AdminProblemCreate from './components/AdminProblemCreate'
import GroupSelect from './components/GroupSelect'
import GroupProblemList from './components/GroupProblemList'
import ProblemsetSection from './components/ProblemsetSection'
import RecentSubmissions from './components/RecentSubmissions'

export default function App() {
  // 현재 보고 있는 메인 메뉴 ('groups' | 'all-problems' | 'admin')
  const [currentTab, setCurrentTab] = useState('groups')

  // 선택된 문제 ID
  const [selectedProblemId, setSelectedProblemId] = useState(null)

  // 선택된 그룹 ID
  const [selectedGroupId, setSelectedGroupId] = useState(null)

  // 제출 완료 시 최근 제출 목록 갱신 트리거
  const [submissionCount, setSubmissionCount] = useState(0)

  const handleSelectProblem = (id) => {
    setSelectedProblemId(Number(id))
  }

  const handleBackToList = () => {
    setSelectedProblemId(null)
  }

  const handleSubmissionDone = () => {
    setSubmissionCount((prev) => prev + 1)
  }

  return (
    <div>
      <header>
        <h1>Interface OJ System</h1>
        <p>온라인 저지 시스템</p>
      </header>

      {/* 내비게이션 메뉴 */}
      <nav>
        <button
          type="button"
          onClick={() => {
            setCurrentTab('groups')
            setSelectedProblemId(null)
          }}
          disabled={currentTab === 'groups' && !selectedProblemId}
        >
          그룹 및 문제 목록
        </button>
        {' '}
        <button
          type="button"
          onClick={() => {
            setCurrentTab('all-problems')
            setSelectedProblemId(null)
          }}
          disabled={currentTab === 'all-problems' && !selectedProblemId}
        >
          전체 문제 목록
        </button>
        {' '}
        <button
          type="button"
          onClick={() => {
            setCurrentTab('admin')
            setSelectedProblemId(null)
          }}
          disabled={currentTab === 'admin'}
        >
          문제 등록
        </button>
      </nav>

      <hr />

      {/* ================= 그룹별 문제 및 문제집 ================= */}
      {currentTab === 'groups' && (
        <main>
          <GroupSelect
            selectedGroupId={selectedGroupId}
            onSelectGroup={(gid) => {
              setSelectedGroupId(gid)
              setSelectedProblemId(null)
            }}
          />

          <hr />

          {!selectedProblemId ? (
            <div>
              <GroupProblemList
                groupId={selectedGroupId}
                onSelectProblem={handleSelectProblem}
              />

              <hr />

              <ProblemsetSection
                groupId={selectedGroupId}
                onSelectProblem={handleSelectProblem}
              />
            </div>
          ) : (
            <div>
              <button type="button" onClick={handleBackToList}>
                ← 그룹 문제 목록으로 돌아가기
              </button>

              <ProblemDetail
                problemId={selectedProblemId}
                onBack={handleBackToList}
              />

              <hr />

              <SubmissionSection
                problemId={selectedProblemId}
                onSubmissionComplete={handleSubmissionDone}
              />

              <hr />

              <RecentSubmissions
                problemId={selectedProblemId}
                refreshTrigger={submissionCount}
              />
            </div>
          )}
        </main>
      )}

      {/* ================= 전체 문제 목록 ================= */}
      {currentTab === 'all-problems' && (
        <main>
          {!selectedProblemId ? (
            <ProblemList onSelectProblem={handleSelectProblem} />
          ) : (
            <div>
              <ProblemDetail
                problemId={selectedProblemId}
                onBack={handleBackToList}
              />
              <hr />
              <SubmissionSection
                problemId={selectedProblemId}
                onSubmissionComplete={handleSubmissionDone}
              />
            </div>
          )}
        </main>
      )}

      {/* ================= 문제 등록 ================= */}
      {currentTab === 'admin' && (
        <main>
          <AdminProblemCreate
            onProblemCreated={() => {
              setCurrentTab('all-problems')
            }}
          />
        </main>
      )}

      <hr />

      <footer>
        <p>Interface OJ System</p>
      </footer>
    </div>
  )
}
