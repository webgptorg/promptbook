import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../../../../src/errors/EnvironmentMismatchError';
import { $spawnLoggedBashScript } from './$spawnLoggedBashScript';
import { toPosixPath } from './toPosixPath';

/**
 * Maximum time allowed for the shell ownership watcher to stop the process tree.
 */
const PROCESS_TREE_TERMINATION_TIMEOUT_MS = 20_000;

/**
 * Maximum time allowed for the harness fixture to boot and write its first heartbeat.
 *
 * Booting the fixture pays for a full Bash *login* shell, which is a cost of the machine and not of the ownership
 * behavior verified here - shell profiles that load version managers such as `nvm` need roughly ten seconds on
 * Windows, and parallel Jest workers multiply that further. This startup budget is therefore deliberately much
 * larger than `PROCESS_TREE_TERMINATION_TIMEOUT_MS`, which keeps bounding the behavior actually under test.
 */
const HARNESS_FIXTURE_STARTUP_TIMEOUT_MS = 90_000;

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
        const bashOutput = collectProcessOutput(bashProcess);

        await waitForHarnessHeartbeat({ harnessHeartbeatPath, bashProcess, bashOutput });

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
 * Buffered standard streams of one test process, used to explain unexpected fixture failures.
 */
type CollectedProcessOutput = {
    readonly text: string;
};

/**
 * Mirrors the standard streams of one spawned test process into a buffer.
 */
function collectProcessOutput(commandProcess: ChildProcessWithoutNullStreams): CollectedProcessOutput {
    const chunks: string[] = [];

    commandProcess.stdout.on('data', (chunk) => chunks.push(chunk.toString()));
    commandProcess.stderr.on('data', (chunk) => chunks.push(chunk.toString()));

    return {
        get text(): string {
            return chunks.join('');
        },
    };
}

/**
 * One started harness fixture together with the wrapper shell that owns it.
 */
type HarnessFixture = {
    harnessHeartbeatPath: string;
    bashProcess: ChildProcessWithoutNullStreams;
    bashOutput: CollectedProcessOutput;
};

/**
 * Waits until the harness fixture writes its first heartbeat.
 *
 * When the wrapper shell exits before writing anything, waiting for the full startup budget would only hide why, so
 * the fixture failure is reported immediately together with the output the shell produced.
 */
async function waitForHarnessHeartbeat({
    harnessHeartbeatPath,
    bashProcess,
    bashOutput,
}: HarnessFixture): Promise<void> {
    const deadlineTimeMs = Date.now() + HARNESS_FIXTURE_STARTUP_TIMEOUT_MS;
    const isHeartbeatWritten = async (): Promise<boolean> =>
        Boolean((await readFile(harnessHeartbeatPath, 'utf-8').catch(() => '')).trim());

    while (Date.now() < deadlineTimeMs) {
        if (await isHeartbeatWritten()) {
            return;
        }

        if (isChildProcessFinished(bashProcess)) {
            // Note: The heartbeat can still land between the last check and the exit of the wrapper shell.
            if (await isHeartbeatWritten()) {
                return;
            }

            throw createHarnessStartupError({
                reason: 'its wrapper shell exited first',
                harnessHeartbeatPath,
                bashProcess,
                bashOutput,
            });
        }

        await wait(FIXTURE_POLL_INTERVAL_MS);
    }

    throw createHarnessStartupError({
        reason: `it did not start within ${HARNESS_FIXTURE_STARTUP_TIMEOUT_MS} ms`,
        harnessHeartbeatPath,
        bashProcess,
        bashOutput,
    });
}

/**
 * Describes one failed harness fixture startup with everything needed to tell a broken wrapper from a slow machine.
 */
function createHarnessStartupError({
    reason,
    harnessHeartbeatPath,
    bashProcess,
    bashOutput,
}: HarnessFixture & { reason: string }): EnvironmentMismatchError {
    return new EnvironmentMismatchError(
        spaceTrim(
            (block) => `
                The test fixture did not write its heartbeat because ${reason}.

                Heartbeat file: ${harnessHeartbeatPath}
                Wrapper shell exit code: ${bashProcess.exitCode ?? '(still running)'}
                Wrapper shell signal: ${bashProcess.signalCode ?? '(none)'}

                Wrapper shell output:
                ${block(bashOutput.text.trim() || '(no output)')}
            `,
        ),
    );
}

/**
 * Waits for one bounded test delay.
 */
function wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
}
