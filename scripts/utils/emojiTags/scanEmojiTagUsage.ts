import { readFileSync, statSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { join, relative } from 'path';
import type { string_char_emoji } from '../../../src/types/typeAliasEmoji';
import { escapeRegExp } from '../../../src/utils/chat/escapeRegExp';

/**
 * Default file globs scanned for emoji tags.
 */
const DEFAULT_INCLUDE_GLOBS = ['**/*.{ts,tsx,js,jsx,json,md,txt}'];

/**
 * Default ignored paths while scanning the repository.
 */
const DEFAULT_IGNORE_GLOBS = ['**/node_modules/**', '**/.git/**', '**/.promptbook/ptbk-coder/**'];

/**
 * Directory used for Promptbook coder runtime caches.
 */
const PTBK_CODER_CACHE_DIRECTORY_PATH = '.promptbook/ptbk-coder';

/**
 * Relative cache file path storing per-file emoji-tag scan results.
 */
const EMOJI_TAG_SCAN_CACHE_FILE_PATH = `${PTBK_CODER_CACHE_DIRECTORY_PATH}/emoji-tag-scan-cache.json`;

/**
 * Current schema version of the persisted emoji-tag scan cache.
 */
const EMOJI_TAG_SCAN_CACHE_VERSION = 1;

/**
 * Options controlling one repository emoji-tag scan.
 */
export type EmojiTagScanOptions = {
    /**
     * Candidate emojis that may appear inside bracketed tags.
     */
    readonly candidateEmojis: ReadonlySet<string_char_emoji>;

    /**
     * Root directory to scan (defaults to `process.cwd()`).
     */
    readonly rootDir?: string;

    /**
     * Glob patterns to include when scanning for tags.
     */
    readonly includeGlobs?: ReadonlyArray<string>;

    /**
     * Glob patterns to ignore when scanning for tags.
     */
    readonly ignoreGlobs?: ReadonlyArray<string>;

    /**
     * Exact prefix expected before the emoji inside the brackets.
     */
    readonly tagPrefix?: string;

    /**
     * Optional error handler for best-effort scans that should skip unreadable files.
     */
    readonly onFileError?: (error: Error, filePath: string) => void;
};

/**
 * Result of one repository emoji-tag scan.
 */
export type EmojiTagScanResult = {
    /**
     * Emojis already used inside matching bracketed tags.
     */
    readonly usedEmojis: ReadonlySet<string_char_emoji>;

    /**
     * Number of files whose content had to be read during this run.
     */
    readonly scannedFileCount: number;

    /**
     * Number of files satisfied purely from the persisted cache.
     */
    readonly reusedFileCount: number;
};

/**
 * One persisted cache file record.
 */
type EmojiTagScanCacheFile = {
    readonly mtimeMs: number;
    readonly size: number;
    readonly tagsByPrefix: Readonly<Record<string, ReadonlyArray<string_char_emoji>>>;
};

/**
 * Full persisted cache payload for repository emoji-tag scans.
 */
type EmojiTagScanCache = {
    readonly version: number;
    readonly files: Readonly<Record<string, EmojiTagScanCacheFile>>;
};

/**
 * Scans repository files for bracketed emoji tags while reusing per-file cache entries for unchanged files.
 */
export async function scanEmojiTagUsage(options: EmojiTagScanOptions): Promise<EmojiTagScanResult> {
    const rootDir = options.rootDir ?? process.cwd();
    const includeGlobs = options.includeGlobs ?? DEFAULT_INCLUDE_GLOBS;
    const ignoreGlobs = options.ignoreGlobs ?? DEFAULT_IGNORE_GLOBS;
    const tagPrefix = options.tagPrefix ?? '';
    const filesToScan = await findFilesToScan(rootDir, includeGlobs, ignoreGlobs);
    const matcher = buildEmojiTagMatcher(options.candidateEmojis, tagPrefix);
    const usedEmojis = new Set<string_char_emoji>();
    const existingCache = await readEmojiTagScanCache(rootDir);
    const nextCacheFiles: Record<string, EmojiTagScanCacheFile> = { ...existingCache.files };
    let isCacheDirty = false;
    let scannedFileCount = 0;
    let reusedFileCount = 0;

    for (const filePath of filesToScan) {
        try {
            const fileStats = statSync(filePath);
            const cacheKey = toCacheKey(rootDir, filePath);
            const cachedFile = nextCacheFiles[cacheKey];
            const cachedEmojis = getCachedFileEmojis(cachedFile, fileStats.mtimeMs, fileStats.size, tagPrefix);

            if (cachedEmojis) {
                reusedFileCount += 1;
                addEmojis(usedEmojis, cachedEmojis);
                continue;
            }

            const fileContent = readFileSync(filePath, 'utf-8'); /* Note: sync file reads are fine for local tooling. */
            const scannedEmojis = scanFileForEmojiTags(fileContent, matcher);
            addEmojis(usedEmojis, scannedEmojis);
            nextCacheFiles[cacheKey] = updateCachedFile(
                cachedFile,
                fileStats.mtimeMs,
                fileStats.size,
                tagPrefix,
                scannedEmojis,
            );
            scannedFileCount += 1;
            isCacheDirty = true;
        } catch (error) {
            if (options.onFileError) {
                options.onFileError(normalizeError(error), filePath);
                continue;
            }

            throw error;
        }
    }

    if (isCacheDirty) {
        await writeEmojiTagScanCache(rootDir, {
            version: EMOJI_TAG_SCAN_CACHE_VERSION,
            files: nextCacheFiles,
        });
    }

    return {
        usedEmojis,
        scannedFileCount,
        reusedFileCount,
    };
}

/**
 * Resolves files to scan for matching emoji tags.
 */
async function findFilesToScan(
    rootDir: string,
    includeGlobs: ReadonlyArray<string>,
    ignoreGlobs: ReadonlyArray<string>,
): Promise<ReadonlyArray<string>> {
    const files = new Set<string>();

    for (const pattern of includeGlobs) {
        const matches = await glob(pattern, {
            cwd: rootDir,
            ignore: Array.from(new Set([...ignoreGlobs, ...DEFAULT_IGNORE_GLOBS])),
            nodir: true,
            absolute: true,
        });

        for (const match of matches) {
            files.add(match);
        }
    }

    return Array.from(files);
}

/**
 * Builds a regex that matches one exact bracketed emoji-tag form.
 */
function buildEmojiTagMatcher(candidateEmojis: ReadonlySet<string_char_emoji>, tagPrefix: string): RegExp {
    const escapedEmojiAlternatives = Array.from(candidateEmojis)
        .sort((leftEmoji, rightEmoji) => rightEmoji.length - leftEmoji.length)
        .map((emoji) => escapeRegExp(emoji))
        .join('|');

    if (escapedEmojiAlternatives === '') {
        return /$^/u;
    }

    return new RegExp(`\\[${escapeRegExp(tagPrefix)}(?<emoji>${escapedEmojiAlternatives})\\]`, 'gu');
}

/**
 * Extracts matching emojis from one file content.
 */
function scanFileForEmojiTags(fileContent: string, matcher: RegExp): ReadonlyArray<string_char_emoji> {
    matcher.lastIndex = 0;
    const matchedEmojis = new Set<string_char_emoji>();

    for (const match of fileContent.matchAll(matcher)) {
        const emoji = match.groups?.emoji;
        if (emoji) {
            matchedEmojis.add(emoji as string_char_emoji);
        }
    }

    return Array.from(matchedEmojis);
}

/**
 * Returns cached emojis when the file metadata still matches the stored cache entry.
 */
function getCachedFileEmojis(
    cachedFile: EmojiTagScanCacheFile | undefined,
    mtimeMs: number,
    size: number,
    tagPrefix: string,
): ReadonlyArray<string_char_emoji> | undefined {
    if (!cachedFile || cachedFile.mtimeMs !== mtimeMs || cachedFile.size !== size) {
        return undefined;
    }

    const cachedEmojis = cachedFile.tagsByPrefix[tagPrefix];
    return Array.isArray(cachedEmojis) ? cachedEmojis : undefined;
}

/**
 * Stores the latest scan result for one file while preserving other prefix caches when the file revision is unchanged.
 */
function updateCachedFile(
    cachedFile: EmojiTagScanCacheFile | undefined,
    mtimeMs: number,
    size: number,
    tagPrefix: string,
    emojis: ReadonlyArray<string_char_emoji>,
): EmojiTagScanCacheFile {
    const isSameFileRevision = cachedFile?.mtimeMs === mtimeMs && cachedFile.size === size;

    return {
        mtimeMs,
        size,
        tagsByPrefix: {
            ...(isSameFileRevision ? cachedFile.tagsByPrefix : {}),
            [tagPrefix]: [...emojis],
        },
    };
}

/**
 * Loads the persisted emoji-tag scan cache and falls back to an empty cache when it is missing or invalid.
 */
async function readEmojiTagScanCache(rootDir: string): Promise<EmojiTagScanCache> {
    try {
        const cacheContent = await readFile(join(rootDir, EMOJI_TAG_SCAN_CACHE_FILE_PATH), 'utf-8');
        return normalizeEmojiTagScanCache(JSON.parse(cacheContent));
    } catch {
        return createEmptyEmojiTagScanCache();
    }
}

/**
 * Persists the updated emoji-tag scan cache as a best-effort optimization.
 */
async function writeEmojiTagScanCache(rootDir: string, cache: EmojiTagScanCache): Promise<void> {
    try {
        await mkdir(join(rootDir, PTBK_CODER_CACHE_DIRECTORY_PATH), { recursive: true });
        await writeFile(join(rootDir, EMOJI_TAG_SCAN_CACHE_FILE_PATH), `${JSON.stringify(cache, null, 2)}\n`, 'utf-8');
    } catch {
        // Note: Cache writes are only an optimization; scanning still succeeds when the cache cannot be written.
    }
}

/**
 * Normalizes one parsed cache payload into the current typed cache shape.
 */
function normalizeEmojiTagScanCache(value: unknown): EmojiTagScanCache {
    if (!isPlainObject(value) || value.version !== EMOJI_TAG_SCAN_CACHE_VERSION || !isPlainObject(value.files)) {
        return createEmptyEmojiTagScanCache();
    }

    const files: Record<string, EmojiTagScanCacheFile> = {};

    for (const [filePath, cachedValue] of Object.entries(value.files)) {
        if (!isPlainObject(cachedValue)) {
            continue;
        }

        const { mtimeMs, size, tagsByPrefix } = cachedValue;
        if (typeof mtimeMs !== 'number' || typeof size !== 'number' || !isPlainObject(tagsByPrefix)) {
            continue;
        }

        const normalizedTagsByPrefix: Record<string, ReadonlyArray<string_char_emoji>> = {};
        for (const [tagPrefix, cachedEmojis] of Object.entries(tagsByPrefix)) {
            if (!Array.isArray(cachedEmojis)) {
                continue;
            }

            normalizedTagsByPrefix[tagPrefix] = cachedEmojis.filter(
                (emoji): emoji is string_char_emoji => typeof emoji === 'string',
            );
        }

        files[filePath] = {
            mtimeMs,
            size,
            tagsByPrefix: normalizedTagsByPrefix,
        };
    }

    return {
        version: EMOJI_TAG_SCAN_CACHE_VERSION,
        files,
    };
}

/**
 * Creates an empty cache payload for emoji-tag scans.
 */
function createEmptyEmojiTagScanCache(): EmojiTagScanCache {
    return {
        version: EMOJI_TAG_SCAN_CACHE_VERSION,
        files: {},
    };
}

/**
 * Converts an absolute file path into a stable cache key relative to the scanned root.
 */
function toCacheKey(rootDir: string, filePath: string): string {
    return relative(rootDir, filePath).replace(/\\/gu, '/');
}

/**
 * Adds multiple emojis into one target set.
 */
function addEmojis(target: Set<string_char_emoji>, emojis: ReadonlyArray<string_char_emoji>): void {
    for (const emoji of emojis) {
        target.add(emoji);
    }
}

/**
 * Checks whether one unknown JSON value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalizes thrown values into proper `Error` objects for optional callbacks.
 */
function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

// Note: [?] Code in this file should never be published in any package
