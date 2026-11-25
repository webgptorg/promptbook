import assert from 'node:assert/strict';
import test from 'node:test';
import { Book, book } from '../book.mjs';
import { parseChatBook, renderChatBook } from '../dist/chats/chat-book.js';

test('a Book template removes the common margin and remains an editable Book', () => {
    const agent = book`
        AGENT ${'Writer'}
        RULE Preserve spacing.

            First paragraph
              Nested line
        MODEL *
    `;
    assert.ok(agent instanceof Book);
    assert.equal(agent.toString(), 'AGENT Writer\nRULE Preserve spacing.\n\n    First paragraph\n      Nested line\nMODEL *');
    assert.equal(agent.rename('Editor'), agent);
    assert.equal(agent.name, 'Editor');
    assert.deepEqual(agent.diagnostics, []);
    assert.equal(book`TASK Inline`.kind, 'task');
    assert.equal(book`  `.toString(), '');
    assert.equal(book`CHAT Meeting
        CHAT TITLE Discussion
    `.document.commitments[0].written, 'CHAT TITLE');
});

test('template margins come from the literal and preserve substituted data', () => {
    const content = 'one\r\n  two\n\nthree\\n \\` ${literal}  ';
    const source = book`\r\n\tAGENT Writer\r\n\tNOTE\r\n\t  ${content}\r\n\tRULE Total ${2}.\r\n`.toString();
    assert.equal(source, 'AGENT Writer\r\nNOTE\r\n  one\r\n    two\n\n  three\\n \\` ${literal}  \r\nRULE Total 2.');
    assert.equal(book`${' \nverbatim\n '}`.toString(), ' \nverbatim\n ');
    assert.equal(book`
        ${Book.create('agent', 'Writer').toString().trimEnd()}
        RULE Show \`code\` and \${placeholder}.
    `.toString(), 'AGENT Writer\nRULE Show `code` and ${placeholder}.');
    assert.equal(book`
AGENT Writer
    intentionally indented
`.toString(), 'AGENT Writer\n    intentionally indented');
});

test('opening and serializing a Book preserves the exact source, including unfinished and legacy drafts', () => {
    for (const source of ['', ' \r\n', 'Old name\nENTITY AGENT', 'AGENT', '\uFEFF\r\nTASK Překlad\nNOTE  Ahoj!  \r\n\r\n', 'CHAT Meeting\nFUTURE VALUE something']) {
        const book = Book.parse(source);
        void book.diagnostics;
        assert.equal(book.toString(), source);
    }
});

test('a rename touches only the name, for every declaration kind', () => {
    for (const kind of ['agent', 'task', 'chat']) {
        const source = `\uFEFF\r\n${kind.toUpperCase()}\t Old name   \nNOTE Old name\r\n\n`;
        const book = Book.parse(source);
        assert.equal(book.rename('Nové jméno'), book);
        assert.equal(book.name, 'Nové jméno');
        assert.equal(book.toString(), source.replace('Old name', 'Nové jméno'));
    }
    assert.equal(Book.parse('\uFEFFAGENT').rename('Writer').toString(), '\uFEFFAGENT Writer');
    assert.equal(Book.parse('AGENT\t').rename('Writer').toString(), 'AGENT\tWriter');
    assert.equal(Book.create('task', 'API cleanup').name, 'Api cleanup');
});

test('raw drafts and chained edits read the same current source', () => {
    const book = Book.create('agent', 'Writer');
    assert.equal(book.model.constraint.explicit, false);
    const raw = 'AGENT Reader\nMODELS harness=claude-code thinking=high';
    assert.equal(book.setSource(raw), book);
    assert.equal(book.name, 'Reader');
    assert.deepEqual(book.model.constraint.rows, [{ harness: 'CLAUDE_CODE', thinking: 'high' }]);
    assert.equal(book.setModel(book.model.constraint.rows).toString(), raw);
    assert.equal(book.rename('Editor').setModel([{}]).toString(), 'AGENT Editor\nMODEL *');
    assert.deepEqual(book.model.constraint, { explicit: true, rows: [{}] });
    book.setSource('AGENT Editor\nMODEL thing=bad');
    assert.ok(book.model.diagnostics.some(({ line, severity }) => line === 2 && severity === 'error'));
    assert.equal(book.setModel([{ harness: 'OPENAI_CODEX' }]).diagnostics.length, 0);
});

test('MODEL edits preserve unrelated source byte for byte and keep alternatives paired', () => {
    const before = '\uFEFFAGENT Writer\r\nFUTURE THING keep  \nNOTE examples:\r\n~~~\nMODEL model=fenced\n~~~\r\n\\MODEL model=literal\n';
    const after = '\r\n \t\r\nRULES Keep this spelling.  \n\n';
    const book = Book.parse(before + 'MODEL\r\nharness=CLAUDE_CODE\nmodel=old' + after);
    const rows = [
        { harness: 'OPENAI_CODEX', model: 'gpt-5', thinking: 'high', provider: 'OpenAI', origin: 'US', runtime: 'official' },
        { harness: 'CLAUDE_CODE' },
    ];
    const selection = 'MODEL\r\nharness=OPENAI_CODEX model=gpt-5 thinking=high provider=OpenAI origin=US runtime=official\r\nharness=CLAUDE_CODE';
    assert.equal(book.setModel(rows).toString(), before + selection + after);
    assert.deepEqual(Book.parse(book.toString()).model.constraint.rows, rows);
    assert.equal(book.setModel(rows).toString(), before + selection + after);
});

test('an explicit edit repairs duplicate MODEL blocks in agents and tasks, preserving intervening commitments', () => {
    for (const kind of ['AGENT', 'TASK']) {
        const prefix = `${kind} Example\n`;
        const book = Book.parse(prefix + 'MODEL model=a\n\nNOTE between\nMODELS model=b\nRULE after');
        assert.ok(book.model.diagnostics.length);
        assert.equal(book.setModel([{ model: 'new' }]).toString(), prefix + 'MODEL model=new\n\nNOTE between\nRULE after');
        assert.deepEqual(book.model.diagnostics, []);
    }
});

test('changing a chat model appends history without changing a prior message or selection', () => {
    const source = renderChatBook({
        name: 'Meeting', members: ['@User', '@Writer'], status: 'open',
        messages: [{ sender: '@User', at: '2026-11-24T12:00:00Z', text: 'Hello\n\n' }],
    });
    const chat = Book.parse(source);
    const first = chat.setModel([{ model: 'one' }]).toString();
    const second = chat.setModel([{ model: 'two' }]).toString();
    assert.equal(first, source + 'MODEL model=one\n\n');
    assert.equal(second, first + 'MODEL model=two\n\n');
    assert.equal(chat.setModel([{ model: 'two' }]).toString(), second);
    assert.deepEqual(chat.model.constraint.rows, [{ model: 'two' }]);
    assert.deepEqual(chat.model.diagnostics, []);
    assert.deepEqual(parseChatBook(second).messages, parseChatBook(source).messages);
});

test('appending literal input creates exactly one commitment, with the original newline convention', () => {
    const source = 'TASK Review\r\nNOTE Keep this.\r\n';
    const content = 'Follow this example:\nMODEL model=literal\n~~~\n\\already escaped';
    const book = Book.parse(source).addCommitment('GOAL', content);
    assert.ok(book.toString().startsWith(source));
    assert.ok(!/(?<!\r)\n/.test(book.toString()));
    assert.deepEqual(book.document.commitments.map(({ keyword }) => keyword), ['NOTE', 'GOAL']);
    assert.equal(book.document.commitments.at(-1).body, content);
    assert.equal(Book.parse('TASK Review').addCommitment('NOTE', 'Last').toString(), 'TASK Review\nNOTE Last');
    assert.equal(Book.create('agent', 'Writer').setModel([{}]).toString(), 'AGENT Writer\nMODEL *\n');
});

test('invalid structured edits leave the draft untouched and preserve diagnostics for raw editing', () => {
    const source = 'AGENT Writer\nRULE An open fence\n~~~';
    const book = Book.parse(source);
    for (const rows of [[], [{ model: 'two words' }], [{ model: 'gpt\nRULE Surprise' }], [{ thinking: 'never' }], [{ endpoint: 'local' }], [{ model: '' }]]) {
        assert.throws(() => book.setModel(rows));
    }
    assert.throws(() => book.setModel([{}]), /fence/);
    assert.throws(() => book.addCommitment('NOTE', 'Hidden'), /fence/);
    assert.throws(() => book.addCommitment('NOTE\nRULE', 'Invalid keyword'), /keyword/);
    assert.throws(() => book.addCommitment('TASK', 'Another entity'), /keyword/);
    assert.throws(() => book.rename(' '));
    assert.equal(book.toString(), source);
    const legacy = Book.parse('Legacy name\nMODEL model=one');
    assert.throws(() => legacy.rename('Writer'), /declaration/);
    assert.throws(() => legacy.setModel([{}]), /declaration/);
    assert.equal(legacy.toString(), 'Legacy name\nMODEL model=one');
});
