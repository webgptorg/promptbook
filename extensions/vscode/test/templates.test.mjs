import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import javascript from '@shikijs/langs/javascript';
import jsx from '@shikijs/langs/jsx';
import markdown from '@shikijs/langs/markdown';
import typescript from '@shikijs/langs/typescript';
import tsx from '@shikijs/langs/tsx';
import onig from 'vscode-oniguruma';
import textmate from 'vscode-textmate';

/** Tokenize the staged extension together with the host grammars, as VS Code does. */
const stage = new URL('../../../dist-vscode/extension/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', stage)));
const grammars = new Map([...javascript, ...jsx, ...typescript, ...tsx, ...markdown].map(g => [g.scopeName, g]));
for (const entry of manifest.contributes.grammars) {
    grammars.set(entry.scopeName, JSON.parse(await readFile(new URL(entry.path, stage))));
}
await onig.loadWASM(await readFile(createRequire(import.meta.url).resolve('vscode-oniguruma/release/onig.wasm')));
const registry = new textmate.Registry({
    onigLib: Promise.resolve(onig),
    loadGrammar: async scope => grammars.get(scope) ?? null,
    getInjections: scope => manifest.contributes.grammars.filter(g => g.injectTo?.includes(scope)).map(g => g.scopeName),
});

for (const host of ['js', 'js.jsx', 'ts', 'tsx']) {
    test(`embedded Book, host expressions and surrounding code in ${host}`, async () => {
        const grammar = await registry.loadGrammar(`source.${host}`);
        const keyword = 'keyword.control.commitment.book';
        const ref = 'variable.other.reference.book';
        const expr = `meta.template.expression.${host}`;
        const cases = [
            ['const agent = book`', {}],
            ['    AGENT Editor', { AGENT: keyword }],
            ['        RULE indented continuation', { RULE: '!commitment' }],
            ['    RULE Ask @Adam and {Other Agent} about ${who({ id: 2 })}.', { RULE: keyword, '@Adam': ref, '{Other Agent}': ref, who: expr }],
            ['    NOTE **bold** and \\`inline\\` or \\${literal}.', { bold: 'markup.bold.markdown', inline: 'markup.inline.raw.book', literal: '!expression' }],
            ['    ~~~', {}],
            ['    RULE @Example ${value}', { RULE: 'markup.raw.block.book', '@Example': '!reference', value: expr }],
            ['    ~~~', {}],
            ['    FUTURE THING example', { FUTURE: 'invalid.illegal.unknown-commitment.book' }],
            ['    \\`\\`\\`ts', {}],
            ['    RULE fenced as an example', { RULE: 'markup.raw.block.book' }],
            ['    \\`\\`\\`', {}],
            ['    RULE Real commitment', { RULE: keyword }],
            ['    NOTE ${', {}],
            ['        String({ nested: true })', {}],
            ['    } after @Writer', { '@Writer': ref }],
            ['`.rename("Editor");', { rename: '!book' }],
            ['const one = book`TASK Inline`; const n = 3;', { TASK: keyword, '3': '!book' }],
            ['const zero = book`', {}],
            ['CHAT Team', { CHAT: keyword }],
            ['    NOTE indented content', { NOTE: '!commitment' }],
            ['CHAT TITLE Meeting`;', { 'CHAT TITLE': keyword }],
            ['const nested = `outer ${book`TASK Inside`.name}`;', { TASK: keyword }],
            ['const double = book`NOTE ${book`TASK Inner`.name}`;', { TASK: keyword }],
            ['const ordinary = `AGENT Example`;', { AGENT: '!book' }],
            ['const quoted = "book`TASK Example`";', { TASK: '!book' }],
            ['// book`RULE Example`', { RULE: '!book' }],
            ['const other = notebook`CHAT Example`;', { CHAT: '!book' }],
        ];
        if (host === 'js.jsx' || host === 'tsx') {
            cases.push(['const view = <p>{book`TASK In JSX`.name}</p>;', { TASK: keyword }]);
        }
        let stack = textmate.INITIAL;
        for (const [line, checks] of cases) {
            const { tokens, ruleStack } = grammar.tokenizeLine(line, stack);
            stack = ruleStack;
            for (const [fragment, expected] of Object.entries(checks)) {
                const column = line.indexOf(fragment);
                const scopes = tokens.find(t => t.startIndex <= column && column < t.endIndex)?.scopes ?? [];
                const matches = expected.startsWith('!')
                    ? scopes.every(scope => !scope.includes(expected.slice(1)))
                    : scopes.includes(expected);
                assert.ok(matches, `${fragment} in ${line}: expected ${expected}, got ${scopes.join(' ')}`);
            }
        }
    });
}
