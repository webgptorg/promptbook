import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AGENTS_FILE_PATH, getDefaultCoderAgentsFileContent } from './agentsFile';
import {
    getDefaultCoderPromptTemplateDefinition,
    getDefaultCoderPromptTemplateDefinitions,
    getDefaultCoderProjectPromptTemplateDefinitions,
    resolveCoderPromptTemplate,
} from './boilerplateTemplates';
import {
    getDefaultCoderPackageJsonScripts,
    getDefaultCoderVscodeSettings,
    initializeCoderProjectConfiguration,
} from './init';

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

/**
 * Reads and parses one JSON file for filesystem-based CLI assertions.
 */
async function readJsonFile<TValue>(filePath: string): Promise<TValue> {
    return JSON.parse(await readFile(filePath, 'utf-8')) as TValue;
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
        expect(summary.agentsFileStatus).toBe('created');
        expect(summary.gitignoreFileStatus).toBe('created');
        expect(summary.packageJsonFileStatus).toBe('created');
        expect(summary.vscodeSettingsFileStatus).toBe('created');
        expect(summary.promptTemplateFileStatuses).toEqual(
            getDefaultCoderProjectPromptTemplateDefinitions().map(({ id, relativeFilePath }) => ({
                id,
                relativeFilePath,
                status: 'created',
            })),
        );

        for (const definition of getDefaultCoderProjectPromptTemplateDefinitions()) {
            const content = await readFile(join(projectPath, definition.relativeFilePath), 'utf-8');
            expect(normalizeLineEndings(content).trim()).toBe(definition.content);
        }

        const agentsFileContent = await readFile(join(projectPath, AGENTS_FILE_PATH), 'utf-8');
        expect(normalizeLineEndings(agentsFileContent).trim()).toBe(getDefaultCoderAgentsFileContent());

        await expect(readFile(join(projectPath, 'prompts', 'templates', 'agents-server.md'), 'utf-8')).rejects.toThrow();

        const gitignoreContent = await readFile(join(projectPath, '.gitignore'), 'utf-8');
        expect(normalizeLineEndings(gitignoreContent)).toBe('# Promptbook Coder\n/.tmp\n');

        expect(await readJsonFile(join(projectPath, 'package.json'))).toEqual({
            scripts: getDefaultCoderPackageJsonScripts(),
        });

        expect(await readJsonFile(join(projectPath, '.vscode', 'settings.json'))).toEqual(
            getDefaultCoderVscodeSettings(),
        );
    });

    it('merges standalone coder project files without overwriting unrelated configuration', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        await writeFile(join(projectPath, '.gitignore'), 'node_modules\n.tmp\n', 'utf-8');
        await writeFile(
            join(projectPath, 'package.json'),
            '{\n  "name": "demo",\n  "scripts": {\n    "test": "echo test",\n    "coder:run": "echo old"\n  }\n}\n',
            'utf-8',
        );
        await writeFile(join(projectPath, AGENTS_FILE_PATH), 'Custom instructions\n', 'utf-8');
        await mkdir(join(projectPath, '.vscode'), { recursive: true });
        await writeFile(
            join(projectPath, '.vscode', 'settings.json'),
            '{\n  // Keep project setting\n  "files.eol": "\\n",\n  "markdown.copyFiles.destination": {\n    "docs/*md": "./docs/images/${documentBaseName}.png",\n  },\n}\n',
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);

        expect(summary.gitignoreFileStatus).toBe('unchanged');
        expect(summary.packageJsonFileStatus).toBe('updated');
        expect(summary.vscodeSettingsFileStatus).toBe('updated');
        expect(summary.agentsFileStatus).toBe('unchanged');

        const gitignoreContent = await readFile(join(projectPath, '.gitignore'), 'utf-8');
        expect(normalizeLineEndings(gitignoreContent)).toBe('node_modules\n.tmp\n');

        expect(await readJsonFile(join(projectPath, 'package.json'))).toEqual({
            name: 'demo',
            scripts: {
                test: 'echo test',
                ...getDefaultCoderPackageJsonScripts(),
            },
        });

        const packageJsonContent = await readFile(join(projectPath, 'package.json'), 'utf-8');
        expect(packageJsonContent).toContain('\n  "scripts": {\n');

        expect(await readJsonFile(join(projectPath, '.vscode', 'settings.json'))).toEqual({
            'files.eol': '\n',
            'markdown.copyFiles.destination': {
                'docs/*md': './docs/images/${documentBaseName}.png',
                'prompts/*md': './prompts/screenshots/${documentBaseName}.png',
            },
        });

        expect(await readFile(join(projectPath, AGENTS_FILE_PATH), 'utf-8')).toBe('Custom instructions\n');
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
