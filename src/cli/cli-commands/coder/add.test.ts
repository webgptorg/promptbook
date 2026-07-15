import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { addCoderPrompt } from './add';

/**
 * Creates and tracks one temporary directory for filesystem-based CLI tests.
 */
async function createTemporaryDirectory(trackedDirectories: Array<string>): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'promptbook-coder-add-'));
    trackedDirectories.push(directory);
    return directory;
}

/**
 * Normalizes text files to LF line endings before assertions.
 */
function normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/gu, '\n');
}

/**
 * Reads the single prompt file written into `prompts/` of a temporary project.
 */
async function readOnlyPromptFile(projectPath: string): Promise<{ readonly name: string; readonly content: string }> {
    const promptFiles = (await readdir(join(projectPath, 'prompts'))).filter((name) => name.endsWith('.md'));
    expect(promptFiles).toHaveLength(1);
    const name = promptFiles[0]!;
    const content = normalizeLineEndings(await readFile(join(projectPath, 'prompts', name), 'utf-8'));
    return { name, content };
}

describe('addCoderPrompt', () => {
    let temporaryDirectories: Array<string>;

    beforeEach(() => {
        temporaryDirectories = [];
    });

    afterEach(async () => {
        await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
    });

    it('writes one ready-to-run prompt with the description as the title and the template rules below', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        const result = await addCoderPrompt({ projectPath, description: 'Add a dark mode toggle', priority: 0 });
        const { name, content } = await readOnlyPromptFile(projectPath);

        expect(content.startsWith('[ ]\n')).toBe(true);
        expect(content).toContain(`${result.emojiTag} Add a dark mode toggle`);
        expect(content).toContain('Keep in mind the DRY');
        expect(content).not.toContain('@@@');
        expect(result.emojiTag).toMatch(/^\[✨.+\]$/u);
        expect(name).toContain('add-a-dark-mode-toggle');
        expect(result.filePath).toBe(join('prompts', name));
    });

    it('renders the priority as trailing "!" markers', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        await addCoderPrompt({ projectPath, description: 'Task with priority', priority: 2 });
        const { content } = await readOnlyPromptFile(projectPath);

        expect(content.startsWith('[ ] !!\n')).toBe(true);
    });

    it('keeps the first description line as the title and the rest as the body for multiline input', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        const result = await addCoderPrompt({
            projectPath,
            description: 'First line summary\nSecond line detail\nThird line detail',
            priority: 0,
        });
        const { content } = await readOnlyPromptFile(projectPath);

        expect(content).toContain(`${result.emojiTag} First line summary\n`);
        expect(content).toContain('Second line detail\nThird line detail');
    });

    it('throws a branded ParseError for an empty description', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        await expect(addCoderPrompt({ projectPath, description: '   ', priority: 0 })).rejects.toMatchObject({
            name: 'ParseError',
        });
    });

    it('assigns a fresh unique emoji tag and the next sequential number to each added prompt', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        const first = await addCoderPrompt({ projectPath, description: 'First feature', priority: 0 });
        const second = await addCoderPrompt({ projectPath, description: 'Second feature', priority: 0 });

        expect(first.emojiTag).not.toBe(second.emojiTag);

        const promptFiles = (await readdir(join(projectPath, 'prompts'))).filter((name) => name.endsWith('.md')).sort();
        expect(promptFiles).toHaveLength(2);
        expect(promptFiles[0]).toContain('-0000-');
        expect(promptFiles[1]).toContain('-0010-');
    });

    it('uses the requested built-in template slug prefix and rules', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        await addCoderPrompt({
            projectPath,
            description: 'Server tweak',
            priority: 0,
            templateOption: 'agents-server',
        });
        const { name, content } = await readOnlyPromptFile(projectPath);

        expect(name).toContain('agents-server-server-tweak');
        expect(content).toContain('You are working with the [Agents Server](apps/agents-server)');
        expect(content).not.toContain('@@@');
    });
});
