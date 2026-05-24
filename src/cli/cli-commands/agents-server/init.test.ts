import { Command } from 'commander';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $initializeAgentsServerInitCommand } from './init';
import { initializeAgentsServerProjectConfiguration } from './initializeAgentsServerProjectConfiguration';

/**
 * Creates and tracks one temporary directory for filesystem-based Agents Server init tests.
 */
async function createTemporaryDirectory(trackedDirectories: Array<string>): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'promptbook-agents-server-init-'));
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
 * Counts exact substring occurrences in generated configuration content.
 */
function countOccurrences(content: string, searchValue: string): number {
    return content.split(searchValue).length - 1;
}

describe('ptbk agents-server init', () => {
    let temporaryDirectories: Array<string>;

    beforeEach(() => {
        temporaryDirectories = [];
    });

    afterEach(async () => {
        await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
    });

    it('creates local Agents Server environment and gitignore configuration', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);

        const summary = await initializeAgentsServerProjectConfiguration(projectPath);

        expect(summary).toEqual({
            envFileStatus: 'created',
            gitignoreFileStatus: 'created',
            initializedEnvVariableNames: [
                'PTBK_AGENTS_SERVER_DATABASE',
                'PTBK_AGENTS_SERVER_SQLITE_PATH',
                'OPENAI_API_KEY',
                'POSTGRES_URL',
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'SUPABASE_SERVICE_ROLE_KEY',
                'SUPABASE_AUTO_MIGRATE',
                'ADMIN_PASSWORD',
            ],
        });

        const envContent = normalizeLineEndings(await readFile(join(projectPath, '.env'), 'utf-8'));
        expect(countOccurrences(envContent, '# Created by `ptbk agents-server init` command')).toBe(9);
        expect(envContent).toContain('PTBK_AGENTS_SERVER_DATABASE=supabase');
        expect(envContent).toContain('PTBK_AGENTS_SERVER_SQLITE_PATH=.promptbook/agents-server.sqlite');
        expect(envContent).toContain(
            '# Documentation: https://github.com/webgptorg/promptbook/blob/main/apps/agents-server/README.md#agents-server-env-openai-api-key\nOPENAI_API_KEY=',
        );
        expect(envContent).toContain(
            '# Documentation: https://github.com/webgptorg/promptbook/blob/main/apps/agents-server/README.md#agents-server-env-postgres-url\nPOSTGRES_URL=',
        );
        expect(envContent).toContain('SUPABASE_AUTO_MIGRATE=true');
        expect(envContent).toContain('ADMIN_PASSWORD=');

        const gitignoreContent = normalizeLineEndings(await readFile(join(projectPath, '.gitignore'), 'utf-8'));
        expect(gitignoreContent).toBe('# Promptbook Agents Server\nnode_modules\n.promptbook\n.logs\n');
    });

    it('appends only missing configuration and stays unchanged on repeated init', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        await writeFile(join(projectPath, '.env'), 'CUSTOM_VALUE=keep\nOPENAI_API_KEY=existing-key\n', 'utf-8');
        await writeFile(join(projectPath, '.gitignore'), 'node_modules\n/custom-rule\n', 'utf-8');

        const firstSummary = await initializeAgentsServerProjectConfiguration(projectPath);
        const secondSummary = await initializeAgentsServerProjectConfiguration(projectPath);

        expect(firstSummary.envFileStatus).toBe('updated');
        expect(firstSummary.initializedEnvVariableNames).not.toContain('OPENAI_API_KEY');
        expect(secondSummary).toEqual({
            envFileStatus: 'unchanged',
            gitignoreFileStatus: 'unchanged',
            initializedEnvVariableNames: [],
        });

        const envContent = normalizeLineEndings(await readFile(join(projectPath, '.env'), 'utf-8'));
        expect(envContent).toContain('CUSTOM_VALUE=keep\nOPENAI_API_KEY=existing-key\n');
        expect(countOccurrences(envContent, 'OPENAI_API_KEY=')).toBe(1);

        const gitignoreContent = normalizeLineEndings(await readFile(join(projectPath, '.gitignore'), 'utf-8'));
        expect(gitignoreContent).toBe('node_modules\n/custom-rule\n\n# Promptbook Agents Server\n.promptbook\n.logs\n');
    });

    it('prints a summary from the CLI command', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const originalWorkingDirectory = process.cwd();
        const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        try {
            process.chdir(projectPath);
            const program = new Command();
            $initializeAgentsServerInitCommand(program);

            await program.parseAsync(['node', 'test', 'init'], { from: 'node' });

            const output = consoleInfoSpy.mock.calls.flat().join('\n');
            expect(output).toContain('Promptbook Agents Server configuration initialized.');
            expect(output).toContain('✔ .env: created');
            expect(output).toContain('✔ .gitignore: created');
        } finally {
            process.chdir(originalWorkingDirectory);
            consoleInfoSpy.mockRestore();
            processExitSpy.mockRestore();
        }
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name
