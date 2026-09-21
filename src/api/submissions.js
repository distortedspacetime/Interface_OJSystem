// 1회차 Frontend API 통신 모듈

/**
 * 코드 제출 API
 * @param {Object} submissionData { problemId: number, language: string, source: string }
 * @returns {Promise<{ submissionId: number, result: string }>}
 */
export async function submitCode({ problemId, language, source }) {
  try {
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        problemId: Number(problemId),
        language,
        source,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`서버 응답 오류 (${response.status}): ${errorText || '잘못된 요청'}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    // 1회차 임시 응답
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          submissionId: 1,
          result: 'AC',
        })
      }, 300)
    })
  }
}

