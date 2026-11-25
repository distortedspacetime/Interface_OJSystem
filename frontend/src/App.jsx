import { useCallback, useEffect, useRef, useState } from 'react'
import GroupSelection from './components/GroupSelection'
import ProblemList from './components/ProblemList'
import ProblemSetList from './components/ProblemSetList'
import ProblemDetail from './components/ProblemDetail'
import SubmissionPanel from './components/SubmissionPanel'
import SubmissionList from './components/SubmissionList'
import { getSubmissions } from './api/getSubmissions'
import UserLookupForm from './components/UserLookupForm'
import AppHeader from './design/layout/AppHeader'
import './design/tokens.css'
import './design/global.css'
import './App.css'

const STORAGE_KEY = 'oj_view_state'
const DEFAULT_VIEW = {
  sessionId: null,
  screen: 'entry',
  user: null,
  group: null,
  problemSet: null,
  problem: null,
  detailOrigin: 'list',
}

function sanitizeView(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_VIEW
  const user = raw.user?.userId ? raw.user : null
  const sessionId = user && typeof raw.sessionId === 'string' ? raw.sessionId : (user ? 'default' : null)
  const group = user && raw.group?.groupId ? raw.group : null
  const problemSet = group && raw.problemSet?.setId ? raw.problemSet : null
  const problem = user && raw.problem?.problemId ? raw.problem : null
  const detailOrigin = raw.detailOrigin === 'submissions' ? 'submissions' : 'list'
  let screen = typeof raw.screen === 'string' ? raw.screen : 'entry'

  if (!user) screen = 'entry'
  else if (['list', 'sets'].includes(screen) && !group) screen = 'groups'
  else if (['detail', 'submit'].includes(screen) && !problem) {
    screen = detailOrigin === 'submissions' ? 'submissions' : (group ? 'list' : 'groups')
  }

  return { sessionId, screen, user, group, problemSet, problem, detailOrigin }
}

function loadInitialView() {
  if (typeof window === 'undefined') return DEFAULT_VIEW
  if (window.history.state?.ojView) {
    return sanitizeView(window.history.state.ojView)
  }
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY)
    if (saved) return sanitizeView(JSON.parse(saved))
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_VIEW
}

function saveViewToStorage(view) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(view))
  } catch {
    // Ignore storage errors
  }
}

function App() {
  const [view, setView] = useState(loadInitialView)
  const { screen, user, group, problemSet, problem, detailOrigin } = view
  const [_submissionHistory, setSubmissionHistory] = useState({})
  const [submissionState, setSubmissionState] = useState({
    submissions: [], loading: false, error: null,
  })
  const [submissionRefresh, setSubmissionRefresh] = useState(0)
  const main = useRef(null)
  const viewRef = useRef(view)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const commitView = useCallback((patchOrUpdater, { replace = false } = {}) => {
    const prev = viewRef.current
    const nextRaw = typeof patchOrUpdater === 'function' ? patchOrUpdater(prev) : { ...prev, ...patchOrUpdater }
    const sanitized = sanitizeView(nextRaw)
    const next = sanitized.screen === 'entry' ? DEFAULT_VIEW : sanitized
    viewRef.current = next
    saveViewToStorage(next)
    if (replace) {
      window.history.replaceState({ ojView: next }, '')
    } else if (
      next.screen !== prev.screen ||
      next.user?.userId !== prev.user?.userId ||
      next.group?.groupId !== prev.group?.groupId ||
      next.problemSet?.setId !== prev.problemSet?.setId ||
      next.problem?.problemId !== prev.problem?.problemId
    ) {
      window.history.pushState({ ojView: next }, '')
    }
    setView(next)
  }, [])

  useEffect(() => {
    if (!window.history.state?.ojView) {
      window.history.replaceState({ ojView: view }, '')
    }
    saveViewToStorage(view)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onPopState = (event) => {
      if (viewRef.current.screen === 'entry') {
        if (event.state?.ojView && event.state.ojView.screen !== 'entry') {
          window.history.replaceState({ ojView: DEFAULT_VIEW }, '')
        }
        return
      }
      const next = event.state?.ojView ? sanitizeView(event.state.ojView) : loadInitialView()
      if (next.screen === 'entry' || next.sessionId !== viewRef.current.sessionId) {
        window.history.replaceState({ ojView: viewRef.current }, '')
        return
      }
      viewRef.current = next
      saveViewToStorage(next)
      setView(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [screen, group?.groupId, problemSet?.setId, problem?.problemId])

  function enter(matchedUser) {
    commitView({
      sessionId: `${matchedUser.userId}-${Date.now()}`,
      user: matchedUser,
      group: null,
      problemSet: null,
      problem: null,
      detailOrigin: 'list',
      screen: 'groups',
    }, { replace: true })
  }

  function selectGroup(item) {
    commitView({
      group: item,
      problemSet: null,
      problem: null,
      screen: 'list',
    })
  }

  function showAll() {
    commitView({ problemSet: null, screen: 'list' })
  }

  function openProblem(item) {
    commitView({ problem: item, detailOrigin: 'list', screen: 'detail' })
  }

  function openSubmittedProblem(item) {
    commitView({
      problem: {
        problemId: item.problemId,
        title: item.title,
        isSolved: item.result === 'AC' || (submissionState.submissions ?? []).some((entry) => entry.problemId === item.problemId && entry.result === 'AC'),
      },
      detailOrigin: 'submissions',
      screen: 'detail',
    })
  }

  const recordSubmission = useCallback((item) => {
    setSubmissionHistory((history) => {
      const records = history[item.userId] ?? []
      const previous = records.find((record) => record.submissionId === item.submissionId)
      const record = { ...item, submittedAt: previous?.submittedAt ?? item.submittedAt }
      return { ...history, [item.userId]: [record, ...records.filter((entry) => entry.submissionId !== item.submissionId)] }
    })
  }, [])

  useEffect(() => {
    if (screen !== 'submissions' || !user?.userId) return
    const controller = new AbortController()
    setSubmissionState({ submissions: [], loading: true, error: null })

    getSubmissions(user.userId, controller.signal).then(
      (submissions) => {
        if (!controller.signal.aborted)
          setSubmissionState({ submissions, loading: false, error: null })
      },
      (error) => {
        if (!controller.signal.aborted)
          setSubmissionState({ submissions: [], loading: false, error: error.message })
      }
    )
    return () => controller.abort()
  }, [screen, user?.userId, submissionRefresh])

  function submitProblem(item) {
    commitView((prev) => ({ ...prev, problem: { ...prev.problem, ...item }, screen: 'submit' }))
  }

  function navigate(next) {
    if (next === 'list') showAll()
    else commitView({ screen: next })
  }

  const historyDetail = detailOrigin === 'submissions' && ['detail', 'submit'].includes(screen)
  const hasGroup = user && group && !['entry', 'groups', 'submissions'].includes(screen) && !historyDetail
  return <>
    <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <AppHeader user={screen === 'entry' ? null : user} screen={historyDetail ? 'submissions' : screen} group={group} onNavigate={navigate} onChangeUser={() => commitView({ screen: 'entry' }, { replace: true })} />
    <main id="main-content" ref={main} tabIndex={-1}>
      {hasGroup && <nav className="crumbs" aria-label="현재 위치">
        <button type="button" onClick={() => commitView({ screen: 'groups' })}>그룹 선택</button><span aria-hidden="true">/</span>
        <button type="button" onClick={showAll}>{group.groupName}</button>
        {problemSet && screen !== 'sets' && <><span aria-hidden="true">/</span><button type="button" onClick={() => commitView({ screen: 'list' })}>{problemSet.setName}</button></>}
        {['detail', 'submit'].includes(screen) && <><span aria-hidden="true">/</span><span>{problem.title}</span></>}
        {screen === 'sets' && <><span aria-hidden="true">/</span><span aria-current="page">문제집 목록</span></>}
      </nav>}
      {historyDetail && <nav className="crumbs" aria-label="현재 위치"><button type="button" onClick={() => commitView({ screen: 'submissions' })}>내 제출</button><span aria-hidden="true">/</span><span>{problem.title}</span></nav>}
      {screen === 'entry' && <UserLookupForm initialName={user?.username ?? ''} onUserFound={enter} />}
      {screen === 'groups' && <GroupSelection key={user.userId} userId={user.userId} onSelect={selectGroup} onBack={() => commitView({ screen: 'entry' }, { replace: true })} />}
      {screen === 'submissions' && user && <SubmissionList key={user.userId} username={user.username} submissions={submissionState.submissions} loading={submissionState.loading} error={submissionState.error} onRefresh={() => setSubmissionRefresh((n) => n + 1)} onOpenProblem={openSubmittedProblem} onBack={() => commitView({ screen: group ? 'list' : 'groups' })} />}
      {screen === 'sets' && <ProblemSetList key={`${user.userId}-${group.groupId}`} group={group} groupId={group.groupId} userId={user.userId} onSelect={(item) => commitView({ problemSet: item, screen: 'list' })} onShowProblems={showAll} />}
      {screen === 'list' && <ProblemList key={`${user.userId}-${group.groupId}-${problemSet?.setId ?? 'all'}`} group={group} userId={user.userId} selectedSet={problemSet} onSelect={openProblem} onBack={() => commitView({ screen: problemSet ? 'sets' : 'groups' })} onShowSets={() => commitView({ screen: 'sets' })} onShowAll={showAll} />}
      {screen === 'detail' && <ProblemDetail key={`${user.userId}-${problem.problemId}`} problemId={problem.problemId} isSolved={problem.isSolved} userId={user.userId} onSubmit={submitProblem} onBack={() => commitView({ screen: detailOrigin })} backLabel={historyDetail ? '내 제출 목록' : undefined} />}
      {screen === 'submit' && <SubmissionPanel key={`${user.userId}-${problem.problemId}`} problemId={problem.problemId} problem={problem} userId={user.userId} onSubmissionChange={recordSubmission} onShowSubmissions={() => commitView({ screen: 'submissions' })} onBackToList={group ? () => commitView({ screen: 'list' }) : undefined} onBackToDetail={() => commitView({ screen: 'detail' })} />}
    </main>
    <footer className="site-footer">Interface Online Judge</footer>
  </>
}

export default App
