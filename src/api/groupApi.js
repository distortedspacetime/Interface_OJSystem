// 그룹 및 문제집 관련 API 모듈
import { apiClient } from './client'

/**
 * 그룹 목록 조회
 * GET /api/groups
 * @returns {Promise<Array>}
 */
export async function getGroups() {
  const data = await apiClient('/api/groups')
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.groups)) return data.groups
  return []
}

/**
 * 그룹 상세 정보 조회
 * GET /api/groups/:groupId
 * @param {number|string} groupId
 * @returns {Promise<Object>}
 */
export async function getGroup(groupId) {
  const data = await apiClient(`/api/groups/${groupId}`)
  if (data && data.group) return data.group
  return data
}

/**
 * 그룹 내 문제집 목록 조회
 * GET /api/groups/:groupId/problemsets
 * @param {number|string} groupId
 * @returns {Promise<Array>}
 */
export async function getGroupProblemsets(groupId) {
  const data = await apiClient(`/api/groups/${groupId}/problemsets`)
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.problemsets)) return data.problemsets
  return []
}

/**
 * 문제집 상세 조회
 * GET /api/problemsets/:setId
 * @param {number|string} setId
 * @returns {Promise<Object>}
 */
export async function getProblemset(setId) {
  const data = await apiClient(`/api/problemsets/${setId}`)
  if (data && data.problemset) return data.problemset
  return data
}

/**
 * 문제집에 포함된 문제 목록 조회
 * GET /api/problemsets/:setId/problems
 * @param {number|string} setId
 * @returns {Promise<Array>}
 */
export async function getProblemsetProblems(setId) {
  const data = await apiClient(`/api/problemsets/${setId}/problems`)
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.problems)) return data.problems
  return []
}
