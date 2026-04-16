/**
 * Decides whether one temporary prompt artifact should be deleted after a round finishes.
 */
export function shouldDeleteTemporaryArtifact({
    preserveArtifactsOnSuccess,
    hasFailed,
}: {
    preserveArtifactsOnSuccess?: boolean;
    hasFailed: boolean;
}): boolean {
    return !preserveArtifactsOnSuccess && !hasFailed;
}
