import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { ROOT, temporaryDirectory } from './helpers.mjs';

const execFileAsync = promisify(execFile);

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
    for (const file of ['installer/windows/bootstrap.ps1', 'installer/windows/promptbook.iss', '.github/workflows/check.yml', '.github/workflows/publish.yml']) {
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
