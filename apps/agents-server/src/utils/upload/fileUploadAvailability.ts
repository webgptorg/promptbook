/**
 * Message shown when self-contained file uploads cannot safely choose a serving domain.
 */
export const FILE_UPLOAD_REQUIRES_SERVER_DOMAIN_MESSAGE =
    'Create the first server/domain before uploading files. Uploaded files are served from the current server domain, and raw-IP bootstrap access does not have one yet.';

/**
 * Browser-safe upload availability state.
 */
export type FileUploadAvailability = {
    /**
     * Whether file uploads may be accepted for the current request.
     */
    readonly isUploadAvailable: boolean;

    /**
     * User-facing reason shown when uploads are unavailable.
     */
    readonly message: string | null;
};

/**
 * Inputs used to resolve whether uploads are allowed for the current server.
 */
export type ResolveFileUploadAvailabilityOptions = {
    /**
     * Current server id, or `null` before a request is matched to a server/domain.
     */
    readonly serverId: number | null;

    /**
     * Public URL resolved for the current request.
     */
    readonly serverPublicUrl: URL;

    /**
     * Whether the deployment is using the bundled self-contained S3 storage.
     */
    readonly isSelfContainedS3StorageSelected: boolean;
};

/**
 * Default upload availability used when no server-side context is available.
 */
export const AVAILABLE_FILE_UPLOAD: FileUploadAvailability = {
    isUploadAvailable: true,
    message: null,
};

/**
 * Resolves whether file uploads can be accepted for the current request.
 *
 * Self-contained S3 publishes files through the current server domain. While the
 * standalone VPS is still being accessed as a bootstrap/default server, there is
 * no server-specific domain to publish under, so uploads must be disabled.
 *
 * @param options - Current server and storage mode.
 * @returns Browser-safe upload availability state.
 */
export function resolveFileUploadAvailability(
    options: ResolveFileUploadAvailabilityOptions,
): FileUploadAvailability {
    if (!options.isSelfContainedS3StorageSelected) {
        return AVAILABLE_FILE_UPLOAD;
    }

    if (options.serverId !== null) {
        return AVAILABLE_FILE_UPLOAD;
    }

    if (isLocalDevelopmentUrl(options.serverPublicUrl)) {
        return AVAILABLE_FILE_UPLOAD;
    }

    return {
        isUploadAvailable: false,
        message: FILE_UPLOAD_REQUIRES_SERVER_DOMAIN_MESSAGE,
    };
}

/**
 * Checks whether a server URL points to local development.
 *
 * @param serverPublicUrl - Public URL resolved for the current request.
 * @returns `true` for localhost and loopback hosts.
 */
function isLocalDevelopmentUrl(serverPublicUrl: URL): boolean {
    const hostname = serverPublicUrl.hostname.toLowerCase();

    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
