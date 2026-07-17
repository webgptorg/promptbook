import colors from 'colors';
import * as readline from 'readline';

/**
 * Default label used before the next pause checkpoint is known.
 */
const DEFAULT_PAUSE_TARGET_LABEL = 'the next task';

/**
 * Pause lifecycle of `ptbk coder run`.
 */
export type CoderRunPauseState = 'RUNNING' | 'PAUSING' | 'PAUSED';

/**
 * Result of toggling the pause hotkey state.
 */
export type CoderRunPauseToggleResult = 'REQUESTED_PAUSE' | 'CANCELLED_PAUSE' | 'RESUMED';

/**
 * Result of requesting a timed wait skip.
 */
export type CoderRunSkipCurrentWaitResult = 'REQUESTED_SKIP' | 'NO_ACTIVE_WAIT';

/**
 * Result of toggling the dynamic end-after-current-prompt state.
 */
export type CoderRunEndAfterCurrentPromptToggleResult = 'REQUESTED_END' | 'CANCELLED_END';

/**
 * Token that identifies one active timed wait which can be skipped by the user.
 */
export type CoderRunSkippableWaitToken = symbol;

/**
 * Current pause state.
 */
let pauseState: CoderRunPauseState = 'RUNNING';

/**
 * Label of the next checkpoint where the requested pause will take effect.
 */
let pauseTargetLabel = DEFAULT_PAUSE_TARGET_LABEL;

/**
 * Token of the currently active timed wait, if the runner is inside one.
 */
let activeSkippableWaitToken: CoderRunSkippableWaitToken | undefined;

/**
 * Whether the user requested the active timed wait to end immediately.
 */
let isSkipCurrentWaitRequested = false;

/**
 * Whether the runner should stop after the current prompt round reaches its normal boundary.
 */
let isEndAfterCurrentPromptRequested = false;

/**
 * Promise resolvers waiting for the active timed wait to be skipped.
 */
const SKIP_CURRENT_WAIT_RESOLVERS = new Map<CoderRunSkippableWaitToken, Set<() => void>>();

/**
 * Stores one new pause state in the shared runner controller.
 */
function setPauseState(nextPauseState: CoderRunPauseState): void {
    pauseState = nextPauseState;
}

/**
 * Stores one new pause target label in the shared runner controller.
 */
function setPauseTargetLabel(nextPauseTargetLabel: string): void {
    pauseTargetLabel = nextPauseTargetLabel.trim() || DEFAULT_PAUSE_TARGET_LABEL;
}

/**
 * Stores the dynamic end-after-current-prompt state.
 */
function setEndAfterCurrentPromptRequested(isRequested: boolean): void {
    isEndAfterCurrentPromptRequested = isRequested;
}

/**
 * Applies the same three-state toggle used by the `P` hotkey.
 */
export function togglePauseState(): CoderRunPauseToggleResult {
    if (pauseState === 'RUNNING') {
        setPauseState('PAUSING');
        return 'REQUESTED_PAUSE';
    }

    if (pauseState === 'PAUSING') {
        setPauseState('RUNNING');
        resetPauseTargetLabel();
        return 'CANCELLED_PAUSE';
    }

    setPauseState('RUNNING');
    resetPauseTargetLabel();
    return 'RESUMED';
}

/**
 * Applies the two-state toggle used by the `X` hotkey.
 */
export function toggleEndAfterCurrentPromptState(): CoderRunEndAfterCurrentPromptToggleResult {
    if (!isEndAfterCurrentPromptRequested) {
        setEndAfterCurrentPromptRequested(true);
        return 'REQUESTED_END';
    }

    setEndAfterCurrentPromptRequested(false);
    return 'CANCELLED_END';
}

/**
 * Returns whether the dynamic end-after-current-prompt control is active.
 */
export function getEndAfterCurrentPromptState(): boolean {
    return isEndAfterCurrentPromptRequested;
}

/**
 * Starts one timed wait which can be skipped by the `S` hotkey.
 */
export function beginSkippableWait(): CoderRunSkippableWaitToken {
    const waitToken = Symbol('coder-run-skippable-wait');

    activeSkippableWaitToken = waitToken;
    isSkipCurrentWaitRequested = false;
    SKIP_CURRENT_WAIT_RESOLVERS.clear();

    return waitToken;
}

/**
 * Finishes one timed wait and clears any skip request that belonged to it.
 */
export function finishSkippableWait(waitToken: CoderRunSkippableWaitToken): void {
    if (activeSkippableWaitToken !== waitToken) {
        return;
    }

    activeSkippableWaitToken = undefined;
    isSkipCurrentWaitRequested = false;
    resolveSkipCurrentWaitResolvers(waitToken);
    SKIP_CURRENT_WAIT_RESOLVERS.delete(waitToken);
}

/**
 * Requests that the currently active timed wait ends immediately.
 */
export function requestSkipCurrentWait(): CoderRunSkipCurrentWaitResult {
    if (activeSkippableWaitToken === undefined) {
        return 'NO_ACTIVE_WAIT';
    }

    isSkipCurrentWaitRequested = true;
    resolveSkipCurrentWaitResolvers(activeSkippableWaitToken);
    return 'REQUESTED_SKIP';
}

/**
 * Returns whether one timed wait should end early.
 */
export function shouldSkipCurrentWait(waitToken: CoderRunSkippableWaitToken): boolean {
    return activeSkippableWaitToken === waitToken && isSkipCurrentWaitRequested;
}

/**
 * Waits for either a timeout or an `S` hotkey skip request.
 */
export async function waitForSkippableMilliseconds(
    waitToken: CoderRunSkippableWaitToken,
    durationMs: number,
): Promise<void> {
    if (durationMs <= 0 || shouldSkipCurrentWait(waitToken)) {
        return;
    }

    await new Promise<void>((resolve) => {
        let timeout: NodeJS.Timeout | undefined = setTimeout(resolveWait, durationMs);
        const resolver = (): void => resolveWait();
        const resolvers = getSkipCurrentWaitResolvers(waitToken);

        resolvers.add(resolver);

        function resolveWait(): void {
            if (timeout !== undefined) {
                clearTimeout(timeout);
                timeout = undefined;
            }

            resolvers.delete(resolver);
            if (resolvers.size === 0) {
                SKIP_CURRENT_WAIT_RESOLVERS.delete(waitToken);
            }

            resolve();
        }
    });
}

/**
 * Restores all shared terminal controls to their default state.
 */
export function resetCoderRunControls(): void {
    setPauseState('RUNNING');
    resetPauseTargetLabel();
    setEndAfterCurrentPromptRequested(false);

    if (activeSkippableWaitToken !== undefined) {
        resolveSkipCurrentWaitResolvers(activeSkippableWaitToken);
    }

    activeSkippableWaitToken = undefined;
    isSkipCurrentWaitRequested = false;
    SKIP_CURRENT_WAIT_RESOLVERS.clear();
}

/**
 * Listens for the terminal control keys.
 */
export function listenForCoderRunControls(): void {
    if (!process.stdin.isTTY) {
        return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            process.exit();
        }

        if (key.name === 'p') {
            const toggleResult = togglePauseState();

            if (toggleResult === 'REQUESTED_PAUSE') {
                // Note: Using console.log here which adds a new line.
                // This is intentional to prevent the message from being overwritten.
                console.log(colors.bgWhite('Pausing...'));
            } else if (toggleResult === 'CANCELLED_PAUSE') {
                console.log(colors.green('Pause cancelled. Resuming...'));
            }
        }

        if (key.name === 's') {
            if (requestSkipCurrentWait() === 'REQUESTED_SKIP') {
                console.log(colors.green('Skipping current wait...'));
            }
        }

        if (key.name === 'x') {
            const toggleResult = toggleEndAfterCurrentPromptState();

            if (toggleResult === 'REQUESTED_END') {
                console.log(colors.yellow('Will end after the current prompt finishes.'));
            } else {
                console.log(colors.green('End request cancelled. Continuing all prompts.'));
            }
        }
    });
}

/**
 * Backwards-compatible alias for the shared terminal controls listener.
 */
export function listenForPause(): void {
    listenForCoderRunControls();
}

/**
 * If the execution is paused, it will wait until it is resumed.
 *
 * @param options.silent - When `true`, suppresses console output (used when the terminal UI handles display).
 * @param options.onPaused - Callback invoked when entering the PAUSED state.
 * @param options.onResumed - Callback invoked when leaving the PAUSED state.
 */
export async function checkPause(options?: {
    silent?: boolean;
    onPaused?: () => void;
    onResumed?: () => void;
}): Promise<void> {
    if (pauseState === 'PAUSING') {
        setPauseState('PAUSED');

        if (!options?.silent) {
            console.log(
                colors.bgWhite.black(`Paused before ${getPauseTargetLabel()}`) +
                    colors.gray(' (Press "p" to resume)'),
            );
        }

        options?.onPaused?.();

        while (getPauseState() === 'PAUSED') {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        options?.onResumed?.();

        if (!options?.silent) {
            console.log(colors.green('Resuming...'));
        }
    }
}

/**
 * Returns the current pause state for external consumers such as the terminal UI.
 */
export function getPauseState(): CoderRunPauseState {
    return pauseState;
}

/**
 * Returns the label of the next checkpoint where pausing will take effect.
 */
export function getPauseTargetLabel(): string {
    return pauseTargetLabel;
}

/**
 * Updates the label of the next pause checkpoint.
 */
export function announcePauseTargetLabel(nextPauseTargetLabel: string): void {
    setPauseTargetLabel(nextPauseTargetLabel);
}

/**
 * Restores the default generic pause target label.
 */
export function resetPauseTargetLabel(): void {
    setPauseTargetLabel(DEFAULT_PAUSE_TARGET_LABEL);
}

/**
 * Requests a pause from an external controller (e.g. the Ink UI).
 */
export function requestPause(): void {
    if (pauseState === 'RUNNING') {
        setPauseState('PAUSING');
    }
}

/**
 * Resumes execution from an external controller after a pause.
 */
export function requestResume(): void {
    setPauseState('RUNNING');
    resetPauseTargetLabel();
}

/**
 * Gets or creates the resolver set for one timed wait.
 */
function getSkipCurrentWaitResolvers(waitToken: CoderRunSkippableWaitToken): Set<() => void> {
    const existingResolvers = SKIP_CURRENT_WAIT_RESOLVERS.get(waitToken);

    if (existingResolvers !== undefined) {
        return existingResolvers;
    }

    const resolvers = new Set<() => void>();
    SKIP_CURRENT_WAIT_RESOLVERS.set(waitToken, resolvers);
    return resolvers;
}

/**
 * Resolves all pending skip waiters for one timed wait.
 */
function resolveSkipCurrentWaitResolvers(waitToken: CoderRunSkippableWaitToken): void {
    const resolvers = SKIP_CURRENT_WAIT_RESOLVERS.get(waitToken);

    if (resolvers === undefined) {
        return;
    }

    for (const resolver of resolvers) {
        resolver();
    }

    resolvers.clear();
}
