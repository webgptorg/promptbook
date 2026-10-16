import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { AgentCatalog, resolveEffectiveAgent, teamReferences, validateAgents } from '../dist/project/agents.js';
import { ADAM_BOOK, TEACHER_BOOK } from '../dist/project/defaults.js';
import { loadSettings, resolveSettings, updateProjectConfig } from '../dist/project/config.js';
import { projectAt } from '../dist/project/workspace.js';
import { git, initRepository, temporaryDirectory } from './helpers.mjs';

/**
 * Writes files relative to a root.
 */
async function files(root, entries) {
    for (const [path, content] of Object.entries(entries)) {
        await mkdir(join(root, path, '..'), { recursive: true });
        await writeFile(join(root, path), content);
    }
}

test('agent lookup: non-agents, agents/ tier, other Books, then ignored node_modules; collisions and shadowing', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await files(root, {
        '.gitignore': 'node_modules/\n',
        'agents/.core/adam.book': 'Adam\nFROM Void\nRULE Base rule.\n',
        'agents/front.book': 'Frontend Developer\nGOAL Pretty UI.\n',
        'docs/agents/front-copy.book': 'Frontend Developer\nRULE lower tier copy\n',
        'docs/helper.book': 'Helper\nRULE help\n',
        'node_modules/pkg/vendor.book': 'Vendor Agent\nRULE from a dependency\n',
        'agents/a/dup.book': 'Twin\n',
        'agents/b/dup.book': 'Twin\n',
        'agents/reserved.book': 'User\n',
        'tasks/task.book': 'TASK Not an agent\n',
    });
    const catalog = await AgentCatalog.load(root);
    assert.equal((await catalog.resolve('{Expert}')).kind, 'non-agent');
    const front = await catalog.resolve('@FrontendDeveloper');
    assert.equal(front.kind, 'agent');
    assert.equal(front.definition.relativePath, 'agents/front.book');
    assert.equal((await catalog.resolve('{Helper}')).definition.tier, 3);
    const vendor = await catalog.resolve('{Vendor Agent}');
    assert.equal(vendor.kind, 'agent');
    assert.equal(vendor.definition.tier, 4);
    assert.ok(!catalog.ordinary().some((definition) => definition.name === 'Vendor Agent'));
    assert.equal((await catalog.resolve('@Twin')).kind, 'ambiguous');
    assert.equal((await catalog.resolve('{Not an agent}')).kind, 'missing');
    assert.ok(catalog.diagnostics.some((diagnostic) => /reserved/.test(diagnostic.message)));
    assert.equal((await catalog.resolve('@User')).kind, 'non-agent');
});

test('inheritance: implicit Adam, FROM chains, Expert foundation, cycles and FROM User fail; Teacher must be CLOSED', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await files(root, {
        'agents/.core/adam.book': 'Adam\nFROM Void\nRULE Be careful.\n',
        'agents/.core/teacher.book': 'Teacher\nFROM Expert\nRULE Teach.\n',
        'agents/dev.book': 'Developer\nRULE Write tests.\nTEAM Ask @Lawyer and {Missing One}.\n',
        'agents/senior.book': 'Senior\nFROM @Developer\nRULE Review.\nDELETE RULE Write tests.\n',
        'agents/loop-a.book': 'Loop A\nFROM {Loop B}\n',
        'agents/loop-b.book': 'Loop B\nFROM {Loop A}\n',
        'agents/bad.book': 'Bad\nFROM User\n',
        'agents/expertish.book': 'Modified Expert\nFROM Expert\nRULE Local twist.\n',
    });
    const catalog = await AgentCatalog.load(root);
    const senior = await resolveEffectiveAgent(catalog, '@Senior');
    assert.deepEqual(senior.chain, ['Senior', 'Developer', 'Adam']);
    const texts = senior.instructions.map((instruction) => instruction.text);
    assert.ok(texts.includes('Be careful.'));
    assert.ok(!texts.includes('Write tests.'), 'DELETE withdraws the inherited rule');
    assert.ok(senior.instructions.find((instruction) => instruction.text === 'Be careful.').agent === 'Adam');
    assert.ok((await resolveEffectiveAgent(catalog, '{Loop A}')).diagnostics.some((diagnostic) => /cycle/i.test(diagnostic.message)));
    assert.ok((await resolveEffectiveAgent(catalog, '@Bad')).diagnostics.some((diagnostic) => /User cannot be an inheritance parent/.test(diagnostic.message)));
    const modified = await resolveEffectiveAgent(catalog, '{Modified Expert}');
    assert.deepEqual(modified.chain, ['Modified Expert', 'Expert']);
    const diagnostics = await validateAgents(catalog);
    assert.ok(diagnostics.some((diagnostic) => /Teacher must end with CLOSED/.test(diagnostic.message)));
    assert.equal((await resolveEffectiveAgent(catalog, '@Developer')).learning.open, true);
});

test('reference examples: @ and brace forms everywhere, normalized names, built-ins first, then agents/, project, ignored content', async (t) => {
    const root = await temporaryDirectory(t);
    await initRepository(root);
    await files(root, {
        '.gitignore': 'node_modules/\n',
        'agents/.core/adam.book': 'Adam\n\nFROM @Void\n\nRULE Never claim work you did not verify, and report blockers honestly.\nRULE …\nCLOSED\n',
        'agents/.core/teacher.book': 'Teacher\n\nFROM @Expert\n\nRULE …\nCLOSED\n',
        'agents/developer.book': 'Developer\n\nNOTE This is not needed because its implicitly FROM @Adam\n\nTEAM When you need to write `book` language consult with @Expert\nRULE …\nCLOSED\n',
        'agents/frontend-developer.book': 'Frontend Developer\n\nFROM @Developer\nKNOWLEDGE …\nCLOSED\n',
        'agents/ux-designer.book': 'UX Designer\n\nTEAM When you need to write `book` language consult with @Expert, to do the frontend tasks consult with {Frontend Developer}\nKNOWLEDGE …\nCLOSED\n',
        'docs/frontend-copy.book': 'Frontend Developer\nRULE shadowed by agents/\n',
        'node_modules/pkg/frontend.book': 'Frontend Developer\nRULE shadowed twice\n',
        'node_modules/pkg/designer.book': 'Design System Keeper\nRULE only in a dependency\n',
    });
    const catalog = await AgentCatalog.load(root);
    for (const reference of ['@Void', '@Null', '{Void}', '{Null}', '@Expert', '{Expert}', '@User', '{User}']) assert.equal((await catalog.resolve(reference)).kind, 'non-agent', reference);
    assert.equal((await catalog.resolve('@Adam')).definition.relativePath, (await catalog.resolve('{Adam}')).definition.relativePath, '@Adam and {Adam} are the same reference');
    for (const reference of ['{Frontend Developer}', '{FrontendDeveloper}', '{frontend Developer}', '{Frontend_Developer}', '{-Fronténd Developer}', '@FrontendDeveloper']) {
        const resolved = await catalog.resolve(reference);
        assert.equal(resolved.kind, 'agent', reference);
        assert.equal(resolved.definition.relativePath, 'agents/frontend-developer.book', `${reference} resolves in agents/ before the project and node_modules copies`);
    }
    assert.deepEqual((await resolveEffectiveAgent(catalog, '@Adam')).chain, ['Adam'], 'FROM @Void ends inheritance');
    assert.deepEqual((await resolveEffectiveAgent(catalog, '@Teacher')).chain, ['Teacher', 'Expert']);
    const developer = await resolveEffectiveAgent(catalog, '@Developer');
    assert.deepEqual(developer.chain, ['Developer', 'Adam'], 'implicit Adam; the NOTE text is not a FROM');
    assert.deepEqual(teamReferences(developer), ['@Expert']);
    assert.deepEqual((await resolveEffectiveAgent(catalog, '{Frontend Developer}')).chain, ['Frontend Developer', 'Developer', 'Adam']);
    const designer = await resolveEffectiveAgent(catalog, '{UX Designer}');
    assert.deepEqual(teamReferences(designer), ['@Expert', '{Frontend Developer}']);
    assert.equal(designer.learning.open, false);
    assert.equal((await catalog.resolve('{Design System Keeper}')).definition.tier, 4, 'Git-ignored content is the last tier');
    assert.deepEqual((await validateAgents(catalog)).filter((diagnostic) => diagnostic.severity === 'error'), []);
    assert.match(ADAM_BOOK, /^FROM @Void$/m, 'supplied defaults use the @ form');
    assert.match(ADAM_BOOK, /CLOSED\n$/);
    assert.match(TEACHER_BOOK, /^FROM @Expert$/m);
});

test('configuration precedence: defaults < legacy environment < ptbk.json < CLI < runtime; explicit false/null kept', () => {
    const resolved = resolveSettings({
        file: { routing: { harness: 'claude-code' }, execution: { commit: false, check: null, waitAfterError: '5m' }, server: { port: 4100 }, unknownKey: true },
        env: { PTBK_HARNESS: 'openai-codex', PTBK_MODEL: 'env-model' },
        cli: { 'server.port': 4200 },
        runtime: { 'execution.waitBetweenPrompts': 60_000 },
    });
    assert.equal(resolved.values['routing.harness'], 'claude-code');
    assert.equal(resolved.sources['routing.harness'], 'ptbk.json');
    assert.equal(resolved.values['routing.model'], 'env-model');
    assert.equal(resolved.sources['routing.model'], 'environment');
    assert.equal(resolved.values['execution.commit'], false);
    assert.equal(resolved.values['execution.check'], null);
    assert.equal(resolved.values['execution.waitAfterError'], 300_000);
    assert.equal(resolved.values['server.port'], 4200);
    assert.equal(resolved.sources['server.port'], 'cli');
    assert.equal(resolved.values['execution.waitBetweenPrompts'], 60_000);
    assert.equal(resolved.values['execution.repairAttempts'], 3);
    assert.ok(resolved.diagnostics.some((diagnostic) => /unknownKey/.test(diagnostic.location) && diagnostic.severity === 'warning'));
    const invalid = resolveSettings({ file: { execution: { gitChanges: 'sometimes' }, harnesses: { 'openai-codex': { apiKey: 'sk-secret' } } } });
    assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.location.includes('execution.gitChanges') && diagnostic.severity === 'error'));
    assert.ok(invalid.diagnostics.some((diagnostic) => /credential references/.test(diagnostic.message)));
});

test('saving settings preserves unknown keys and writes durations readably', async (t) => {
    const root = await temporaryDirectory(t);
    const project = projectAt(root);
    await writeFile(project.configPath, JSON.stringify({ custom: { keep: true }, execution: { check: 'npm test' } }, null, 4));
    assert.equal(await updateProjectConfig(project, { settings: { 'execution.waitAfterError': 90_000 }, harnesses: { 'claude-code': { enabled: true } } }), true);
    const saved = JSON.parse(await readFile(project.configPath, 'utf8'));
    assert.deepEqual(saved.custom, { keep: true });
    assert.equal(saved.execution.check, 'npm test');
    assert.equal(saved.execution.waitAfterError, '1m30s');
    assert.equal(saved.harnesses['claude-code'].enabled, true);
    assert.equal(await updateProjectConfig(project, { settings: { 'execution.waitAfterError': 90_000 } }), false, 'unchanged content is not rewritten');
    const settings = await loadSettings(project);
    assert.equal(settings.values['execution.waitAfterError'], 90_000);
    await git(root, ['--version']);
});
