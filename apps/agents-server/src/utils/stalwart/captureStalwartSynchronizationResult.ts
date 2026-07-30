/**
 * Outcome of one administrator-triggered Stalwart synchronization.
 */
export type StalwartSynchronizationResult = {
    readonly isSuccessful: boolean;
    readonly errorMessage: string | null;
};

/**
 * Runs one Stalwart synchronization and turns an unavailable or misconfigured mail service into a
 * reportable result.
 *
 * Stalwart being unreachable, still in bootstrap mode, or rejecting a management method is an operational
 * state which administrators have to see and act on, not a server crash.
 */
export async function captureStalwartSynchronizationResult(
    synchronize: () => Promise<void>,
): Promise<StalwartSynchronizationResult> {
    try {
        await synchronize();
        return { isSuccessful: true, errorMessage: null };
    } catch (error) {
        console.error('[stalwart-email]', 'administrator_synchronization_failed', { error });

        return {
            isSuccessful: false,
            errorMessage: error instanceof Error ? error.message : String(error),
        };
    }
}
