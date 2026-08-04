import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DEFAULT_BOILERPLATE_COUNT } from './boilerplateCount';
import { generatePromptBoilerplate } from './generate-boilerplates';

/**
 * Creates and tracks one temporary directory for filesystem-based CLI tests.
 */
async function createTemporaryDirectory(trackedDirectories: Array<string>): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'promptbook-coder-boilerplates-'));
    trackedDirectories.push(directory);
    return directory;
}

/**
 * Reads all generated prompt files of a temporary project, normalized to LF line endings.
 */
async function readGeneratedPromptFiles(projectPath: string): Promise<ReadonlyArray<string>> {
    const promptsDirectory = join(projectPath, 'prompts');
    const promptFileNames = (await readdir(promptsDirectory)).filter((name) => name.endsWith('.md')).sort();

    return Promise.all(
        promptFileNames.map(async (name) =>
            (await readFile(join(promptsDirectory, name), 'utf-8')).replace(/\r\n/gu, '\n'),
        ),
    );
}

/**
 * Lists all emoji tags used in one generated prompt file.
 */
function listEmojiTags(content: string): ReadonlyArray<string> {
    return content.match(/\[✨[^\]]+\]/gu) ?? [];
}

describe('generatePromptBoilerplate', () => {
    let temporaryDirectories: Array<string>;

    beforeEach(() => {
        temporaryDirectories = [];
    });

    afterEach(async () => {
        await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
    });

    it('generates one prompt in each file by default', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        await generatePromptBoilerplate({ projectPath, boilerplateCount: DEFAULT_BOILERPLATE_COUNT });
        const promptFileContents = await readGeneratedPromptFiles(projectPath);

        expect(promptFileContents).toHaveLength(DEFAULT_BOILERPLATE_COUNT.filesCount);
        for (const content of promptFileContents) {
            expect(content.startsWith('[-]\n')).toBe(true);
            expect(content).not.toContain('\n---\n');
            expect(listEmojiTags(content)).toHaveLength(1);
        }
    });

    it('generates N files with M prompts each and gives every prompt its own fresh emoji tag', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        await generatePromptBoilerplate({
            projectPath,
            boilerplateCount: { filesCount: 3, promptsPerFileCount: 4 },
        });
        const promptFileContents = await readGeneratedPromptFiles(projectPath);

        expect(promptFileContents).toHaveLength(3);

        const allEmojiTags: Array<string> = [];
        for (const content of promptFileContents) {
            const emojiTags = listEmojiTags(content);
            expect(emojiTags).toHaveLength(4);
            expect(content.split('\n---\n')).toHaveLength(4);
            allEmojiTags.push(...emojiTags);
        }

        expect(new Set(allEmojiTags).size).toBe(3 * 4);
    });
});
