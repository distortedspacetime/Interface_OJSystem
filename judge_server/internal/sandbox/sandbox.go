package sandbox

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"judge_server/internal/model"
)

type Sandbox struct{}
type SandboxState struct {
	Running   bool   `json:"Running"`
	ExitCode  int    `json:"ExitCode"`
	OOMKilled bool   `json:"OOMKilled"`
	Error     string `json:"Error"`
}

func New() *Sandbox {
	return &Sandbox{}
}

func (s *Sandbox) Create(request model.SandboxRequest) (model.SandboxResult, error) {
	languageMap := map[string]string{
		"C":      "gcc:14",
		"C++":    "gcc:14",
		"Java":   "eclipse-temurin:21-jdk",
		"python": "python:3.12-slim",
	}

	image, ok := languageMap[request.Language]
	if !ok {
		return model.SandboxResult{}, fmt.Errorf(
			"unsupported language: %s", request.Language,
		)
	}

	if request.Command == "" {
		return model.SandboxResult{}, fmt.Errorf("sandbox command is empty")
	}

	if request.MemoryLimitsMb <= 0 || request.ProcessLimits <= 0 {
		return model.SandboxResult{}, fmt.Errorf("sandbox limits must be positive")
	}

	// judge_server에서 실행한다는 전제로 제출별 절대 경로를 만든다.
	workDir, err := filepath.Abs(
		filepath.Join("sandboxs", strconv.Itoa(request.SubmissionID)),
	)
	if err != nil {
		return model.SandboxResult{}, fmt.Errorf("resolve sandbox path: %w", err)
	}

	if err := os.MkdirAll(workDir, 0755); err != nil {
		return model.SandboxResult{}, fmt.Errorf("create sandbox directory: %w", err)
	}

	memory := strconv.Itoa(request.MemoryLimitsMb) + "m"

	args := []string{
		"create",
		"-i",
		"--network", "none",
		"--memory", memory,
		"--memory-swap", memory,
		"--pids-limit", strconv.Itoa(request.ProcessLimits),
		"--mount", "type=bind,src=" + workDir + ",dst=/work",
		"--workdir", "/work",
		image,
		request.Command,
	}
	args = append(args, request.Args...)

	cmd := exec.Command("docker", args...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	output, err := cmd.Output()
	if err != nil {
		return model.SandboxResult{}, fmt.Errorf(
			"create sandbox: %w: %s",
			err,
			strings.TrimSpace(stderr.String()),
		)
	}

	return model.SandboxResult{
		ContainerId: strings.TrimSpace(string(output)),
	}, nil
}

// 실행 명령만 구성한다.
// 입력·출력 연결과 cmd.Run()은 Compiler 또는 Executor에서 담당한다.
func (s *Sandbox) BuildStartCommand(
	ctx context.Context,
	containerID string,
) *exec.Cmd {
	return exec.CommandContext(
		ctx,
		"docker", "start", "-a", "-i", containerID,
	)
}

// 컨테이너 상태를 JSON으로 받아 필요한 필드로 변환한다.
func (s *Sandbox) Inspect(containerID string) (SandboxState, error) {
	output, err := runControlCommand(
		"container", "inspect",
		"--format", "{{json .State}}",
		containerID,
	)
	if err != nil {
		return SandboxState{}, fmt.Errorf("inspect sandbox: %w", err)
	}

	var state SandboxState
	if err := json.Unmarshal(output, &state); err != nil {
		return SandboxState{}, fmt.Errorf("decode sandbox state: %w", err)
	}

	return state, nil
}

// 컨테이너를 강제 종료하되 상태 조회를 위해 삭제하지 않는다.
func (s *Sandbox) Kill(containerID string) error {
	_, err := runControlCommand("kill", containerID)
	if err == nil {
		return nil
	}

	// 종료 요청 직전에 프로그램이 스스로 끝난 경우도 확인한다.
	state, inspectErr := s.Inspect(containerID)
	if inspectErr == nil && !state.Running {
		return nil
	}

	return fmt.Errorf("kill sandbox: %w", err)
}

// 실행 중인 경우에도 강제 종료하고 컨테이너를 삭제한다.
// 호스트의 제출 작업 폴더는 삭제하지 않는다.
func (s *Sandbox) Cleanup(containerID string) error {
	_, err := runControlCommand("rm", "-f", containerID)
	if err != nil {
		return fmt.Errorf("cleanup sandbox: %w", err)
	}
	return nil
}

// 실행용 context가 취소돼도 조회·종료·삭제는 수행할 수 있도록
// 별도의 context와 관리 명령용 타임아웃을 사용한다.
func runControlCommand(args ...string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", args...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	output, err := cmd.Output()
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("docker control timeout: %w", ctx.Err())
		}
		return nil, fmt.Errorf(
			"docker control failed: %w: %s",
			err,
			strings.TrimSpace(stderr.String()),
		)
	}

	return output, nil
}
