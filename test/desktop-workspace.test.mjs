import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

/** The dashboard's own tab model, evaluated as the classic script the desktop page loads. */
const sandbox = { self: {} };
runInNewContext(readFileSync(new URL('../src/service/spa/workspace.js', import.meta.url), 'utf8'), sandbox);
const workspace = sandbox.self.PtbkWorkspace;
const file = (path) => ({ key: `file:${path}`, kind: 'file', path, title: path });
const page = (name) => ({ key: `page:${name}`, kind: 'page', page: name, title: name });
const keys = (state) => Array.from(state.tabs, (tab) => `${tab.key}${tab.mode === 'regular' ? '' : `(${tab.mode})`}`);

test('one reusable preview per window: another preview replaces it in place, an open tab stays available', () => {
    let state = workspace.open(workspace.empty(), page('files'));
    state = workspace.open(state, file('a.md'), { preview: true });
    state = workspace.open(state, file('b.md'), { preview: true });
    assert.deepEqual(keys(state), ['page:files', 'file:b.md(preview)']);
    assert.equal(state.active, 'file:b.md');
    // Switching to an already open tab leaves the preview available.
    state = workspace.activate(state, 'page:files');
    assert.deepEqual(keys(state), ['page:files', 'file:b.md(preview)']);
    // Previewing an already open document focuses it without turning it into the preview.
    state = workspace.open(state, page('files'), { preview: true });
    assert.deepEqual(keys(state), ['page:files', 'file:b.md(preview)']);
    assert.equal(state.active, 'page:files');
});

test('editing, double-click or Keep Open promotes the preview; reopening focuses the existing tab', () => {
    let state = workspace.open(workspace.empty(), file('a.md'), { preview: true });
    state = workspace.promote(state, 'file:a.md');
    assert.deepEqual(keys(state), ['file:a.md']);
    state = workspace.open(state, file('b.md'), { preview: true });
    // Opening the previewed document for editing keeps it open.
    state = workspace.open(state, file('b.md'));
    assert.deepEqual(keys(state), ['file:a.md', 'file:b.md']);
    state = workspace.open(state, file('a.md'));
    assert.deepEqual(keys(state), ['file:a.md', 'file:b.md']);
    assert.equal(state.active, 'file:a.md');
});

test('pinned tabs stay at the left and survive Close Others and closing regular tabs', () => {
    let state = workspace.empty();
    for (const name of ['a', 'b', 'c', 'd']) state = workspace.open(state, file(name));
    state = workspace.open(state, file('p'), { preview: true });
    state = workspace.pin(state, 'file:c');
    state = workspace.pin(state, 'file:p');
    assert.deepEqual(keys(state), ['file:c(pinned)', 'file:p(pinned)', 'file:a', 'file:b', 'file:d']);
    assert.deepEqual(keys(workspace.closeOthers(state, 'file:b')), ['file:c(pinned)', 'file:p(pinned)', 'file:b']);
    assert.equal(workspace.closeOthers(state, 'file:b').active, 'file:b');
    assert.deepEqual(keys(workspace.closeUnpinned(state)), ['file:c(pinned)', 'file:p(pinned)']);
    // Unpinning returns it to the first regular position.
    assert.deepEqual(keys(workspace.unpin(state, 'file:c')), ['file:p(pinned)', 'file:c', 'file:a', 'file:b', 'file:d']);
    // A new tab never lands between pinned tabs.
    assert.deepEqual(keys(workspace.open(state, file('e'))).slice(0, 2), ['file:c(pinned)', 'file:p(pinned)']);
});

test('closing the active tab activates a neighbor, and closing the last returns to the project overview', () => {
    let state = workspace.empty();
    for (const name of ['a', 'b', 'c']) state = workspace.open(state, file(name));
    state = workspace.activate(state, 'file:b');
    state = workspace.close(state, 'file:b');
    assert.equal(state.active, 'file:c');
    state = workspace.close(state, 'file:c');
    assert.equal(state.active, 'file:a');
    state = workspace.close(state, 'file:a');
    assert.deepEqual(JSON.parse(JSON.stringify(state)), { tabs: [], active: null });
    // Closing an inactive tab keeps the overview or the active tab as it is.
    let other = workspace.open(workspace.open(workspace.empty(), file('x')), file('y'));
    other = workspace.activate(other, null);
    assert.equal(workspace.close(other, 'file:y').active, null);
});

test('a restart keeps regular and pinned tabs only; the temporary preview is disposable', () => {
    let state = workspace.open(workspace.empty(), page('chats'));
    state = workspace.pin(workspace.open(state, file('a.md')), 'file:a.md');
    state = workspace.open(state, file('b.md'), { preview: true });
    const kept = workspace.persisted(state);
    assert.deepEqual(keys(kept), ['file:a.md(pinned)', 'page:chats']);
    assert.equal(kept.active, null);
    const restored = workspace.restored({ ...kept, active: 'page:chats', tabs: [...kept.tabs, { key: 'file:a.md', mode: 'regular' }, { key: 'file:z', mode: 'preview' }] });
    assert.deepEqual(keys(restored), ['file:a.md(pinned)', 'page:chats', 'file:z']);
    assert.equal(restored.active, 'page:chats');
});
