import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, copyFile, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { ROOT, temporaryDirectory } from './helpers.mjs';

const execFileAsync = promisify(execFile);

/** Absolute shell paths let fixtures replace PATH without hiding the shell itself. */
const availableShells = Promise.all((process.platform === 'win32' ? ['powershell', 'pwsh'] : ['pwsh']).map(async (shell) => {
    try {
        const { stdout } = await execFileAsync(shell, ['-NoProfile', '-Command', '[Console]::Write((Get-Process -Id $PID).Path)']);
        return stdout.trim();
    } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw error;
    }
})).then((shells) => shells.filter(Boolean));

/** A fixture user with no tools or network dependencies. */
async function isolatedUser(t) {
    const directory = await temporaryDirectory(t, 'ptbk installer \u00fc [x] & user');
    for (const part of ['bin', 'local', 'roaming', 'home', 'temp']) await mkdir(join(directory, part));
    const env = { ...process.env, LOCALAPPDATA: join(directory, 'local'), APPDATA: join(directory, 'roaming'), USERPROFILE: join(directory, 'home'), TEMP: join(directory, 'temp') };
    const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    env[pathKey] = join(directory, 'bin');
    return { directory, env };
}

/** A native version probe which can print a valid-looking version and still fail. */
async function probeTool(directory, name, version, exitCode = 0) {
    const filename = process.platform === 'win32' && !name.endsWith('.cmd') ? name + '.cmd' : name;
    const content = process.platform === 'win32'
        ? '@echo off\r\necho ' + version + '\r\nexit /b ' + exitCode + '\r\n'
        : '#!/bin/sh\nprintf "%s\\n" "' + version + '"\nexit ' + exitCode + '\n';
    const path = join(directory, 'bin', filename);
    await writeFile(path, content);
    await chmod(path, 0o755);
}

/** Reads the Unicode result protocol consumed by the native installer. */
async function installerData(path) {
    const source = await readFile(path, 'utf16le');
    return Object.fromEntries([...source.matchAll(/^([^=\r\n]+)=(.*)$/gm)].map((match) => [match[1], match[2]]));
}

/**
 * Runs a PowerShell script file and returns its exit code and combined output (`undefined` when that shell is missing).
 */
async function runPowerShell(shell, args, env) {
    try {
        const { stdout, stderr } = await execFileAsync(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ...args], { env, timeout: 120_000 });
        return { code: 0, output: `${stdout}${stderr}` };
    } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        return { code: error.code, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
}

test('Windows installer sources and PowerShell workflow steps are pure ASCII (BOM-less files are read as ANSI on Windows)', async () => {
    // Windows PowerShell 5.1 and Inno Setup read a file without a BOM as ANSI: an em dash (E2 80 94) then contains a
    // right double quotation mark, which PowerShell treats as a string delimiter and the whole script fails to parse.
    for (const file of ['installer/windows/bootstrap.ps1', 'installer/windows/promptbook.iss', 'installer/windows/report-dialog.iss', 'installer/windows/command-line.iss', 'test/fixtures/installer-dialog.iss', 'test/fixtures/installer-dialog.ps1', 'test/fixtures/installer-functions.ps1', '.github/workflows/check.yml', '.github/workflows/publish.yml']) {
        const content = await readFile(join(ROOT, file));
        const offset = content.findIndex((byte) => byte > 0x7f);
        const line = offset < 0 ? 0 : content.subarray(0, offset).toString('latin1').split('\n').length;
        assert.equal(offset, -1, `${file} contains a non-ASCII character on line ${line}`);
    }
});

test('Windows installer bootstrap: exact version, explicit handoff through --path, documented exit codes', async () => {
    const script = await readFile(join(ROOT, 'installer', 'windows', 'bootstrap.ps1'), 'utf8');
    assert.match(script, /\$spec = if \(\$PackageSpec\) \{ \$PackageSpec \} else \{ "ptbk@\$PromptbookVersion" \}/, 'installs the exact advertised version, never latest');
    assert.match(script, /init --path \$\(ConvertTo-PowerShellLiteral \$target\)/, 'hands the prepared folder to the ordinary init');
    assert.doesNotMatch(script, /Set-ExecutionPolicy/, 'never relaxes the machine execution policy');
    for (const code of [2, 3, 4, 5, 6]) assert.match(script, new RegExp(`(Stop-Bootstrap|exit) ${code}\\b`), `exit code ${code} is used`);
    const setup = await readFile(join(ROOT, 'installer', 'windows', 'promptbook.iss'), 'utf8');
    assert.match(setup, /^PrivilegesRequired=lowest$/m, 'the installer itself runs per user');
    // Inno Setup rejects a prerelease such as 0.119.0-25 in the binary (a.b.c.d) version resources.
    for (const directive of ['VersionInfoVersion', 'VersionInfoProductVersion']) assert.match(setup, new RegExp(`^${directive}=\\{#NumericVersion\\}$`, 'm'), `${directive} is numeric`);
    for (const directive of ['VersionInfoTextVersion', 'VersionInfoProductTextVersion']) assert.match(setup, new RegExp(`^${directive}=\\{#Version\\}$`, 'm'), `${directive} carries the release version`);
});

test('Windows installer bootstrap reuses the Node.js, npm and Git that are present (probed in plan mode with each available PowerShell)', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk bootstrap');
    const env = { ...process.env, LOCALAPPDATA: join(directory, 'local'), APPDATA: join(directory, 'roaming'), USERPROFILE: join(directory, 'home'), TEMP: join(directory, 'temp') };
    if (process.platform !== 'win32') {
        // The bootstrap looks for npm.cmd (npm's Windows shim); elsewhere a stand-in forwards to npm.
        const bin = join(directory, 'bin');
        await mkdir(bin);
        await writeFile(join(bin, 'npm.cmd'), '#!/bin/sh\nexec npm "$@"\n');
        await chmod(join(bin, 'npm.cmd'), 0o755);
        env.PATH = `${bin}${delimiter}${env.PATH ?? ''}`;
    }
    // Windows PowerShell 5.1 is what the installer runs; PowerShell 7 is also on the hosted Linux and macOS runners.
    const shells = process.platform === 'win32' ? ['powershell', 'pwsh'] : ['pwsh'];
    let probed = 0;
    for (const shell of shells) {
        const result = await runPowerShell(shell, [join(ROOT, 'installer', 'windows', 'bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-ProjectsRoot', join(directory, 'Projects [x] & co'), '-ProjectName', "first & project's", '-Plan'], env);
        if (!result) continue;
        probed++;
        assert.equal(result.code, 0, `${shell}: ${result.output}`);
        // A working tool must never be reported as broken: stopping its output early used to lose its exit code.
        assert.match(result.output, /Node\.js \d+\.\d+\.\d+ at /, `${shell}: ${result.output}`);
        assert.match(result.output, /npm \d+\.\d+\.\d+/, `${shell}: ${result.output}`);
        assert.match(result.output, /Git \d+\.\d+\.\d+ at /, `${shell}: ${result.output}`);
        assert.match(result.output, /PLAN: npm install --global ptbk@0\.0\.0-test/, `${shell}: ${result.output}`);
        assert.match(result.output, /Handoff command: ptbk init --path /, `${shell}: ${result.output}`);
    }
    if (!probed) t.skip('no PowerShell is installed');
});

test('the installer check expects what the installer plans: its asserted texts exist in the bootstrap', async () => {
    // The check itself runs only on Windows, where a stale text blocks publishing; this catches it before a release.
    const workflow = await readFile(join(ROOT, '.github', 'workflows', 'check.yml'), 'utf8');
    const bootstrap = await readFile(join(ROOT, 'installer', 'windows', 'bootstrap.ps1'), 'utf8');
    const expected = [...workflow.matchAll(/-notmatch '(PLAN: [^']+)'/g)].map((match) => match[1]);
    assert.ok(expected.length >= 2, 'the check still asserts the planned prerequisites');
    for (const text of expected) assert.ok(bootstrap.includes(text), `the bootstrap no longer plans "${text}"`);
});

test('required-software detection distinguishes missing, incompatible, broken and usable tools without installing anything', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    const cases = [
        { label: 'clean computer', node: undefined, npm: undefined, git: undefined, expected: ['0', '0', '0'] },
        { label: 'compatible tools', node: 'v22.13.0', npm: '10.5.0', git: 'git version 2.45.1', expected: ['1', '1', '0'] },
        { label: 'old Node', node: 'v20.19.0', npm: '10.5.0', git: 'git version 2.45.1', expected: ['0', '1', '0'] },
        { label: 'missing npm', node: 'v24.0.0', npm: undefined, git: 'git version 2.45.1', expected: ['0', '1', '0'] },
        { label: 'old npm', node: 'v24.0.0', npm: '9.0.0', git: 'git version 2.45.1', expected: ['0', '1', '0'] },
        { label: 'broken Node', node: 'v24.0.0', nodeExit: 17, npm: '10.5.0', git: 'git version 2.45.1', expected: ['0', '1', '0'] },
        { label: 'broken Git', node: 'v24.0.0', npm: '10.5.0', git: 'git version 2.45.1', gitExit: 19, expected: ['1', '0', '1'] },
    ];
    for (const shell of shells) for (const fixture of cases) await t.test(shell + ': ' + fixture.label, async (t) => {
        const { directory, env } = await isolatedUser(t);
        if (fixture.node) await probeTool(directory, 'node', fixture.node, fixture.nodeExit);
        if (fixture.npm) await probeTool(directory, 'npm.cmd', fixture.npm);
        if (fixture.git) await probeTool(directory, 'git', fixture.git, fixture.gitExit);
        const detection = join(directory, 'detected.ini');
        const resultFile = join(directory, 'result.ini');
        const projectsRoot = join(directory, 'Projects [x] & co');
        const result = await runPowerShell(shell, [join(ROOT, 'installer/windows/bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-ProjectsRoot', projectsRoot, '-DetectOnly', '-IsolatedPath', '-DetectionFile', detection, '-ResultFile', resultFile], env);
        assert.equal(result.code, 0, result.output);
        const actual = await installerData(detection);
        assert.deepEqual([actual.NodeReady, actual.GitReady, actual.GitNeedsRepair], fixture.expected, result.output);
        assert.equal((await installerData(resultFile)).Code, '0');
        // PowerShell may create its own AppData cache in an isolated Windows profile. Check the actual project
        // locations instead: neither the selected projects root nor the default ptbk directory may be created.
        for (const path of [projectsRoot, join(env.USERPROFILE, 'ptbk')]) {
            await assert.rejects(readdir(path), { code: 'ENOENT' }, 'detection must not create a project');
        }
    });
});

test('unexpected bootstrap errors retain their stage and a readable result for the installer', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const resultFile = join(directory, 'result.ini');
        const result = await runPowerShell(shell, [join(ROOT, 'installer/windows/bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-DetectOnly', '-IsolatedPath', '-ResultFile', resultFile], env);
        assert.equal(result.code, 5, result.output);
        const actual = await installerData(resultFile);
        assert.equal(actual.Code, '5');
        assert.equal(actual.Stage, 'Checking required software');
        assert.match(actual.Message, /Detection requires -DetectionFile/);
        assert.match(actual.NextAction, /Retry/);
        assert.match(await readFile(actual.LogFile, 'utf8'), /Unexpected error at line/);
    }
});

test('a failed Node download reports the actual error and never continues to package installation', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const wrapper = join(directory, 'network-failure.ps1');
        const resultFile = join(directory, 'result.ini');
        await writeFile(wrapper, "param([string] $Bootstrap, [string] $ResultFile)\nfunction Invoke-WebRequest { throw 'Fixture connection refused' }\n& $Bootstrap -PromptbookVersion '0.0.0-test' -IsolatedPath -ResultFile $ResultFile\nexit $LASTEXITCODE\n");
        const result = await runPowerShell(shell, [wrapper, '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-ResultFile', resultFile], env);
        assert.equal(result.code, 5, result.output);
        const actual = await installerData(resultFile);
        assert.equal(actual.Stage, 'Node.js installation');
        assert.match(actual.Message, /Fixture connection refused/);
        assert.doesNotMatch(result.output, /Promptbook CLI ptbk/);
    }
});

test('Windows preparation uses hidden captured output and leaves harness selection to init', async () => {
    const setup = await readFile(join(ROOT, 'installer/windows/promptbook.iss'), 'utf8');
    const bootstrap = await readFile(join(ROOT, 'installer/windows/bootstrap.ps1'), 'utf8');
    assert.match(setup, /ExecAndLogOutput\(/);
    assert.match(setup, /CreateOutputMarqueeProgressPage\(/);
    assert.doesNotMatch(setup, /\bSW_SHOW\b|see the terminal window|stage reported in the terminal/);
    assert.doesNotMatch(setup, /Name: "(codex|claude)"|install if missing/);
    assert.doesNotMatch(setup, /CreateInput(?:Dir|Query)Page|-ProjectsRoot|-ProjectName|-ValidateProjectsOnly/);
    assert.match(setup, /Params := ' -SkipProject';/, 'normal installation always selects software-only preparation');
    assert.match(bootstrap, /Start-Process -FilePath \$DesktopPath \| Out-Null/, 'opens the normal desktop entry point');
    assert.doesNotMatch(bootstrap, /InstallCodex|InstallClaude|@openai\/codex|@anthropic-ai\/claude-code/);
});

test('verified downloads retry transient failures and refuse corrupt content', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const result = await runPowerShell(shell, [join(ROOT, 'test/fixtures/installer-functions.ps1'), '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-WorkDirectory', directory, '-Mode', 'downloads'], env);
        assert.equal(result.code, 0, result.output);
        assert.match(result.output, /Retry and checksum verified/);
    }
});

test('Node archives extract to literal Unicode and bracket paths and repairs preserve an earlier runtime', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const result = await runPowerShell(shell, [join(ROOT, 'test/fixtures/installer-functions.ps1'), '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-WorkDirectory', directory, '-Mode', 'archive'], env);
        assert.equal(result.code, 0, result.output);
        assert.match(result.output, /Literal-path extraction and repair verified/);
    }
});

test('a previously prepared private Node runtime is reused despite a stale incompatible PATH', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        await probeTool(directory, 'node', 'v20.19.0');
        const runtime = join(env.LOCALAPPDATA, 'Promptbook', 'runtime', 'node-fixture');
        await mkdir(runtime, { recursive: true });
        if (process.platform === 'win32') await copyFile(process.execPath, join(runtime, 'node.exe'));
        else await symlink(process.execPath, join(runtime, 'node.exe'));
        const npm = join(runtime, 'npm.cmd');
        await writeFile(npm, process.platform === 'win32' ? '@echo off\r\necho 10.5.0\r\nexit /b 0\r\n' : '#!/bin/sh\nprintf "10.5.0\\n"\n');
        await chmod(npm, 0o755);
        const result = await runPowerShell(shell, [join(ROOT, 'test/fixtures/installer-functions.ps1'), '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-WorkDirectory', directory, '-Mode', 'reuse'], env);
        assert.equal(result.code, 0, result.output);
        assert.match(result.output, /Private runtime reused/);
    }
});


test('default preflight defers directory creation until npm can reserve its launcher path', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const resultFile = join(directory, 'result.ini');
        const detection = join(directory, 'destination.ini');
        // No -ProjectsRoot: exercise the exact multi-level home/ptbk/project default in the screenshot.
        const args = [join(ROOT, 'installer/windows/bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-ValidateProjectsOnly', '-IsolatedPath', '-DetectionFile', detection, '-ResultFile', resultFile];
        for (let attempt = 0; attempt < 2; attempt++) {
            const result = await runPowerShell(shell, args, env);
            assert.equal(result.code, 0, result.output);
            const destination = await installerData(detection);
            assert.equal(destination.Root, join(env.USERPROFILE, 'ptbk', 'project'));
            await assert.rejects(readdir(join(env.USERPROFILE, 'ptbk')), { code: 'ENOENT' }, 'preflight must not occupy npm launcher paths before the global prefix is known');
            await assert.rejects(readdir(destination.Target), { code: 'ENOENT' });
            const actual = await installerData(resultFile);
            const report = await readFile(actual.ReportFile, 'utf8');
            assert.match(report, /Version: 0\.0\.0-test/);
            assert.match(report, /PowerShell: /);
            assert.match(report, /Exit code: 0/);
            assert.doesNotMatch(result.output, /Promptbook CLI ptbk|Downloading/);
        }
    }
});

test('folder errors are reported before software changes and retain the conflicting user file', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) for (const conflict of ['ancestor', 'root', 'project-file', 'nonempty', 'linked-project']) await t.test(shell + ': ' + conflict, async (t) => {
        const { directory, env } = await isolatedUser(t);
        const root = join(env.USERPROFILE, 'ptbk', 'project');
        const target = join(root, 'first project');
        let sentinel;
        if (conflict === 'ancestor') {
            sentinel = join(env.USERPROFILE, 'ptbk');
        } else if (conflict === 'root') {
            await mkdir(join(env.USERPROFILE, 'ptbk'));
            sentinel = root;
        } else {
            await mkdir(root, { recursive: true });
            if (conflict === 'linked-project') {
                const outside = join(directory, 'outside');
                await mkdir(outside);
                await symlink(outside, target, process.platform === 'win32' ? 'junction' : 'dir');
                sentinel = join(outside, 'keep.txt');
            } else if (conflict === 'nonempty') {
                await mkdir(target);
                sentinel = join(target, 'keep.txt');
            } else sentinel = target;
        }
        await writeFile(sentinel, 'user file preserved');
        const resultFile = join(directory, 'result.ini');
        // A real bootstrap run, without Plan or ValidateProjectsOnly, must fail before even probing tools.
        const result = await runPowerShell(shell, [join(ROOT, 'installer/windows/bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-ProjectsRoot', root, '-ProjectName', 'first project', '-IsolatedPath', '-ResultFile', resultFile], env);
        assert.equal(result.code, 4, result.output);
        const actual = await installerData(resultFile);
        assert.equal(actual.Code, '4');
        assert.match(actual.Stage, /^Projects? folder$/);
        assert.match(actual.NextAction, /Choose/);
        assert.doesNotMatch(result.output, /Node\.js and npm|Promptbook CLI ptbk|Downloading/);
        assert.equal(await readFile(sentinel, 'utf8'), 'user file preserved');
        const report = await readFile(actual.ReportFile, 'utf8');
        assert.ok(report.includes(actual.Message), report);
        assert.ok(report.includes(root), report);
        assert.match(report, /PATH .*ptbk/);
    });
});

test('the same preflight refuses Windows device names, traversal and trailing dots before creating a root', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) for (const name of ['..', 'CON.txt', 'aux', 'LPT1.log', 'outside/child', 'trailing.']) {
        const { directory, env } = await isolatedUser(t);
        const resultFile = join(directory, 'result.ini');
        const result = await runPowerShell(shell, [join(ROOT, 'installer/windows/bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-ProjectName', name, '-ValidateProjectsOnly', '-ResultFile', resultFile], env);
        assert.equal(result.code, 4, shell + ': ' + name + ': ' + result.output);
        assert.equal((await installerData(resultFile)).Stage, 'Project name');
        await assert.rejects(readdir(join(env.USERPROFILE, 'ptbk')), { code: 'ENOENT' });
    }
});

test('project skip does not validate or create a projects root', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const blockedRoot = join(env.USERPROFILE, 'ptbk');
        await writeFile(blockedRoot, 'kept');
        const result = await runPowerShell(shell, [join(ROOT, 'installer/windows/bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-SkipProject', '-Plan', '-IsolatedPath'], env);
        assert.equal(result.code, 2, result.output);
        assert.equal(await readFile(blockedRoot, 'utf8'), 'kept');
    }
});

test('report sanitization removes credentials while keeping useful Windows path diagnostics', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const wrapper = join(directory, 'report.ps1');
        await writeFile(wrapper, [
            'param([string] $Bootstrap)',
            '$tokens = $null; $errors = $null',
            '$ast = [Management.Automation.Language.Parser]::ParseFile($Bootstrap, [ref] $tokens, [ref] $errors)',
            "foreach ($f in $ast.FindAll({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] }, $false)) { . ([scriptblock]::Create($f.Extent.Text)) }",
            "Protect-DiagnosticText 'https://user:fixture-secret@registry.invalid/npm?token=fixture-token api_key=fixture-key Authorization: Bearer fixture-bearer Authorization: Basic fixture-basic C:\\Users\\test\\ptbk\\project'",
        ].join('\n'));
        const result = await runPowerShell(shell, [wrapper, '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1')], env);
        assert.equal(result.code, 0, result.output);
        assert.doesNotMatch(result.output, /fixture-secret|fixture-token|fixture-key|fixture-bearer|fixture-basic/);
        assert.match(result.output, /C:\\Users\\test\\ptbk\\project/);
        assert.match(result.output, /\[redacted\]/);
    }
});


test('a real Windows write denial remains a folder error without permission changes or probe files', { skip: process.platform !== 'win32' }, async (t) => {
    const shells = await availableShells;
    assert.ok(shells.length, 'Windows must provide PowerShell for the installer');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const result = await runPowerShell(shell, [join(ROOT, 'test/fixtures/installer-functions.ps1'), '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-WorkDirectory', directory, '-Mode', 'permissions'], env);
        assert.equal(result.code, 0, result.output);
        const actual = await installerData(join(directory, 'permission-result.ini'));
        assert.equal(actual.Code, '4');
        assert.equal(actual.Stage, 'Projects folder');
        assert.match(await readFile(actual.ReportFile, 'utf8'), /write-denied/);
    }
});

test('a blocked default selects the same safe alternative in preflight and prerequisite discovery', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) for (const conflict of ['ancestor', 'root', 'alternatives']) await t.test(shell + ': ' + conflict, async (t) => {
        const { directory, env } = await isolatedUser(t);
        const original = conflict === 'root' ? join(env.USERPROFILE, 'ptbk', 'project') : join(env.USERPROFILE, 'ptbk');
        if (conflict === 'root') await mkdir(join(env.USERPROFILE, 'ptbk'));
        await writeFile(original, 'legacy file preserved');
        if (conflict === 'alternatives') {
            await writeFile(join(env.USERPROFILE, 'ptbk-projects'), 'kept');
            await writeFile(join(env.USERPROFILE, 'ptbk-projects-2'), 'kept too');
        }
        const expected = join(env.USERPROFILE, conflict === 'alternatives' ? 'ptbk-projects-3' : 'ptbk-projects');
        const destination = join(directory, 'destination.ini');
        const resultFile = join(directory, 'result.ini');
        const base = [join(ROOT, 'installer/windows/bootstrap.ps1'), '-PromptbookVersion', '0.0.0-test', '-IsolatedPath', '-ResultFile', resultFile];
        for (let attempt = 0; attempt < 2; attempt++) {
            const result = await runPowerShell(shell, [...base, '-ValidateProjectsOnly', '-DetectionFile', destination], env);
            assert.equal(result.code, 0, result.output);
            assert.equal((await installerData(destination)).Root, expected);
            const actual = await installerData(resultFile);
            assert.equal(actual.ProjectsRoot, expected);
            assert.match(await readFile(actual.ReportFile, 'utf8'), /Default location choice: .*blocked/);
        }
        const detection = join(directory, 'prerequisites.ini');
        const result = await runPowerShell(shell, [...base, '-DetectOnly', '-DetectionFile', detection], env);
        assert.equal(result.code, 0, result.output);
        assert.equal((await installerData(detection)).DefaultProjectsRoot, expected);
        assert.equal(await readFile(original, 'utf8'), 'legacy file preserved');
        await assert.rejects(readdir(expected), { code: 'ENOENT' }, 'default discovery creates no project directories');
    });
});

test('default selection reserves the future npm launcher when the custom global prefix is home', async (t) => {
    const shells = await availableShells;
    if (!shells.length) return t.skip('no PowerShell is installed');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const wrapper = join(directory, 'default-root.ps1');
        await writeFile(wrapper, [
            'param([string] $Bootstrap)',
            '$tokens = $null; $errors = $null',
            '$ast = [Management.Automation.Language.Parser]::ParseFile($Bootstrap, [ref] $tokens, [ref] $errors)',
            "foreach ($f in $ast.FindAll({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] }, $false)) { . ([scriptblock]::Create($f.Extent.Text)) }",
            '$choice = Get-DefaultProjectsRoot $env:USERPROFILE $env:USERPROFILE',
            '[Console]::Write($choice.Root)',
        ].join('\n'));
        const result = await runPowerShell(shell, [wrapper, '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1')], env);
        assert.equal(result.code, 0, result.output);
        assert.equal(result.output.trim(), join(env.USERPROFILE, 'ptbk-projects'));
        // Windows PowerShell may create its own AppData cache in a redirected fixture profile.
        assert.deepEqual((await readdir(env.USERPROFILE)).filter((name) => name.toLowerCase() !== 'appdata'), []);
    }
});

test('npm-generated ptbk launchers preserve literal Windows paths and custom launchers stay untouched', { skip: process.platform !== 'win32' }, async (t) => {
    const shells = await availableShells;
    assert.ok(shells.length, 'Windows provides PowerShell');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const result = await runPowerShell(shell, [join(ROOT, 'test/fixtures/installer-functions.ps1'), '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-WorkDirectory', directory, '-Mode', 'shim', '-NodePath', process.execPath], env);
        assert.equal(result.code, 0, result.output);
        assert.match(result.output, /Npm launcher literal paths and custom launcher preservation verified/);
    }
});

test('a compatible read-only npm launcher at an ordinary prefix is reused without a write', { skip: process.platform !== 'win32' }, async (t) => {
    const shells = await availableShells;
    for (const shell of shells) {
        const directory = await temporaryDirectory(t, 'ptbk ordinary prefix');
        if (/[&^!]/.test(directory)) return t.skip('the host temp location itself requires a launcher repair');
        const result = await runPowerShell(shell, [join(ROOT, 'test/fixtures/installer-functions.ps1'), '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-WorkDirectory', directory, '-Mode', 'shim', '-NodePath', process.execPath, '-ReadOnlyShim'], process.env);
        assert.equal(result.code, 0, result.output);
    }
});

test('a fresh redirected Windows profile creates and reuses literal Start menu shortcuts', { skip: process.platform !== 'win32' }, async (t) => {
    const shells = await availableShells;
    assert.ok(shells.length, 'Windows provides PowerShell');
    for (const shell of shells) {
        const { directory, env } = await isolatedUser(t);
        const result = await runPowerShell(shell, [join(ROOT, 'test/fixtures/installer-functions.ps1'), '-Bootstrap', join(ROOT, 'installer/windows/bootstrap.ps1'), '-WorkDirectory', directory, '-Mode', 'shortcuts', '-NodePath', process.execPath], env);
        assert.equal(result.code, 0, result.output);
        assert.match(result.output, /Fresh profile Start menu shortcuts created and reused/);
    }
});
