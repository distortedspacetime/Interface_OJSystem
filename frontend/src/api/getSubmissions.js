export async function getSubmissions(userId, signal) {
  const query = new URLSearchParams({ userId: String(userId) })
  const response = await fetch(`/api/submissions?${query}`, { signal })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || '제출 목록을 불러오지 못했습니다.')
  }
  if (!Array.isArray(data?.submissions)) {
    throw new Error('서버 응답 형식이 올바르지 않습니다.')
  }
  return data.submissions
}
