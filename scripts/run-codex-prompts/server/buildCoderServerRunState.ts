import type { CoderRunConfig, CoderRunPhase, CoderRunProgressSnapshot, CoderRunUiState } from '../ui/CoderRunUiState';
import type { AgentRunStatusTableRow } from '../ui/buildCoderRunUiFrame';

/**
 * Snapshot of the active coder runner exposed to the browser UI.
 */
export type CoderServerRunState = {
    readonly config: CoderRunConfig;
    readonly phase: CoderRunPhase;
    readonly currentPromptLabel: string;
    readonly currentAttempt: number;
    readonly maxAttempts: number;
    readonly statusMessage: string;
    readonly detailLines: readonly string[];
    readonly agentStatusLines: readonly string[];
    readonly agentStatusTableRows: readonly AgentRunStatusTableRow[];
    readonly agentOutputLines: readonly string[];
    readonly errors: readonly string[];
    readonly progress: CoderRunProgressSnapshot;
};

/**
 * Builds a plain JSON-safe snapshot from the shared terminal UI state.
 */
export function buildCoderServerRunState(uiState: CoderRunUiState): CoderServerRunState {
    return {
        config: uiState.config,
        phase: uiState.phase,
        currentPromptLabel: uiState.currentPromptLabel,
        currentAttempt: uiState.currentAttempt,
        maxAttempts: uiState.maxAttempts,
        statusMessage: uiState.statusMessage,
        detailLines: [...uiState.detailLines],
        agentStatusLines: [...uiState.agentStatusLines],
        agentStatusTableRows: [...uiState.agentStatusTableRows],
        agentOutputLines: [...uiState.agentOutputLines],
        errors: [...uiState.errors],
        progress: uiState.getProgress(),
    };
}

// Note: [🟡] Code for CLI command [coder server](scripts/run-codex-prompts/server/buildCoderServerRunState.ts) should never be published outside of `@promptbook/cli`
