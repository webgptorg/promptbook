import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from './helpers.mjs';

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
