import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import JSZip from 'jszip';
import { vscodeVersion } from '../../../scripts/vscode-version.mjs';
import { assertSameExtension, vscePublish } from '../../../scripts/publish-vscode.mjs';
import language from '../../../dist-vscode/test/language.cjs';

test('Marketplace versions update legacy 1.x installations and preserve prerelease/stable ordering', () => {
    const versions = ['0.119.0-43', '0.119.0-44', '0.119.0', '0.119.1-0', '0.119.1', '0.120.0-0', '1.0.0-0'];
    const compare = (a, b) => { const left = a.split('.').map(Number), right = b.split('.').map(Number); return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]; };
    assert.equal(vscodeVersion(versions[0]), '2.119.43');
    const mapped = ['1.0.70', ...versions.map(vscodeVersion)];
    for (let i = 1; i < mapped.length; i++) assert.ok(compare(mapped[i], mapped[i - 1]) > 0, `${mapped[i - 1]} → ${mapped[i]}`);
    for (const bad of ['0.119.0-beta.1', '0.119.0-99999', '0.119.0+sha', '01.2.3', '0.1.21475']) assert.throws(() => vscodeVersion(bad));
});

test('staged identity, engine version, aliases, grammar and entry point come from the current checkout', async () => {
    const engine = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url)));
    const stage = new URL('../../../dist-vscode/extension/', import.meta.url);
    const manifest = JSON.parse(await readFile(new URL('package.json', stage)));
    assert.equal(`${manifest.publisher}.${manifest.name}`.toLowerCase(), 'promptbook.book-extension');
    assert.equal(manifest.promptbook.version, engine.version);
    assert.equal(manifest.version, vscodeVersion(engine.version));
    assert.equal(manifest.main, './out/extension.cjs');
    assert.ok((await readFile(new URL(manifest.main, stage))).length > 1000);
    assert.deepEqual(manifest.contributes.languages[0].extensions, ['.book', '.book.md', '.ptbk', '.ptbk.md']);
    const grammar = JSON.parse(await readFile(new URL('syntaxes/book.tmLanguage.json', stage)));
    const keywords = grammar.patterns.find((item) => item.name === 'keyword.control.commitment.book').match;
    for (const keyword of language.commitmentKeywords()) assert.ok(keywords.includes(keyword.replaceAll(' ', '[ \\t]+')), keyword);
    const snippets = JSON.parse(await readFile(new URL('snippets/book.json', stage)));
    for (const snippet of Object.values(snippets)) {
        const source = snippet.body.join('\n').replace(/\$\{\d+:([^}]+)\}/g, '$1').replace(/\$\d+/g, '');
        assert.equal(language.analyze(source).diagnostics.length, 0, source);
    }
});

test('publication retries compare actual extension bytes rather than only version numbers or ZIP timestamps', async () => {
    const make = async (text, date, extra = false) => {
        const zip = new JSZip().file('extension/package.json', '{"version":"2.119.43"}', { date })
            .file('extension/out/extension.cjs', text, { date });
        if (extra) zip.file('signature.p7s', 'Marketplace signature');
        return zip.generateAsync({ type: 'nodebuffer' });
    };
    const a = await make('original', new Date('2026-01-01'));
    await assertSameExtension(a, await make('original', new Date('2026-02-02'), true));
    await assert.rejects(assertSameExtension(a, await make('changed', new Date('2026-02-02'))), /differs/);
    const missing = await new JSZip().file('extension/package.json', '{}').generateAsync({ type: 'nodebuffer' });
    await assert.rejects(assertSameExtension(a, missing), /file list/);
});

test('Marketplace publication: the token first, trusted publishing (OIDC) when there is none or the Marketplace refused it, and the remedy when nothing works', async () => {
    const expired = '::error::Access Denied: The Personal Access Token used has expired.\n';
    /** A vsce double answering each attempt in turn; it records the arguments and whether a token was passed. */
    const scripted = (...answers) => {
        const calls = [];
        const run = async (args, env) => (calls.push({ oidc: args.includes('--oidc'), token: env.VSCE_PAT }), answers.shift());
        return { calls, run };
    };
    const quiet = () => undefined;
    const actions = { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.example/' };

    let vsce = scripted({ ok: true, output: 'DONE Published' });
    await vscePublish('x.vsix', { env: { VSCE_PAT: 'token' }, run: vsce.run, log: quiet });
    assert.deepEqual(vsce.calls, [{ oidc: false, token: 'token' }], 'a working token is enough');

    // The expired token of 0.119.0-44: trusted publishing is tried without the token, and both messages are logged.
    vsce = scripted({ ok: false, output: expired }, { ok: true, output: 'DONE Published' });
    const logged = [];
    await vscePublish('x.vsix', { env: { VSCE_PAT: 'token', ...actions }, run: vsce.run, log: (text) => logged.push(text) });
    assert.deepEqual(vsce.calls, [{ oidc: false, token: 'token' }, { oidc: true, token: undefined }]);
    assert.match(logged.join(''), /has expired[\s\S]*trying trusted publishing[\s\S]*DONE Published/);

    vsce = scripted({ ok: false, output: expired }, { ok: false, output: '::error::Marketplace OIDC token exchange failed (403)\n' });
    await assert.rejects(vscePublish('x.vsix', { env: { VSCE_PAT: 'token', ...actions }, run: vsce.run, log: quiet }), /refused the VSCE_PAT token, and trusted publishing \(OIDC\) failed too.*VSCE_PAT repository secret.*no new version is needed/);
    vsce = scripted({ ok: false, output: expired });
    await assert.rejects(vscePublish('x.vsix', { env: { VSCE_PAT: 'token' }, run: vsce.run, log: quiet }), /refused the VSCE_PAT token .*VSCE_PAT repository secret/, 'outside GitHub Actions there is no OIDC');
    assert.equal(vsce.calls.length, 1);

    // Another failure is no credential problem: it is not retried with a different credential.
    vsce = scripted({ ok: false, output: '::error::Promptbook.book-extension v2.119.44 already exists.\n' });
    await assert.rejects(vscePublish('x.vsix', { env: { VSCE_PAT: 'token', ...actions }, run: vsce.run, log: quiet }), /vsce publish failed; its messages are above\.$/);
    assert.equal(vsce.calls.length, 1);

    vsce = scripted({ ok: true, output: 'DONE Published' });
    await vscePublish('x.vsix', { env: actions, run: vsce.run, log: quiet });
    assert.deepEqual(vsce.calls, [{ oidc: true, token: undefined }], 'without a token, trusted publishing');
});
