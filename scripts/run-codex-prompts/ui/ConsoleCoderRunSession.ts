import { CliProgressDisplay } from '../common/cliProgressDisplay';
import { checkPause, listenForPause } from '../common/waitForPause';
import { waitForEnter } from '../common/waitForEnter';
import type {
    CoderRunOutputSource,
    CoderRunPromptState,
    CoderRunRunnerState,
    CoderRunSession,
    CoderRunSessionOptions,
} from './CoderRunSession';

/**
 * Console-backed coding-run session used when the Ink UI is disabled or unavailable.
 */
export class ConsoleCoderRunSession implements CoderRunSession {
    public readonly isTerminalUi = false;
    private readonly progressDisplay: CliProgressDisplay | undefined;

    /**
     * Console logger that preserves the original line-oriented CLI behavior.
     */
    public readonly logger = {
        info: (message: string): void => {
            console.info(message);
        },
        warn: (message: string): void => {
            console.warn(message);
        },
        error: (message: string): void => {
            console.error(message);
        },
        rawOutput: (chunk: string, source: CoderRunOutputSource): void => {
            if (source === 'stderr') {
                if (chunk.trim()) {
                    console.warn(chunk);
                }
                return;
            }

            console.info(chunk);
        },
    };

    /**
     * Creates a new console session and starts the legacy sticky progress header.
     */
    public constructor(options: CoderRunSessionOptions) {
        this.progressDisplay = new CliProgressDisplay(options.startTime);
        listenForPause();
    }

    /**
     * Console mode does not render runner metadata outside the raw logs.
     */
    public setRunnerState(_runnerState: Partial<CoderRunRunnerState>): void {}

    /**
     * Updates the sticky progress header in console mode.
     */
    public updateStats(stats: Parameters<CliProgressDisplay['update']>[0]): void {
        this.progressDisplay?.update(stats);
    }

    /**
     * Console mode does not render dedicated current-prompt panels.
     */
    public setCurrentPrompt(_prompt?: CoderRunPromptState): void {}

    /**
     * Console mode does not render a dedicated thinking panel.
     */
    public setThinkingMessage(_message?: string): void {}

    /**
     * Delegates pause handling to the legacy raw-stdin implementation.
     */
    public async checkPause(): Promise<void> {
        await checkPause();
    }

    /**
     * Delegates Enter prompts to the existing readline prompt helper.
     */
    public async waitForEnter(prompt: string): Promise<void> {
        await waitForEnter(prompt);
    }

    /**
     * Stops the sticky progress header before the process exits.
     */
    public stop(): void {
        this.progressDisplay?.stop();
    }
}
