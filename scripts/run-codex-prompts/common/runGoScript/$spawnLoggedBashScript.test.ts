import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { $spawnLoggedBashScript } from './$spawnLoggedBashScript';
import { toPosixPath } from './toPosixPath';

/**
 * Maximum time allowed for the shell ownership watcher to stop the process tree.
 */
const PROCESS_TREE_TERMINATION_TIMEOUT_MS = 20_000;

/**
 * Delay used to prove that a stopped harness no longer writes its heartbeat file.
 */
const HARNESS_HEARTBEAT_SETTLE_DELAY_MS = 200;

/**
 * Poll interval used while waiting for a test harness fixture to start.
 */
const FIXTURE_POLL_INTERVAL_MS = 25;

describe('$spawnLoggedBashScript', () => {
    let temporaryDirectoryPath: string;
    let bashProcess: ChildProcessWithoutNullStreams | undefined;
    let parentProcess: ChildProcess | undefined;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-harness-ownership-'));
    });

    afterEach(async () => {
        await terminateProcessIfNeeded(parentProcess);
        await terminateProcessIfNeeded(bashProcess);
        await rm(temporaryDirectoryPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    });

    it('terminates nested harness processes when the owning coder process exits', async () => {
        const scriptPath = join(temporaryDirectoryPath, 'harness.sh');
        const harnessHeartbeatPath = join(temporaryDirectoryPath, 'harness-heartbeat.txt');

        await writeFile(
            scriptPath,
            spaceTrim(`
                (
                    while true; do
                        printf 'heartbeat\\n' >> "${toPosixPath(harnessHeartbeatPath)}"
                        sleep 0.05
                    done
                ) &
                HARNESS_PROCESS_ID=$!
                wait "$HARNESS_PROCESS_ID"
            `),
            'utf-8',
        );

        parentProcess = spawn(process.execPath, ['-e', 'setInterval(() => undefined, 1_000);'], { stdio: 'ignore' });
        if (!parentProcess.pid) {
            throw new Error('Expected the test coder parent process to have a PID.');
        }

        bashProcess = $spawnLoggedBashScript({
            scriptPath,
            parentProcessId: parentProcess.pid,
        });

        await waitForNonEmptyFile(harnessHeartbeatPath);

        parentProcess.kill();
        await waitForProcessToExit(parentProcess);
        await waitForProcessToExit(bashProcess);

        const heartbeatBeforeSettling = await readFile(harnessHeartbeatPath, 'utf-8');
        await wait(HARNESS_HEARTBEAT_SETTLE_DELAY_MS);
        const heartbeatAfterSettling = await readFile(harnessHeartbeatPath, 'utf-8');

        expect(heartbeatAfterSettling).toBe(heartbeatBeforeSettling);
    });
});

/**
 * Stops one test process when its normal ownership watcher has not completed yet.
 */
async function terminateProcessIfNeeded(commandProcess: ChildProcess | undefined): Promise<void> {
    if (!commandProcess || isChildProcessFinished(commandProcess)) {
        return;
    }

    commandProcess.kill();
    await waitForProcessToExit(commandProcess).catch(() => undefined);
}

/**
 * Waits for one direct test process to exit, failing instead of leaving a test hanging indefinitely.
 */
async function waitForProcessToExit(commandProcess: ChildProcess): Promise<void> {
    if (isChildProcessFinished(commandProcess)) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('The Bash process tree did not terminate before the test timeout.'));
        }, PROCESS_TREE_TERMINATION_TIMEOUT_MS);

        const cleanup = (): void => {
            clearTimeout(timeout);
            commandProcess.off('exit', handleExit);
            commandProcess.off('error', handleError);
        };
        const handleExit = (): void => {
            cleanup();
            resolve();
        };
        const handleError = (error: Error): void => {
            cleanup();
            reject(error);
        };

        commandProcess.once('exit', handleExit);
        commandProcess.once('error', handleError);
    });
}

/**
 * Determines whether the direct child process already exited or received a terminating signal.
 */
function isChildProcessFinished(commandProcess: ChildProcess): boolean {
    return commandProcess.exitCode !== null || commandProcess.signalCode !== null;
}

/**
 * Waits until the fixture wrote non-empty content to one file.
 */
async function waitForNonEmptyFile(filePath: string): Promise<void> {
    const deadlineTimeMs = Date.now() + PROCESS_TREE_TERMINATION_TIMEOUT_MS;

    while (Date.now() < deadlineTimeMs) {
        const content = await readFile(filePath, 'utf-8').catch(() => '');
        if (content.trim()) {
            return;
        }

        await wait(FIXTURE_POLL_INTERVAL_MS);
    }

    throw new Error(`The test fixture did not create ${filePath} before the timeout.`);
}

/**
 * Waits for one bounded test delay.
 */
function wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
}
