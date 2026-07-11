import { spaceTrim } from 'spacetrim';
import type { CoderRunUiHandle } from '../../../../../scripts/run-codex-prompts/ui/renderCoderRunUi';
import { NotAllowed } from '../../../../errors/NotAllowed';

/**
 * Mutable supervisor state shared with child-process and watcher callbacks.
 *
 * @private internal type of `startAgentsServer`
 */
export type AgentsServerSupervisorState = {
    isContinuing: boolean;
    uiHandle?: CoderRunUiHandle;
    lastUserChatJobWorkerError?: {
        message: string;
        repeatCount: number;
    };
    nextExit?: {
        code: number | null;
        signal: NodeJS.Signals | null;
    };
};

/**
 * Adds one Next or worker output line to the rich terminal UI when it is active.
 *
 * @private internal utility of `startAgentsServer`
 */
export function addUiOutput(state: AgentsServerSupervisorState, output: string): void {
    state.uiHandle?.state.addAgentOutput(output);
}

/**
 * Adds one service error line to the rich terminal UI when it is active.
 *
 * @private internal utility of `startAgentsServer`
 */
export function addUiError(state: AgentsServerSupervisorState, error: string): void {
    state.uiHandle?.state.addError(error);
}

/**
 * Throws when the server child stopped while the watcher was still expected to be foreground work.
 *
 * @private internal utility of `startAgentsServer`
 */
export function assertNextServerStillRunning(state: AgentsServerSupervisorState): void {
    if (!state.nextExit) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Agents Server Next process stopped.

            - Exit code: \`${String(state.nextExit.code)}\`
            - Signal: \`${String(state.nextExit.signal)}\`
        `),
    );
}
