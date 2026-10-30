import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { classifySubject, readCommit, readHistory } from '../dist/project/history.js';
import { fileKind, listFolder, readProjectFile } from '../dist/project/files.js';
import { fileLines, pageBody } from '../dist/ui/dashboard-pages.js';
import { stripAnsi } from '../dist/ui/ansi.js';
import { createTerminalProfile } from '../dist/ui/terminal.js';
import { git, initRepository, temporaryDirectory } from './helpers.mjs';

/**
 * A colorless interactive terminal profile.
 */
function terminal(columns = 100, rows = 30) {
    const stdout = { isTTY: true, columns, rows, hasColors: () => false, write: () => true };
    return { ...createTerminalProfile({ stdout, stdin: { isTTY: true }, env: { TERM: 'xterm-256color', NO_COLOR: '1' } }), columns: () => columns, rows: () => rows };
}

test('History: recognized Promptbook formats are presented without rewriting originals; others stay verbatim', () => {
    assert.deepEqual(classifySubject('ptbk: `~<@@/>-` Write the welcome page — 2026-10-29 10:00:00'), { kind: 'agent', summary: 'Write the welcome page — 2026-10-29 10:00:00', visual: '~<@@/>-' });
    assert.deepEqual(classifySubject('ptbk: Add task - Plan'), { kind: 'system', summary: 'Add task - Plan' });
    assert.deepEqual(classifySubject('PTBK: Chat - Old'), { kind: 'legacy', summary: 'Chat - Old' });
    assert.deepEqual(classifySubject('Fix the header (manual)'), { kind: 'foreign', summary: 'Fix the header (manual)' });
});

test('History: real topology with forks and merges, full original messages and trailers, read-only', async (t) => {
    const directory = await temporaryDirectory(t, 'ptbk history');
    await initRepository(directory);
    const commit = async (file, message) => {
        await writeFile(join(directory, file), `${file}\n`);
        await git(directory, ['add', file]);
        await git(directory, ['commit', '-q', '-m', message]);
    };
    await commit('a.txt', 'Initial ordinary commit');
    await git(directory, ['checkout', '-q', '-b', 'feature']);
    await commit('b.txt', 'ptbk: `o(ee)o` Build the feature\n\nTask-Name: Build the feature');
    await git(directory, ['checkout', '-q', '-']);
    await commit('c.txt', 'PTBK: Chat - Old thread\n\nChat-Name: Old thread');
    await git(directory, ['merge', '-q', '--no-ff', 'feature', '-m', 'ptbk: Merge feature']);
    const status = await git(directory, ['status', '--porcelain']);
    const view = await readHistory(directory, { limit: 50 });
    assert.equal(view.shallow, false);
    const commits = view.rows.filter((row) => row.commit).map((row) => row.commit);
    assert.equal(commits.length, 4);
    assert.deepEqual(new Set(commits.map((item) => item.kind)), new Set(['system', 'legacy', 'agent', 'foreign']), 'every known format and an ordinary commit');
    assert.equal(commits[0].kind, 'system', 'newest first: the merge');
    assert.equal(commits[0].parents.length, 2, 'the merge keeps both parents');
    assert.ok(view.rows.some((row) => !row.commit && /[\\/|]/.test(row.graph)), 'fork/merge lanes are part of the rows');
    assert.ok(commits.some((item) => item.kind === 'agent' && item.visual === 'o(ee)o' && item.summary === 'Build the feature'));
    assert.ok(commits[0].refs.some((ref) => /HEAD/.test(ref)), 'branch labels are kept');
    const agent = commits.find((item) => item.kind === 'agent');
    const detail = await readCommit(directory, agent.sha);
    assert.equal(detail.message, 'ptbk: `o(ee)o` Build the feature\n\nTask-Name: Build the feature', 'the original message, verbatim');
    assert.deepEqual(detail.trailers, { tasks: ['Build the feature'], chats: [] });
    await assert.rejects(readCommit(directory, 'not-a-sha'), /not a commit id/);
    assert.equal(await git(directory, ['status', '--porcelain']), status, 'inspection never changes the repository');
    const limited = await readHistory(directory, { limit: 2 });
    assert.equal(limited.rows.filter((row) => row.commit).length, 2);
    assert.equal(limited.more, true);
    const empty = await temporaryDirectory(t, 'ptbk empty history');
    await initRepository(empty);
    assert.match((await readHistory(empty)).problem, /No commit exists yet/);
    const page = pageBody({ kind: 'history', scroll: 0, focus: 0, view }, { snapshot: {}, terminal: terminal(), frame: 0, owning: false });
    const text = page.body.map(stripAnsi).join('\n');
    assert.match(text, /`o\(ee\)o` Build the feature/, 'agent work is shown by its visual, without the ptbk: prefix');
    assert.match(text, /Fixture Tester: Initial ordinary commit/, 'ordinary commits keep their real author');
    assert.match(text, /PTBK Chat - Old thread/);
});

test('Files: confined nonhidden browsing with readable formatting; hidden, escaping and protected paths are refused', async (t) => {
    const outside = await temporaryDirectory(t, 'ptbk outside');
    const project = await temporaryDirectory(t, 'ptbk files');
    await mkdir(join(project, 'docs'), { recursive: true });
    await mkdir(join(project, '.ptbk', 'wallet'), { recursive: true });
    await writeFile(join(project, '.env'), 'OPENAI_API_KEY=secret\n');
    await writeFile(join(project, '.ptbk', 'wallet', 'vault.json'), '{}');
    await writeFile(join(project, 'docs', 'readme.md'), '# Title\n\nSome \u001b[31mtext\u001b[0m.\n');
    await writeFile(join(project, 'ptbk.json'), '{"a":1,"b":{"c":[1,2]}}');
    await writeFile(join(project, 'agent.book'), 'AGENT Writer\nGOAL Write.\n');
    await writeFile(join(project, 'pixel.png'), Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex'));
    await writeFile(join(project, 'clip.mp4'), Buffer.alloc(16));
    await writeFile(join(outside, 'secret.txt'), 'outside\n');
    await symlink(join(outside, 'secret.txt'), join(project, 'escape.txt'));
    const root = await listFolder(project, '');
    assert.deepEqual(root.entries.map((entry) => entry.name), ['docs', 'agent.book', 'clip.mp4', 'escape.txt', 'pixel.png', 'ptbk.json'], 'folders first; hidden entries never listed');
    assert.equal(root.entries.find((entry) => entry.name === 'escape.txt').type, 'link-outside', 'a link leaving the project is never followed');
    assert.deepEqual([fileKind('a.book'), fileKind('a.md'), fileKind('a.json'), fileKind('a.png'), fileKind('a.mp4'), fileKind('a.bin')], ['book', 'markdown', 'json', 'image', 'video', 'binary']);
    for (const path of ['.env', '.ptbk/wallet/vault.json', '../x', 'escape.txt', 'docs/../.env']) await assert.rejects(readProjectFile(project, path), /not an accessible project path|outside the project/, path);
    const json = await readProjectFile(project, 'ptbk.json');
    assert.equal(json.text, '{\n    "a": 1,\n    "b": {\n        "c": [\n            1,\n            2\n        ]\n    }\n}', 'JSON is shown formatted');
    const image = await readProjectFile(project, 'pixel.png');
    assert.match(image.image, /^data:image\/png;base64,/);
    const video = await readProjectFile(project, 'clip.mp4');
    assert.equal(video.text, undefined);
    assert.equal(video.kind, 'video');
    const markdown = await readProjectFile(project, 'docs/readme.md');
    const lines = fileLines(markdown, terminal(), 80).map(stripAnsi);
    assert.equal(lines[0], 'Title', 'headings are emphasized readably');
    assert.doesNotMatch(lines.join('\n'), /\u001b/, 'untrusted terminal sequences are never emitted');
    assert.match(fileLines(video, terminal(), 80).join('\n'), /Video playback is not part of Files/);
    assert.match(fileLines(image, terminal(), 80).join('\n'), /browser dashboard displays the image/);
    const page = pageBody({ kind: 'files', scroll: 0, focus: 0, path: '', view: root }, { snapshot: {}, terminal: terminal(), frame: 0, owning: false });
    assert.match(page.body.map(stripAnsi).join('\n'), /escape\.txt → outside the project \(not followed\)/);
    assert.match(page.context, /hidden and protected paths/);

    // The narrow exception: hidden agent Book folders such as agents/.core are navigable; nothing else hidden is.
    await mkdir(join(project, 'agents', '.core'), { recursive: true });
    await mkdir(join(project, 'agents', '.cache'), { recursive: true });
    await mkdir(join(project, 'agents', '.ptbk'), { recursive: true });
    await writeFile(join(project, 'agents', '.core', 'adam.book'), 'AGENT Adam\nFROM @Void\n');
    await writeFile(join(project, 'agents', '.core', '.secret'), 'token\n');
    await writeFile(join(project, 'agents', '.cache', 'notes.txt'), 'no books here\n');
    await writeFile(join(project, 'agents', '.ptbk', 'x.book'), 'AGENT X\n');
    await writeFile(join(project, 'agents', '.env'), 'KEY=secret\n');
    await writeFile(join(project, 'agents', 'writer.book'), 'AGENT Writer\n');
    assert.deepEqual((await listFolder(project, 'agents')).entries.map((entry) => entry.name), ['.core', 'writer.book'], 'only the hidden folder holding agent Books');
    assert.deepEqual((await listFolder(project, 'agents/.core')).entries.map((entry) => entry.name), ['adam.book'], 'hidden files inside stay hidden');
    assert.match((await readProjectFile(project, 'agents/.core/adam.book')).text, /AGENT Adam/);
    for (const path of ['agents/.core/.secret', 'agents/.cache/notes.txt', 'agents/.ptbk/x.book', 'agents/.env', 'docs/.core/adam.book', 'agents/.core/../../.env']) await assert.rejects(readProjectFile(project, path), /not an accessible project path|no longer exists/, path);
    assert.deepEqual((await listFolder(project, 'team', { agentsDirectory: 'team' }).catch(() => ({ entries: [] }))).entries, [], 'the configured agents directory decides where the exception applies');
});
