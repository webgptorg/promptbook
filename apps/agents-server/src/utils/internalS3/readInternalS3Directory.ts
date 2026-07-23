import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createInternalS3Client } from './createInternalS3Client';
import type { InternalS3BrowserEntry, InternalS3BrowserSnapshot, InternalS3Configuration } from './internalS3Types';
import { resolveInternalS3ErrorMessage } from './resolveInternalS3ErrorMessage';

/**
 * Number of direct entries requested for one browser directory.
 *
 * @private helper of `readInternalS3Directory`
 */
const INTERNAL_S3_BROWSER_MAX_KEYS = 1000;

/**
 * Timeout for one browser listing request, in milliseconds.
 *
 * @private helper of `readInternalS3Directory`
 */
const INTERNAL_S3_BROWSER_TIMEOUT_MS = 12000;

/**
 * S3 delimiter used to list one directory level.
 *
 * @private helper of `readInternalS3Directory`
 */
const INTERNAL_S3_DIRECTORY_DELIMITER = '/';

/**
 * Human-friendly collator used for directory entries.
 *
 * @private helper of `readInternalS3Directory`
 */
const INTERNAL_S3_BROWSER_ENTRY_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

/**
 * Normalized relative and absolute S3 prefixes for one browser request.
 *
 * @private helper type of `readInternalS3Directory`
 */
type InternalS3BrowserPrefix = {
    /**
     * Configured root prefix, with a trailing slash when present.
     */
    readonly rootPrefix: string;

    /**
     * Relative browser prefix below the configured root prefix.
     */
    readonly relativePrefix: string;

    /**
     * Absolute S3 prefix sent to `ListObjectsV2`.
     */
    readonly absolutePrefix: string;

    /**
     * Relative prefix of the parent directory, or `null` at the browser root.
     */
    readonly parentPrefix: string | null;
};

/**
 * Reads one directory level from the configured internal S3 path prefix.
 *
 * @param configuration - Internal S3 configuration.
 * @param rawRelativePrefix - Browser prefix from the URL query.
 * @returns Directory listing snapshot.
 * @private internal utility of the `/admin/internal-s3` page
 */
export async function readInternalS3Directory(
    configuration: InternalS3Configuration,
    rawRelativePrefix?: string,
): Promise<InternalS3BrowserSnapshot> {
    const prefix = normalizeInternalS3BrowserPrefix(rawRelativePrefix, configuration.pathPrefix);

    if (!configuration.isSelfContainedS3Selected) {
        return createUnavailableInternalS3BrowserSnapshot(
            prefix,
            'Self-contained S3 is not the active storage for this server.',
        );
    }

    if (!configuration.isS3StorageConfigured) {
        return createUnavailableInternalS3BrowserSnapshot(
            prefix,
            'Self-contained S3 is selected but not fully configured.',
        );
    }

    const s3Client = createInternalS3Client(configuration);
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), INTERNAL_S3_BROWSER_TIMEOUT_MS);

    try {
        const response = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: configuration.bucket!,
                Prefix: prefix.absolutePrefix || undefined,
                Delimiter: INTERNAL_S3_DIRECTORY_DELIMITER,
                MaxKeys: INTERNAL_S3_BROWSER_MAX_KEYS,
            }),
            { abortSignal: abortController.signal },
        );

        return {
            relativePrefix: prefix.relativePrefix,
            absolutePrefix: prefix.absolutePrefix,
            parentPrefix: prefix.parentPrefix,
            isAvailable: true,
            entries: sortInternalS3BrowserEntries([
                ...createInternalS3DirectoryEntries(response.CommonPrefixes ?? [], prefix),
                ...createInternalS3FileEntries(response.Contents ?? [], prefix, configuration),
            ]),
            isTruncated: response.IsTruncated === true,
            errorMessage: null,
        };
    } catch (error) {
        return createUnavailableInternalS3BrowserSnapshot(
            prefix,
            resolveInternalS3ErrorMessage(error, { timeoutMs: INTERNAL_S3_BROWSER_TIMEOUT_MS }),
        );
    } finally {
        clearTimeout(timeoutHandle);
        s3Client.destroy();
    }
}

/**
 * Normalizes a browser prefix while keeping the listing inside the configured root prefix.
 *
 * @param rawRelativePrefix - Browser prefix from the URL query.
 * @param configuredPathPrefix - Configured S3 path prefix.
 * @returns Normalized browser prefixes.
 * @private helper of `readInternalS3Directory`
 */
export function normalizeInternalS3BrowserPrefix(
    rawRelativePrefix: string | null | undefined,
    configuredPathPrefix: string | null,
): InternalS3BrowserPrefix {
    const rootPrefix = normalizeInternalS3PrefixText(configuredPathPrefix);
    const relativePrefix = normalizeInternalS3PrefixText(rawRelativePrefix);
    const absolutePrefix = joinInternalS3PrefixParts(rootPrefix, relativePrefix);

    return {
        rootPrefix,
        relativePrefix,
        absolutePrefix,
        parentPrefix: resolveInternalS3ParentPrefix(relativePrefix),
    };
}

/**
 * Creates a browser snapshot for skipped or failed listings.
 *
 * @param prefix - Normalized browser prefixes.
 * @param errorMessage - Human-readable failure reason.
 * @returns Unavailable browser snapshot.
 * @private helper of `readInternalS3Directory`
 */
function createUnavailableInternalS3BrowserSnapshot(
    prefix: InternalS3BrowserPrefix,
    errorMessage: string,
): InternalS3BrowserSnapshot {
    return {
        relativePrefix: prefix.relativePrefix,
        absolutePrefix: prefix.absolutePrefix,
        parentPrefix: prefix.parentPrefix,
        isAvailable: false,
        entries: [],
        isTruncated: false,
        errorMessage,
    };
}

/**
 * Converts common prefixes from S3 into directory entries.
 *
 * @param commonPrefixes - S3 common prefixes.
 * @param prefix - Normalized browser prefixes.
 * @returns Directory entries.
 * @private helper of `readInternalS3Directory`
 */
function createInternalS3DirectoryEntries(
    commonPrefixes: ReadonlyArray<{ readonly Prefix?: string }>,
    prefix: InternalS3BrowserPrefix,
): InternalS3BrowserEntry[] {
    return commonPrefixes.flatMap((commonPrefix) => {
        const key = commonPrefix.Prefix;
        if (!key) {
            return [];
        }

        const relativePrefix = stripInternalS3RootPrefix(key, prefix.rootPrefix);
        const name = getInternalS3PrefixName(relativePrefix);
        if (!name) {
            return [];
        }

        return [
            {
                kind: 'directory',
                key,
                name,
                relativePrefix,
                sizeBytes: null,
                lastModified: null,
                publicUrl: null,
            },
        ];
    });
}

/**
 * Converts S3 objects into file entries for the current directory level.
 *
 * @param objects - S3 object summaries.
 * @param prefix - Normalized browser prefixes.
 * @param configuration - Internal S3 configuration.
 * @returns File entries.
 * @private helper of `readInternalS3Directory`
 */
function createInternalS3FileEntries(
    objects: ReadonlyArray<{ readonly Key?: string; readonly LastModified?: Date; readonly Size?: number }>,
    prefix: InternalS3BrowserPrefix,
    configuration: InternalS3Configuration,
): InternalS3BrowserEntry[] {
    return objects.flatMap((object) => {
        const key = object.Key;
        if (!key || key === prefix.absolutePrefix || key.endsWith(INTERNAL_S3_DIRECTORY_DELIMITER)) {
            return [];
        }

        const name = key.slice(prefix.absolutePrefix.length);
        if (!name || name.includes(INTERNAL_S3_DIRECTORY_DELIMITER)) {
            return [];
        }

        return [
            {
                kind: 'file',
                key,
                name,
                relativePrefix: null,
                sizeBytes: object.Size ?? 0,
                lastModified: object.LastModified?.toISOString() ?? null,
                publicUrl: createInternalS3ObjectPublicUrl(configuration, key),
            },
        ];
    });
}

/**
 * Sorts directories first and then files by display name.
 *
 * @param entries - Unsorted entries.
 * @returns Sorted entries.
 * @private helper of `readInternalS3Directory`
 */
function sortInternalS3BrowserEntries(entries: ReadonlyArray<InternalS3BrowserEntry>): InternalS3BrowserEntry[] {
    return [...entries].sort((firstEntry, secondEntry) => {
        if (firstEntry.kind !== secondEntry.kind) {
            return firstEntry.kind === 'directory' ? -1 : 1;
        }

        return INTERNAL_S3_BROWSER_ENTRY_COLLATOR.compare(firstEntry.name, secondEntry.name);
    });
}

/**
 * Normalizes one S3 prefix string.
 *
 * @param value - Raw prefix text.
 * @returns Normalized prefix with a trailing slash when not empty.
 * @private helper of `readInternalS3Directory`
 */
function normalizeInternalS3PrefixText(value: string | null | undefined): string {
    const normalizedValue = value?.trim().replace(/\\/g, INTERNAL_S3_DIRECTORY_DELIMITER) ?? '';
    const segments = normalizedValue
        .split(INTERNAL_S3_DIRECTORY_DELIMITER)
        .map((segment) => segment.trim())
        .filter(Boolean);

    if (segments.some((segment) => segment === '.' || segment === '..')) {
        return '';
    }

    return segments.length > 0 ? `${segments.join(INTERNAL_S3_DIRECTORY_DELIMITER)}/` : '';
}

/**
 * Joins configured root and relative browser prefixes.
 *
 * @param rootPrefix - Configured root prefix.
 * @param relativePrefix - Relative browser prefix.
 * @returns Absolute S3 prefix.
 * @private helper of `readInternalS3Directory`
 */
function joinInternalS3PrefixParts(rootPrefix: string, relativePrefix: string): string {
    if (!rootPrefix) {
        return relativePrefix;
    }

    return `${rootPrefix}${relativePrefix}`;
}

/**
 * Resolves the parent prefix for breadcrumb and parent-folder links.
 *
 * @param relativePrefix - Current relative prefix.
 * @returns Parent relative prefix, or `null` at root.
 * @private helper of `readInternalS3Directory`
 */
function resolveInternalS3ParentPrefix(relativePrefix: string): string | null {
    const segments = relativePrefix
        .replace(/\/+$/u, '')
        .split(INTERNAL_S3_DIRECTORY_DELIMITER)
        .filter(Boolean);

    if (segments.length === 0) {
        return null;
    }

    segments.pop();
    return segments.length > 0 ? `${segments.join(INTERNAL_S3_DIRECTORY_DELIMITER)}/` : '';
}

/**
 * Converts an absolute S3 prefix into a browser-relative prefix.
 *
 * @param key - Absolute S3 prefix.
 * @param rootPrefix - Configured root prefix.
 * @returns Relative prefix.
 * @private helper of `readInternalS3Directory`
 */
function stripInternalS3RootPrefix(key: string, rootPrefix: string): string {
    if (!rootPrefix || !key.startsWith(rootPrefix)) {
        return key;
    }

    return key.slice(rootPrefix.length);
}

/**
 * Resolves display name for a directory prefix.
 *
 * @param prefix - Relative directory prefix.
 * @returns Last path segment.
 * @private helper of `readInternalS3Directory`
 */
function getInternalS3PrefixName(prefix: string): string {
    const segments = prefix
        .replace(/\/+$/u, '')
        .split(INTERNAL_S3_DIRECTORY_DELIMITER)
        .filter(Boolean);

    return segments.at(-1) ?? '';
}

/**
 * Builds a public object URL from the configured internal S3 public base URL.
 *
 * @param configuration - Internal S3 configuration.
 * @param key - Absolute S3 object key.
 * @returns Public URL, or `null` when it cannot be constructed.
 * @private helper of `readInternalS3Directory`
 */
function createInternalS3ObjectPublicUrl(configuration: InternalS3Configuration, key: string): string | null {
    if (!configuration.publicUrl) {
        return null;
    }

    try {
        const baseUrl = new URL(configuration.publicUrl);
        if (!baseUrl.pathname.endsWith(INTERNAL_S3_DIRECTORY_DELIMITER)) {
            baseUrl.pathname = `${baseUrl.pathname}${INTERNAL_S3_DIRECTORY_DELIMITER}`;
        }

        const encodedKey = key.split(INTERNAL_S3_DIRECTORY_DELIMITER).map(encodeURIComponent).join('/');
        return new URL(encodedKey, baseUrl).href;
    } catch {
        return null;
    }
}
