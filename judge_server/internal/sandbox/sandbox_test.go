package sandbox

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"judge_server/internal/model"
)

// Create가 만드는 작업 폴더를 테스트용 임시 디렉터리에 격리한다.
func useTempWorkingDir(t *testing.T) {
	t.Helper()

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}

	tempDir := t.TempDir()

	if err := os.Chdir(tempDir); err != nil {
		t.Fatal(err)
	}

	// t.TempDir의 삭제보다 먼저 원래 위치로 돌아간다.
	t.Cleanup(func() {
		if err := os.Chdir(originalDir); err != nil {
			t.Errorf("restore working directory: %v", err)
		}
	})
}

func TestSandboxLifecycle(t *testing.T) {
	useTempWorkingDir(t)

	tests := []struct {
		name        string
		submission  int
		command     string
		args        []string
		timeout     time.Duration
		wantOutput  string
		wantTimeout bool
	}{
		{
			name:       "normal",
			submission: 1,
			command:    "cat",
			timeout:    10 * time.Second,
			wantOutput: "hello sandbox\n",
		},
		{
			name:        "timeout",
			submission:  2,
			command:     "sleep",
			args:        []string{"30"},
			timeout:     3 * time.Second,
			wantTimeout: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sb := New()

			result, err := sb.Create(model.SandboxRequest{
				SubmissionID:   tc.submission,
				Language:       "C",
				MemoryLimitsMb: 64,
				ProcessLimits:  16,
				Command:        tc.command,
				Args:           tc.args,
			})
			if err != nil {
				t.Fatalf("Create: %v", err)
			}

			id := result.ContainerId
			if id == "" {
				t.Fatal("Create returned an empty container ID")
			}

			// 중간에 테스트가 실패해도 컨테이너를 정리한다.
			removed := false
			t.Cleanup(func() {
				if !removed {
					if err := sb.Cleanup(id); err != nil {
						t.Errorf("fallback Cleanup: %v", err)
					}
				}
			})

			state, err := sb.Inspect(id)
			if err != nil {
				t.Fatalf("Inspect before start: %v", err)
			}
			if state.Running {
				t.Fatal("container is running before start")
			}

			ctx, cancel := context.WithTimeout(
				context.Background(), tc.timeout,
			)
			defer cancel()

			cmd := sb.BuildStartCommand(ctx, id)

			var stdout, stderr bytes.Buffer
			cmd.Stdout = &stdout
			cmd.Stderr = &stderr

			if !tc.wantTimeout {
				cmd.Stdin = strings.NewReader(tc.wantOutput)
			}

			runErr := cmd.Run()

			if tc.wantTimeout {
				if ctx.Err() != context.DeadlineExceeded {
					t.Fatalf(
						"expected timeout; runErr=%v stderr=%q",
						runErr, stderr.String(),
					)
				}

				// 시작 자체가 지연된 것을 실행 시간 초과로 착각하지 않도록 확인.
				state, err = sb.Inspect(id)
				if err != nil {
					t.Fatalf("Inspect after timeout: %v", err)
				}
				if !state.Running {
					t.Fatalf(
						"expected sleep container to remain running; state=%+v",
						state,
					)
				}

				if err := sb.Kill(id); err != nil {
					t.Fatalf("Kill: %v", err)
				}
			} else {
				if runErr != nil {
					t.Fatalf(
						"Run: %v stderr=%q",
						runErr, stderr.String(),
					)
				}
				if stdout.String() != tc.wantOutput {
					t.Fatalf(
						"stdout=%q, want %q",
						stdout.String(), tc.wantOutput,
					)
				}
			}

			state, err = sb.Inspect(id)
			if err != nil {
				t.Fatalf("Inspect after execution: %v", err)
			}
			if state.Running {
				t.Fatal("container is still running")
			}
			if state.OOMKilled || state.Error != "" {
				t.Fatalf("unexpected container state: %+v", state)
			}
			if !tc.wantTimeout && state.ExitCode != 0 {
				t.Fatalf("unexpected exit code: %d", state.ExitCode)
			}

			t.Logf(
				"Running=%v ExitCode=%d OOMKilled=%v",
				state.Running, state.ExitCode, state.OOMKilled,
			)

			if err := sb.Cleanup(id); err != nil {
				t.Fatalf("Cleanup: %v", err)
			}
			removed = true

			// Docker 조회가 정상 동작하면서 해당 컨테이너가 사라졌는지 확인.
			checkCtx, checkCancel := context.WithTimeout(
				context.Background(), 5*time.Second,
			)
			defer checkCancel()

			output, err := exec.CommandContext(
				checkCtx,
				"docker", "container", "ls",
				"-a", "-q", "--no-trunc",
				"--filter", "id="+id,
			).Output()
			if err != nil {
				t.Fatalf("check removal: %v", err)
			}
			if strings.TrimSpace(string(output)) != "" {
				t.Fatalf("container remains after Cleanup: %s", output)
			}
		})
	}
}

func TestSandboxMemoryLimit(t *testing.T) {
	useTempWorkingDir(t)

	const submissionID = 3

	sb := New()

	// 실제 Sandbox와 동일하게 64MB 제한 컨테이너를 생성한다.
	result, err := sb.Create(model.SandboxRequest{
		SubmissionID:   submissionID,
		Language:       "C",
		MemoryLimitsMb: 64,
		ProcessLimits:  16,
		Command:        "./memory_test",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	id := result.ContainerId
	if id == "" {
		t.Fatal("Create returned an empty container ID")
	}

	removed := false
	t.Cleanup(func() {
		if !removed {
			if err := sb.Cleanup(id); err != nil {
				t.Errorf("fallback Cleanup: %v", err)
			}
		}
	})

	// Create()가 실제로 사용하는 것과 동일한 작업 디렉터리.
	// 테스트에서는 useTempWorkingDir() 때문에 TempDir/sandboxs/3이 된다.
	workDir, err := filepath.Abs(
		filepath.Join("sandboxs", strconv.Itoa(submissionID)),
	)
	if err != nil {
		t.Fatalf("resolve sandbox path: %v", err)
	}

	// 64MB 제한을 확실히 넘기기 위해 256MB를 할당하고
	// 각 메모리 페이지에 실제로 접근한다.
	source := `
#include <stdlib.h>
#include <stddef.h>

int main(void) {
    size_t size = 256 * 1024 * 1024;

    volatile char *memory = malloc(size);
    if (memory == NULL) {
        return 1;
    }

    for (size_t i = 0; i < size; i += 4096) {
        memory[i] = 1;
    }

    free((void *)memory);
    return 0;
}
`

	sourcePath := filepath.Join(workDir, "memory_test.c")

	if err := os.WriteFile(sourcePath, []byte(source), 0644); err != nil {
		t.Fatalf("write memory test source: %v", err)
	}

	// Windows에서 직접 gcc로 컴파일하면 Windows 실행 파일이 되므로,
	// gcc:14 컨테이너에서 Linux 바이너리를 만든다.
	compileCtx, compileCancel := context.WithTimeout(
		context.Background(),
		30*time.Second,
	)
	defer compileCancel()

	compileCmd := exec.CommandContext(
		compileCtx,
		"docker", "run", "--rm",
		"--mount", "type=bind,src="+workDir+",dst=/work",
		"--workdir", "/work",
		"gcc:14",
		"gcc", "memory_test.c", "-o", "memory_test",
	)

	var compileStderr bytes.Buffer
	compileCmd.Stderr = &compileStderr

	if err := compileCmd.Run(); err != nil {
		t.Fatalf(
			"compile memory test: %v stderr=%q",
			err,
			compileStderr.String(),
		)
	}

	// 컴파일된 파일이 Sandbox의 bind mount 대상 안에 있는지 확인한다.
	binaryPath := filepath.Join(workDir, "memory_test")
	if _, err := os.Stat(binaryPath); err != nil {
		t.Fatalf("memory test binary not found: %v", err)
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	cmd := sb.BuildStartCommand(ctx, id)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	runErr := cmd.Run()

	// OOM이 아니라 테스트 timeout으로 끝났으면 실패.
	if ctx.Err() == context.DeadlineExceeded {
		t.Fatal("container did not hit memory limit before timeout")
	}

	state, err := sb.Inspect(id)
	if err != nil {
		t.Fatalf("Inspect: %v", err)
	}

	t.Logf(
		"runErr=%v Running=%v ExitCode=%d OOMKilled=%v Error=%q",
		runErr,
		state.Running,
		state.ExitCode,
		state.OOMKilled,
		state.Error,
	)

	if state.Running {
		t.Fatal("container is still running")
	}

	if !state.OOMKilled {
		t.Fatalf(
			"expected OOMKilled=true; ExitCode=%d Error=%q stderr=%q",
			state.ExitCode,
			state.Error,
			stderr.String(),
		)
	}

	if state.ExitCode != 137 {
		t.Fatalf(
			"expected exit code 137, got %d",
			state.ExitCode,
		)
	}

	if err := sb.Cleanup(id); err != nil {
		t.Fatalf("Cleanup: %v", err)
	}
	removed = true
}

func TestSandboxProcessLimit(t *testing.T) {
	useTempWorkingDir(t)

	const submissionID = 4

	sb := New()

	result, err := sb.Create(model.SandboxRequest{
		SubmissionID:   submissionID,
		Language:       "C",
		MemoryLimitsMb: 64,
		ProcessLimits:  16,
		Command:        "./process_test",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	id := result.ContainerId
	if id == "" {
		t.Fatal("Create returned an empty container ID")
	}

	removed := false
	t.Cleanup(func() {
		if !removed {
			if err := sb.Cleanup(id); err != nil {
				t.Errorf("fallback Cleanup: %v", err)
			}
		}
	})

	workDir, err := filepath.Abs(
		filepath.Join("sandboxs", strconv.Itoa(submissionID)),
	)
	if err != nil {
		t.Fatalf("resolve sandbox path: %v", err)
	}

	source := `
#include <errno.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>

int main(void) {
    for (int i = 0; i < 64; i++) {
        pid_t pid = fork();

        if (pid < 0) {
            // pids-limit에 걸린 경우 일반적으로 EAGAIN이 발생한다.
            if (errno == EAGAIN) {
                return 0;
            }

            return 2;
        }

        if (pid == 0) {
            // 생성된 자식 프로세스가 바로 종료되면
            // PID 슬롯이 다시 비므로 일정 시간 유지한다.
            sleep(30);
            _exit(0);
        }
    }

    // 64개를 모두 만들었다면 ProcessLimits가 적용되지 않은 것.
    return 1;
}
`

	sourcePath := filepath.Join(workDir, "process_test.c")

	if err := os.WriteFile(sourcePath, []byte(source), 0644); err != nil {
		t.Fatalf("write process test source: %v", err)
	}

	compileCtx, compileCancel := context.WithTimeout(
		context.Background(),
		30*time.Second,
	)
	defer compileCancel()

	compileCmd := exec.CommandContext(
		compileCtx,
		"docker", "run", "--rm",
		"--mount", "type=bind,src="+workDir+",dst=/work",
		"--workdir", "/work",
		"gcc:14",
		"gcc", "process_test.c", "-o", "process_test",
	)

	var compileStderr bytes.Buffer
	compileCmd.Stderr = &compileStderr

	if err := compileCmd.Run(); err != nil {
		t.Fatalf(
			"compile process test: %v stderr=%q",
			err,
			compileStderr.String(),
		)
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	cmd := sb.BuildStartCommand(ctx, id)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	runErr := cmd.Run()

	if ctx.Err() == context.DeadlineExceeded {
		t.Fatal("process limit test timed out")
	}

	state, err := sb.Inspect(id)
	if err != nil {
		t.Fatalf("Inspect: %v", err)
	}

	t.Logf(
		"runErr=%v Running=%v ExitCode=%d OOMKilled=%v Error=%q",
		runErr,
		state.Running,
		state.ExitCode,
		state.OOMKilled,
		state.Error,
	)

	if state.Running {
		t.Fatal("container is still running")
	}

	// 프로그램은 PID 제한에 걸렸을 때 exit 0으로 종료하도록 작성했다.
	if state.ExitCode != 0 {
		t.Fatalf(
			"process limit was not detected; ExitCode=%d stderr=%q",
			state.ExitCode,
			stderr.String(),
		)
	}

	if state.OOMKilled {
		t.Fatal("process limit test was unexpectedly OOM killed")
	}

	if err := sb.Cleanup(id); err != nil {
		t.Fatalf("Cleanup: %v", err)
	}
	removed = true
}

func TestSandboxNetworkIsolation(t *testing.T) {
	useTempWorkingDir(t)

	sb := New()

	result, err := sb.Create(model.SandboxRequest{
		SubmissionID:   5,
		Language:       "C",
		MemoryLimitsMb: 64,
		ProcessLimits:  16,
		Command:        "sh",
		Args: []string{
			"-c",
			"ls -1 /sys/class/net",
		},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	id := result.ContainerId
	if id == "" {
		t.Fatal("Create returned an empty container ID")
	}

	removed := false
	t.Cleanup(func() {
		if !removed {
			if err := sb.Cleanup(id); err != nil {
				t.Errorf("fallback Cleanup: %v", err)
			}
		}
	})

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	cmd := sb.BuildStartCommand(ctx, id)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	runErr := cmd.Run()

	if ctx.Err() == context.DeadlineExceeded {
		t.Fatal("network isolation test timed out")
	}

	if runErr != nil {
		t.Fatalf(
			"Run: %v stderr=%q",
			runErr,
			stderr.String(),
		)
	}

	state, err := sb.Inspect(id)
	if err != nil {
		t.Fatalf("Inspect: %v", err)
	}

	interfaces := strings.Fields(stdout.String())

	t.Logf(
		"interfaces=%v Running=%v ExitCode=%d OOMKilled=%v",
		interfaces,
		state.Running,
		state.ExitCode,
		state.OOMKilled,
	)

	if state.Running {
		t.Fatal("container is still running")
	}

	if state.ExitCode != 0 {
		t.Fatalf(
			"unexpected exit code: %d",
			state.ExitCode,
		)
	}

	// --network none 컨테이너에는 loopback 인터페이스만 있어야 한다.
	if len(interfaces) != 1 || interfaces[0] != "lo" {
		t.Fatalf(
			"unexpected network interfaces: %v",
			interfaces,
		)
	}

	if err := sb.Cleanup(id); err != nil {
		t.Fatalf("Cleanup: %v", err)
	}
	removed = true
}
