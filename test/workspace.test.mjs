import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import test from 'node:test';
import { confinePath, requireGit, resolveWorkspace, resolveAgentSelection } from '../dist/coder/workspace.js';
import { addTask, initializeProject, verifyTasks } from '../dist/coder/authoring.js';
import { discoverAgents, ensureCoreAgents, normalizeAgentName, prepareAgent, validateAgents } from '../dist/coder/agents.js';
import { discoverTasks } from '../dist/coder/sources.js';
import { acquireLease, readLedger, saveLedger } from '../dist/coder/state.js';

/** Invoke real local Git with safe argv in disposable fixture projects. */
const run = promisify(execFile);

/** Create a fixture with a space in its path and optional Git metadata. */
async function fixture(t, git = true) {
    const project = await realpath(await mkdtemp(path.join(os.tmpdir(), 'ptbk project ')));
    t.after(() => rm(project, { recursive: true, force: true }));
    if (git) await run('git', ['-C', project, 'init', '--quiet']);
    return project;
}

test('workspace paths respect nested projects, custom absolute sources and missing explicit inputs', async (t) => {
    const root = await fixture(t);
    const project = path.join(root, 'nested project');
    await mkdir(path.join(project, 'custom tasks'), { recursive: true });
    const workspace = await resolveWorkspace({ path: project, tasks: path.join(project, 'custom tasks') });
    assert.equal(workspace.gitRoot, root);
    assert.equal(workspace.projectPath, project);
    assert.equal(workspace.tasksPath, path.join(project, 'custom tasks'));
    assert.equal(workspace.statePath, path.join(project, '.ptbk'));
    await requireGit(workspace, true);
    await assert.rejects(readFile(path.join(project, '.git')));
    await assert.rejects(resolveWorkspace({ path: project, tasks: 'missing' }), /Explicit task source is missing/);
    await assert.rejects(resolveWorkspace({ path: path.join(root, 'missing') }), /does not exist/);
    assert.deepEqual(await readdir(project), ['custom tasks']);
});

test('sibling projects keep task ledgers separate while sharing checkout ownership', async t => {
    const root = await fixture(t);
    const projects = [path.join(root, 'first'), path.join(root, 'second')];
    await Promise.all(projects.map(project => mkdir(project)));
    const [first, second] = await Promise.all(projects.map(project => resolveWorkspace({ path: project })));
    const lease = await acquireLease(first);
    try {
        await assert.rejects(acquireLease(second), /owned by PID/);
        const ledger = await readLedger(first);
        ledger.tasks['shared-task-id'] = { scheduleRevision: 'fixture', anchor: 0, history: [] };
        await saveLedger(first, ledger);
        assert.equal((await readLedger(second)).tasks['shared-task-id'], undefined);
    } finally { await lease.release(); }
});

test('a read-only workspace needs no repository, while Git preflight distinguishes bare and damaged metadata', async (t) => {
    const project = await fixture(t, false);
    const workspace = await resolveWorkspace({ path: project });
    assert.equal(workspace.gitRoot, undefined);
    assert.deepEqual(await readdir(project), []);
    await assert.rejects(requireGit(workspace), /No Git repository/);
    await writeFile(path.join(project, '.git'), 'gitdir: /nonexistent/ptbk-git\n');
    await assert.rejects(resolveWorkspace({ path: project }), /damaged or unreadable|cannot be read/);
    await assert.rejects(requireGit(workspace, true), /damaged or unreadable|cannot be read/);
    assert.equal(await readFile(path.join(project, '.git'), 'utf8'), 'gitdir: /nonexistent/ptbk-git\n');
    const bare = await fixture(t, false);
    await run('git', ['init', '--bare', '--quiet', bare]);
    await assert.rejects(resolveWorkspace({ path: bare }), /Bare repositories/);
});

test('confinement rejects regular and dangling symlink escapes before file creation', async (t) => {
    const project = await fixture(t);
    const outside = await fixture(t, false);
    await symlink(outside, path.join(project, 'escape'));
    await symlink(path.join(outside, 'does-not-exist'), path.join(project, 'dangling'));
    await assert.rejects(confinePath(project, path.join(project, 'escape', 'new.txt')), /escapes/);
    await assert.rejects(confinePath(project, path.join(project, 'dangling', 'new.txt')), /escapes/);
    await assert.rejects(resolveWorkspace({ path: project, tasks: 'escape' }), /escapes/);
    assert.deepEqual(await readdir(outside), []);
});

test('init is idempotent and preserves custom Books, context, env and check script bytes', async (t) => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'agents'));
    const developer = 'Developer\n\nRULE A custom rule.\nTEAM Consult {./lawyer.book}.\nTEAM Consult {./copywriter.book}.\n';
    const context = '# Existing instructions\r\nPreserve this.\r\n';
    const packageText = '{\n "scripts": {"check":"custom checker", "coder:run":"custom coder", "coder:list":"custom list"}\n}\n';
    await writeFile(path.join(project, 'agents', 'developer.book'), developer);
    await writeFile(path.join(project, 'AGENTS.md'), context);
    await writeFile(path.join(project, '.env'), 'PRIVATE_VALUE=original\n');
    await writeFile(path.join(project, 'package.json'), packageText);
    const workspace = await resolveWorkspace({ path: project }, true);
    const changed = await initializeProject(workspace);
    assert.ok(changed.length);
    assert.equal(await readFile(path.join(project, 'agents', 'developer.book'), 'utf8'), developer);
    assert.equal(await readFile(path.join(project, 'AGENTS.md'), 'utf8'), context);
    assert.equal(await readFile(path.join(project, '.env'), 'utf8'), 'PRIVATE_VALUE=original\n');
    const scripts = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8')).scripts;
    assert.equal(scripts.check, 'custom checker');
    assert.equal(scripts['coder:run'], 'custom coder');
    assert.equal(scripts['coder:list'], 'custom list');
    assert.deepEqual(await initializeProject(workspace), []);
    assert.deepEqual(await discoverTasks(workspace), []);
});

test('init detects inherited local advisors without appending duplicate TEAM references', async (t) => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'agents'));
    const developer = 'Developer\n\nIMPORT {./helpers.book}\nRULE Keep the original role.\n';
    await writeFile(path.join(project, 'agents', 'developer.book'), developer);
    await writeFile(path.join(project, 'agents', 'helpers.book'), 'Helpers\n\nTEAM {./lawyer.book}\nTEAM {./copywriter.book}\n');
    const workspace = await resolveWorkspace({ path: project }, true);
    await initializeProject(workspace);
    assert.equal(await readFile(path.join(project, 'agents', 'developer.book'), 'utf8'), developer);
});

test('init creates an honest failing check placeholder and preserves existing validation commands', async (t) => {
    const project = await fixture(t);
    await writeFile(path.join(project, 'package.json'), '{"scripts":{"start":"node app.js"}}');
    const workspace = await resolveWorkspace({ path: project }, true);
    await initializeProject(workspace);
    const config = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8'));
    assert.match(config.scripts.check, /process\.exit\(1\)/);
    const validated = await fixture(t);
    await writeFile(path.join(validated, 'package.json'), '{"scripts":{"typecheck":"tsc --noEmit","lint":"eslint .","test":"node --test","build":"tsc"}}');
    await initializeProject(await resolveWorkspace({ path: validated }, true));
    const existing = JSON.parse(await readFile(path.join(validated, 'package.json'), 'utf8'));
    assert.equal(existing.scripts.check, 'npm run typecheck && npm run lint && npm run test && npm run build');
});

test('init migrates only recognized generated commands and leaves custom callers and workflows intact', async (t) => {
    const project = await fixture(t);
    const workflow = 'name: Custom\non: push\njobs:\n  work:\n    steps:\n      - run: npx ptbk coder run --custom-wrapper\n';
    await mkdir(path.join(project, '.github', 'workflows'), { recursive: true });
    await writeFile(path.join(project, '.github', 'workflows', 'custom.yml'), workflow);
    await writeFile(path.join(project, 'package.json'), JSON.stringify({ scripts: {
        check: 'node --test',
        'coder:run': 'ptbk coder run --harness openai-codex --thinking-level max',
        'coder:list': 'custom-wrapper && ptbk coder list',
    } }));
    const workspace = await resolveWorkspace({ path: project }, true);
    await initializeProject(workspace);
    const scripts = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8')).scripts;
    assert.equal(scripts.check, 'node --test');
    assert.equal(scripts['coder:run'], 'ptbk run --harness openai-codex --thinking-level max');
    assert.equal(scripts['coder:list'], 'custom-wrapper && ptbk coder list');
    assert.equal(scripts['coder:fix'], 'ptbk fix --harness openai-codex --thinking-level max');
    assert.equal(scripts['coder:plan'], 'ptbk plan --harness openai-codex --thinking-level max');
    assert.equal(await readFile(path.join(project, '.github', 'workflows', 'custom.yml'), 'utf8'), workflow);
    assert.deepEqual(await initializeProject(workspace), []);
});

test('every init mutation is confined, including existing context, package and template symlinks', async (t) => {
    for (const filename of ['AGENTS.md', '.gitignore', 'package.json', 'tasks/templates/task.book']) {
        const project = await fixture(t);
        const outside = await fixture(t, false);
        const external = path.join(outside, 'external.txt');
        const original = filename === 'package.json' ? '{"scripts":{}}' : 'User content\n';
        await writeFile(external, original);
        await mkdir(path.dirname(path.join(project, filename)), { recursive: true });
        await symlink(external, path.join(project, filename));
        await assert.rejects(initializeProject(await resolveWorkspace({ path: project }, true)), /escapes/);
        assert.equal(await readFile(external, 'utf8'), original);
    }
});

test('authoring accepts absolute templates, validates priority and emits tasks with the correct source project', async (t) => {
    const project = await fixture(t);
    const template = path.join(project, 'template.txt');
    await writeFile(template, 'Implement {{description}}.');
    const workspace = await resolveWorkspace({ path: project }, true);
    const file = await addTask(workspace, 'CSV export', { template, priority: 3 });
    const [task] = await discoverTasks(workspace);
    assert.equal(task.source.path, file);
    assert.equal(task.source.projectPath, project);
    assert.equal(task.payload, 'Implement CSV export.');
    assert.equal(task.priority, 3);
    assert.deepEqual(task.diagnostics, []);
    await assert.rejects(addTask(workspace, 'Work', { priority: -1 }), /nonnegative/);
    await assert.rejects(addTask(workspace, 'Work', { priority: 1.5 }), /nonnegative/);
});

test('verify reviews every Markdown section before archiving and refuses a concurrent source edit', async (t) => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'prompts'));
    const source = path.join(project, 'prompts', 'done.md');
    const original = '[x]\nFirst\n---\n[x]\nSecond\n';
    await writeFile(source, original);
    const workspace = await resolveWorkspace({ path: project });
    let reviews = 0;
    const changed = await verifyTasks(workspace, { ask: async () => {
        reviews++;
        if (reviews === 2) assert.equal(await readFile(source, 'utf8'), original);
        return 'a';
    } });
    assert.equal(reviews, 2);
    assert.deepEqual(changed, [source, path.join(project, 'prompts', 'done', 'done.md')]);
    assert.equal(await readFile(changed[1], 'utf8'), original);
    await writeFile(source, original);
    await assert.rejects(verifyTasks(workspace, { ask: async () => { await writeFile(source, `${original}Editor update\n`); return 'a'; } }), /changed during review/);
    assert.equal(await readFile(source, 'utf8'), `${original}Editor update\n`);
});

test('verify preserves an existing archive and leaves unresolved sections in the active source', async (t) => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'prompts', 'done'), { recursive: true });
    const source = path.join(project, 'prompts', 'work.md');
    await writeFile(source, '[x]\nFinished\n---\n[ ]\nUnfinished');
    const workspace = await resolveWorkspace({ path: project });
    assert.deepEqual(await verifyTasks(workspace, { ask: async () => 'a' }), []);
    await writeFile(source, '[x]\nFinished');
    const archive = path.join(project, 'prompts', 'done', 'work.md');
    await writeFile(archive, 'Existing archive');
    await assert.rejects(verifyTasks(workspace, { ask: async () => 'a' }), /Archive already exists/);
    assert.equal(await readFile(archive, 'utf8'), 'Existing archive');
    assert.equal(await readFile(source, 'utf8'), '[x]\nFinished');
});

test('read-only agent selection resolves nested local roles and exposes aliases without remote inheritance', async (t) => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'agents', 'custom'), { recursive: true });
    const file = path.join(project, 'agents', 'custom', 'role.book');
    await writeFile(file, 'Project Developer\nFROM {https://never-read.invalid/agent.book}\nRULE Local role\n');
    const workspace = await resolveWorkspace({ path: project });
    const selected = await resolveAgentSelection(workspace, 'Project Developer');
    assert.equal(selected.path, file);
    assert.ok(selected.aliases.includes('role'));
    assert.ok(selected.aliases.includes('Project Developer'));
    assert.equal((await resolveAgentSelection(workspace, file)).path, file);
    await writeFile(path.join(project, 'agents', 'duplicate.book'), 'Project Developer\nRULE Other role\n');
    await assert.rejects(resolveAgentSelection(workspace, 'Project Developer'), /[Aa]mbiguous/);
    await unlink(path.join(project, 'agents', 'duplicate.book'));
    await assert.rejects(resolveAgentSelection(workspace, 'missing.book'), /does not exist/);
    const task = path.join(project, 'agents', 'task.book');
    await writeFile(task, 'Task title\nTASK\nMETA ID task\nSTATUS todo\nPROMPT\nWork');
    await assert.rejects(resolveAgentSelection(workspace, task), /Task Book cannot|task Books cannot/);
});

test('remote primary agent identity is syntax-checked without contacting the host', async (t) => {
    const project = await fixture(t);
    const workspace = await resolveWorkspace({ path: project });
    const selected = await resolveAgentSelection(workspace, 'https://never-read.invalid/roles/../developer.book');
    assert.equal(selected.path, 'https://never-read.invalid/developer.book');
    assert.ok(selected.aliases.includes('developer'));
    await assert.rejects(resolveAgentSelection(workspace, 'http://never-read.invalid/developer.book'), /HTTPS/);
    await assert.rejects(resolveAgentSelection(workspace, 'https://username:credential@never-read.invalid/developer.book'), /credentials/);
});


test('agent identities normalize diacritics and camel case and include hidden nested definitions', async t => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'agents', '.advisors', 'deep'), { recursive: true });
    await writeFile(path.join(project, 'agents', '.advisors', 'deep', 'renamed.book'), 'Jóhn Smith\nFROM Void\nRULE Advice\n');
    const workspace = await resolveWorkspace({ path: project });
    const definitions = await discoverAgents(project);
    assert.equal(definitions[0].hidden, true);
    for (const reference of ['johnSmith', 'john-smith', '@JOHN_SMITH', '{John Smith}']) assert.equal((await resolveAgentSelection(workspace, reference)).path, definitions[0].path);
    assert.equal(normalizeAgentName('Jóhn Smith'), normalizeAgentName('johnSmith'));
    await writeFile(path.join(project, 'agents', 'collision.book'), 'johnSmith\nFROM Void\n');
    await assert.rejects(discoverAgents(project), /Ambiguous.*renamed.book.*collision.book|Ambiguous.*collision.book.*renamed.book/);
    await assert.rejects(resolveAgentSelection(workspace, definitions[0].path), /Ambiguous/);
});

test('core repair is individual, reserved identities cannot be shadowed, and Teacher must be closed', async t => {
    const project = await fixture(t);
    const core = path.join(project, 'agents', '.core');
    await mkdir(core, { recursive: true });
    const customized = 'Adam\nFROM Void\nRULE Preserve this customized foundation.\nCLOSED\n';
    await writeFile(path.join(core, 'adam.book'), customized);
    assert.equal((await ensureCoreAgents(project)).length, 2);
    assert.equal(await readFile(path.join(core, 'adam.book'), 'utf8'), customized);
    assert.deepEqual(await ensureCoreAgents(project), []);
    assert.equal((await validateAgents(project)).length, 3);
    assert.deepEqual((await readdir(core)).sort(), ['adam.book', 'manager.book', 'teacher.book']);
    await writeFile(path.join(core, 'teacher.book'), 'Teacher\nFROM Expert\nOPEN\n');
    await assert.rejects(ensureCoreAgents(project), /Teacher must end in CLOSED.*self-teaching/);
    assert.equal(await readFile(path.join(core, 'teacher.book'), 'utf8'), 'Teacher\nFROM Expert\nOPEN\n');
    await writeFile(path.join(core, 'teacher.book'), 'Teacher\nFROM Expert\nCLOSED\n');
    await writeFile(path.join(project, 'agents', 'fake-expert.book'), 'Éxpert\nFROM Void\n');
    await assert.rejects(discoverAgents(project), /reserved non-agent/);
});

test('Expert is engine-owned and natural TEAM references resolve special and hidden advisors without merging roles', async t => {
    const project = await fixture(t);
    await initializeProject(await resolveWorkspace({ path: project }, true));
    await mkdir(path.join(project, 'agents', '.advisors'), { recursive: true });
    await writeFile(path.join(project, 'agents', '.advisors', 'other.book'), 'Legal Advisor\nFROM Void\nRULE Advisor private instruction\nCLOSED\n');
    await writeFile(path.join(project, 'agents', 'custom.book'), 'Custom Agent\nFROM Expert\nRULE Local instruction\nTEAM Ask {Legal Advisor}, @User and @Expert. Void references @Null and @0 are no-ops.\nOPEN Learn knowledge only, preserve my rules.\n');
    const agent = await prepareAgent('agents/custom.book', project);
    assert.match(agent.instructions, /running ptbk .*engine/);
    assert.match(agent.instructions, /Local instruction/);
    assert.doesNotMatch(agent.instructions, /Advisor private instruction/);
    assert.deepEqual(agent.team.map(member => member.name), ['Legal Advisor', 'User', 'Expert']);
    assert.deepEqual(agent.learning, { open: true, limits: 'Learn knowledge only, preserve my rules.' });
    assert.equal((await prepareAgent('ptbk:expert', project)).learning.open, false);
    await assert.rejects(readFile(path.join(project, 'agents', '.core', 'expert.book')));
    await writeFile(path.join(project, 'agents', 'custom.book'), 'Custom Agent\nFROM User\n');
    await assert.rejects(prepareAgent('agents/custom.book', project), /FROM\/IMPORT User is invalid/);
});

test('learning belongs to each local Book and instruction deletion preserves explicit provenance', async t => {
    const project = await fixture(t);
    await ensureCoreAgents(project);
    await writeFile(path.join(project, 'agents', 'parent.book'), 'Parent\nFROM Void\nRULE Keep this\nRULE Withdraw this\nCLOSED\n');
    await writeFile(path.join(project, 'agents', 'child.book'), 'Child\nFROM Parent\nDELETE RULE Withdraw this\nRULE Child rule\n');
    const child = await prepareAgent('agents/child.book', project);
    assert.equal(child.learning.open, true);
    assert.match(child.instructions, /parent.book:3.*Keep this/);
    assert.doesNotMatch(child.instructions, /Withdraw this/);
    assert.ok(child.sources[path.join(project, 'agents', 'parent.book')]);
    await writeFile(path.join(project, 'agents', 'child.book'), 'Child\nFROM Parent\nOPEN\nRULE Invalid final policy\n');
    await assert.rejects(prepareAgent('agents/child.book', project), /OPEN\/CLOSED must be the final/);
});

test('init preserves renamed customized default roles and declares real validation setup when absent', async t => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'agents', 'custom'), { recursive: true });
    const book = 'Developer\nFROM Void\nRULE Original bytes\n';
    const file = path.join(project, 'agents', 'custom', 'renamed.book');
    await writeFile(file, book);
    await initializeProject(await resolveWorkspace({ path: project }, true));
    assert.equal(await readFile(file, 'utf8'), book);
    await assert.rejects(readFile(path.join(project, 'agents', 'developer.book')));
    assert.match(await readFile(path.join(project, '.gitignore'), 'utf8'), /^\.ptbk\/$/m);
});

test('read-only selection resolves effective local models in inheritance order without setup, remote I/O or knowledge reads', async t => {
    const project = await fixture(t);
    await mkdir(path.join(project, 'agents'));
    await writeFile(path.join(project, 'agents', 'base.book'), 'Base\nFROM Void\nMODEL gpt-5-base\n');
    await writeFile(path.join(project, 'agents', 'imported.book'), 'Imported\nFROM Void\nMODEL provider/imported\n');
    const child = path.join(project, 'agents', 'child.book');
    await writeFile(child, 'Child\nFROM Base\nIMPORT {./imported.book}\nMODEL NAME provider/final\n');
    const workspace = await resolveWorkspace({ path: project });
    assert.equal((await resolveAgentSelection(workspace, 'Child')).model, 'provider/final');
    assert.equal((await prepareAgent(child, project)).model, 'provider/final');
    await writeFile(child, 'Child\nFROM Base\nIMPORT {./imported.book}\nDELETE MODEL provider/imported\nKNOWLEDGE ./missing-evidence.md\n');
    assert.equal((await resolveAgentSelection(workspace, 'Child')).model, 'gpt-5-base');
    await writeFile(child, 'Child\nMODEL gpt-5-local\n');
    assert.equal((await resolveAgentSelection(workspace, 'Child')).model, 'gpt-5-local');
    await assert.rejects(readFile(path.join(project, 'agents', '.core', 'adam.book')), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(project, '.ptbk', 'ledger.json')), { code: 'ENOENT' });
    await writeFile(child, 'Child\nFROM https://metadata-must-not-resolve.invalid/base.book\nMODEL provider/local\n');
    assert.equal((await resolveAgentSelection(workspace, 'Child')).model, undefined);
    await writeFile(child, 'Child\nFROM Void\nMODEL default\n');
    assert.equal((await resolveAgentSelection(workspace, 'Child')).model, undefined);
});
