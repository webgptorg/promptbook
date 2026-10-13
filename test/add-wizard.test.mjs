import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { addTaskWizard } from '../dist/coder/add-wizard.js';
import { saveAuthoredTask } from '../dist/coder/authoring.js';
import { git } from '../dist/coder/git.js';
import { acquireLease } from '../dist/coder/state.js';

/** Build an offline project with a useful template and no runtime state. */
async function fixture(t) {
    const projectPath = await mkdtemp(join(tmpdir(), 'ptbk add wizard '));
    t.after(() => rm(projectPath, { recursive: true, force: true }));
    await git(projectPath, ['init', '-q']);
    await mkdir(join(projectPath, 'tasks', 'templates'), { recursive: true });
    await writeFile(join(projectPath, 'tasks', 'templates', 'acceptance.book'), 'TASK Template\n\n{{description}}\n\nVerify the acceptance criteria.\n');
    return { projectPath, gitRoot: projectPath, tasksPath: join(projectPath, 'tasks'), statePath: join(projectPath, '.ptbk'), legacyPath: join(projectPath, 'prompts'), timezone: 'UTC' };
}

/** Drive actual picker/composer keys only after each control has acquired its terminal. */
function terminal(driver) {
    const input = new EventEmitter();
    Object.assign(input, { isTTY: true, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() {}, pause() {} });
    const output = new EventEmitter();
    const screens = [];
    Object.assign(output, { isTTY: true, rows: 24, columns: 100, write(chunk) {
        const screen = String(chunk); screens.push(screen);
        const keys = driver(screen);
        if (keys !== undefined) setImmediate(() => input.emit('data', keys));
        return true;
    } });
    return { input, output, screens };
}

test('supplied task inputs are reviewed once and the saved bytes equal the confirmed preview', async t => {
    const workspace = await fixture(t);
    let reviews = 0;
    const surface = terminal(screen => {
        if (screen.includes('Review the task before saving') && !reviews++) return '\u001b[H\r';
    });
    const prepared = await addTaskWizard(workspace, { ...surface, description: 'Preserve exact reviewed content\nUnicode: čeština 😀', template: 'tasks/templates/acceptance.book', priority: 17 });
    assert.ok(prepared);
    assert.match(prepared.content, /TASK PRIORITY 17/);
    assert.match(prepared.content, /Verify the acceptance criteria/);
    assert.match(prepared.content, /čeština 😀/);
    assert.equal(surface.screens.filter(screen => screen.includes('Task description')).length, 0);
    assert.equal(surface.screens.filter(screen => screen.includes('Task template')).length, 0);
    assert.equal(surface.screens.filter(screen => screen.includes('Task priority')).length, 0);
    assert.deepEqual(await readdir(workspace.tasksPath), ['templates']);
    assert(!(await readdir(workspace.projectPath)).includes('.ptbk'));
    // A template edited after confirmation cannot silently change the reviewed task.
    await writeFile(join(workspace.tasksPath, 'templates', 'acceptance.book'), 'TASK Changed\nNew unreviewed body.\n');
    const lease = await acquireLease(workspace);
    try { await saveAuthoredTask(workspace, prepared); } finally { await lease.release(); }
    assert.equal(await readFile(prepared.path, 'utf8'), prepared.content);
});

test('task wizard collects missing choices and cancellation never creates a task or runtime state', async t => {
    const workspace = await fixture(t);
    let step = 0;
    const surface = terminal(screen => {
        if (step === 0 && screen.includes('Task description')) { step++; return 'Do a useful task\u0013'; }
        if (step === 1 && screen.includes('Task template')) { step++; return '\r'; }
        if (step === 2 && screen.includes('Task priority')) { step++; return '\u001b[B\r'; }
        if (step === 3 && screen.includes('Review the task before saving')) { step++; return '\r'; }
    });
    assert.equal(await addTaskWizard(workspace, surface), undefined);
    assert.equal(step, 4);
    assert.match(surface.screens.join(''), /TASK PRIORITY 1/);
    assert.deepEqual(await readdir(workspace.tasksPath), ['templates']);
    assert(!(await readdir(workspace.projectPath)).includes('.ptbk'));
    assert.equal(surface.input.isRaw, false);
});

test('Back edits the retained draft before a new exact preview and Esc cancels safely', async t => {
    const workspace = await fixture(t);
    let step = 0;
    const surface = terminal(screen => {
        if (step === 0 && screen.includes('Review the task before saving')) { step++; return '\u001b[H\u001b[B\r'; }
        if (step === 1 && screen.includes('Task description')) { step++; return '\u001b[F plus acceptance\u0013'; }
        if (step === 2 && screen.includes('Review the task before saving')) { step++; return '\u001b'; }
    });
    await assert.rejects(addTaskWizard(workspace, { ...surface, description: 'Original draft', template: 'tasks/templates/acceptance.book', priority: 0 }), { name: 'AbortError' });
    assert.equal(step, 3);
    assert.match(surface.screens.join(''), /Original draft plus acceptance/);
    assert.deepEqual(await readdir(workspace.tasksPath), ['templates']);
    assert(!(await readdir(workspace.projectPath)).includes('.ptbk'));
});
