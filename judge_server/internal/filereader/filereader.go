package filereader

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

type FileReader struct {
	problemDir string
}

type Limits struct {
	TimeLimitMs   int `json:"timeLimitMs"`
	MemoryLimitMb int `json:"memoryLimitMb"`
	OutputLimitKb int `json:"outputLimitKb"`
}

func problemDirBuild(root string) string {
	return filepath.Join(
		root,
		"data",
		"problems",
	)
}
func New(root string) *FileReader {
	return &FileReader{
		problemDir: problemDirBuild(root),
	}
}

func (p *FileReader) ReadTestcase(problemID int, idx int) (string, string, error) {

	inputPath := filepath.Join(p.problemDir, strconv.Itoa(problemID), "input", strconv.Itoa(idx))
	input, err := os.ReadFile(inputPath)
	if err != nil {
		return "", "", fmt.Errorf(
			"failed to read input for problem %d: %w",
			problemID,
			err,
		)
	}

	outputPath := filepath.Join(p.problemDir, strconv.Itoa(problemID), "output", strconv.Itoa(idx))
	expectedOutput, err := os.ReadFile(outputPath)

	if err != nil {
		return "", "", fmt.Errorf(
			"failed to read output for problem %d: %w",
			problemID,
			err,
		)
	}

	return string(input), string(expectedOutput), nil
}

func (p *FileReader) ReadLimits(problemID int) (Limits, error) {

	path := filepath.Join(
		p.problemDir,
		strconv.Itoa(problemID),
		"limits",
		"limits.json",
	)

	data, err := os.ReadFile(path)
	if err != nil {
		return Limits{}, fmt.Errorf(
			"failed to read limits for problem %d: %w",
			problemID,
			err,
		)
	}

	var limits Limits

	if err := json.Unmarshal(data, &limits); err != nil {
		return Limits{}, fmt.Errorf(
			"failed to decode limits for problem %d: %w",
			problemID,
			err,
		)
	}

	return limits, nil
}

func (p *FileReader) CountTestCases(problemID int) (int, error) {
	entries, err := os.ReadDir(
		filepath.Join(p.problemDir, "input", strconv.Itoa(problemID)),
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
