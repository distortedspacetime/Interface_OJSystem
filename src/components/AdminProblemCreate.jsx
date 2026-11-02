import { useState } from 'react'
import { createProblem } from '../api/problemApi'

export default function AdminProblemCreate({ onProblemCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    inputDescription: '',
    outputDescription: '',
    timeLimit: 1000,
    memoryLimit: 128,
    outputLimit: 512,
    groupId: 1,
  })

  const [submitting, setSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState(null)
  const [isError, setIsError] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'timeLimit' || name === 'memoryLimit' || name === 'outputLimit' || name === 'groupId'
        ? Number(value)
        : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('문제 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setResultMessage(null)
    setIsError(false)

    try {
      const response = await createProblem(formData)
      setIsError(false)
      setResultMessage(
        `문제 등록 성공! 등록된 문제 번호: ${response.problemId || response.id || '등록 완료'}`
      )
      if (onProblemCreated) onProblemCreated()
    } catch (err) {
      setIsError(true)
      setResultMessage(`문제 등록 실패: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2>문제 등록</h2>
      <p>[안내] 현재 로그인 및 관리자 인증은 생략되어 있습니다.</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">문제 제목: </label>
          <input
            type="text"
            id="title"
            name="title"
            size="50"
            value={formData.title}
            onChange={handleChange}
            placeholder="예: 두 수의 합 구하기"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="groupId">소속 그룹 ID: </label>
          <input
            type="number"
            id="groupId"
            name="groupId"
            value={formData.groupId}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <label htmlFor="timeLimit">시간 제한 (ms): </label>
          <input
            type="number"
            id="timeLimit"
            name="timeLimit"
            value={formData.timeLimit}
            onChange={handleChange}
          />
          {' | '}
          <label htmlFor="memoryLimit">메모리 제한 (MB): </label>
          <input
            type="number"
            id="memoryLimit"
            name="memoryLimit"
            value={formData.memoryLimit}
            onChange={handleChange}
          />
          {' | '}
          <label htmlFor="outputLimit">출력 제한 (KB): </label>
          <input
            type="number"
            id="outputLimit"
            name="outputLimit"
            value={formData.outputLimit}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <label htmlFor="description">문제 설명:</label>
          <br />
          <textarea
            id="description"
            name="description"
            rows="6"
            cols="80"
            value={formData.description}
            onChange={handleChange}
            placeholder="문제의 본문 설명을 입력하세요."
          />
        </div>

        <br />

        <div>
          <label htmlFor="inputDescription">입력 설명:</label>
          <br />
          <textarea
            id="inputDescription"
            name="inputDescription"
            rows="4"
            cols="80"
            value={formData.inputDescription}
            onChange={handleChange}
            placeholder="입력 형식 및 제한 조건을 입력하세요."
          />
        </div>

        <br />

        <div>
          <label htmlFor="outputDescription">출력 설명:</label>
          <br />
          <textarea
            id="outputDescription"
            name="outputDescription"
            rows="4"
            cols="80"
            value={formData.outputDescription}
            onChange={handleChange}
            placeholder="출력 형식 및 답안 형식을 입력하세요."
          />
        </div>

        <br />

        <button type="submit" disabled={submitting}>
          {submitting ? '문제 등록 요청 중...' : '새 문제 등록하기'}
        </button>
      </form>

      {resultMessage && (
        <div>
          <h3>등록 처리 결과</h3>
          <p>{isError ? `[오류] ${resultMessage}` : `[성공] ${resultMessage}`}</p>
        </div>
      )}
    </section>
  )
}
