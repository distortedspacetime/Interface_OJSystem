// 제출 관련 API 모듈
import { apiClient } from './client'

/**
 * 소스코드 제출
 * POST /api/submissions
 * @param {Object} params { problemId, language, source }
 * @returns {Promise<{ submissionId: number, status?: string, verdict?: string }>}
 */
export async function submitCode({ problemId, language, source }) {
  const payload = {
    problemId: Number(problemId),
    language,
    source,
  }

  try {
    const data = await apiClient('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data
  } catch (error) {
    console.warn('POST /api/submissions 호출 실패:', error.message)
    throw error
  }
}

/**
 * 제출 상태 및 결과 조회
 * GET /api/submissions/:id
 * @param {number|string} submissionId
 * @returns {Promise<{ submissionId: number, status: string, verdict: string|null }>}
 */
export async function getSubmission(submissionId) {
  try {
    const data = await apiClient(`/api/submissions/${submissionId}`)
    return data
  } catch (error) {
    console.warn(`GET /api/submissions/${submissionId} 호출 실패:`, error.message)
    throw error
  }
}

/**
 * 특정 문제에 대한 내 최근 제출 목록 조회
 * GET /api/submissions?problemId=:problemId&scope=me
 * @param {number|string} problemId
 * @returns {Promise<Array>}
 */
export async function getRecentSubmissions(problemId) {
  try {
    const data = await apiClient(`/api/submissions?problemId=${problemId}&scope=me`)
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.submissions)) return data.submissions
    return []
  } catch (error) {
    console.warn(`GET /api/submissions?problemId=${problemId}&scope=me 호출 실패:`, error.message)
    throw error
  }
}

/**
 * 채점 판정 코드 한글 변환
 * @param {string} verdict 판정 코드 (AC, WA, CE, RE, TLE, MLE, OLE, JE 등)
 * @returns {string} 한글 안내 문구
 */
export function getVerdictLabel(verdict) {
  if (!verdict) return '판정 대기중'

  const map = {
    AC: '정답 (AC)',
    WA: '오답 (WA)',
    CE: '컴파일 오류 (CE)',
    RE: '실행 오류 (RE)',
    TLE: '시간 초과 (TLE)',
    MLE: '메모리 초과 (MLE)',
    OLE: '출력 초과 (OLE)',
    JE: '채점 서버 오류 (JE)',
    PENDING: '채점 대기중',
    JUDGING: '채점 진행중',
  }

  return map[verdict] || verdict
}
