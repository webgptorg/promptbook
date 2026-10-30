import assert from 'node:assert/strict';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { AgentCatalog, resolveEffectiveAgent, teamReferences, validateAgents } from '../dist/project/agents.js';
import { ADAM_BOOK, TEACHER_BOOK } from '../dist/project/defaults.js';
import { loadSettings, resolveSettings, updateProjectConfig } from '../dist/project/config.js';
import { projectAt } from '../dist/project/workspace.js';
import { resolveRoute } from '../dist/engine/routing.js';
import { readTaskBook } from '../dist/tasks/book-task.js';
import { ENGINE_VERSION } from '../dist/common/version.js';
import { git, initRepository, ptbk, temporaryDirectory } from './helpers.mjs';

/**
 * Writes files relative to a root.
 */
async function files(root, entries) {
    for (const [path, content] of Object.entries(entries)) {
        await mkdir(join(root, path, '..'), { recursive: true });
        await writeFile(join(root, path), content);
    }
}

test('agent lookup: system agents, agents/ tier, other Books, then ignored node_modules; collisions and shadowing', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await files(root, {
        '.gitignore': 'node_modules/\n',
        'agents/.core/adam.book': 'AGENT Adam\nFROM Void\nRULE Base rule.\n',
        'agents/front.book': 'AGENT Frontend Developer\nGOAL Pretty UI.\n',
        'docs/agents/front-copy.book': 'AGENT Frontend Developer\nRULE lower tier copy\n',
        'docs/helper.book': 'AGENT Helper\nRULE help\n',
        'node_modules/pkg/vendor.book': 'AGENT Vendor Agent\nRULE from a dependency\n',
        'agents/a/dup.book': 'AGENT Twin\n',
        'agents/b/dup.book': 'AGENT Twin\n',
        'agents/reserved.book': 'AGENT User\n',
        'agents/old.book': 'Old Style\nPERSONA Former plain name line.\n',
        'tasks/task.book': 'TASK Not an agent\n',
        'docs/misplaced.book': 'TASK Placed among docs\n',
        'tasks/reviewer.book': 'TASK Reviewer\n',
        'agents/team/reviewer.book': 'AGENT Reviewer\nRULE Review.\n',
    });
    const catalog = await AgentCatalog.load(root);
    assert.equal((await catalog.resolve('{Expert}')).kind, 'system-agent');
    const front = await catalog.resolve('@FrontendDeveloper');
    assert.equal(front.kind, 'agent');
    assert.equal(front.definition.relativePath, 'agents/front.book');
    assert.equal((await catalog.resolve('{Helper}')).definition.tier, 3);
    const vendor = await catalog.resolve('{Vendor Agent}');
    assert.equal(vendor.kind, 'agent');
    assert.equal(vendor.definition.tier, 4);
    assert.ok(!catalog.ordinary().some((definition) => definition.name === 'Vendor Agent'));
    assert.deepEqual(front.shadowed.map((entry) => entry.relativePath), ['docs/agents/front-copy.book'], 'the lower-tier copy is shadowed, not merged');
    const twin = await catalog.resolve('@Twin');
    assert.equal(twin.kind, 'agent', 'same-name Books resolve deterministically (first by depth, root order, then path)');
    assert.equal(twin.definition.relativePath, 'agents/a/dup.book');
    assert.deepEqual(twin.shadowed.map((entry) => entry.relativePath), ['agents/b/dup.book']);
    assert.ok(catalog.diagnostics.some((diagnostic) => diagnostic.severity === 'warning' && diagnostic.path === 'agents/b/dup.book' && /shadow/i.test(diagnostic.message)), 'the collision is reported for Fixer');
    const wrongKind = await catalog.resolve('{Not an agent}');
    assert.equal(wrongKind.kind, 'wrong-kind', 'a task name is never silently treated as an agent');
    assert.equal(wrongKind.entry.relativePath, 'tasks/task.book');
    assert.ok(catalog.diagnostics.some((diagnostic) => /reserved/.test(diagnostic.message)));
    assert.equal((await catalog.resolve('@User')).kind, 'system-agent');
    const old = await catalog.resolve('{Old Style}');
    assert.equal(old.kind, 'invalid', 'a plain name line in agents/ is former syntax, not an implicit agent');
    assert.ok(catalog.diagnostics.some((diagnostic) => diagnostic.path === 'agents/old.book' && /ptbk migrate/.test(diagnostic.message)));
    const misplaced = await catalog.resolve('{Placed among docs}');
    assert.equal(misplaced.kind, 'wrong-kind', 'the opening declaration supplies the kind wherever the file is stored');
    assert.equal(misplaced.entry.kind, 'task');
    const reviewer = await catalog.resolve('@Reviewer');
    assert.equal(reviewer.kind, 'agent', 'the whole agents/ folder is searched before the rest of the project, however shallow');
    assert.equal(reviewer.definition.relativePath, 'agents/team/reviewer.book');
    assert.equal(reviewer.definition.tier, 2);
    assert.deepEqual(reviewer.shadowed.map((entry) => entry.relativePath), ['tasks/reviewer.book']);
    assert.equal((await catalog.resolve('{Not an agent}')).entry.tier, 3, 'tasks/ belongs to the rest of the project');
});

test('Book listing: tracked Books deleted or moved without a commit are not unreadable; the moved copy is indexed', async (t) => {
    const directory = await temporaryDirectory(t);
    const root = join(directory, 'project');
    await initRepository(root);
    await files(root, {
        'agents/.core/adam.book': 'AGENT Adam\nFROM Void\nRULE Base rule.\n',
        'agents/moved.book': 'AGENT Moved Agent\nRULE Keep working.\n',
        'agents/deleted.book': 'AGENT Deleted Agent\nRULE Gone soon.\n',
        'agents/locked.book': 'AGENT Locked Agent\nRULE Unreadable on purpose.\n',
    });
    await git(root, ['add', '.']);
    await git(root, ['commit', '-qm', 'Books']);
    await mkdir(join(root, 'agents', '.legacy'));
    await rename(join(root, 'agents', 'moved.book'), join(root, 'agents', '.legacy', 'moved.book'));
    await rm(join(root, 'agents', 'deleted.book'));
    // A permission failure is a real read failure of an existing Book (not reproducible on Windows or as root).
    const isLockable = process.platform !== 'win32' && process.getuid?.() !== 0;
    if (isLockable) await chmod(join(root, 'agents', 'locked.book'), 0o000);
    const catalog = await AgentCatalog.load(root);
    const moved = await catalog.resolve('@MovedAgent');
    assert.equal(moved.kind, 'agent');
    assert.equal(moved.definition.relativePath, 'agents/.legacy/moved.book');
    assert.equal((await catalog.resolve('@DeletedAgent')).kind, 'missing');
    const lint = await ptbk(['lint', '--json'], { cwd: root, env: { ...process.env, NO_COLOR: '1', PTBK_HOME: join(directory, 'ptbk home') } });
    const unreadable = JSON.parse(lint.stdout).findings.filter((finding) => /Unreadable Book/.test(finding.message));
    assert.deepEqual(
        unreadable.map((finding) => finding.location),
        isLockable ? ['agents/locked.book'] : [],
        lint.stdout,
    );
    assert.equal(lint.code, 0, lint.output);
});

test('inheritance: implicit Adam, FROM chains, Expert foundation, cycles and FROM User fail; Teacher must be CLOSED', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await files(root, {
        'agents/.core/adam.book': 'AGENT Adam\nFROM Void\nRULE Be careful.\n',
        'agents/.core/teacher.book': 'AGENT Teacher\nFROM Expert\nRULE Teach.\n',
        'agents/dev.book': 'AGENT Developer\nRULE Write tests.\nTEAM Ask @Lawyer and {Missing One}.\n',
        'agents/senior.book': 'AGENT Senior\nFROM @Developer\nRULE Review.\nDELETE RULE Write tests.\n',
        'agents/loop-a.book': 'AGENT Loop Alpha\nFROM {Loop Beta}\n',
        'agents/loop-b.book': 'AGENT Loop Beta\nFROM {Loop Alpha}\n',
        'agents/doubled.book': 'AGENT Doubled\nFROM {{Loop Beta}}\n',
        'agents/bad.book': 'AGENT Bad\nFROM User\n',
        'agents/expertish.book': 'AGENT Modified Expert\nFROM Expert\nRULE Local twist.\n',
    });
    const catalog = await AgentCatalog.load(root);
    const senior = await resolveEffectiveAgent(catalog, '@Senior');
    assert.deepEqual(senior.chain, ['Senior', 'Developer', 'Adam']);
    const texts = senior.instructions.map((instruction) => instruction.text);
    assert.ok(texts.includes('Be careful.'));
    assert.ok(!texts.includes('Write tests.'), 'DELETE withdraws the inherited rule');
    assert.ok(senior.instructions.find((instruction) => instruction.text === 'Be careful.').agent === 'Adam');
    assert.ok((await resolveEffectiveAgent(catalog, '{Loop Alpha}')).diagnostics.some((diagnostic) => /cycle/i.test(diagnostic.message)));
    const doubled = await resolveEffectiveAgent(catalog, '@Doubled');
    assert.ok(doubled.diagnostics.some((diagnostic) => /FROM "\{\{Loop Beta\}\}" is not a valid reference\. References use single braces: \{Loop Beta\}/.test(diagnostic.message)), 'FROM {{…}} is malformed and points to {…}');
    assert.ok((await resolveEffectiveAgent(catalog, '@Bad')).diagnostics.some((diagnostic) => /User cannot be an inheritance parent/.test(diagnostic.message)));
    const modified = await resolveEffectiveAgent(catalog, '{Modified Expert}');
    assert.deepEqual(modified.chain, ['Modified Expert', 'Expert']);
    const diagnostics = await validateAgents(catalog);
    assert.ok(diagnostics.some((diagnostic) => /Teacher must end with CLOSED/.test(diagnostic.message)));
    assert.equal((await resolveEffectiveAgent(catalog, '@Developer')).learning.open, true);
});

test('repair deadlock: Fixer repair work runs despite a problematic MODEL inherited from Adam; other work stays blocked', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await files(root, {
        'agents/.core/adam.book': 'AGENT Adam\nFROM @Void\nMODEL Use Claude Opus 5.5 or a newer Opus model.\nRULE Be careful.\n',
        'agents/.core/fixer.book': 'AGENT Fixer\nFROM @Adam\nGOAL Solve problems.\n',
        'agents/dev.book': 'AGENT Developer\nRULE Write tests.\n',
    });
    const catalog = await AgentCatalog.load(root);
    const fixer = await resolveEffectiveAgent(catalog, '@Fixer');
    assert.deepEqual(
        fixer.diagnostics.map((diagnostic) => [diagnostic.path, diagnostic.commitment, diagnostic.severity]),
        [['agents/.core/adam.book', 'MODEL', 'error']],
        'the inherited prose MODEL is one error, tagged as MODEL content',
    );
    const codex = { type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'openai-codex', isEnabled: true };
    // A stand-in pool with one usable Codex instance at the official endpoint.
    const pool = {
        rejectsModel: async () => false,
        models: async () => ['gpt-x'],
        instance: () => codex,
        instancesFor: () => [codex],
        enabled: () => ['openai-codex'],
        select: () => codex,
        inspectionOf: () => ({ usable: true, summary: 'Ready.' }),
        inspection: () => ({ usable: true, summary: 'Ready.' }),
        baseUrl: () => undefined,
    };
    const context = { catalog, pool, settings: {} };
    const task = (agent, origin) =>
        readTaskBook({
            source: `TASK Work\nTASK AGENT @${agent}\nMODEL harness=OPENAI_CODEX model=gpt-x thinking=medium runtime=official\n${origin ? `TASK ORIGIN ${origin}\n` : ''}`,
            path: join(root, 'tasks', 'work.book'),
            relativePath: 'tasks/work.book',
            order: 0,
            timeZone: 'UTC',
        });
    const repair = await resolveRoute(task('Fixer', 'maintenance: router bootstrap'), context);
    assert.equal(repair.kind, 'routable', `the repair is not blocked by what it repairs: ${repair.reason ?? ''}`);
    assert.equal(repair.selection.model, 'gpt-x', 'the repair runs with its own MODEL');
    const ordinary = await resolveRoute(task('Developer'), context);
    assert.equal(ordinary.kind, 'blocked');
    assert.match(ordinary.reason, /adam\.book: MODEL: "Use Claude Opus .*" is prose/);
    assert.equal((await resolveRoute(task('Fixer'), context)).kind, 'blocked', "Fixer's ordinary work still waits for the repair");
});

test('reference examples: @ and brace forms everywhere, normalized names, built-ins first, then agents/, project, ignored content', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await files(root, {
        '.gitignore': 'node_modules/\n',
        'agents/.core/adam.book': 'AGENT Adam\n\nFROM @Void\n\nRULE Never claim work you did not verify, and report blockers honestly.\nRULE …\nCLOSED\n',
        'agents/.core/teacher.book': 'AGENT Teacher\n\nFROM @Expert\n\nRULE …\nCLOSED\n',
        'agents/developer.book': 'AGENT Developer\n\nNOTE This is not needed because its implicitly FROM @Adam\n\nTEAM When you need to write `book` language consult with @Expert\nRULE …\nCLOSED\n',
        'agents/frontend-developer.book': 'AGENT Frontend Developer\n\nFROM @Developer\nKNOWLEDGE …\nCLOSED\n',
        'agents/ux-designer.book': 'AGENT Ux Designer\n\nTEAM When you need to write `book` language consult with @Expert, to do the frontend tasks consult with {Frontend Developer}\nKNOWLEDGE …\nCLOSED\n',
        'agents/template-writer.book': 'AGENT Template Writer\n\nTEAM Fill {{Frontend Developer}} placeholders yourself; ask @Expert about syntax.\nCLOSED\n',
        'tasks/frontend-developer.book': 'TASK Frontend Developer\n',
        'docs/frontend-copy.book': 'AGENT Frontend Developer\nRULE shadowed by agents/\n',
        'node_modules/pkg/frontend.book': 'AGENT Frontend Developer\nRULE shadowed twice\n',
        'node_modules/pkg/designer.book': 'AGENT Design System Keeper\nRULE only in a dependency\n',
    });
    const catalog = await AgentCatalog.load(root);
    for (const reference of ['@Void', '@Null', '{Void}', '{Null}', '@Expert', '{Expert}', '@User', '{User}']) assert.equal((await catalog.resolve(reference)).kind, 'system-agent', reference);
    assert.equal((await catalog.resolve('@Adam')).definition.relativePath, (await catalog.resolve('{Adam}')).definition.relativePath, '@Adam and {Adam} are the same reference');
    for (const reference of ['{Frontend Developer}', '{FrontendDeveloper}', '{frontend Developer}', '{Frontend_Developer}', '{-Fronténd Developer}', '@FrontendDeveloper']) {
        const resolved = await catalog.resolve(reference);
        assert.equal(resolved.kind, 'agent', reference);
        assert.equal(resolved.definition.relativePath, 'agents/frontend-developer.book', `${reference} resolves in agents/ before the tasks/, project and node_modules copies`);
    }
    for (const reference of ['{{Adam}}', '{{Frontend Developer}}', '{{Expert}}']) assert.equal((await catalog.resolve(reference)).kind, 'invalid', `${reference} is not a reference`);
    assert.deepEqual((await resolveEffectiveAgent(catalog, '@Adam')).chain, ['Adam'], 'FROM @Void ends inheritance');
    assert.deepEqual((await resolveEffectiveAgent(catalog, '@Teacher')).chain, ['Teacher', 'Expert']);
    const developer = await resolveEffectiveAgent(catalog, '@Developer');
    assert.deepEqual(developer.chain, ['Developer', 'Adam'], 'implicit Adam; the NOTE text is not a FROM');
    assert.deepEqual(teamReferences(developer), ['@Expert']);
    assert.deepEqual((await resolveEffectiveAgent(catalog, '{Frontend Developer}')).chain, ['Frontend Developer', 'Developer', 'Adam']);
    const designer = await resolveEffectiveAgent(catalog, '{UX Designer}');
    assert.deepEqual(teamReferences(designer), ['@Expert', '{Frontend Developer}']);
    assert.deepEqual(teamReferences(await resolveEffectiveAgent(catalog, '{Template Writer}')), ['@Expert'], 'double-brace text in TEAM is not a teammate');
    assert.equal(designer.learning.open, false);
    assert.equal((await catalog.resolve('{Design System Keeper}')).definition.tier, 4, 'Git-ignored content is the last tier');
    assert.deepEqual((await validateAgents(catalog)).filter((diagnostic) => diagnostic.severity === 'error'), []);
    assert.match(ADAM_BOOK, /^FROM @Void$/m, 'supplied defaults use the @ form');
    assert.match(ADAM_BOOK, /CLOSED\n$/);
    assert.match(TEACHER_BOOK, /^FROM @Expert$/m);
});

test('configuration precedence: plugin/engine defaults < ptbk.json < CLI < runtime; explicit false/null kept; no legacy environment fallback', () => {
    const resolved = resolveSettings({
        file: { routing: { harness: 'CLAUDE_CODE', defaultAgent: 'Planner' }, execution: { isCommitEnabled: false, check: null, waitAfterError: '5m', checkBefore: 'yes and fail' }, server: { port: 4100 }, unknownKey: true },
        env: { PTBK_HARNESS: 'openai-codex', PTBK_MODEL: 'env-model', PTBK_THINKING_LEVEL: 'high' },
        cli: { 'server.port': 4200 },
        runtime: { 'execution.waitBetweenPrompts': 60_000 },
    });
    assert.equal(resolved.values['execution.checkBefore'], 'yes-and-fail', 'canonical enum values are read in any spelling');
    assert.equal(resolved.sources['execution.checkBefore'], 'ptbk.json');
    assert.equal(resolved.values['routing.defaultAgent'], 'Planner');
    assert.ok(!Object.hasOwn(resolved.values, 'routing.harness') && !Object.hasOwn(resolved.values, 'routing.model'), 'model/harness defaults are plugin-owned, not settings');
    assert.ok(Object.values(resolved.sources).every((source) => source !== 'environment'), 'PTBK_HARNESS/PTBK_MODEL/PTBK_THINKING_LEVEL no longer fill defaults');
    assert.ok(resolved.diagnostics.some((diagnostic) => diagnostic.location === 'ptbk.json › routing.harness' && diagnostic.severity === 'warning' && /superseded/.test(diagnostic.message)), 'an unmigrated routing default is diagnosed, not used');
    assert.equal(resolved.values['execution.isCommitEnabled'], false);
    assert.equal(resolved.values['execution.check'], null);
    assert.equal(resolved.values['execution.waitAfterError'], 300_000);
    assert.equal(resolved.values['server.port'], 4200);
    assert.equal(resolved.sources['server.port'], 'cli');
    assert.equal(resolved.values['execution.waitBetweenPrompts'], 60_000);
    assert.equal(resolved.values['execution.repairAttempts'], 3);
    assert.equal(resolved.values.isAutoSync, false, 'automatic synchronization defaults off');
    assert.ok(resolved.diagnostics.some((diagnostic) => /unknownKey/.test(diagnostic.location) && diagnostic.severity === 'warning'));
    const invalid = resolveSettings({ file: { execution: { gitChanges: 'sometimes' }, tools: [{ type: 'HARNESS', variant: 'OPENAI_CODEX', name: 'company', authentication: 'API_KEY', apiKey: 'sk-secret' }] } });
    assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.location.includes('execution.gitChanges') && diagnostic.severity === 'error'));
    assert.ok(invalid.diagnostics.some((diagnostic) => /environment reference/.test(diagnostic.message) && !diagnostic.message.includes('sk-secret')), 'an inline key is invalid and never echoed');
    assert.equal(invalid.tools.length, 0, 'an invalid tool is not usable');
});

test('saving settings preserves unknown keys and writes durations readably', async (t) => {
    const root = await temporaryDirectory(t);
    const project = projectAt(root);
    await writeFile(project.configPath, JSON.stringify({ promptbookVersion: ENGINE_VERSION, custom: { keep: true }, execution: { check: 'npm test' } }, null, 4));
    assert.equal(await updateProjectConfig(project, { settings: { 'execution.waitAfterError': 90_000, 'execution.checkBefore': 'yes-and-fix' } }), true);
    const saved = JSON.parse(await readFile(project.configPath, 'utf8'));
    assert.deepEqual(saved.custom, { keep: true });
    assert.equal(saved.execution.check, 'npm test');
    assert.equal(saved.execution.waitAfterError, '1m30s');
    assert.equal(saved.execution.checkBefore, 'YES_AND_FIX', 'fixed enum values are saved canonically');
    assert.equal(await updateProjectConfig(project, { settings: { 'execution.waitAfterError': 90_000 } }), false, 'unchanged content is not rewritten');
    const settings = await loadSettings(project);
    assert.equal(settings.values['execution.waitAfterError'], 90_000);
    await git(root, ['--version']);
});
