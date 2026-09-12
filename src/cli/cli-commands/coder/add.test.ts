import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Command } from 'commander';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { $initializeCoderAddCommand, addCoderPrompt } from './add';

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
            description: spaceTrim(`
                First line summary
                Second line detail
                Third line detail
            `),
            priority: 0,
        });
        const { content } = await readOnlyPromptFile(projectPath);

        expect(content).toContain(`${result.emojiTag} First line summary\n`);
        expect(content).toContain(
            spaceTrim(`
            Second line detail
            Third line detail
        `),
        );
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
});

describe('$initializeCoderAddCommand', () => {
    const originalStandardInputIsTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    let processExitSpy: jest.SpiedFunction<typeof process.exit>;
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
        // Note: An interactive terminal is emulated, so a missing description would be asked for without `--no-questions`
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        if (originalStandardInputIsTtyDescriptor === undefined) {
            Reflect.deleteProperty(process.stdin, 'isTTY');
        } else {
            Object.defineProperty(process.stdin, 'isTTY', originalStandardInputIsTtyDescriptor);
        }

        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('refuses a missing description instead of asking for it when --no-questions is used', async () => {
        const program = new Command();
        $initializeCoderAddCommand(program);

        await program.parseAsync(['node', 'test', 'add', '--no-questions'], { from: 'node' });

        expect(processExitSpy).toHaveBeenCalledWith(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('--no-questions'));
    });
});
