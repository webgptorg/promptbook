/**
 * Static configuration describing the bundled self-contained (internal) S3 storage.
 *
 * All values are read from the environment. Secret values are never exposed here —
 * only whether they are configured.
 *
 * [✨🏣] Companion of the self-contained S3 storage set up by `$provideCdnForServer`.
 *
 * @private internal utility of the `/admin/internal-s3` page
 */
export type InternalS3Configuration = {
    /**
     * Raw configured storage mode (`PTBK_FILE_STORAGE_MODE` or legacy `CDN_PROVIDER`), or `null` when unset.
     */
    readonly storageMode: string | null;

    /**
     * Whether the bundled self-contained S3 (VersityGW) is the active storage for this server.
     */
    readonly isSelfContainedS3Selected: boolean;

    /**
     * Whether all required S3-compatible endpoint and credentials are present.
     */
    readonly isS3StorageConfigured: boolean;

    /**
     * S3 endpoint URL the server talks to (`CDN_ENDPOINT`).
     */
    readonly endpoint: string | null;

    /**
     * Bucket name that stores the files (`CDN_BUCKET`).
     */
    readonly bucket: string | null;

    /**
     * Signing region used by the AWS SDK (`CDN_REGION`).
     */
    readonly region: string | null;

    /**
     * Object key path prefix (`NEXT_PUBLIC_CDN_PATH_PREFIX`).
     */
    readonly pathPrefix: string | null;

    /**
     * Public URL used to build file links (`NEXT_PUBLIC_CDN_PUBLIC_URL`).
     */
    readonly publicUrl: string | null;

    /**
     * Whether path-style addressing is forced (`CDN_FORCE_PATH_STYLE`).
     */
    readonly isForcePathStyleEnabled: boolean;

    /**
     * Access key id (`CDN_ACCESS_KEY_ID`) — an identifier, not the secret.
     */
    readonly accessKeyId: string | null;

    /**
     * Whether the secret access key is configured (`CDN_SECRET_ACCESS_KEY`). The secret itself is never exposed.
     */
    readonly isSecretAccessKeyConfigured: boolean;

    /**
     * On-disk data directory used by the bundled VersityGW service (`PTBK_SELF_CONTAINED_S3_DIRECTORY`).
     */
    readonly dataDirectory: string | null;

    /**
     * systemd service name for the bundled VersityGW service (`PTBK_SELF_CONTAINED_S3_SERVICE_NAME`).
     */
    readonly serviceName: string | null;

    /**
     * Local port the bundled VersityGW service listens on (`PTBK_SELF_CONTAINED_S3_PORT`).
     */
    readonly port: string | null;
};

/**
 * Object statistics gathered from the internal S3 bucket.
 *
 * @private internal utility of the `/admin/internal-s3` page
 */
export type InternalS3ObjectStatistics = {
    /**
     * Number of objects found under the configured path prefix.
     */
    readonly objectCount: number;

    /**
     * Total size in bytes of the counted objects.
     */
    readonly totalSizeBytes: number;

    /**
     * Whether object enumeration stopped at the safety page cap and the totals are therefore a lower bound.
     */
    readonly isListingTruncated: boolean;
};

/**
 * Result of a live connectivity and statistics probe against the internal S3 storage.
 *
 * @private internal utility of the `/admin/internal-s3` page
 */
export type InternalS3Health = {
    /**
     * Whether the live S3 endpoint responded to the connectivity probe.
     */
    readonly isReachable: boolean;

    /**
     * Round-trip latency of the connectivity probe in milliseconds, when measured.
     */
    readonly latencyMs: number | null;

    /**
     * Object statistics gathered from the bucket, when listing succeeded.
     */
    readonly statistics: InternalS3ObjectStatistics | null;

    /**
     * Human-readable failure reason, when the probe failed.
     */
    readonly errorMessage: string | null;
};

/**
 * Combined configuration and live-health snapshot rendered by the internal S3 admin page.
 *
 * @private internal utility of the `/admin/internal-s3` page
 */
export type InternalS3Snapshot = {
    /**
     * Static configuration read from the environment.
     */
    readonly configuration: InternalS3Configuration;

    /**
     * Live health probe result, or `null` when the probe was skipped.
     */
    readonly health: InternalS3Health | null;

    /**
     * Reason the live probe was skipped, or `null` when it ran.
     */
    readonly probeSkippedReason: string | null;

    /**
     * ISO timestamp when the snapshot was taken.
     */
    readonly checkedAt: string;
};
