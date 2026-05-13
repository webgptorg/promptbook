import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Logical public directory marker used in `run_browser` payload paths.
 *
 * This value is kept stable for UI parsing and `/api/browser-artifacts/*` URL mapping.
 */
export const RUN_BROWSER_ARTIFACT_PUBLIC_DIRECTORY = '.playwright-cli';

/**
 * Runtime environment variable that overrides local artifact storage directory.
 */
const RUN_BROWSER_ARTIFACT_STORAGE_DIRECTORY_ENV = 'RUN_BROWSER_ARTIFACT_STORAGE_DIRECTORY';

/**
 * Default writable directory for `run_browser` screenshot/video artifacts.
 */
const DEFAULT_RUN_BROWSER_ARTIFACT_STORAGE_DIRECTORY = join(tmpdir(), 'promptbook', 'run-browser-artifacts');

/**
 * Whitelist pattern for browser artifact filenames produced by `run_browser`.
 */
export const RUN_BROWSER_ARTIFACT_FILENAME_PATTERN =
    /^agents-server-run-browser-[a-f0-9-]+(?:-[a-z0-9-]+)?\.(png|jpg|jpeg|webm|mp4)$/;

/**
 * Converts Windows separators to POSIX separators for payload paths.
 */
function toPosixPath(pathname: string): string {
    return pathname.split('\\').join('/');
}

/**
 * Resolves writable filesystem directory used for artifact persistence.
 */
export function resolveRunBrowserArtifactStorageDirectory(): string {
    const configuredStorageDirectory = process.env[RUN_BROWSER_ARTIFACT_STORAGE_DIRECTORY_ENV];
    if (configuredStorageDirectory && configuredStorageDirectory.trim()) {
        return configuredStorageDirectory.trim();
    }

    return DEFAULT_RUN_BROWSER_ARTIFACT_STORAGE_DIRECTORY;
}

/**
 * Resolves absolute filesystem path of one artifact filename.
 */
export function resolveRunBrowserArtifactFilesystemPath(artifactFilename: string): string {
    return join(resolveRunBrowserArtifactStorageDirectory(), artifactFilename);
}

/**
 * Resolves payload path of one artifact filename used by replay renderers.
 */
export function resolveRunBrowserArtifactPublicPath(artifactFilename: string): string {
    return toPosixPath(`${RUN_BROWSER_ARTIFACT_PUBLIC_DIRECTORY}/${artifactFilename}`);
}

/**
 * Validates whether one filename belongs to the supported browser artifact set.
 */
export function isRunBrowserArtifactFilename(artifactFilename: string): boolean {
    return RUN_BROWSER_ARTIFACT_FILENAME_PATTERN.test(artifactFilename);
}
