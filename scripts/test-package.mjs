import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import assert from 'node:assert/strict';
import { validateRelease } from './validate-release.mjs';

/** Executes npm and the packed executable in independent fixture directories. */
const execute = promisify(execFile);
/** The package under test is this checkout, independent of the caller's directory. */
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
/** Disposable package test root never touches the repository's project tasks. */
const temporary = await mkdtemp(join(tmpdir(), 'ptbk-package-'));
try {
    const release = await validateRelease();
    const { stdout } = await execute('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], { cwd: repositoryRoot });
    const packed = JSON.parse(stdout)[0];
    const files = packed.files.map(file => file.path);
    assert(files.includes('bin/ptbk.js') && files.includes('dist/coder/cli.js'), 'The executable and compiled runtime must be shipped.');
    assert(!files.some(path => /(?:^|\/)(?:\.env|node_modules|tasks|specs|src)(?:\/|$)/.test(path)), 'Package includes private or repository-only files.');
    const tarball = join(temporary, packed.filename);
    const fixture = join(temporary, 'external project');
    const globalPrefix = join(temporary, 'global');
    await mkdir(fixture);
    await writeFile(join(fixture, 'package.json'), '{"name":"ptbk-package-fixture","version":"0.0.0","private":true}\n');
    await execute('npm', ['install', '--no-audit', '--no-fund', tarball], { cwd: fixture });
    const executable = join(fixture, 'node_modules', 'ptbk', 'bin', 'ptbk.js');
    await execute(join(fixture, 'node_modules', '.bin', 'ptbk'), ['--version'], { cwd: fixture });
    const version = await execute(process.execPath, [executable, '--version'], { cwd: fixture });
    assert.equal(version.stdout.trim(), release.version);
    await execute(process.execPath, [executable, 'coder', 'init', '--no-questions'], { cwd: fixture });
    const contextPath = join(fixture, 'AGENTS.md');
    const context = await readFile(contextPath, 'utf8');
    await execute(process.execPath, [executable, 'coder', 'init', '--no-questions'], { cwd: fixture });
    assert.equal(await readFile(contextPath, 'utf8'), context);
    await execute(process.execPath, [executable, 'coder', 'add', 'Verify installed package'], { cwd: fixture });
    const listed = await execute(process.execPath, [executable, 'coder', 'list', '--json'], { cwd: fixture });
    assert.equal(JSON.parse(listed.stdout).tasks.length, 1);
    await execute(process.execPath, [executable, 'coder', 'run', '--dry-run', '--json'], { cwd: fixture });
    await writeFile(join(fixture, 'agents', 'package-smoke.book'), 'Package smoke developer\n\nRULE Implement the requested task without consulting advisors.\n');
    const harnessDirectory = join(temporary, 'harness-bin');
    await mkdir(harnessDirectory);
    const harness = join(harnessDirectory, 'opencode');
    await writeFile(harness, '#!/usr/bin/env node\nconst fs = require("node:fs");\nif (process.argv.includes("--help")) { console.log("--format --model --variant"); process.exit(0); }\nfs.writeFileSync("packed-output.txt", "Packed harness execution passed\\n");\nconsole.log(JSON.stringify({type:"result",result:"Implemented fixture"}));\n');
    await chmod(harness, 0o755);
    await execute('git', ['config', 'user.name', 'Package fixture'], { cwd: fixture });
    await execute('git', ['config', 'user.email', 'fixture@example.test'], { cwd: fixture });
    await execute('git', ['config', 'commit.gpgsign', 'false'], { cwd: fixture });
    await execute('git', ['add', '--', '.'], { cwd: fixture });
    await execute('git', ['commit', '-qm', 'Package fixture baseline'], { cwd: fixture });
    const executed = await execute(process.execPath, [executable, 'coder', 'run', '--harness', 'opencode', '--agent', 'agents/package-smoke.book', '--model', 'fixture/model', '--no-ui', '--check', 'node -e "require(\'node:fs\').accessSync(\'packed-output.txt\')"'], { cwd: fixture, env: { ...process.env, PATH: `${harnessDirectory}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}` } });
    assert.match(executed.stdout, /1 completed, 0 failed/);
    assert.equal(await readFile(join(fixture, 'packed-output.txt'), 'utf8'), 'Packed harness execution passed\n');
    assert.equal(JSON.parse((await execute(process.execPath, [executable, 'coder', 'list', '--json'], { cwd: fixture })).stdout).tasks[0].status, 'done');
    await execute('npm', ['install', '--global', '--prefix', globalPrefix, '--no-audit', '--no-fund', tarball], { cwd: fixture });
    const globalExecutable = process.platform === 'win32' ? join(globalPrefix, 'node_modules', 'ptbk', 'bin', 'ptbk.js') : join(globalPrefix, 'lib', 'node_modules', 'ptbk', 'bin', 'ptbk.js');
    const globalVersion = await execute(process.execPath, [globalExecutable, '--version'], { cwd: fixture });
    assert.equal(globalVersion.stdout.trim(), release.version);
    if (process.platform !== 'win32') {
        const linkedVersion = await execute(join(globalPrefix, 'bin', 'ptbk'), ['--version'], { cwd: fixture });
        assert.equal(linkedVersion.stdout.trim(), release.version);
    }
    process.stdout.write(`Packed ptbk@${release.version}: local/global installation and external-project init/add/list/dry-run/harness/check/commit passed.\n`);
} finally { await rm(temporary, { recursive: true, force: true }); }
