import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { createInternalS3Client } from './createInternalS3Client';
import type { InternalS3Configuration, InternalS3Health, InternalS3ObjectStatistics } from './internalS3Types';

/**
 * Maximum number of object pages enumerated before statistics are reported as truncated.
 *
 * @private helper of `probeInternalS3Health`
 */
const INTERNAL_S3_OBJECT_PAGE_LIMIT = 50;

/**
 * Number of objects requested per listing page.
 *
 * @private helper of `probeInternalS3Health`
 */
const INTERNAL_S3_OBJECTS_PER_PAGE = 1000;

/**
 * Overall timeout for the internal S3 probe, in milliseconds, so the admin page never hangs.
 *
 * @private helper of `probeInternalS3Health`
 */
const INTERNAL_S3_PROBE_TIMEOUT_MS = 12000;

/**
 * One enumerated object listing page and its measured request latency.
 *
 * @private helper of `probeInternalS3Health`
 */
type InternalS3ObjectStatisticsProbe = {
    readonly statistics: InternalS3ObjectStatistics;
    readonly firstPageLatencyMs: number;
};

/**
 * Probes the live internal S3 storage for reachability and object statistics.
 *
 * A bounded `ListObjectsV2` enumeration under the configured path prefix both proves
 * reachability (the first page must succeed) and gathers statistics. The probe never
 * throws — failures are captured into the returned {@link InternalS3Health}.
 *
 * @param configuration - Fully configured internal S3 configuration.
 * @returns Live health snapshot.
 * @private internal utility of the `/admin/internal-s3` page
 */
export async function probeInternalS3Health(configuration: InternalS3Configuration): Promise<InternalS3Health> {
    const s3Client = createInternalS3Client(configuration);
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), INTERNAL_S3_PROBE_TIMEOUT_MS);

    try {
        const probe = await readInternalS3ObjectStatistics(
            s3Client,
            configuration.bucket!,
            configuration.pathPrefix,
            abortController.signal,
        );

        return {
            isReachable: true,
            latencyMs: probe.firstPageLatencyMs,
            statistics: probe.statistics,
            errorMessage: null,
        };
    } catch (error) {
        return {
            isReachable: false,
            latencyMs: null,
            statistics: null,
            errorMessage: resolveInternalS3ErrorMessage(error),
        };
    } finally {
        clearTimeout(timeoutHandle);
        s3Client.destroy();
    }
}

/**
 * Enumerates objects under the configured path prefix and sums their count and size.
 *
 * @param s3Client - Internal S3 client.
 * @param bucket - Bucket name.
 * @param pathPrefix - Configured object key prefix, or `null`.
 * @param abortSignal - Signal aborting the enumeration when the probe times out.
 * @returns Object statistics with the first-page latency used as the reachability measurement.
 * @private helper of `probeInternalS3Health`
 */
async function readInternalS3ObjectStatistics(
    s3Client: S3Client,
    bucket: string,
    pathPrefix: string | null,
    abortSignal: AbortSignal,
): Promise<InternalS3ObjectStatisticsProbe> {
    let objectCount = 0;
    let totalSizeBytes = 0;
    let continuationToken: string | undefined;
    let pageIndex = 0;
    let firstPageLatencyMs = 0;

    do {
        const startedAt = Date.now();
        const response = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: pathPrefix ? `${pathPrefix}/` : undefined,
                MaxKeys: INTERNAL_S3_OBJECTS_PER_PAGE,
                ContinuationToken: continuationToken,
            }),
            { abortSignal },
        );

        if (pageIndex === 0) {
            firstPageLatencyMs = Date.now() - startedAt;
        }

        for (const object of response.Contents ?? []) {
            objectCount += 1;
            totalSizeBytes += object.Size ?? 0;
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        pageIndex += 1;
    } while (continuationToken && pageIndex < INTERNAL_S3_OBJECT_PAGE_LIMIT);

    return {
        statistics: {
            objectCount,
            totalSizeBytes,
            isListingTruncated: Boolean(continuationToken),
        },
        firstPageLatencyMs,
    };
}

/**
 * Resolves a user-facing message from an internal S3 probe error.
 *
 * @param error - Thrown value.
 * @returns Human-readable failure message.
 * @private helper of `probeInternalS3Health`
 */
function resolveInternalS3ErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            return `Internal S3 did not respond within ${INTERNAL_S3_PROBE_TIMEOUT_MS / 1000} seconds.`;
        }

        return error.message;
    }

    return 'Unknown error while contacting the internal S3 storage.';
}
