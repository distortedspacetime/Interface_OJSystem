package worker

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

// 문제별 실행 제한 설정
type limits struct {
	TimeLimitMs   int `json:"timeLimitMs"`
	MemoryLimitMb int `json:"memoryLimitMb"`
	OutputLimitKb int `json:"outputLimitKb"`
}

// loadLimits는 문제의 limits.json을 읽어 실행 제한을 반환한다.
func loadLimits(problemRoot string) (limits, error) {
	data, err := os.ReadFile(
		filepath.Join(problemRoot, "limits", "limits.json"),
	)
	if err != nil {
		return limits{}, err
	}

	var result limits

	if err := json.Unmarshal(data, &result); err != nil {
		return limits{}, err
	}

	return result, nil
}

// countTestCases는 input 디렉터리에 존재하는 파일 개수를 반환한다.
func countTestCases(problemRoot string) (int, error) {
	entries, err := os.ReadDir(
		filepath.Join(problemRoot, "input"),
	)
	if err != nil {
		return 0, err
	}

	count := 0

	for _, entry := range entries {
		if !entry.IsDir() {
			count++
		}
	}

	return count, nil
}

// readTestCaseInput은 지정된 테스트케이스의 입력 파일을 읽는다.
func readTestCaseInput(
	problemRoot string,
	testCaseID int,
) ([]byte, error) {

	path := filepath.Join(
		problemRoot,
		"input",
		strconv.Itoa(testCaseID),
	)

	input, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf(
			"cannot find input testcase %d: %w",
			testCaseID,
			err,
		)
	}

	return input, nil
}
