import type { CoderRunPhase } from '../ui/CoderRunUiState';

/**
 * One named pause checkpoint inside the `ptbk coder run` pipeline.
 */
export type CoderRunPauseCheckpointOptions = {
    /**
     * Human-readable description of the stage that should not start until pause is cleared.
     */
    readonly checkpointLabel: string;

    /**
     * UI phase that should be shown while this checkpoint is active.
     */
    readonly phase: CoderRunPhase;

    /**
     * Status line that should be restored after resuming from this checkpoint.
     */
    readonly statusMessage: string;
};

/**
 * Callback used to pause before one specific coder-run stage starts.
 */
export type WaitForCoderRunPauseCheckpoint = (
    checkpoint: CoderRunPauseCheckpointOptions,
) => Promise<void>;
