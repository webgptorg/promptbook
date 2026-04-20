import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { string_char_emoji } from '../../../src/types/typeAliasEmoji';
import { scanEmojiTagUsage } from './scanEmojiTagUsage';

/**
 * Relative cache file path written by the emoji-tag scanner.
 */
const EMOJI_TAG_SCAN_CACHE_FILE_PATH = join('.promptbook', 'ptbk-coder', 'emoji-tag-scan-cache.json');

/**
 * Creates and tracks one temporary directory for filesystem-based emoji-tag scan tests.
 */
async function createTemporaryDirectory(trackedDirectories: Array<string>): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'promptbook-emoji-tag-scan-'));
    trackedDirectories.push(directory);
    return directory;
}

/**
 * Creates a small set of candidate emojis for focused test scans.
 */
function createCandidateEmojiSet(...emojis: ReadonlyArray<string>): ReadonlySet<string_char_emoji> {
    return new Set(emojis as ReadonlyArray<string_char_emoji>);
}

/**
 * Turns a scan result into a sorted array for stable assertions.
 */
function sortEmojis(emojis: ReadonlySet<string_char_emoji>): Array<string> {
    return Array.from(emojis).sort();
}

describe('scanEmojiTagUsage', () => {
    let temporaryDirectories: Array<string>;

    beforeEach(() => {
        temporaryDirectories = [];
        jest.restoreAllMocks();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
    });

    it('reuses cached scan results for unchanged files', async () => {
        const rootDir = await createTemporaryDirectory(temporaryDirectories);
        const filePath = join(rootDir, 'notes.md');
        await writeFile(filePath, 'First tag [✨😀]\n', 'utf-8');

        const firstScan = await scanEmojiTagUsage({
            rootDir,
            tagPrefix: '✨',
            candidateEmojis: createCandidateEmojiSet('😀', '😃'),
        });

        expect(sortEmojis(firstScan.usedEmojis)).toEqual(['😀']);
        expect(firstScan.scannedFileCount).toBe(1);
        expect(firstScan.reusedFileCount).toBe(0);

        const secondScan = await scanEmojiTagUsage({
            rootDir,
            tagPrefix: '✨',
            candidateEmojis: createCandidateEmojiSet('😀', '😃'),
        });

        expect(sortEmojis(secondScan.usedEmojis)).toEqual(['😀']);
        expect(secondScan.scannedFileCount).toBe(0);
        expect(secondScan.reusedFileCount).toBe(1);

        const cacheContent = await readFile(join(rootDir, EMOJI_TAG_SCAN_CACHE_FILE_PATH), 'utf-8');
        expect(cacheContent).toContain('"notes.md"');
        expect(cacheContent).toContain('😀');
    });

    it('rescans files after content changes and refreshes the cached emojis', async () => {
        const rootDir = await createTemporaryDirectory(temporaryDirectories);
        const filePath = join(rootDir, 'notes.md');
        await writeFile(filePath, 'Initial tag [✨😀]\n', 'utf-8');

        await scanEmojiTagUsage({
            rootDir,
            tagPrefix: '✨',
            candidateEmojis: createCandidateEmojiSet('😀', '😃'),
        });

        await writeFile(filePath, 'Updated tag [✨😃]\n', 'utf-8');
        const updatedFileStats = await stat(filePath);
        const updatedTime = new Date(updatedFileStats.mtimeMs + 1000);
        await utimes(filePath, updatedTime, updatedTime);

        const updatedScan = await scanEmojiTagUsage({
            rootDir,
            tagPrefix: '✨',
            candidateEmojis: createCandidateEmojiSet('😀', '😃'),
        });

        expect(sortEmojis(updatedScan.usedEmojis)).toEqual(['😃']);
        expect(updatedScan.scannedFileCount).toBe(1);
        expect(updatedScan.reusedFileCount).toBe(0);
    });

    it('supports scans without any tag prefix for plain `[emoji]` tags', async () => {
        const rootDir = await createTemporaryDirectory(temporaryDirectories);
        await writeFile(join(rootDir, 'plain-tags.md'), 'Plain tag [😀]\n', 'utf-8');

        const scanResult = await scanEmojiTagUsage({
            rootDir,
            tagPrefix: '',
            candidateEmojis: createCandidateEmojiSet('😀', '😃'),
        });

        expect(sortEmojis(scanResult.usedEmojis)).toEqual(['😀']);
    });
});
