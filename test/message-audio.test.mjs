import assert from 'node:assert/strict';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseChatBook } from '../dist/chats/chat-book.js';
import { appendMessageAudio, messageAudioLabel, parseMessageAudio, renderMessageAudio, resolveMessageAudio } from '../dist/chats/message-audio.js';
import { ChatStore } from '../dist/chats/store.js';
import { matchCommitmentKeyword } from '../dist/book/commitments.js';
import { projectAt } from '../dist/project/workspace.js';
import { git, temporaryDirectory } from './helpers.mjs';

/**
 * The specification's example: overlapping speakers on one call, the second segment interrupted.
 */
const EXAMPLE = [
    'CHAT Discuss export',
    'CHAT MEMBER @User',
    'CHAT MEMBER @Chatter',
    'CHAT MESSAGE @User 2026-11-04T18:00:00+01:00',
    'Please keep the existing column order.',
    'CHAT MESSAGE AUDIO {"path":"assets/chat-audio/export-call/user-1.webm","call":"export-call","startMs":0,"endMs":2400}',
    'CHAT MESSAGE @Chatter 2026-11-04T18:00:02+01:00',
    "I'll keep the current order and",
    'CHAT MESSAGE AUDIO {"path":"assets/chat-audio/export-call/chatter-1.webm","call":"export-call","startMs":1900,"endMs":3100,"status":"interrupted"}',
    '',
].join('\n');

test('CHAT MESSAGE AUDIO: one multiword keyword binding speech to the exact preceding message, with overlap timing and honest status', () => {
    assert.equal(matchCommitmentKeyword('CHAT MESSAGE AUDIO {"path":"a.webm"}').definition.keyword, 'CHAT MESSAGE AUDIO', 'never a CHAT MESSAGE whose sender is AUDIO');
    const chat = parseChatBook(EXAMPLE);
    assert.deepEqual(chat.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'), []);
    assert.equal(chat.messages.length, 2, 'audio is not another message');
    assert.equal(chat.messages[0].text, 'Please keep the existing column order.');
    assert.deepEqual(chat.messages[0].audio, [{ path: 'assets/chat-audio/export-call/user-1.webm', status: 'complete', timing: { call: 'export-call', startMs: 0, endMs: 2400 } }]);
    assert.equal(chat.messages[1].audio[0].status, 'interrupted');
    assert.ok(chat.messages[1].audio[0].timing.startMs < chat.messages[0].audio[0].timing.endMs, 'overlapping speech keeps its shared call timeline');
    assert.equal(messageAudioLabel(chat.messages[1].audio), 'audio interrupted');
    assert.equal(messageAudioLabel(chat.messages[0].audio), 'audio available');
    assert.equal(messageAudioLabel(undefined), undefined);
});

test('CHAT MESSAGE AUDIO diagnostics: orphan bindings, malformed JSON or timing and escaping paths keep the text and bind nothing', () => {
    const base = 'CHAT Talk\nCHAT MEMBER @User\nCHAT MEMBER @Chatter\n';
    const orphan = parseChatBook(`${base}CHAT MESSAGE AUDIO {"path":"a.webm"}\nCHAT MESSAGE @User 2026-11-04T18:00:00Z\nHello\n`);
    assert.ok(orphan.diagnostics.some((diagnostic) => diagnostic.severity === 'error' && /must directly follow/.test(diagnostic.message)));
    assert.equal(orphan.messages[0].audio, undefined);
    const interrupted = parseChatBook(`${base}CHAT MESSAGE @User 2026-11-04T18:00:00Z\nHello\nCHAT TITLE Greeting\nCHAT MESSAGE AUDIO {"path":"a.webm"}\n`);
    assert.ok(interrupted.diagnostics.some((diagnostic) => /must directly follow/.test(diagnostic.message)), 'another commitment closes the group; no guessing by proximity');
    assert.equal(interrupted.messages[0].audio, undefined);
    for (const [record, pattern] of [
        ['not json', /JSON object/],
        ['["a.webm"]', /JSON object/],
        ['{"path":""}', /nonempty/],
        ['{"path":"../secret.webm"}', /cannot leave/],
        ['{"path":"/etc/passwd"}', /absolute/],
        ['{"path":"a\\\\b.webm"}', /separators/],
        ['{"path":"a//b.webm"}', /empty/],
        ['{"path":"a.webm","status":"done"}', /status/],
        ['{"path":"a.webm","call":"c","startMs":5}', /together/],
        ['{"path":"a.webm","call":"c","startMs":5,"endMs":1}', /not be after/],
        ['{"path":"a.webm","call":"c","startMs":-1,"endMs":1}', /nonnegative/],
        ['{"path":"a.webm","call":"","startMs":0,"endMs":1}', /call/],
    ]) {
        const chat = parseChatBook(`${base}CHAT MESSAGE @User 2026-11-04T18:00:00Z\nHello\nCHAT MESSAGE AUDIO ${record}\n`);
        assert.equal(chat.messages[0].text, 'Hello', record);
        assert.equal(chat.messages[0].audio, undefined, record);
        assert.ok(chat.diagnostics.some((diagnostic) => diagnostic.severity === 'error' && pattern.test(diagnostic.message)), `${record}: ${JSON.stringify(chat.diagnostics)}`);
    }
    assert.deepEqual(parseMessageAudio('{"path":"chats/_assets/Hovor s Chatterem/1/audio-ž 1.webm"}').audio, { path: 'chats/_assets/Hovor s Chatterem/1/audio-ž 1.webm', status: 'complete' }, 'Unicode and spaces are ordinary path text');
    assert.match(parseMessageAudio('{"path":"a.webm","speaker":"@Adam"}').warning, /unknown keys/);
});

test('CHAT MESSAGE AUDIO round trip: several segments, repeated sender/time, late finalization after a later reply and literal examples', () => {
    let source = 'CHAT Talk\nCHAT MEMBER @User\nCHAT MEMBER @Chatter\n\nCHAT MESSAGE @User 2026-11-04T18:00:00Z\nFirst\n\nCHAT MESSAGE @User 2026-11-04T18:00:00Z\nSame sender and time\n\n';
    source = `${source}CHAT MESSAGE @Chatter 2026-11-04T18:00:01Z\nA literal example:\n\\CHAT MESSAGE AUDIO {"path":"x.webm"}\n\nCHAT STATUS waiting-for-user\n`;
    const segment = (path, extra = {}) => ({ path, status: 'complete', ...extra });
    // The second (identical-looking) message gets two segments; the first gets one later, after the reply.
    let updated = appendMessageAudio(source, 1, [segment('chats/_assets/talk/2/audio-a.webm', { timing: { call: 'c1', startMs: 0, endMs: 900 } }), segment('chats/_assets/talk/2/audio-b.webm', { timing: { call: 'c1', startMs: 900, endMs: 1500 } })]);
    updated = appendMessageAudio(updated, 0, [segment('chats/_assets/talk/1/audio-x y.webm', { status: 'incomplete' })]);
    updated = appendMessageAudio(updated, 2, [segment('chats/_assets/talk/3/audio-r.webm', { status: 'interrupted' })]);
    const chat = parseChatBook(updated);
    assert.deepEqual(chat.diagnostics.filter((diagnostic) => diagnostic.severity !== 'info'), []);
    assert.deepEqual(chat.messages.map((message) => message.text), ['First', 'Same sender and time', 'A literal example:\nCHAT MESSAGE AUDIO {"path":"x.webm"}'], 'texts are unchanged and the literal example stays literal');
    assert.deepEqual(chat.messages.map((message) => (message.audio ?? []).map((audio) => audio.path.split('/').pop())), [['audio-x y.webm'], ['audio-a.webm', 'audio-b.webm'], ['audio-r.webm']]);
    assert.equal(chat.status, 'waiting-for-user', 'events keep their positions');
    assert.ok(updated.startsWith(source.slice(0, source.indexOf('First'))), 'earlier content is untouched');
    assert.equal(appendMessageAudio(updated, 1, [segment('chats/_assets/talk/2/audio-a.webm')]), updated, 'a replayed segment is not bound twice');
    assert.equal(renderMessageAudio({ path: 'a.webm', status: 'complete' }), 'CHAT MESSAGE AUDIO {"path":"a.webm"}');
    // Appending to the final message of a file keeps its text.
    const last = appendMessageAudio('CHAT T\nCHAT MEMBER @User\nCHAT MEMBER @Chatter\n\nCHAT MESSAGE @User 2026-11-04T18:00:00Z\nEnds with a blank line\n\n\n', 0, [segment('a.webm')]);
    assert.equal(parseChatBook(last).messages[0].text, 'Ends with a blank line\n');
});

test('recorded audio is a committed project chat asset bound once, never another message; escaping assets are refused', async (t) => {
    const root = await temporaryDirectory(t, 'ptbk audio');
    await git(root, ['init', '-q']);
    await git(root, ['config', 'user.email', 'test@example.com']);
    await git(root, ['config', 'user.name', 'Test']);
    await writeFile(join(root, 'README.md'), 'x\n');
    await git(root, ['add', '.']);
    await git(root, ['commit', '-qm', 'init']);
    const project = projectAt(root);
    const committed = [];
    const store = new ChatStore(project, {
        timeZone: 'UTC',
        persistence: {
            commit: async (paths, subject) => {
                await git(root, ['add', '--', ...paths]);
                await git(root, ['commit', '-qm', subject]);
                // Inspect Git's actual portable paths, including on Windows where native paths use backslashes.
                committed.push((await git(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD'])).split('\0').filter(Boolean));
                return 'sha';
            },
        },
    });
    const created = await store.create({ name: 'Voice export', members: ['@User', '@Chatter'], status: 'open', messages: [{ sender: '@User', text: 'Keep the column order.' }] });
    await store.append(created.chat.name, { sender: '@Chatter', text: 'I will keep it.' });
    const recording = join(root, '.ptbk', 'tmp-recording.webm');
    await mkdir(join(root, '.ptbk'), { recursive: true });
    await writeFile(recording, 'webm-bytes');
    // The user's audio is finalized after the agent already replied.
    const first = await store.recordAudio(created.chat.name, 1, [{ id: 'call-1 user 1', extension: 'webm', file: recording, timing: { call: 'call-1', startMs: 0, endMs: 2000 } }]);
    assert.equal(first.archive.complete, true);
    assert.equal(first.chat.messages.length, 2, 'audio never adds a message');
    assert.equal(first.chat.messages[0].audio[0].path, first.audio[0].path);
    assert.match(first.audio[0].path, /^chats\/_assets\/.+\/1\/audio-call-1-user-1\.webm$/);
    assert.equal(await readFile(join(root, first.audio[0].path), 'utf8'), 'webm-bytes');
    const files = await git(root, ['ls-files']);
    assert.ok(files.includes(first.audio[0].path), 'the recording itself is committed by default');
    assert.ok(committed.at(-1).some((path) => path.endsWith('.book')) && committed.at(-1).includes(first.audio[0].path), 'binding and file are committed together');
    const replay = await store.recordAudio(created.chat.name, 1, [{ id: 'call-1 user 1', extension: 'webm', data: Buffer.from('webm-bytes') }]);
    assert.deepEqual(replay.audio, [], 'reconnect/finalization replay binds nothing twice');
    const agent = await store.recordAudio(created.chat.name, 2, [{ id: 'call-1 chatter 1', extension: 'webm', data: Buffer.from('agent'), status: 'interrupted', timing: { call: 'call-1', startMs: 1500, endMs: 2600 } }]);
    assert.equal(agent.chat.messages[1].audio[0].status, 'interrupted');
    assert.equal(agent.chat.messages[0].text, 'Keep the column order.');
    await assert.rejects(store.recordAudio(created.chat.name, 9, [{ id: 'x', extension: 'webm', data: Buffer.from('x') }]), /no message 9/);
    // Ignored assets are an honest incomplete archive.
    await writeFile(join(root, '.gitignore'), '*.ogg\n');
    const ignored = await store.recordAudio(created.chat.name, 2, [{ id: 'call-1 chatter 2', extension: 'ogg', data: Buffer.from('agent') }]);
    assert.equal(ignored.archive.complete, false);
    assert.match(ignored.archive.problems[0], /ignored by Git/);
    // Reading assets stays inside the project.
    assert.match(await resolveMessageAudio(root, first.audio[0].path), /audio-call-1-user-1\.webm$/);
    const outside = await temporaryDirectory(t, 'ptbk audio outside');
    await writeFile(join(outside, 'secret.webm'), 'secret');
    // A directory junction exercises escaping audio on Windows without requiring symlink privileges.
    await symlink(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(resolveMessageAudio(root, 'escape/secret.webm'), /outside the project/);
    await assert.rejects(resolveMessageAudio(root, '../x.webm'), /cannot leave/);
});
