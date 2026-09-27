import { execFile } from 'child_process';
// cspell:ignore onwarn
import { existsSync, readFileSync, statSync } from 'fs';
import { chmod, copyFile, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, isAbsolute, join, resolve } from 'path';
import { promisify } from 'util';
import { rollup, type RollupOptions } from 'rollup';
import typescript from 'typescript';
import createRollupConfiguration from '../../../../../rollup.config';
import { copyCoderAgentBooks } from '../../../../../scripts/generate-packages/copyCoderAgentBooks';
import { parsePromptFile } from '../../../../../scripts/run-codex-prompts/prompts/parsePromptFile';
import { snapshotPlanningProject } from './fixtures/snapshotPlanningProject';

/** Monorepo path used only to build the package and provide already installed external dependencies. */
const REPOSITORY_PATH = resolve(__dirname, '../../../../..');
/** Fixture directory shared by local and packed CLI executions. */
const FIXTURE_DIRECTORY = join(__dirname, 'fixtures');
/** Process helper with fixed executable/argument boundaries. */
const EXECUTE_FILE = promisify(execFile);

/**
 * Uses the production Rollup entrypoint, external dependencies, asset plugins and UMD format.
 * A transpilation-only TypeScript plugin avoids repeating the separate whole-repository type check in this fixture.
 */
async function buildPackagedCli(packagePath: string): Promise<void> {
    const previousPackage = process.env.PACKAGE_BASENAME;
    process.env.PACKAGE_BASENAME = 'cli';
    const configuration = createRollupConfiguration()[0]!;
    if (previousPackage === undefined) delete process.env.PACKAGE_BASENAME;
    else process.env.PACKAGE_BASENAME = previousPackage;
    const plugins = (configuration.plugins as Array<{ name: string }>).filter((plugin) => plugin.name !== 'typescript');
    const bundle = await rollup({
        ...configuration,
        onwarn: () => undefined,
        plugins: [
            {
                name: 'planning-fixture-typescript',
                resolveId(source: string, importer?: string) {
                    if (!source.startsWith('.') && !isAbsolute(source)) return null;
                    const base = importer ? resolve(dirname(importer), source) : resolve(source);
                    return (
                        [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, join(base, 'index.ts')].find(
                            (path) => existsSync(path) && statSync(path).isFile(),
                        ) || null
                    );
                },
                load(path: string) {
                    if (!/\.tsx?$/u.test(path)) return null;
                    return typescript.transpileModule(readFileSync(path, 'utf-8'), {
                        compilerOptions: {
                            module: typescript.ModuleKind.ESNext,
                            target: typescript.ScriptTarget.ES2022,
                            jsx: typescript.JsxEmit.ReactJSX,
                            esModuleInterop: true,
                        },
                        fileName: path,
                    }).outputText;
                },
            },
            ...plugins,
        ],
    } as RollupOptions);
    try {
        await bundle.write({
            file: join(packagePath, 'umd/index.umd.js'),
            format: 'umd',
            name: 'promptbook-cli',
            inlineDynamicImports: true,
        });
    } finally {
        await bundle.close();
    }
    await mkdir(join(packagePath, 'bin'), { recursive: true });
    await copyFile(
        join(REPOSITORY_PATH, 'packages/cli/bin/promptbook-cli.js'),
        join(packagePath, 'bin/promptbook-cli.js'),
    );
    const metadata = JSON.parse(await readFile(join(REPOSITORY_PATH, 'packages/cli/package.json'), 'utf-8'));
    await writeFile(join(packagePath, 'package.json'), JSON.stringify(metadata));
    await copyCoderAgentBooks(REPOSITORY_PATH, packagePath);
}

/** Installs a mock at the normal npm Codex location on PATH; no production mocking switches are needed. */
async function installMockHarness(directory: string): Promise<string> {
    const entrypoint = join(directory, 'node_modules/@openai/codex/bin/codex.js');
    await mkdir(dirname(entrypoint), { recursive: true });
    await copyFile(join(FIXTURE_DIRECTORY, 'codex.cjs'), entrypoint);
    const launcher = join(directory, 'codex');
    await writeFile(
        launcher,
        `#!/bin/sh\nexec '${process.execPath.replace(/'/gu, "'\\''")}' '${entrypoint.replace(/'/gu, "'\\''")}' "$@"\n`,
    );
    await chmod(launcher, 0o755);
    await writeFile(join(directory, 'codex.cmd'), '@echo off\r\nexit /b 99\r\n');
    return directory;
}

describe('planning through local and npm-packed CLI entrypoints', () => {
    let temporaryPath: string;
    let packagePath: string;
    let harnessPath: string;
    beforeAll(async () => {
        temporaryPath = await mkdtemp(join(tmpdir(), 'ptbk planning package '));
        packagePath = join(temporaryPath, 'built');
        await mkdir(packagePath);
        await buildPackagedCli(packagePath);
        const npmPath = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
        const packed = await EXECUTE_FILE(
            process.execPath,
            [npmPath, 'pack', '--ignore-scripts', '--json', '--pack-destination', temporaryPath],
            { cwd: packagePath, windowsHide: true },
        );
        const filename = JSON.parse(packed.stdout)[0].filename;
        await EXECUTE_FILE('tar', ['-xzf', filename], { cwd: temporaryPath, windowsHide: true });
        packagePath = join(temporaryPath, 'package');
        // Model an installed dependency tree without downloading packages; ESM imports do not honor NODE_PATH.
        await symlink(
            join(REPOSITORY_PATH, 'node_modules'),
            join(packagePath, 'node_modules'),
            process.platform === 'win32' ? 'junction' : 'dir',
        );
        harnessPath = await installMockHarness(join(temporaryPath, 'harness'));
    });
    afterAll(async () => {
        if (temporaryPath) await rm(temporaryPath, { recursive: true, force: true });
    });

    it.each(['local', 'packaged'])(
        'initializes roles, preserves customizations and authors multiple PRDs via the %s CLI',
        async (mode) => {
            const projectPath = join(temporaryPath, mode);
            await mkdir(projectPath);
            const entryArguments =
                mode === 'local'
                    ? // Type checking runs separately; this fixture exercises the actual local CLI entrypoint.
                      [
                          '-r',
                          require.resolve('ts-node/register/transpile-only'),
                          join(REPOSITORY_PATH, 'src/cli/test/ptbk.ts'),
                      ]
                    : [join(packagePath, 'bin/promptbook-cli.js')];
            const environment = {
                ...process.env,
                PATH: `${harnessPath}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
                NODE_PATH: join(REPOSITORY_PATH, 'node_modules'),
                TS_NODE_PROJECT: join(REPOSITORY_PATH, 'src/cli/test/tsconfig.json'),
                PTBK_PLANNER_TEST_FIXTURE: join(FIXTURE_DIRECTORY, 'conversation.json'),
            };
            /** Invokes the real command parser and command implementation in a separate Node process. */
            const run = (argumentsList: string[], isTerminal = false) =>
                EXECUTE_FILE(
                    process.execPath,
                    [
                        ...(isTerminal ? ['-r', join(FIXTURE_DIRECTORY, 'terminal.cjs')] : []),
                        ...entryArguments,
                        ...argumentsList,
                    ],
                    {
                        cwd: projectPath,
                        env: environment,
                        timeout: 60000,
                        maxBuffer: 2 * 1024 * 1024,
                        windowsHide: true,
                    },
                );
            const initialized = await run(['coder', 'init', '--no-questions']);
            expect(initialized.stdout).toContain('agents/planner.book: created');
            expect(await readFile(join(projectPath, 'agents/.core/adam.book'), 'utf-8')).toContain('Adam');
            const planner = await readFile(join(projectPath, 'agents/planner.book'), 'utf-8');
            await writeFile(
                join(projectPath, 'agents/planner.book'),
                planner.replace('CLOSED', 'RULE Preserve this project preference.\n\nCLOSED'),
            );
            const repeated = await run(['coder', 'init', '--no-questions']);
            expect(repeated.stdout).toContain('agents/planner.book: unchanged');
            expect(await readFile(join(projectPath, 'agents/planner.book'), 'utf-8')).toContain(
                'Preserve this project preference',
            );
            await writeFile(join(projectPath, 'application.ts'), 'Unrelated implementation artifact.');
            const before = await snapshotPlanningProject(projectPath);
            const result = await run(['coder', 'plan', '--harness', 'openai-codex'], true);
            expect(result.stdout).toContain('Planning ended');
            const files = (await readdir(join(projectPath, 'prompts')))
                .filter((path) => /-(csv-exports|audit-history|audit-retention)\.md$/u.test(path))
                .sort();
            expect(files).toHaveLength(3);
            const contents = await Promise.all(
                files.map((path) => readFile(join(projectPath, 'prompts', path), 'utf-8')),
            );
            expect(contents[0]).toContain('Administrators and owners');
            expect(parsePromptFile(files[2]!, contents[2]!).sections[0]?.status).toBe('not-ready');
            const after = await snapshotPlanningProject(projectPath);
            expect(
                Object.keys(after)
                    .filter((path) => before[path] !== after[path])
                    .sort(),
            ).toEqual(files.map((path) => `prompts/${path}`));
            expect(Object.keys(before).every((path) => path in after)).toBe(true);

            const adversarialFixturePath = join(temporaryPath, `${mode}-adversarial.json`);
            environment.PTBK_PLANNER_TEST_FIXTURE = adversarialFixturePath;
            for (const reply of [
                {
                    message: 'Implementing',
                    reads: [],
                    proposals: [
                        { kind: 'edit', path: 'application.ts', find: 'Unrelated', replace: 'Changed', isReady: true },
                    ],
                },
                {
                    message: 'Delegating',
                    reads: [{ kind: 'delegate', agent: 'Developer', command: 'npm install' }],
                    proposals: [],
                },
            ]) {
                await writeFile(adversarialFixturePath, JSON.stringify([{ user: 'Implement with Developer', reply }]));
                await expect(
                    run(
                        [
                            'coder',
                            'plan',
                            '--harness',
                            'openai-codex',
                            '--agent',
                            join(projectPath, 'agents/developer.book'),
                        ],
                        true,
                    ),
                ).rejects.toThrow();
                expect(await snapshotPlanningProject(projectPath)).toEqual(after);
            }
            await writeFile(
                adversarialFixturePath,
                JSON.stringify([{ user: 'Continue planning', failure: 'Fixture harness failure' }]),
            );
            await expect(run(['coder', 'plan', '--harness', 'openai-codex'], true)).rejects.toThrow(
                'Planner harness failed',
            );
            expect(await snapshotPlanningProject(projectPath)).toEqual(after);
            await expect(run(['coder', 'plan', '--harness', 'openai-codex'])).rejects.toThrow('interactive terminal');
            expect((await run(['coder', 'plan', '--help'])).stdout).toContain('agents/planner.book');
        },
    );
});

// Note: [💞] Ignore a discrepancy between file name and entity name.
