package executor

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"judge_server/internal/model"
	"os/exec"
	"strings"
	"time"
)

type Executor struct {
}

func New() *Executor {
	return &Executor{}
}

func (e *Executor) Execute(request model.ExecuteRequest) (model.ExecuteResult, error) {
	if request.Command == "" {
		return model.ExecuteResult{}, fmt.Errorf("execution command is empty")
	}
	if request.TimeLimit <= 0 {
		return model.ExecuteResult{}, fmt.Errorf("time limit must be greater than zero")
	}
	if request.ContainerID == "" {
		return model.ExecuteResult{}, fmt.Errorf("no container ID")
	}
	//timer set
	// Docker CLI의 비정상적인 지연을 방지하기 위한 제한 시간.
	// 실제 사용자 프로그램의 TLE는 컨테이너 내부 timeout이 관리한다.
	dockerTimeout := request.TimeLimit + 10*time.Second

	if dockerTimeout < 10*time.Second {
		dockerTimeout = 10 * time.Second
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		dockerTimeout,
	)
	defer cancel()

	args := []string{
		"exec",
		"-i",
	}

	// 컨테이너 내부 작업 디렉터리 설정.
	if request.WorkDir != "" {
		args = append(args, "-w", request.WorkDir)
	}

	args = append(
		args,
		request.ContainerID,
		"timeout",
		"-k", "1s",
		request.TimeLimit.String(),
		fmt.Sprintf("%.9fs", request.TimeLimit.Seconds()),
		request.Command,
	)

	args = append(args, request.Args...)

	cmd := exec.CommandContext(
		ctx,
		"docker",
		args...,
	)

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	cmd.Stdin = strings.NewReader(request.Stdin)
	cmd.Dir = request.WorkDir

	start := time.Now()
	runErr := cmd.Run()
	duration := time.Since(start)

	result := model.ExecuteResult{
		Stdout:    stdout.String(),
		Stderr:    stderr.String(),
		ExitCode:  0,
		OOMKilled: false,
		TimeOut:   false,
		Duration:  duration,
	}

	// Go Context의 제한 시간이 초과된 경우.
	// Docker CLI 실행에 문제가 발생한 것으로 처리한다.
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		result.ExitCode = -1

		return result, fmt.Errorf(
			"docker exec exceeded safety timeout: %w",
			ctx.Err(),
		)
	}

	if runErr != nil {
		var exitErr *exec.ExitError

		if errors.As(runErr, &exitErr) {
			result.ExitCode = exitErr.ExitCode()

			// GNU timeout의 일반적인 시간 초과 종료 코드.
			if result.ExitCode == 124 {
				result.TimeOut = true
			}

			// 사용자 프로그램의 비정상 종료도
			// ExecuteResult로 반환한다.
			return result, nil
		}

		// 프로세스 시작 실패 등 실행기 자체의 오류.
		return result, fmt.Errorf(
			"failed to execute docker command: %w",
			runErr,
		)
	}

	return result, nil
}
