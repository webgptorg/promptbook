import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    getDefaultCoderPromptTemplateDefinition,
    getDefaultCoderPromptTemplateDefinitions,
    resolveCoderPromptTemplate,
} from './boilerplateTemplates';
import { initializeCoderProjectConfiguration } from './init';

/**
 * Creates and tracks one temporary directory for filesystem-based CLI tests.
 */
async function createTemporaryDirectory(trackedDirectories: Array<string>): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'promptbook-coder-'));
    trackedDirectories.push(directory);
    return directory;
}

/**
 * Normalizes text files to LF line endings before assertions.
 */
function normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/gu, '\n');
}

describe('coder boilerplate templates', () => {
    let temporaryDirectories: Array<string>;

    beforeEach(() => {
        temporaryDirectories = [];
    });

    afterEach(async () => {
        await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
    });

    it('keeps Promptbook project template files in sync with built-in defaults', async () => {
        for (const definition of getDefaultCoderPromptTemplateDefinitions()) {
            const content = await readFile(join(process.cwd(), definition.relativeFilePath), 'utf-8');
            expect(normalizeLineEndings(content).trim()).toBe(definition.content);
        }
    });

    it('creates the default template files during coder init', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        const summary = await initializeCoderProjectConfiguration(projectPath);

        expect(summary.promptsTemplatesDirectoryStatus).toBe('created');
        expect(summary.promptTemplateFileStatuses).toEqual(
            getDefaultCoderPromptTemplateDefinitions().map(({ id, relativeFilePath }) => ({
                id,
                relativeFilePath,
                status: 'created',
            })),
        );

        for (const definition of getDefaultCoderPromptTemplateDefinitions()) {
            const content = await readFile(join(projectPath, definition.relativeFilePath), 'utf-8');
            expect(normalizeLineEndings(content).trim()).toBe(definition.content);
        }
    });

    it('resolves template files relative to the project root', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const relativeTemplatePath = 'foo/bar/custom.template.md';

        await mkdir(join(projectPath, 'foo', 'bar'), { recursive: true });
        await writeFile(join(projectPath, 'foo', 'bar', 'custom.template.md'), 'Custom template\n', 'utf-8');

        const template = await resolveCoderPromptTemplate({
            projectPath,
            templateOption: relativeTemplatePath,
        });

        expect(template).toEqual({
            identifier: relativeTemplatePath,
            relativeFilePath: relativeTemplatePath,
            content: 'Custom template',
            slugPrefix: 'custom',
        });
    });

    it('resolves built-in aliases without requiring initialized project files', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        const template = await resolveCoderPromptTemplate({
            projectPath,
            templateOption: 'agents-server',
        });

        expect(template.content).toBe(getDefaultCoderPromptTemplateDefinition('agents-server').content);
        expect(template.slugPrefix).toBe('agents-server');
        expect(template.relativeFilePath).toBe(join('prompts', 'templates', 'agents-server.md'));
    });
});
