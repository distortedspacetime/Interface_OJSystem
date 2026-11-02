// 문제 관련 API 모듈
import { apiClient } from './client'

/**
 * 전체 문제 목록 조회
 * GET /api/problems
 * @returns {Promise<Array>}
 */
export async function getProblems() {
  const data = await apiClient('/api/problems')
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.problems)) return data.problems
  return []
}

/**
 * 문제 상세 조회
 * GET /api/problems/:id
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getProblem(id) {
  const data = await apiClient(`/api/problems/${id}`)
  if (data && data.problem) return data.problem
  return data
}

/**
 * 관리자 문제 등록
 * POST /api/problems
 * @param {Object} problemData
 * @returns {Promise<Object>}
 */
export async function createProblem(problemData) {
  const data = await apiClient('/api/problems', {
    method: 'POST',
    body: JSON.stringify(problemData),
  })
  return data
}

/**
 * 그룹별 전체 문제 목록 조회
 * GET /api/problems?groupId=:groupId
 * @param {number|string} groupId
 * @returns {Promise<Array>}
 */
export async function getGroupProblems(groupId) {
  const data = await apiClient(`/api/problems?groupId=${groupId}`)
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.problems)) return data.problems
  return []
}
