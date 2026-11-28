import type { InternalS3Snapshot } from './internalS3Types';

/**
 * Visual severity of the self-contained S3 operational status.
 *
 * @private shared by Internal S3 administration and Header warnings
 */
export type InternalS3StatusTone = 'positive' | 'warning' | 'critical' | 'muted';

/**
 * Presentation-ready self-contained S3 operational status.
 *
 * @private shared by Internal S3 administration and Header warnings
 */
export type InternalS3Status = {
    /**
     * Severity used to select the status presentation.
     */
    readonly tone: InternalS3StatusTone;

    /**
     * Short human-readable status title.
     */
    readonly title: string;

    /**
     * Optional detail that explains the current status.
     */
    readonly message: string;
};

/**
 * Resolves the current operational status of the bundled self-contained S3 storage.
 *
 * @param snapshot - Current S3 configuration and live health snapshot.
 * @returns Presentation-ready status for the Internal S3 page and header warning policy.
 *
 * @private shared by Internal S3 administration and Header warnings
 */
export function resolveInternalS3Status(snapshot: InternalS3Snapshot): InternalS3Status {
    const { configuration, health, probeSkippedReason } = snapshot;

    if (!configuration.isSelfContainedS3Selected) {
        return {
            tone: 'muted',
            title: 'Self-contained S3 is not the active storage',
            message: probeSkippedReason ?? '',
        };
    }

    if (health === null) {
        return {
            tone: 'warning',
            title: 'Self-contained S3 is not fully configured',
            message: probeSkippedReason ?? '',
        };
    }

    if (health.isReachable) {
        return {
            tone: 'positive',
            title: 'Internal S3 storage is reachable',
            message: 'The bundled VersityGW storage responded to a live object listing.',
        };
    }

    return {
        tone: 'critical',
        title: 'Internal S3 storage is not reachable',
        message: health.errorMessage ?? 'The live object listing did not succeed.',
    };
}

/**
 * Determines whether self-contained S3 needs super-admin attention.
 *
 * @param snapshot - Current S3 configuration and live health snapshot.
 * @returns `true` when the selected self-contained storage is incomplete or unavailable.
 *
 * @private shared by Internal S3 administration and Header warnings
 */
export function isInternalS3WarningShown(snapshot: InternalS3Snapshot): boolean {
    const status = resolveInternalS3Status(snapshot);

    return status.tone === 'warning' || status.tone === 'critical';
}
