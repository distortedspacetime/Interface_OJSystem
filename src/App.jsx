import { useState } from 'react'
import { submitCode } from './api/submissions'
import './App.css'

// 1회차 고정 문제 정보
const PROBLEM = {
  id: 1,
  title: 'A+B',
  description: '두 정수를 입력받아 합을 출력하세요.',
}

const LANGUAGES = ['C', 'C++', 'Java', 'Python']

function App() {
  const [language, setLanguage] = useState('C++')
  const [source, setSource] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const responseData = await submitCode({
        problemId: PROBLEM.id,
        language,
        source,
      })
      setResult(responseData)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <header>
        <h1>Interface OJ</h1>
      </header>

      {/* 문제 정보 영역 */}
      <section>
        <h2>
          문제 {PROBLEM.id}.
        </h2>
        <h3>
          {PROBLEM.title}
        </h3>
        <p>{PROBLEM.description}</p>
      </section>

      {/* 제출 폼 영역 */}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="language">언어 선택 </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="source">소스 코드<br/></label>
          <textarea
            id="source"
            rows="10"
            placeholder="코드를 입력하세요"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? '제출 중...' : '제출'}
        </button>
      </form>

      {/* 결과 표시 영역 */}
      {result && (
        <section>
          <h2>제출 결과</h2>

          {result.error ? (
            <p style={{ color: 'red' }}>
              {result.error}
            </p>
          ) : (
            <div>
              <p>
                제출 ID (submissionId): {result.submissionId}
              </p>
              <p>
                결과 (result):{' '}
                <span>{result.result}</span>
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
