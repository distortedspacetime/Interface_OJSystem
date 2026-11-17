# 내 제출 UI 연결 안내

- 실제 화면 진입: 사용자 조회 후 상단 **내 제출** 메뉴. 그룹을 고르기 전에도 접근할 수 있습니다.
- API/백엔드 및 `src/api/*` 파일은 변경하지 않았습니다.
- 현재 App은 접속 중 실제로 제출한 결과만 사용자 ID별 메모리 상태에 모읍니다. 페이지 새로고침 시 초기화됩니다. 과거 기록은 아직 조회하지 않습니다.
- 대기 중인 기록은 목록을 열 때 기존 `subscribeToSubmission`으로 결과를 이어서 받습니다. 기존 제출 API/SSE를 재사용합니다.
- `SubmissionList`는 요청을 보내지 않는 데이터 표시 컴포넌트입니다. API 담당자가 응답을 아래 props로 연결하면 됩니다. 현재 검색/필터/10건씩 페이지 이동은 전달받은 전체 배열에 적용됩니다. 서버 페이지 결과만 넘길 경우 전체 검색/전체 페이지로 동작하지 않으므로 서버 페이지 방식 연동 시 제어 props를 확장해야 합니다.

```jsx
<SubmissionList
  username={user.username}
  submissions={rows}
  loading={loading}
  error={errorMessage}
  onRefresh={reload}
  onOpenProblem={openProblem}
/>
```

각 항목의 필드:

```js
{
  submissionId: 123,
  problemId: 1,
  title: 'A+B',
  language: 'C++', // C, C++, Java, Python
  result: 'AC', // PENDING, JUDGING, AC, WA, CE, TLE, MLE, RE, OLE, JE
  submittedAt: '2026-11-17T05:30:00.000Z', // 시간대 포함 ISO 8601 권장
}
```

제출 시각은 브라우저의 현지 시간으로 표시합니다. `submissionId`는 항목별 고유해야 하며 최신순 ID로 정렬합니다. 소스 코드·실행시간·메모리 사용량은 이 UI에서 요구하지 않습니다. 미지원 결과 코드는 배지에 받은 값 그대로 표시합니다.

## UI 미리보기

`npm run dev` 후 `/submissions-preview.html`에 접속합니다. 샘플 24건으로 결과/언어 필터, 검색, 3페이지 이동, 빈 목록, 로딩, 오류/재시도를 확인할 수 있습니다. `/submissions-preview.html?width=375`로 모바일도 확인할 수 있습니다. 이 페이지는 예시 데이터임을 표시하고 API를 호출하지 않으며 일반 앱 빌드 진입점에는 포함되지 않습니다.