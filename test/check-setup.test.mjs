import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectProjectCheck, prepareProjectCheck, saveProjectCheck } from '../dist/coder/check-setup.js';

/** Generated setup validation must remain an honest failure until the project defines a real check. */
const placeholder = 'node -e "console.error(\'Configure a real project check script before running ptbk checks.\'); process.exit(1)"';

/** Real entry files let setup verify references without executing the deliberately failing fixture. */
const CHECK_FILES = ['validation.mjs', 'validate.mjs', 'saved-check.mjs', 'temporary-check.mjs', 'compile.mjs', 'validate-documents.mjs'];

/** Disposable project configuration permits checking setup without starting a service or running a model. */
async function fixture(t, document = { harnesses: [] }, scripts = { check: placeholder }) {
    const root = await mkdtemp(join(tmpdir(), 'ptbk check setup '));
    t.after(() => rm(root, { recursive: true, force: true }));
    const workspace = { projectPath: root, tasksPath: join(root, 'tasks'), legacyPath: join(root, 'prompts'), statePath: join(root, '.ptbk'), timezone: 'UTC' };
    const path = join(root, 'ptbk.json');
    const previous = `${JSON.stringify(document, null, 2)}\n`;
    await writeFile(path, previous);
    await writeFile(join(root, 'package.json'), JSON.stringify({ scripts }));
    for (const name of CHECK_FILES) await writeFile(join(root, name), 'throw new Error("Setup inspection must never execute validation");\n');
    return { workspace, path, previous };
}

/** Any unexpected terminal interaction fails preservation and explicit-option scenarios immediately. */
const noPrompt = {
    choose: async () => { throw new Error('Unexpected choice prompt'); },
    text: async () => { throw new Error('Unexpected command prompt'); },
    confirm: async () => { throw new Error('Unexpected save confirmation'); },
};

test('validation inspection is read-only for absent setup and honors explicit blank commands', async t => {
    const { workspace, path } = await fixture(t, { execution: { check: '' } });
    const files = await readdir(workspace.projectPath);
    const blank = await inspectProjectCheck(workspace);
    assert.equal(blank.command, '');
    assert.match(blank.diagnostic, /must contain a validation command/);
    assert.equal((await inspectProjectCheck(workspace, 'node validate.mjs')).diagnostic, undefined);
    assert.deepEqual(await readdir(workspace.projectPath), files);
    await rm(path);
    const absent = await inspectProjectCheck(workspace);
    assert.equal(absent.command, 'npm run check');
    assert.match(absent.diagnostic, /unconfigured setup placeholder/);
    assert.deepEqual((await readdir(workspace.projectPath)).sort(), files.filter(name => name !== 'ptbk.json').sort());
});

test('valid saved validation skips onboarding and preserves every configuration byte', async t => {
    const document = { harnesses: [], execution: { check: 'node validation.mjs', autoPull: false }, process: { server: false }, browser: { mode: 'headful' } };
    const { workspace, path, previous } = await fixture(t, document);
    const prepared = await prepareProjectCheck(workspace, { ui: noPrompt });
    assert.equal(prepared.command, 'node validation.mjs');
    assert.equal(prepared.updated, undefined);
    assert.deepEqual(await saveProjectCheck(workspace, prepared), []);
    assert.equal(await readFile(path, 'utf8'), previous);
});

test('an explicit override on a healthy project stays temporary and preserves its default', async t => {
    const { workspace, path, previous } = await fixture(t, { check: 'node saved-check.mjs', harnesses: [] });
    const prepared = await prepareProjectCheck(workspace, { command: 'node temporary-check.mjs', ui: noPrompt });
    assert.equal(prepared.command, 'node temporary-check.mjs');
    assert.equal(prepared.updated, undefined);
    assert.deepEqual(await saveProjectCheck(workspace, prepared), []);
    assert.equal((await inspectProjectCheck(workspace)).command, 'node saved-check.mjs');
    assert.equal(await readFile(path, 'utf8'), previous);
});

test('valid npm default validation is preserved despite a generated placeholder in another script', async t => {
    const { workspace, path, previous } = await fixture(t, { execution: { check: 'npm run typecheck' } }, { check: placeholder, typecheck: 'tsc --noEmit' });
    const prepared = await prepareProjectCheck(workspace, { ui: noPrompt });
    assert.equal(prepared.command, 'npm run typecheck');
    assert.equal(prepared.updated, undefined);
    assert.deepEqual(await saveProjectCheck(workspace, prepared), []);
    assert.equal(await readFile(path, 'utf8'), previous);
});

test('empty npm validation scripts remain unresolved through direct, nested and lifecycle references', async t => {
    for (const scripts of [{ check: '   ' }, { check: 'npm run validate', validate: '\t\n' }, { check: 'node validation.mjs', precheck: ' ' }]) {
        const { workspace, previous, path } = await fixture(t, { harnesses: [] }, scripts);
        assert.match((await inspectProjectCheck(workspace)).diagnostic, /Check setup error/);
        assert.equal(await prepareProjectCheck(workspace), undefined);
        assert.equal(await readFile(path, 'utf8'), previous);
    }
});

test('explicit setup repairs a placeholder by saving execution.check without changing package scripts', async t => {
    const document = { harnesses: [], execution: { noQuestions: false, gitChanges: 'ignore' }, browser: { mode: 'headless' }, updates: { harnesses: false } };
    const { workspace, path, previous } = await fixture(t, document);
    const manifest = await readFile(join(workspace.projectPath, 'package.json'), 'utf8');
    const prepared = await prepareProjectCheck(workspace, { command: 'node validation.mjs', ui: noPrompt });
    assert.equal(await readFile(path, 'utf8'), previous, 'Preparation does not write the selected command');
    assert.deepEqual(JSON.parse(prepared.updated), { ...document, execution: { ...document.execution, check: 'node validation.mjs' } });
    assert.deepEqual(await saveProjectCheck(workspace, prepared), [path]);
    assert.equal((await inspectProjectCheck(workspace)).command, 'node validation.mjs');
    assert.equal(await readFile(join(workspace.projectPath, 'package.json'), 'utf8'), manifest);
});

test('repair updates the existing effective check location while preserving lower precedence choices', async t => {
    for (const section of [undefined, 'routing', 'execution', 'process']) {
        const document = { harnesses: [], check: '' };
        if (section) document[section] = { check: '', ...(section === 'process' ? { server: false } : {}) };
        const { workspace, path } = await fixture(t, document);
        const prepared = await prepareProjectCheck(workspace, { command: 'node validation.mjs' });
        const expected = structuredClone(document);
        if (section) expected[section].check = 'node validation.mjs';
        else expected.check = 'node validation.mjs';
        assert.deepEqual(JSON.parse(prepared.updated), expected);
        await saveProjectCheck(workspace, prepared);
        assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), expected);
        assert.equal((await inspectProjectCheck(workspace)).command, 'node validation.mjs');
    }
});

test('invalid explicit commands fail before prompting or changing the project', async t => {
    const { workspace, path, previous } = await fixture(t);
    const files = (await readdir(workspace.projectPath)).sort();
    for (const command of ['', 'ptbk start', 'npm run missing', 'node missing-validation.mjs', placeholder]) {
        await assert.rejects(prepareProjectCheck(workspace, { command, ui: noPrompt }), /Check setup error/);
        assert.equal(await readFile(path, 'utf8'), previous);
        assert.deepEqual((await readdir(workspace.projectPath)).sort(), files);
    }
});

test('the script picker offers only recursively valid validators with their real shell command descriptions', async t => {
    const scripts = { check: placeholder, typecheck: 'tsc --noEmit', lint: 'npm run missing', test: 'npm run recursive', recursive: 'npm test', build: 'npm run compiler', compiler: 'node compile.mjs', prebuild: 'ptbk start', dev: 'node server.mjs' };
    const { workspace, path, previous } = await fixture(t, { harnesses: [] }, scripts);
    let confirmed;
    const prepared = await prepareProjectCheck(workspace, { ui: {
        choose: async (label, choices, initial) => {
            assert.match(label, /unconfigured setup placeholder/);
            assert.equal(initial, 'npm run typecheck');
            assert.deepEqual(choices.map(choice => choice.value), ['npm run typecheck', '@custom', '@defer']);
            assert.equal(choices[0].description, 'tsc --noEmit');
            return 'npm run typecheck';
        },
        text: noPrompt.text,
        confirm: async label => { confirmed = label; return true; },
    } });
    assert.equal(prepared.command, 'npm run typecheck');
    assert.match(confirmed, /execution\.check: npm run typecheck/);
    assert.match(confirmed, /does not run them/);
    assert.equal(await readFile(path, 'utf8'), previous);
    await saveProjectCheck(workspace, prepared);
    assert.equal((await inspectProjectCheck(workspace)).command, 'npm run typecheck');
});

test('custom validation retains an invalid draft until it is corrected and reviewed', async t => {
    const { workspace, path, previous } = await fixture(t, { check: '', harnesses: [] });
    let choices = 0;
    let fields = 0;
    const prepared = await prepareProjectCheck(workspace, { ui: {
        choose: async (label, catalog, initial) => {
            choices++;
            assert.equal(initial, '@custom');
            assert.deepEqual(catalog.map(choice => choice.value), ['@custom', '@defer']);
            if (choices === 2) assert.match(label, /recursively invokes ptbk/);
            return '@custom';
        },
        text: async (label, initial) => {
            assert.match(label, /validation shell command/);
            fields++;
            assert.equal(initial, fields === 1 ? '' : 'ptbk run');
            return fields === 1 ? 'ptbk run' : 'node validate-documents.mjs';
        },
        confirm: async label => { assert.match(label, /\ncheck: node validate-documents\.mjs/); return true; },
    } });
    assert.equal(prepared.command, 'node validate-documents.mjs');
    assert.equal(choices, 2);
    assert.equal(fields, 2);
    assert.equal(await readFile(path, 'utf8'), previous);
});

test('deferral and declining save keep the validation prerequisite unresolved without rewriting files', async t => {
    const { workspace, path, previous } = await fixture(t);
    assert.equal(await prepareProjectCheck(workspace), undefined);
    assert.equal(await prepareProjectCheck(workspace, { ui: { ...noPrompt, choose: async () => '@defer' } }), undefined);
    assert.equal(await prepareProjectCheck(workspace, { ui: {
        choose: async () => '@custom', text: async () => 'node validate.mjs', confirm: async () => false,
    } }), undefined);
    assert.match((await inspectProjectCheck(workspace)).diagnostic, /unconfigured setup placeholder/);
    assert.equal(await readFile(path, 'utf8'), previous);
    assert.deepEqual((await readdir(workspace.projectPath)).sort(), ['package.json', 'ptbk.json', ...CHECK_FILES].sort());
});

test('preparing and saving a shell check never executes its command or substitutions', async t => {
    const { workspace } = await fixture(t);
    const marker = join(workspace.projectPath, 'must-not-exist');
    const command = `node -e "require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed')"`;
    const prepared = await prepareProjectCheck(workspace, { command });
    await saveProjectCheck(workspace, prepared);
    await assert.rejects(readFile(marker), error => error.code === 'ENOENT');
    assert.deepEqual((await readdir(workspace.projectPath)).sort(), ['package.json', 'ptbk.json', ...CHECK_FILES].sort());
});

test('saving protects concurrent configuration edits and leaves no candidate files', async t => {
    const { workspace, path } = await fixture(t);
    const prepared = await prepareProjectCheck(workspace, { command: 'node validate.mjs' });
    const edited = '{"harnesses":[],"browser":{"mode":"headful"}}\n';
    await writeFile(path, edited);
    await assert.rejects(saveProjectCheck(workspace, prepared), /configuration changed concurrently/);
    assert.equal(await readFile(path, 'utf8'), edited);
    assert.deepEqual((await readdir(workspace.projectPath)).sort(), ['package.json', 'ptbk.json', ...CHECK_FILES].sort());
});

test('ownership and configuration are rechecked immediately before publishing a prepared choice', async t => {
    const { workspace, path } = await fixture(t);
    const prepared = await prepareProjectCheck(workspace, { command: 'node validate.mjs' });
    let assertions = 0;
    const edited = '{"harnesses":[],"updates":{"harnesses":false}}\n';
    await assert.rejects(saveProjectCheck(workspace, prepared, async () => {
        if (++assertions === 2) await writeFile(path, edited);
    }), /configuration changed concurrently/);
    assert.equal(assertions, 2);
    assert.equal(await readFile(path, 'utf8'), edited);
    assert.deepEqual((await readdir(workspace.projectPath)).sort(), ['package.json', 'ptbk.json', ...CHECK_FILES].sort());
});

test('a replaced config symlink cannot overwrite its target during validation setup', async t => {
    const { workspace, path } = await fixture(t);
    const prepared = await prepareProjectCheck(workspace, { command: 'node validate.mjs' });
    const target = join(workspace.projectPath, 'owner-config.json');
    await writeFile(target, prepared.previous);
    await rm(path);
    try { await symlink(target, path, 'file'); }
    catch (error) {
        if (error.code === 'EPERM' || error.code === 'EACCES') { t.skip('Host does not permit creating symbolic links'); return; }
        throw error;
    }
    await assert.rejects(saveProjectCheck(workspace, prepared), /refusing to replace a symlink/);
    assert.equal(await readFile(target, 'utf8'), prepared.previous);
    assert.deepEqual((await readdir(workspace.projectPath)).sort(), ['owner-config.json', 'package.json', 'ptbk.json', ...CHECK_FILES].sort());
});
