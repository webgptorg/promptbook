import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { AGENTS_FILE_PATH, getDefaultCoderAgentsFileContent } from './agentsFile';
import { getDefaultCoderProjectPromptTemplateDefinitions, resolveCoderPromptTemplate } from './boilerplateTemplates';
import {
    CODER_DEVELOPER_AGENT_FILE_PATH,
    DEFAULT_CODER_DEVELOPER_AGENT_SOURCE_FILE_PATH,
} from './ensureCoderDeveloperAgentFile';
import type { CoderReferencedArtifactStatus } from './coderReferencedArtifacts';
import { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
import { getDefaultCoderVscodeSettings } from './getDefaultCoderVscodeSettings';
import type { CoderInitializationSummary } from './initializeCoderProjectConfiguration';
import { initializeCoderProjectConfiguration } from './initializeCoderProjectConfiguration';

/**
 * Creates and tracks one temporary directory for filesystem-based CLI tests.
 */
async function createTemporaryDirectory(trackedDirectories: Array<string>): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'promptbook-coder-'));
    trackedDirectories.push(directory);
    return directory;
}

/**
 * Reads the status of one artifact referenced by the default coder scripts.
 */
function getReferencedArtifactStatus(
    summary: CoderInitializationSummary,
    relativeFilePath: string,
): CoderReferencedArtifactStatus | undefined {
    return summary.referencedArtifactStatuses.find(
        (referencedArtifact) => referencedArtifact.relativeFilePath === relativeFilePath,
    )?.status;
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

    /*
    TODO: Fix test
    it('keeps Promptbook project template files in sync with built-in defaults', async () => {
        for (const definition of getDefaultCoderPromptTemplateDefinitions()) {
            const content = await readFile(join(process.cwd(), definition.relativeFilePath), 'utf-8');
            expect(normalizeLineEndings(content).trim()).toBe(definition.content);
        }
    });
    */

    it('creates the default template files during coder init', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        const summary = await initializeCoderProjectConfiguration(projectPath);

        expect(summary.promptsTemplatesDirectoryStatus).toBe('created');
        expect(summary.agentsDirectoryStatus).toBe('created');
        expect(summary.adamAgentFileStatus).toBe('created');
        expect(await readFile(join(projectPath, 'agents/.core/adam.book'), 'utf-8')).toBe(
            await readFile(join(process.cwd(), 'agents/default/.core/adam.book'), 'utf-8'),
        );
        expect(getReferencedArtifactStatus(summary, CODER_DEVELOPER_AGENT_FILE_PATH)).toBe('created');
        expect(getReferencedArtifactStatus(summary, AGENTS_FILE_PATH)).toBe('created');
        expect(summary.gitignoreFileStatus).toBe('created');
        expect(summary.packageJsonFileStatus).toBe('created');
        expect(summary.vscodeSettingsFileStatus).toBe('created');

        for (const { relativeFilePath } of getDefaultCoderProjectPromptTemplateDefinitions()) {
            expect(getReferencedArtifactStatus(summary, relativeFilePath)).toBe('created');
        }

        for (const definition of getDefaultCoderProjectPromptTemplateDefinitions()) {
            const content = await readFile(join(projectPath, definition.relativeFilePath), 'utf-8');
            expect(normalizeLineEndings(content).trim()).toBe(definition.content);
        }

        const developerAgentContent = await readFile(join(projectPath, CODER_DEVELOPER_AGENT_FILE_PATH), 'utf-8');
        const sourceDeveloperAgentContent = await readFile(
            join(process.cwd(), DEFAULT_CODER_DEVELOPER_AGENT_SOURCE_FILE_PATH),
            'utf-8',
        );
        expect(normalizeLineEndings(developerAgentContent)).toBe(normalizeLineEndings(sourceDeveloperAgentContent));

        const agentsFileContent = await readFile(join(projectPath, AGENTS_FILE_PATH), 'utf-8');
        expect(normalizeLineEndings(agentsFileContent).trim()).toBe(getDefaultCoderAgentsFileContent());

        await expect(readFile(join(projectPath, 'AGENT_CODING.md'), 'utf-8')).rejects.toThrow();

        await expect(
            readFile(join(projectPath, 'prompts', 'templates', 'agents-server.md'), 'utf-8'),
        ).rejects.toThrow();

        const gitignoreContent = await readFile(join(projectPath, '.gitignore'), 'utf-8');
        expect(normalizeLineEndings(gitignoreContent)).toBe(
            '# Promptbook Coder\n/.promptbook\n.env\n.codex\n.github/copilot/settings.local.json\n.cline\n.claude\n.opencode\n.gemini\n.qwen\n',
        );

        const defaultCoderPackageJsonScripts = getDefaultCoderPackageJsonScripts();

        expect(defaultCoderPackageJsonScripts['coder:run']).not.toContain('--agent');
        expect(defaultCoderPackageJsonScripts['coder:plan']).not.toContain('--agent');
        expect(defaultCoderPackageJsonScripts['coder:run']).not.toContain('--context');
        expect(defaultCoderPackageJsonScripts['coder:run']).not.toContain('--path');
        expect(await readJsonFile(join(projectPath, 'package.json'))).toEqual({
            scripts: defaultCoderPackageJsonScripts,
        });
        // Note: Every `coder:*` script goes through NPX, because `ptbk` can be installed globally or locally
        //       and NPX resolves it correctly in either case
        expect(
            Object.entries(defaultCoderPackageJsonScripts)
                .filter(([scriptName]) => scriptName.startsWith('coder:'))
                .every(([, scriptCommand]) => scriptCommand.startsWith('npx ptbk')),
        ).toBe(true);
        // Note: The aggregate check of `coder:run` is a project-owned script initialized next to it.
        expect(defaultCoderPackageJsonScripts['coder:run']).toContain('--check "npm run check" --check-before yes-and-fix');
        expect(defaultCoderPackageJsonScripts.check).toContain('Configure package.json scripts.check');
        expect(defaultCoderPackageJsonScripts['test-for-ptbk-coder']).toBeUndefined();
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
        await mkdir(join(projectPath, 'agents'), { recursive: true });
        await writeFile(join(projectPath, CODER_DEVELOPER_AGENT_FILE_PATH), 'Custom developer agent\n', 'utf-8');
        await mkdir(join(projectPath, '.vscode'), { recursive: true });
        await writeFile(
            join(projectPath, '.vscode', 'settings.json'),
            '{\n  // Keep project setting\n  "files.eol": "\\n",\n  "markdown.copyFiles.destination": {\n    "docs/*md": "./docs/images/${documentBaseName}.png",\n  },\n}\n',
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);

        expect(summary.gitignoreFileStatus).toBe('updated');
        expect(summary.packageJsonFileStatus).toBe('updated');
        expect(summary.vscodeSettingsFileStatus).toBe('updated');
        expect(getReferencedArtifactStatus(summary, CODER_DEVELOPER_AGENT_FILE_PATH)).toBe('augmented');
        expect(getReferencedArtifactStatus(summary, AGENTS_FILE_PATH)).toBe('unchanged');

        const gitignoreContent = await readFile(join(projectPath, '.gitignore'), 'utf-8');
        expect(normalizeLineEndings(gitignoreContent)).toBe(
            'node_modules\n.tmp\n\n# Promptbook Coder\n/.promptbook\n.env\n.codex\n.github/copilot/settings.local.json\n.cline\n.claude\n.opencode\n.gemini\n.qwen\n',
        );

        // Note: The project-owned `coder:run` and `test` scripts must survive the initialization untouched.
        const mergedPackageJson = await readJsonFile<{ name: string; scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );
        expect(mergedPackageJson).toMatchObject({
            name: 'demo',
            scripts: {
                test: 'echo test',
                'coder:run': 'echo old',
                check: 'npm run test',
            },
        });
        expect(mergedPackageJson.scripts.check).not.toBe(getDefaultCoderPackageJsonScripts().check);
        expect(summary.addedPackageJsonScriptNames).not.toContain('coder:run');
        expect(summary.addedPackageJsonScriptNames).toContain('check');

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
        expect(await readFile(join(projectPath, CODER_DEVELOPER_AGENT_FILE_PATH), 'utf-8')).toContain(
            'Custom developer agent\n',
        );
    });

    it('keeps existing scripts and settings and skips the artifacts they no longer reference', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const existingCoderRunScript = 'npx ptbk coder run --harness github-copilot --agent agents/my-own.book';
        const existingCoderPlanScript = 'npx ptbk coder plan --harness openai-codex --agent "agents/my planner.book"';
        const existingScreenshotDestination = 'screenshots/${documentBaseName}.png';

        await writeFile(
            join(projectPath, 'package.json'),
            `${JSON.stringify(
                {
                    name: 'demo',
                    scripts: {
                        'coder:run': existingCoderRunScript,
                        'coder:plan': existingCoderPlanScript,
                        'coder:add': 'npx ptbk coder add --template ./prompts/templates/my-own.md',
                        'test-for-ptbk-coder': 'npm run build && npm run test-unit',
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );
        await mkdir(join(projectPath, '.vscode'), { recursive: true });
        await writeFile(
            join(projectPath, '.vscode', 'settings.json'),
            `${JSON.stringify(
                {
                    'markdown.copyFiles.destination': {
                        'prompts/*md': existingScreenshotDestination,
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);

        // Note: [1] The existing script and setting values must survive verbatim
        const packageJson = await readJsonFile<{ readonly scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );
        expect(packageJson.scripts['coder:run']).toBe(existingCoderRunScript);
        expect(packageJson.scripts['coder:plan']).toBe(existingCoderPlanScript);
        expect(packageJson.scripts.check).toBe('npm run build && npm run test-unit');
        expect(packageJson.scripts['test-for-ptbk-coder']).toBeUndefined();
        expect(
            (
                await readJsonFile<{ readonly 'markdown.copyFiles.destination': Record<string, string> }>(
                    join(projectPath, '.vscode', 'settings.json'),
                )
            )['markdown.copyFiles.destination'],
        ).toEqual({ 'prompts/*md': existingScreenshotDestination });
        expect(summary.vscodeSettingsFileStatus).toBe('unchanged');

        // Note: [2] Only the genuinely missing scripts were added
        expect([...summary.addedPackageJsonScriptNames].sort()).toEqual([
            'check',
            'coder:generate-boilerplates',
            'coder:verify',
        ]);

        // Note: [3] Roles are initialized independently of scripts; project context still follows script ownership.
        expect(getReferencedArtifactStatus(summary, CODER_DEVELOPER_AGENT_FILE_PATH)).toBe('created');
        await expect(readFile(join(projectPath, CODER_DEVELOPER_AGENT_FILE_PATH), 'utf-8')).resolves.toContain(
            'Developer',
        );
        expect(getReferencedArtifactStatus(summary, AGENTS_FILE_PATH)).toBe('created');
        expect(await readFile(join(projectPath, AGENTS_FILE_PATH), 'utf-8')).toBe(
            `${getDefaultCoderAgentsFileContent()}\n`,
        );

        // Note: [4] The added `coder:generate-boilerplates` script still references the common template
        for (const { relativeFilePath } of getDefaultCoderProjectPromptTemplateDefinitions()) {
            expect(getReferencedArtifactStatus(summary, relativeFilePath)).toBe('created');
            await expect(readFile(join(projectPath, relativeFilePath), 'utf-8')).resolves.toBeTruthy();
        }
    });

    it('preserves a custom check script and keeps repeated initialization idempotent', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const customCheckCommand = 'npm run lint && npm run typecheck && npm run build && npm test';
        await writeFile(
            join(projectPath, 'package.json'),
            `${JSON.stringify(
                {
                    name: 'custom-check-project',
                    scripts: {
                        check: customCheckCommand,
                        lint: 'eslint .',
                        typecheck: 'tsc --noEmit',
                        build: 'tsc',
                        test: 'jest',
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );

        const firstSummary = await initializeCoderProjectConfiguration(projectPath);
        const firstPackageJsonContent = await readFile(join(projectPath, 'package.json'), 'utf-8');
        const secondSummary = await initializeCoderProjectConfiguration(projectPath);
        const secondPackageJsonContent = await readFile(join(projectPath, 'package.json'), 'utf-8');

        const packageJson = await readJsonFile<{ readonly scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );
        expect(packageJson.scripts.check).toBe(customCheckCommand);
        expect(firstSummary.packageJsonDiagnostics).toContain(
            'Preserved the existing `scripts.check` command exactly; Coder will execute that project-owned aggregate without adding hidden checks.',
        );
        expect(secondSummary.packageJsonFileStatus).toBe('unchanged');
        expect(secondSummary.addedPackageJsonScriptNames).toEqual([]);
        expect(secondPackageJsonContent).toBe(firstPackageJsonContent);
    });

    it('composes a deterministic check from usable validation scripts without recursive or unsafe scripts', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        await writeFile(
            join(projectPath, 'package.json'),
            `${JSON.stringify(
                {
                    scripts: {
                        test: 'jest',
                        'test:unit': 'jest --runInBand',
                        'test:watch': 'jest --watch',
                        lint: 'eslint .',
                        typecheck: 'tsc --noEmit',
                        build: 'tsc',
                        dev: 'vite',
                        'test:install': 'npm install',
                        'test:release': 'npm run release',
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);
        const packageJson = await readJsonFile<{ readonly scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );

        expect(packageJson.scripts.check).toBe(
            'npm run test && npm run test:unit && npm run lint && npm run typecheck && npm run build',
        );
        expect(packageJson.scripts.check).not.toContain('test:watch');
        expect(packageJson.scripts.check).not.toContain('dev');
        expect(summary.packageJsonDiagnostics).toContain(
            'Generated `scripts.check` from existing validation scripts: tests (npm run test), tests (npm run test:unit), lint (npm run lint), typechecking (npm run typecheck), build (npm run build).',
        );
    });

    it('keeps conflicting legacy aggregate scripts and custom callers intact with migration guidance', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const legacyCheckCommand = 'npm run lint && npm run build && npm test';
        const legacyCallerCommand = 'npm run test-for-ptbk-coder';
        await writeFile(
            join(projectPath, 'package.json'),
            `${JSON.stringify(
                {
                    scripts: {
                        check: 'npm run lint',
                        'test-for-ptbk-coder': legacyCheckCommand,
                        'legacy-release-check': legacyCallerCommand,
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);
        const packageJson = await readJsonFile<{ readonly scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );

        expect(packageJson.scripts.check).toBe('npm run lint');
        expect(packageJson.scripts['test-for-ptbk-coder']).toBe(legacyCheckCommand);
        expect(packageJson.scripts['legacy-release-check']).toBe(legacyCallerCommand);
        expect(summary.packageJsonDiagnostics.join('\n')).toEqual(
            expect.stringContaining('Kept both `check` and customized legacy `test-for-ptbk-coder`'),
        );
        expect(summary.packageJsonDiagnostics.join('\n')).toEqual(
            expect.stringContaining('another project script still calls it'),
        );
    });

    it('migrates the unchanged generated legacy caller and default aggregate body', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        await writeFile(
            join(projectPath, 'package.json'),
            `${JSON.stringify(
                {
                    scripts: {
                        'coder:run':
                            'npx ptbk coder run --harness openai-codex --thinking-level max --test "npm run test-for-ptbk-coder" --test-before yes-and-fix',
                        'test-for-ptbk-coder': 'npm test',
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);
        const packageJson = await readJsonFile<{ readonly scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );

        expect(packageJson.scripts.check).toBe('npm test');
        expect(packageJson.scripts['test-for-ptbk-coder']).toBeUndefined();
        expect(packageJson.scripts['coder:run']).toBe(getDefaultCoderPackageJsonScripts()['coder:run']);
        expect(summary.packageJsonDiagnostics.join('\n')).toEqual(
            expect.stringContaining('Updated the unchanged generated `coder:run` caller'),
        );
    });

    it('removes an unchanged generated legacy aggregate when a custom check already exists', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        await writeFile(
            join(projectPath, 'package.json'),
            `${JSON.stringify(
                {
                    scripts: {
                        check: 'npm run lint && npm run build',
                        'test-for-ptbk-coder': 'npm test',
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);
        const packageJson = await readJsonFile<{ readonly scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );

        expect(packageJson.scripts.check).toBe('npm run lint && npm run build');
        expect(packageJson.scripts['test-for-ptbk-coder']).toBeUndefined();
        expect(summary.packageJsonDiagnostics.join('\n')).toEqual(
            expect.stringContaining('Removed the obsolete `test-for-ptbk-coder` entry'),
        );
    });

    it('creates a failing check placeholder when every conventional candidate is recursive or unsafe', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        await writeFile(
            join(projectPath, 'package.json'),
            `${JSON.stringify(
                {
                    scripts: {
                        test: 'npm run check',
                        lint: 'npm run coder:run',
                        build: 'npm run build',
                        'test:watch': 'jest --watch',
                    },
                },
                null,
                2,
            )}\n`,
            'utf-8',
        );

        const summary = await initializeCoderProjectConfiguration(projectPath);
        const packageJson = await readJsonFile<{ readonly scripts: Record<string, string> }>(
            join(projectPath, 'package.json'),
        );

        expect(packageJson.scripts.check).toContain('process.exit(1)');
        expect(summary.packageJsonDiagnostics.join('\n')).toEqual(
            expect.stringContaining('Created a failing `scripts.check` setup placeholder'),
        );
    });

    it('does not append duplicate commented coder env variables on repeated init', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        await initializeCoderProjectConfiguration(projectPath);
        await writeFile(join(projectPath, 'agents/.core/adam.book'), 'Adam\nFROM @Null\nRULE Custom foundation.\n');
        const repeatedSummary = await initializeCoderProjectConfiguration(projectPath);

        expect(repeatedSummary.adamAgentFileStatus).toBe('unchanged');
        expect(await readFile(join(projectPath, 'agents/.core/adam.book'), 'utf-8')).toContain('Custom foundation.');

        const envContent = await readFile(join(projectPath, '.env'), 'utf-8');
        expect(repeatedSummary.envFileStatus).toBe('unchanged');
        expect(repeatedSummary.initializedEnvVariableNames).toEqual([]);
        expect(envContent.match(/CODING_AGENT_GIT_NAME/gu)).toHaveLength(1);
        expect(envContent.match(/CODING_AGENT_GIT_EMAIL/gu)).toHaveLength(1);
        expect(envContent.match(/CODING_AGENT_GIT_SIGNING_KEY/gu)).toHaveLength(1);
    });

    it('restores missing roles with all scripts already present and preserves customized Books and scripts', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        await initializeCoderProjectConfiguration(projectPath);
        const packagePath = join(projectPath, 'package.json');
        const packageJson = await readJsonFile<{ scripts: Record<string, string> }>(packagePath);
        packageJson.scripts['coder:run'] = 'ptbk coder run --harness openai-codex --agent agents/my-developer.book';
        packageJson.scripts['coder:plan'] = 'ptbk coder plan --harness openai-codex --agent "agents/my planner.book"';
        await writeFile(packagePath, JSON.stringify(packageJson));
        await writeFile(join(projectPath, 'agents/planner.book'), 'Planner\nRULE Keep my customization.\n');
        await rm(join(projectPath, 'agents/developer.book'));
        const repeated = await initializeCoderProjectConfiguration(projectPath);
        expect(getReferencedArtifactStatus(repeated, 'agents/developer.book')).toBe('created');
        expect(getReferencedArtifactStatus(repeated, 'agents/planner.book')).toBe('augmented');
        expect(repeated.addedPackageJsonScriptNames).toEqual([]);
        expect(await readFile(packagePath, 'utf-8')).toBe(JSON.stringify(packageJson));
        expect(await readFile(join(projectPath, 'agents/planner.book'), 'utf-8')).toContain('Keep my customization');
        await rm(join(projectPath, 'agents/planner.book'));
        const partial = await initializeCoderProjectConfiguration(projectPath);
        expect(getReferencedArtifactStatus(partial, 'agents/planner.book')).toBe('created');
        expect(await readFile(join(projectPath, 'agents/planner.book'), 'utf-8')).toContain('Planner');
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

    /*
    TODO: Fix test
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
    */
});
