import { execFile } from 'child_process';
// cspell:ignore onwarn NOSYSTEM gpgsign
import { existsSync, readFileSync, statSync } from 'fs';
import { chmod, copyFile, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, isAbsolute, join, resolve } from 'path';
import { promisify } from 'util';
import { rollup, type RollupOptions } from 'rollup';
import typescript from 'typescript';
import createRollupConfiguration from '../../../../../rollup.config';
import { copyCoderAgentBooks } from '../../../../../scripts/generate-packages/copyCoderAgentBooks';
import { quoteBashArgument } from '../../../../../scripts/run-codex-prompts/common/runGoScript/quoteBashArgument';
import { toPosixPath } from '../../../../../scripts/run-codex-prompts/common/runGoScript/toPosixPath';
import { parsePromptFile } from '../../../../../scripts/run-codex-prompts/prompts/parsePromptFile';
import { PROMPTS_README_TEMPLATE } from '../promptsReadmeTemplate';
import { snapshotPlanningProject } from './fixtures/snapshotPlanningProject';

/** Monorepo path used only to build the package and provide already installed external dependencies. */
const REPOSITORY_PATH = resolve(__dirname, '../../../../..');
/** Fixture directory shared by local and packed CLI executions. */
const FIXTURE_DIRECTORY = join(__dirname, 'fixtures');
/** Process helper with fixed executable/argument boundaries. */
const EXECUTE_FILE = promisify(execFile);
/** Host disk pressure is not a CLI fixture input; production thresholds are covered by disk-guard tests. */
const FIXTURE_NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --require ${JSON.stringify(
    join(__dirname, '../fixtures/healthyDisk.cjs'),
)}`;

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
async function installMockHarness(directory: string, fixture = 'codex.cjs'): Promise<string> {
    const entrypoint = join(directory, 'node_modules/@openai/codex/bin/codex.js');
    await mkdir(dirname(entrypoint), { recursive: true });
    await copyFile(join(FIXTURE_DIRECTORY, fixture), entrypoint);
    const launcher = join(directory, 'codex');
    await writeFile(
        launcher,
        `#!/bin/sh\nexec '${process.execPath.replace(/\\/gu, '/').replace(/'/gu, "'\\''")}' '${entrypoint
            .replace(/\\/gu, '/')
            .replace(/'/gu, "'\\''")}' "$@"\n`,
    );
    await chmod(launcher, 0o755);
    await writeFile(join(directory, 'codex.cmd'), '@echo off\r\nexit /b 99\r\n');
    // Login-shell profiles can reset PATH. BASH_ENV restores the fixture directory before any harness command runs.
    await writeFile(
        join(directory, 'bash-env.sh'),
        `export PATH=${quoteBashArgument(toPosixPath(directory))}:"$PATH"\n`,
    );
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
        const packedMetadata = JSON.parse(packed.stdout)[0];
        for (const asset of ['developer.book', 'planner.book', 'lawyer.book', 'copywriter.book', '.core/adam.book']) {
            expect(packedMetadata.files.map(({ path }: { path: string }) => path)).toContain(`agents/default/${asset}`);
        }
        const filename = packedMetadata.filename;
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

    it('smoke-tests finite check repair through an installed packed CLI outside the monorepo', async () => {
        const projectPath = join(temporaryPath, 'fix project');
        const callerPath = join(temporaryPath, 'fix caller');
        await mkdir(projectPath);
        await mkdir(callerPath);
        const fixHarnessPath = await installMockHarness(join(temporaryPath, 'fix harness'), '../../fixtures/fix.cjs');
        const environment = {
            ...process.env,
            NODE_OPTIONS: FIXTURE_NODE_OPTIONS,
            PATH: `${fixHarnessPath}:${process.env.PATH}`,
            BASH_ENV: join(fixHarnessPath, 'bash-env.sh'),
            GIT_CONFIG_GLOBAL: join(temporaryPath, 'empty-git-config'),
            GIT_CONFIG_NOSYSTEM: '1',
        };
        /** Calls the installed production entrypoint from an unrelated invocation directory. */
        const run = (argumentsList: string[]) =>
            EXECUTE_FILE(process.execPath, [join(packagePath, 'bin/promptbook-cli.js'), ...argumentsList], {
                cwd: callerPath,
                env: environment,
                timeout: 60000,
                maxBuffer: 2 * 1024 * 1024,
            });
        /** Runs fixture-only Git commands using explicit argument boundaries. */
        const git = async (...argumentsList: string[]) =>
            (await EXECUTE_FILE('git', argumentsList, { cwd: projectPath, env: environment })).stdout.trim();
        await git('init');
        await git('config', 'user.name', 'Fixture');
        await git('config', 'user.email', 'fixture@example.com');
        await git('config', 'commit.gpgsign', 'false');
        await writeFile(join(projectPath, '.gitignore'), '.promptbook/\n');
        await writeFile(join(projectPath, 'value.txt'), 'fixed');
        await writeFile(join(projectPath, 'package.json'), JSON.stringify({ scripts: { check: 'node check.cjs' } }));
        await writeFile(
            join(projectPath, 'check.cjs'),
            `const fs=require('fs'); if(fs.readFileSync('value.txt','utf8') !== 'fixed') { console.error('Fixture build failure'); process.exit(9); }`,
        );
        await git('add', '--all');
        await git('commit', '-m', 'healthy fixture');
        const argumentsList = [
            'coder',
            'fix',
            '--harness',
            'openai-codex',
            '--path',
            projectPath,
            '--no-ui',
            '--no-questions',
            '--wait-after-error',
            '0s',
        ];
        const before = await snapshotPlanningProject(projectPath);
        expect((await run(['coder', '--help'])).stdout).toContain('fix');
        const help = (await run(['coder', 'fix', '--help'])).stdout;
        expect(help).toContain('--check');
        expect(help).not.toContain('--check-before');
        await run([...argumentsList, '--dry-run']);
        expect(await snapshotPlanningProject(projectPath)).toEqual(before);
        const healthy = await run(argumentsList);
        expect(healthy.stdout).toContain('Checks passed without repair');
        expect(await git('rev-list', '--count', 'HEAD')).toBe('1');
        await expect(readFile(join(projectPath, '.promptbook/harness-invocations'))).rejects.toMatchObject({
            code: 'ENOENT',
        });
        await expect(readFile(join(projectPath, 'agents/developer.book'))).rejects.toMatchObject({ code: 'ENOENT' });
        await expect(readdir(join(projectPath, 'prompts'))).rejects.toMatchObject({ code: 'ENOENT' });

        await mkdir(join(projectPath, 'agents'));
        await writeFile(
            join(projectPath, 'agents/developer.book'),
            'Developer\nFROM @Null\nRULE PACKED_FIX_DEVELOPER\n',
        );
        await writeFile(join(projectPath, 'AGENTS.md'), 'PACKED_FIX_CONTEXT');
        await writeFile(join(projectPath, 'value.txt'), 'broken');
        await git('add', '--all');
        await git('commit', '-m', 'failing fixture');
        const BEFORE_REPAIR_HEAD = await git('rev-parse', 'HEAD');
        const repaired = await run(argumentsList);
        expect(repaired.stdout).toContain('Repaired and verified');
        const observed = JSON.parse(await readFile(join(projectPath, '.promptbook/mock-call.json'), 'utf-8'));
        expect(observed.prompt).toContain('PACKED_FIX_DEVELOPER');
        expect(observed.prompt).toContain('PACKED_FIX_CONTEXT');
        expect(observed.prompt).not.toContain('remaining coding prompts');
        expect(await git('rev-list', '--count', 'HEAD')).toBe('5');
        const REPAIR_COMMITS = (await git('rev-list', '--reverse', `${BEFORE_REPAIR_HEAD}..HEAD`)).split('\n');
        const REPAIR_PHASES = await Promise.all(
            REPAIR_COMMITS.map(async (commit) =>
                (await git('show', '-s', '--format=%B', commit)).match(/^\s*Coder-Phase: (\S+)\s*$/mu)?.[1],
            ),
        );
        expect(REPAIR_PHASES).toEqual(['implementation', 'finalization', 'finalization']);
        const repairFiles = (await readdir(join(projectPath, 'prompts'))).filter((name) => name.endsWith('.md'));
        expect(repairFiles).toHaveLength(1);
        expect((await git('diff', '--name-only', BEFORE_REPAIR_HEAD, 'HEAD')).split('\n').sort()).toEqual(
            ['value.txt', `prompts/${repairFiles[0]}`, `prompts/traces/${repairFiles[0]}`].sort(),
        );
        for (const COMMIT of REPAIR_COMMITS.slice(0, -1)) {
            expect(await git('show', `${COMMIT}:prompts/${repairFiles[0]}`)).not.toMatch(/^\[x\]/u);
        }
        expect(
            parsePromptFile(repairFiles[0]!, await readFile(join(projectPath, 'prompts', repairFiles[0]!), 'utf-8'))
                .sections[0]?.status,
        ).toBe('done');
        expect(await git('show', 'HEAD:value.txt')).toBe('fixed');
        expect(await git('status', '--porcelain')).toBe('');
        expect(await readdir(callerPath)).toEqual([]);
    });

    it('runs the installed CLI in an external project with shared defaults and independent overrides', async () => {
        const callerPath = join(temporaryPath, 'unrelated caller');
        const projectPath = join(temporaryPath, 'selected project with spaces');
        await mkdir(callerPath);
        await mkdir(projectPath);
        await writeFile(join(callerPath, 'AGENTS.md'), 'CALLER instructions must never leak.');
        const codingHarnessPath = await installMockHarness(join(temporaryPath, 'coding-harness'), 'coding.cjs');
        const environment = {
            ...process.env,
            NODE_OPTIONS: FIXTURE_NODE_OPTIONS,
            PATH: `${codingHarnessPath}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
            BASH_ENV: toPosixPath(join(codingHarnessPath, 'bash-env.sh')),
            GIT_CONFIG_GLOBAL: join(temporaryPath, 'empty-git-config'),
            GIT_CONFIG_NOSYSTEM: '1',
        };
        const resolvedHarness = await EXECUTE_FILE('bash', ['-lc', 'command -v codex'], {
            cwd: projectPath,
            env: environment,
            windowsHide: true,
            timeout: 60000,
        });
        expect(resolvedHarness.stdout.trim()).toBe(toPosixPath(join(codingHarnessPath, 'codex')));
        const HARNESS_VERSION = await EXECUTE_FILE('bash', ['-lc', 'codex --version'], {
            cwd: projectPath,
            env: environment,
            windowsHide: true,
            timeout: 60000,
        });
        expect(HARNESS_VERSION.stdout.trim()).toBe('codex-cli 0.0.0');
        /** Runs Git only in the selected temporary fixture. */
        const RUN_GIT = async (...argumentsList: string[]) =>
            EXECUTE_FILE('git', argumentsList, { cwd: projectPath, env: environment, windowsHide: true });
        /** Runs the packed executable from a directory unrelated to the package or selected project. */
        const run = (argumentsList: string[], cwd = callerPath) =>
            EXECUTE_FILE(process.execPath, [join(packagePath, 'bin/promptbook-cli.js'), ...argumentsList], {
                cwd,
                env: environment,
                windowsHide: true,
                timeout: 60000,
                maxBuffer: 2 * 1024 * 1024,
            });
        const beforeHelp = await readdir(projectPath);
        expect((await run(['coder', 'run', '--help', '--path', projectPath])).stdout).toContain('--path');
        await run(['--version']);
        expect(await readdir(projectPath)).toEqual(beforeHelp);
        await expect(run(['init', '--path', join(temporaryPath, 'does-not-exist'), '--no-questions'])).rejects.toThrow(
            'project directory',
        );
        await run(['init', '--path', projectPath, '--no-questions']);
        await RUN_GIT('config', 'user.name', 'Fixture');
        await RUN_GIT('config', 'user.email', 'fixture@example.com');
        await RUN_GIT('config', 'commit.gpgsign', 'false');
        const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
        expect(packageJson.scripts['coder:run']).not.toMatch(/--(?:agent|context|path)\b/u);
        await writeFile(join(projectPath, 'agents/developer.book'), 'Developer\nFROM @Null\nRULE PACKED Developer.\n');
        await writeFile(join(projectPath, 'agents/planner.book'), 'Planner\nFROM @Null\nRULE PACKED Planner.\n');
        await writeFile(join(projectPath, 'AGENTS.md'), 'PACKED additional context.\n');
        await writeFile(join(projectPath, 'override context.md'), 'PACKED replacement context.\n');
        const argumentsList = [
            'coder',
            'run',
            '--harness',
            'openai-codex',
            '--no-ui',
            '--no-questions',
            '--no-commit',
            '--git-changes',
            'ignore',
            '--limit',
            '1',
            '--wait-after-error',
            '0s',
        ];
        /** Records each invocation's fixture inputs and returns what the fake installed harness observed. */
        const execute = async (extra: string[], cwd?: string) => {
            await writeFile(join(projectPath, 'prompts/defaults.md'), '[ ]\n\nImplement the fixture task.\n');
            // A task changed before invocation is protected user work, so each independent run needs a clean baseline.
            await RUN_GIT('add', '--all');
            await RUN_GIT('commit', '-m', 'fixture invocation inputs');
            await run([...argumentsList, ...extra], cwd);
            return JSON.parse(await readFile(join(projectPath, '.promptbook/mock-call.json'), 'utf-8'));
        };
        const implicit = await execute([], projectPath);
        const explicit = await execute([
            '--path',
            projectPath,
            '--agent',
            './agents/developer.book',
            '--context',
            './AGENTS.md',
        ]);
        expect(explicit).toEqual(implicit);
        expect(explicit.prompt).toContain('PACKED Developer.');
        expect(explicit.prompt.match(/PACKED additional context/g)).toHaveLength(1);
        expect(explicit.prompt).not.toContain('CALLER');
        const overridden = await execute([
            '--path',
            '../selected project with spaces',
            '--agent',
            'agents/planner.book',
            '--context',
            './override context.md',
        ]);
        expect(overridden.prompt).toContain('PACKED Planner.');
        expect(overridden.prompt).toContain('PACKED replacement context.');
        expect(overridden.prompt).not.toContain('PACKED additional context.');
        const inline = await execute(['--path', projectPath, '--context', 'PACKED inline override.']);
        expect(inline.prompt).toContain('PACKED Developer.');
        expect(inline.prompt).toContain('PACKED inline override.');
        expect(inline.prompt).not.toContain('PACKED additional context.');
        const beforePreview = await snapshotPlanningProject(projectPath);
        await run(['coder', 'run', '--path', projectPath, '--dry-run', '--no-ui']);
        await expect(run([...argumentsList, '--path', projectPath, '--agent', './missing.book'])).rejects.toThrow(
            'default Book is not used',
        );
        expect(await snapshotPlanningProject(projectPath)).toEqual(beforePreview);
        expect(await readdir(callerPath)).toEqual(['AGENTS.md']);
    });

    it('smoke-tests workspace preflight and both initializers through an installed packed CLI outside the monorepo', async () => {
        const projectPath = join(temporaryPath, 'workspace-smoke');
        const installationPath = join(temporaryPath, 'installed-bin');
        await mkdir(projectPath);
        await mkdir(installationPath);
        const entrypoint = join(installationPath, 'ptbk');
        if (process.platform === 'win32') {
            // Windows npm launchers are shims; creating a file symlink requires an administrator privilege.
            await writeFile(entrypoint, `require(${JSON.stringify(join(packagePath, 'bin/promptbook-cli.js'))});\n`);
        } else {
            await symlink(join(packagePath, 'bin/promptbook-cli.js'), entrypoint);
        }
        const environment = {
            ...process.env,
            NODE_OPTIONS: FIXTURE_NODE_OPTIONS,
            PATH: `${harnessPath}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
            GIT_CONFIG_GLOBAL: join(temporaryPath, 'empty-git-config'),
            GIT_CONFIG_NOSYSTEM: '1',
        };
        /** Uses the installed executable layout and already installed dependencies, without npm downloads. */
        const run = (argumentsList: string[], executionEnvironment: NodeJS.ProcessEnv = environment) =>
            EXECUTE_FILE(process.execPath, [entrypoint, ...argumentsList], {
                cwd: projectPath,
                env: executionEnvironment,
                timeout: 60000,
                maxBuffer: 2 * 1024 * 1024,
            });
        for (const argumentsList of [
            ['--help'],
            ['--version'],
            ['init', '--help'],
            ['coder', 'init', '--help'],
            ['coder', 'run', '--help'],
            ['coder', 'server', '--help'],
        ]) {
            await run(argumentsList, { ...environment, PATH: projectPath });
            expect(await readdir(projectPath)).toEqual([]);
        }
        await expect(
            run([
                'coder',
                'run',
                '--harness',
                'openai-codex',
                '--no-commit',
                '--git-changes',
                'ignore',
                '--no-questions',
            ]),
        ).rejects.toThrow('No Git working tree');
        expect(await readdir(projectPath)).toEqual([]);
        const listing = await run(['coder', 'list']);
        expect(listing.stderr).toContain('No Git working tree');
        expect(listing.stdout).toContain('No upcoming tasks');
        const previewBookPath = join(temporaryPath, 'preview-agents/developer.book');
        await mkdir(join(temporaryPath, 'preview-agents/.core'), { recursive: true });
        await writeFile(join(temporaryPath, 'preview-agents/.core/adam.book'), 'Adam\nFROM @Null\n');
        await writeFile(previewBookPath, 'Preview Developer\nFROM @Null\nPERSONA Inspect pending PRDs.\nCLOSED\n');
        const preview = await run(['coder', 'run', '--dry-run', '--no-ui', '--agent', previewBookPath]);
        expect(preview.stderr).toContain('No Git working tree');
        expect(preview.stdout).toContain('Following prompts need to be written');
        expect(await readdir(projectPath)).toEqual([]);

        await writeFile(join(projectPath, 'README.md'), '# Existing project\n');
        const initialized = await run(['init', '--no-questions']);
        expect(initialized.stdout).toContain('Git repository: initialized');
        const initializedPackage = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
        expect(initializedPackage.scripts.check).toContain('process.exit(1)');
        expect(initializedPackage.scripts['test-for-ptbk-coder']).toBeUndefined();
        expect(initializedPackage.scripts['check-for-ptbk-coder']).toBeUndefined();
        expect(initializedPackage.scripts['coder:run']).toContain('--check "npm run check" --check-before yes-and-fix');
        expect(
            (
                await EXECUTE_FILE('git', ['rev-parse', '--is-inside-work-tree'], {
                    cwd: projectPath,
                    env: environment,
                })
            ).stdout.trim(),
        ).toBe('true');
        expect((await EXECUTE_FILE('git', ['ls-files'], { cwd: projectPath, env: environment })).stdout.trim()).toBe(
            '',
        );
        expect(await readFile(join(projectPath, 'README.md'), 'utf-8')).toBe('# Existing project\n');
        const configurationBefore = await readFile(join(projectPath, '.git/config'));
        const repeated = await run(['coder', 'init', '--no-questions']);
        expect(repeated.stdout).toContain('Git repository: reused');
        expect(await readFile(join(projectPath, '.git/config'))).toEqual(configurationBefore);
        expect((await run(['coder', 'initialize', '--no-questions'])).stdout).toContain('Git repository: reused');
        expect(JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8')).scripts).toEqual(
            initializedPackage.scripts,
        );

        const checkArguments = [
            'coder',
            'run',
            '--harness',
            'openai-codex',
            '--check-before',
            'yes-and-fail',
            '--no-questions',
            '--no-ui',
            '--no-commit',
            '--git-changes',
            'ignore',
        ];
        await expect(run(checkArguments)).rejects.toThrow('Project check is not configured');
        await expect(run([...checkArguments, '--check', 'npm run missing-build'])).rejects.toThrow(
            'scripts.missing-build is missing',
        );
        await expect(
            run([...checkArguments, '--check', 'npm run missing-build && (cd child-check && npm run check)']),
        ).rejects.toThrow('scripts.missing-build is missing');
        for (const command of ['run', 'server']) {
            await expect(run(['coder', command, '--test', 'npm test'])).rejects.toThrow('renamed to `--check`');
            await expect(run(['coder', command, '--test-before', 'yes-and-fix'])).rejects.toThrow(
                'renamed to `--check-before`',
            );
        }
        await writeFile(
            join(projectPath, 'check.cjs'),
            "console.log('All tests passed!'); console.error('deterministic build failure'); process.exit(1);\n",
        );
        initializedPackage.scripts.check = 'node check.cjs';
        await writeFile(join(projectPath, 'package.json'), JSON.stringify(initializedPackage));
        await expect(run(checkArguments)).rejects.toThrow('deterministic build failure');
        await writeFile(join(projectPath, 'check.cjs'), "console.log('deterministic project check passed');\n");
        expect((await run(checkArguments)).stdout).toContain('Pre-coding checks passed');
        expect(
            (await run([...checkArguments, '--check', `node -e "console.log('(npm run missing-validation)')"`])).stdout,
        ).toContain('(npm run missing-validation)');
        await mkdir(join(projectPath, 'child-check'));
        await writeFile(
            join(projectPath, 'child-check/package.json'),
            JSON.stringify({ scripts: { check: 'node ../check.cjs' } }),
        );
        expect((await run([...checkArguments, '--check', 'npm run check --prefix child-check'])).stdout).toContain(
            'Pre-coding checks passed',
        );
        expect((await readdir(join(projectPath, 'prompts'))).filter((name) => name.includes('repair'))).toEqual([]);

        const secondProjectPath = join(temporaryPath, 'workspace-coder-init');
        await mkdir(secondProjectPath);
        const coderInitialized = await EXECUTE_FILE(process.execPath, [entrypoint, 'coder', 'init', '--no-questions'], {
            cwd: secondProjectPath,
            env: environment,
            timeout: 60000,
        });
        expect(coderInitialized.stdout).toContain('Git repository: initialized');
        const secondPackage = JSON.parse(await readFile(join(secondProjectPath, 'package.json'), 'utf-8'));
        expect(secondPackage.scripts.check).toContain('process.exit(1)');
        expect(secondPackage.scripts['coder:run']).toContain('--check "npm run check"');
        expect(
            (
                await EXECUTE_FILE('git', ['rev-parse', '--is-inside-work-tree'], {
                    cwd: secondProjectPath,
                    env: environment,
                })
            ).stdout.trim(),
        ).toBe('true');
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
                NODE_OPTIONS: FIXTURE_NODE_OPTIONS,
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
            const readmePath = join(projectPath, 'prompts/README.md');
            expect(initialized.stdout).toContain('prompts/README.md: created');
            expect(await readFile(readmePath, 'utf-8')).toBe(`${PROMPTS_README_TEMPLATE}\n`);
            if (mode === 'packaged') {
                const queue = await run(['coder', 'list']);
                expect(queue.stdout).toContain('No upcoming tasks.');
                expect(queue.stdout).not.toContain('README.md');
                // Validate the shipped example without launching an implementation or repeating source-level checks.
                const documentedRun = PROMPTS_README_TEMPLATE.match(/`(ptbk coder run [^`]+)`/u)![1]!;
                const documentedArguments = Array.from(documentedRun.matchAll(/"[^"]*"|\S+/gu), ([argument]) =>
                    argument.replace(/^"|"$/gu, ''),
                );
                await run([...documentedArguments.slice(1), '--dry-run', '--no-ui']);
            }
            expect(initialized.stdout).toContain('agents/planner.book: created');
            for (const asset of [
                'developer.book',
                'planner.book',
                'lawyer.book',
                'copywriter.book',
                '.core/adam.book',
            ]) {
                expect(await readFile(join(projectPath, 'agents', asset))).toEqual(
                    await readFile(join(packagePath, 'agents/default', asset)),
                );
            }
            expect(initialized.stdout).toContain('agents/lawyer.book: created');
            expect(initialized.stdout).toContain('agents/copywriter.book: created');
            expect(await readFile(join(projectPath, 'agents/.core/adam.book'), 'utf-8')).toContain('Adam');
            const planner = await readFile(join(projectPath, 'agents/planner.book'), 'utf-8');
            await writeFile(
                join(projectPath, 'agents/planner.book'),
                planner.replace('CLOSED', 'RULE Preserve this project preference.\n\nCLOSED'),
            );
            const repeated = await run(['coder', 'init', '--no-questions']);
            expect(repeated.stdout).toContain('prompts/README.md: unchanged');
            expect(await readFile(readmePath, 'utf-8')).toBe(`${PROMPTS_README_TEMPLATE}\n`);
            expect(repeated.stdout).toContain('agents/planner.book: unchanged');
            expect(await readFile(join(projectPath, 'agents/planner.book'), 'utf-8')).toContain(
                'Preserve this project preference',
            );
            // Model an older project with every script already present and only one of the helpers customized.
            const developerPath = join(projectPath, 'agents/developer.book');
            await writeFile(developerPath, (await readFile(developerPath, 'utf-8')).replace(/^TEAM .*\r?\n/gm, ''));
            await rm(join(projectPath, 'agents/lawyer.book'));
            await rm(readmePath);
            const customCopywriter =
                'Copywriter\r\nPERSONA Write concise interface text in the project language.\r\nCLOSED\r\n';
            await writeFile(join(projectPath, 'agents/copywriter.book'), customCopywriter);
            const upgraded = await run(['coder', 'init', '--no-questions']);
            expect(upgraded.stdout).toContain('prompts/README.md: created');
            expect(await readFile(readmePath, 'utf-8')).toBe(`${PROMPTS_README_TEMPLATE}\n`);
            expect(upgraded.stdout).toContain('agents/lawyer.book: created');
            expect(upgraded.stdout).toContain('agents/developer.book: augmented');
            expect(upgraded.stdout).toContain('agents/copywriter.book: unchanged');
            expect(await readFile(join(projectPath, 'agents/copywriter.book'), 'utf-8')).toBe(customCopywriter);
            const customReadme = '# Our project workflow\n\nKeep these instructions.\n';
            await writeFile(readmePath, customReadme);
            const initializedSnapshot = await snapshotPlanningProject(projectPath);
            await run(['coder', 'init', '--no-questions']);
            expect(await readFile(readmePath, 'utf-8')).toBe(customReadme);
            expect(await snapshotPlanningProject(projectPath)).toEqual(initializedSnapshot);
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
