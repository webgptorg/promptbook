import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { spaceTrim } from 'spacetrim';
import { formatUnknownErrorDetails } from '../formatUnknownErrorDetails';
import { toPosixPath } from './toPosixPath';

/**
 * Environment variable read by the shell wrapper to tee live output into the temporary runtime log file.
 */
export const PTBK_CODER_LOG_FILE_ENV_NAME = 'PTBK_CODER_LOG_FILE';

/**
 * Log line which separates the raw script input from the raw script output of one execution section.
 *
 * Readers of a runtime log split on this marker to look only at what the harness really produced,
 * without the generated script and the prompt it embeds.
 */
export const SCRIPT_EXECUTION_LOG_RAW_OUTPUT_MARKER = '--- raw output ---';

/**
 * Command which terminates the Bash process tree rooted at the running harness.
 *
 * Bash's POSIX process IDs differ from Windows process IDs in Git Bash, so the Windows branch resolves the native PID
 * before delegating to `taskkill`. Unix harnesses run in a dedicated Bash job process group, which can be terminated
 * with its negative process ID.
 */
const TERMINATE_BASH_PROCESS_TREE_COMMAND =
    process.platform === 'win32'
        ? spaceTrim(`
              HARNESS_WINDOWS_PROCESS_ID="$(ps -l -p "$HARNESS_PROCESS_ID" | awk 'NR == 2 { print $4 }')"
              if [ -n "$HARNESS_WINDOWS_PROCESS_ID" ]; then
                  MSYS_NO_PATHCONV=1 taskkill.exe /PID "$HARNESS_WINDOWS_PROCESS_ID" /T /F > /dev/null 2>&1 || true
              fi
          `)
        : spaceTrim(`
              kill -TERM -- "-$HARNESS_PROCESS_ID" 2>/dev/null || true
              # Wait for cooperative descendants, then stop only this owned group if any writer remains.
              for TERMINATION_ATTEMPT in {1..20}; do
                  if ! kill -0 -- "-$HARNESS_PROCESS_ID" 2>/dev/null; then break; fi
                  sleep 0.01
              done
              kill -KILL -- "-$HARNESS_PROCESS_ID" 2>/dev/null || true
          `);

/**
 * Shell condition that detects whether the Node process which owns the harness is still running.
 *
 * Git Bash translates process IDs and command switches, so querying the native Windows PID needs both `tasklist` and
 * disabled MSYS path conversion there. Unix can use the native `kill -0` process existence check.
 */
const IS_PARENT_PROCESS_RUNNING_CONDITION =
    process.platform === 'win32'
        ? 'MSYS_NO_PATHCONV=1 tasklist.exe /FI "PID eq $PARENT_CODER_PROCESS_ID" /NH | awk -v processId="$PARENT_CODER_PROCESS_ID" \'$2 == processId { isFound = 1 } END { exit isFound ? 0 : 1 }\''
        : 'kill -0 "$PARENT_CODER_PROCESS_ID" 2>/dev/null';

/**
 * Environment variable that identifies the Node process responsible for a temporary harness shell.
 */
export const PTBK_CODER_PARENT_PROCESS_ID_ENV_NAME = 'PTBK_CODER_PARENT_PROCESS_ID';
/** Private stdin command asks the owning wrapper to stop its actual harness job before exiting. */
export const PTBK_CODER_CANCEL_COMMAND = 'PTBK_CANCEL_OWNED_HARNESS';

/**
 * Small bash wrapper that preserves stdout/stderr streams while teeing both into the runtime log file.
 *
 * A watcher polls the owning Node process by its PID. If that process exits abruptly, the watcher stops the whole
 * Bash and harness process tree instead of letting it continue as an orphan.
 */
const LOGGED_BASH_WRAPPER_COMMAND = spaceTrim(`
    PARENT_CODER_PROCESS_ID="\${${PTBK_CODER_PARENT_PROCESS_ID_ENV_NAME}}"
    unset ${PTBK_CODER_PARENT_PROCESS_ID_ENV_NAME}

    terminate_harness_process_tree() {
        # Keep the EXIT cleanup intact so the wrapper can also stop its parent-process watcher.
        trap - HUP INT TERM
        ${TERMINATE_BASH_PROCESS_TREE_COMMAND}
    }

    is_parent_process_running() {
        ${IS_PARENT_PROCESS_RUNNING_CONDITION}
    }

    if [ -n "\${${PTBK_CODER_LOG_FILE_ENV_NAME}:-}" ]; then
        exec > >(tee -a "$${PTBK_CODER_LOG_FILE_ENV_NAME}") 2> >(tee -a "$${PTBK_CODER_LOG_FILE_ENV_NAME}" >&2)
    fi

    watch_parent_process() {
        trap 'exit 0' HUP INT TERM

        while is_parent_process_running; do
            sleep 1
        done

        terminate_harness_process_tree
    }

    # Background harness jobs need their own process group on Unix so termination cannot reach the parent coder.
    set -m
    if ! is_parent_process_running; then
        exit 1
    fi
    bash "$1" &
    HARNESS_PROCESS_ID=$!

    # Windows can lose forked MSYS children when taskkill targets the launcher. Let their owner stop them first.
    # Preserve the control pipe explicitly because background Bash jobs otherwise read from /dev/null.
    exec 3<&0
    watch_control_input() {
        # Timed reads also let this helper finish when a short-lived harness has already exited.
        while kill -0 "$HARNESS_PROCESS_ID" 2>/dev/null; do
            IFS= read -r -t 1 CONTROL_COMMAND <&3
            CONTROL_READ_STATUS=$?
            if [ "$CONTROL_READ_STATUS" = "0" ]; then
                if [ "$CONTROL_COMMAND" = "${PTBK_CODER_CANCEL_COMMAND}" ]; then
                    terminate_harness_process_tree
                fi
                return
            fi
            if [ "$CONTROL_READ_STATUS" = "1" ]; then return; fi
        done
    }
    watch_control_input &
    CONTROL_INPUT_WATCHER_PID=$!

    cleanup_parent_process_watcher() {
        # A successful check may leave background writers with redirected output. Stop only its owned group
        # before the wrapper closes, so a following Git snapshot observes the command's final content.
        terminate_harness_process_tree
        # MSYS can defer TERM while a builtin read waits on a Windows pipe.
        kill -KILL "$CONTROL_INPUT_WATCHER_PID" 2>/dev/null || true
        kill "$PARENT_PROCESS_WATCHER_PID" 2>/dev/null || true
        wait "$CONTROL_INPUT_WATCHER_PID" 2>/dev/null || true
        wait "$PARENT_PROCESS_WATCHER_PID" 2>/dev/null || true
    }

    watch_parent_process &
    PARENT_PROCESS_WATCHER_PID=$!

    trap cleanup_parent_process_watcher EXIT
    trap terminate_harness_process_tree HUP INT TERM

    wait "$HARNESS_PROCESS_ID"
    SCRIPT_EXIT_CODE=$?
    exit "$SCRIPT_EXIT_CODE"
`);

/**
 * Shapes one bash invocation that optionally mirrors live script output into a temporary log file.
 */
export function buildLoggedBashExecution(
    scriptPath: string,
    logPath?: string,
): {
    args: string[];
    env?: Record<string, string>;
} {
    return {
        args: ['-lc', LOGGED_BASH_WRAPPER_COMMAND, 'ptbk-coder-temp-script', toPosixPath(scriptPath)],
        env: logPath ? { [PTBK_CODER_LOG_FILE_ENV_NAME]: toPosixPath(logPath) } : undefined,
    };
}

/**
 * Appends one execution-start section with the raw script input before the shell begins producing output.
 */
export async function appendScriptExecutionLogStart({
    scriptPath,
    scriptContent,
    logPath,
}: {
    scriptPath: string;
    scriptContent: string;
    logPath?: string;
}): Promise<void> {
    if (!logPath) {
        return;
    }

    await mkdir(dirname(logPath), { recursive: true });

    const scriptKind = describeTempScriptKind(scriptPath);
    const normalizedInput = scriptContent.replace(/\r\n/g, '\n').trimEnd();
    const logSection = spaceTrim(
        (block) => `
            === ${scriptKind} started at ${new Date().toISOString()} ===
            Script path: ${toPosixPath(scriptPath)}

            --- raw input ---
            ${block(normalizedInput)}

            ${SCRIPT_EXECUTION_LOG_RAW_OUTPUT_MARKER}
        `,
    );

    await appendFile(logPath, `${logSection}\n`, 'utf-8');
}

/**
 * Appends one execution-finish section after the shell settles.
 */
export async function appendScriptExecutionLogFinish({
    scriptPath,
    logPath,
    status,
    details,
}: {
    scriptPath: string;
    logPath?: string;
    status: string;
    details?: unknown;
}): Promise<void> {
    if (!logPath) {
        return;
    }

    const scriptKind = describeTempScriptKind(scriptPath);
    const logLines = ['', `=== ${scriptKind} finished at ${new Date().toISOString()} ===`, `Status: ${status}`];

    if (details !== undefined) {
        logLines.push('');
        logLines.push('--- details ---');
        logLines.push(formatUnknownErrorDetails(details));
    }

    logLines.push('');
    await appendFile(logPath, `${logLines.join('\n')}\n`, 'utf-8');
}

/**
 * Distinguishes prompt-runner, current aggregate-check and historical aggregate-test shells in the shared runtime log.
 */
function describeTempScriptKind(scriptPath: string): 'runner shell' | 'check shell' | 'test shell' {
    const normalizedScriptPath = scriptPath.toLowerCase();
    // Keep `.test.sh` readable in historical runtime logs; new check scripts use `.check.sh`.
    if (normalizedScriptPath.endsWith('.test.sh')) {
        return 'test shell';
    }

    return normalizedScriptPath.endsWith('.check.sh') ? 'check shell' : 'runner shell';
}
