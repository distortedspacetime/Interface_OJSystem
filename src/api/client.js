// API 클라이언트 공통 설정 및 요청 함수
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * 공통 fetch 요청 래퍼
 * @param {string} endpoint - API 경로 (예: '/api/problems')
 * @param {RequestInit} [options] - fetch 옵션
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)

    // 응답 상태가 정상이 아닐 때
    if (!response.ok) {
      let errorMessage = `HTTP 오류 (${response.status})`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        const text = await response.text()
        if (text) errorMessage = text
      }

      if (response.status === 404) {
        throw new Error(`요청한 리소스를 찾을 수 없습니다 (404 Not Found): ${endpoint}`)
      } else if (response.status === 400) {
        throw new Error(`잘못된 요청입니다 (400 Bad Request): ${errorMessage}`)
      } else if (response.status >= 500) {
        throw new Error(`서버 내부 오류가 발생했습니다 (${response.status}): ${errorMessage}`)
      } else {
        throw new Error(errorMessage)
      }
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`백엔드 서버(${API_BASE_URL})에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.`)
    }
    throw error
  }
}

