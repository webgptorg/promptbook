import { spaceTrim } from 'spacetrim';
import type { InternalS3Snapshot } from './internalS3Types';
import { probeInternalS3Health } from './probeInternalS3Health';
import { readInternalS3Configuration } from './readInternalS3Configuration';

/**
 * Reads the internal S3 configuration and, when applicable, a live health snapshot.
 *
 * The live connectivity probe only runs when the bundled self-contained S3 is the active,
 * fully configured storage — probing an external endpoint or a half-configured setup would be
 * misleading, so those cases return a skip reason instead.
 *
 * @returns Combined configuration and health snapshot for the `/admin/internal-s3` page.
 * @private internal utility of the `/admin/internal-s3` page
 */
export async function readInternalS3Snapshot(): Promise<InternalS3Snapshot> {
    const configuration = readInternalS3Configuration();
    const checkedAt = new Date().toISOString();

    if (!configuration.isSelfContainedS3Selected) {
        return {
            configuration,
            health: null,
            probeSkippedReason: spaceTrim(
                `
                    This server is not using the bundled self-contained S3 storage, so no live
                    connectivity check is performed.
                `,
            ),
            checkedAt,
        };
    }

    if (!configuration.isS3StorageConfigured) {
        return {
            configuration,
            health: null,
            probeSkippedReason: spaceTrim(
                `
                    The self-contained S3 storage is selected but not fully configured, so no live
                    connectivity check is performed.
                `,
            ),
            checkedAt,
        };
    }

    const health = await probeInternalS3Health(configuration);

    return {
        configuration,
        health,
        probeSkippedReason: null,
        checkedAt,
    };
}
