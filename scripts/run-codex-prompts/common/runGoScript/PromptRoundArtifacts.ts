import { unlink } from 'fs/promises';

/**
 * Kind of temporary artifact created during one coder prompt round.
 */
export type PromptRoundArtifactKind = 'runner-script' | 'test-script' | 'runtime-log';

/**
 * Final outcome of one coder prompt round.
 */
export type PromptRoundOutcome = 'success' | 'failure';

/**
 * Shared artifact kinds preserved for debugging when a prompt round fails.
 */
const FAILURE_PRESERVED_ARTIFACT_KINDS = new Set<PromptRoundArtifactKind>(['runner-script', 'runtime-log']);

/**
 * Shared artifact kinds preserved after a successful prompt round when explicitly requested.
 */
const SUCCESS_PRESERVED_ARTIFACT_KINDS = new Set<PromptRoundArtifactKind>(['runner-script', 'runtime-log']);

/**
 * Empty preserved-artifact set used for successful rounds without `--preserve-logs`.
 */
const NO_PRESERVED_ARTIFACT_KINDS = new Set<PromptRoundArtifactKind>();

/**
 * Tracks temporary prompt-round artifacts and deletes only those not preserved for the final round outcome.
 */
export class PromptRoundArtifacts {
    private readonly trackedArtifacts = new Map<string, PromptRoundArtifactKind>();

    /**
     * Creates a new prompt-round artifact tracker.
     */
    public constructor(
        private readonly preservedArtifactKindsByOutcome: Record<PromptRoundOutcome, ReadonlySet<PromptRoundArtifactKind>>,
    ) {}

    /**
     * Registers one temporary artifact for round-final cleanup.
     */
    public track(path: string, kind: PromptRoundArtifactKind): void {
        this.trackedArtifacts.set(path, kind);
    }

    /**
     * Cleans up all tracked artifacts that should not survive the final round outcome.
     */
    public async cleanup(outcome: PromptRoundOutcome): Promise<void> {
        const preservedArtifactKinds = this.preservedArtifactKindsByOutcome[outcome];
        const trackedArtifacts = [...this.trackedArtifacts.entries()];
        this.trackedArtifacts.clear();

        await Promise.all(
            trackedArtifacts.map(async ([path, kind]) => {
                if (preservedArtifactKinds.has(kind)) {
                    return;
                }

                await unlink(path).catch(() => undefined);
            }),
        );
    }
}

/**
 * Creates the default artifact-retention policy used by `ptbk coder run`.
 */
export function createCoderRunPromptRoundArtifacts(isPreserveLogs: boolean): PromptRoundArtifacts {
    return new PromptRoundArtifacts({
        success: isPreserveLogs ? SUCCESS_PRESERVED_ARTIFACT_KINDS : NO_PRESERVED_ARTIFACT_KINDS,
        failure: FAILURE_PRESERVED_ARTIFACT_KINDS,
    });
}

/**
 * Derives the tracked artifact kind from one temporary shell path.
 */
export function getPromptRoundArtifactKindFromScriptPath(scriptPath: string): PromptRoundArtifactKind {
    return scriptPath.toLowerCase().endsWith('.test.sh') ? 'test-script' : 'runner-script';
}
