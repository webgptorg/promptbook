import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBook, singleValue } from '../dist/book/parse.js';
import { appendCommitment, setControlCommitment } from '../dist/book/edit.js';
import { convertLegacyBook } from '../dist/book/convert.js';
import { matchCommitmentKeyword } from '../dist/book/commitments.js';
import { findAgentReferences, formatAgentReference, invalidReferenceMessage, normalizeAgentName, nonAgentOf, parseReferenceValue, toReference } from '../dist/book/references.js';
import { declarationName, renderCommitment, renderDeclaration } from '../dist/book/write.js';
import { generatedName } from '../dist/tasks/identity.js';
import { readTaskBook, splitTaskReferences } from '../dist/tasks/book-task.js';

test('typed declarations: AGENT, TASK and CHAT open a Book and give kind and name with one grammar, without location hints', () => {
    const agent = parseBook('\n\nAGENT Frontend Developer\nPERSONA You build interfaces.\nGOAL Ship it.');
    assert.equal(agent.kind, 'agent');
    assert.equal(agent.name, 'Frontend Developer');
    assert.deepEqual(agent.commitments.map((commitment) => commitment.keyword), ['PERSONA', 'GOAL']);
    const task = parseBook('TASK Improve CSV export — 2026-10-18 01:25:00\nGOAL Preserve columns.\nAdd tests.\nTASK AGENT @Developer');
    assert.equal(task.kind, 'task');
    assert.equal(task.name, 'Improve CSV export — 2026-10-18 01:25:00', 'a date is ordinary name text');
    assert.equal(task.commitments[0].body, 'Preserve columns.\nAdd tests.');
    assert.equal(parseBook('CHAT Discuss export\nCHAT MEMBER @User\nCHAT MEMBER @Developer').kind, 'chat');
    assert.equal(parseBook('TASK Improve CSV export').kind, 'task', 'an undated name is equally valid');
    for (const invalid of ['TASK   ', 'TASK DONE 2026-01-01', 'PERSONA No declaration.', 'TASK SOMETHING value', 'AGENT CEO']) {
        const document = parseBook(invalid);
        assert.equal(document.kind, 'invalid', invalid);
        assert.ok(document.diagnostics.some((diagnostic) => diagnostic.severity === 'error'), invalid);
    }
    assert.equal(parseBook('AGENT Ceo').name, 'Ceo', 'a mixed-case first word begins the name');
    assert.ok(parseBook('TASK Improve\nmore of the name').diagnostics.some((diagnostic) => diagnostic.severity === 'error'), 'a multiline name is invalid');
    assert.ok(parseBook('TASK Improve\n\nAn unowned introduction.').diagnostics.some((diagnostic) => diagnostic.severity === 'error' && /GOAL/.test(diagnostic.message)));
    assert.ok(parseBook('AGENT Alpha\nPERSONA x\nAGENT Beta').diagnostics.some((diagnostic) => /exactly one entity/.test(diagnostic.message)), 'a second declaration is invalid');
    const legacy = parseBook('Developer\n\nGOAL Ship it.');
    assert.equal(legacy.kind, 'invalid', 'a plain name line is former syntax, not an implicit agent');
    assert.equal(legacy.legacy.plainHeader, true);
    assert.match(legacy.diagnostics[0].message, /ptbk migrate/);
    const entity = parseBook('Report\nENTITY TASK\n\nDo it.');
    assert.equal(entity.kind, 'invalid');
    assert.equal(entity.legacy.entity, 'task');
    assert.ok(parseBook('TASK Item\nENTITY AGENT').diagnostics.some((diagnostic) => diagnostic.severity === 'error' && /cannot override/.test(diagnostic.message)));
});

test('commitment boundaries: maximal uppercase keywords of three or more letters; content starts at the first other token', () => {
    assert.equal(matchCommitmentKeyword('TASK AGENT @Developer').definition.keyword, 'TASK AGENT');
    assert.equal(matchCommitmentKeyword('TASK PRIORITY 2').content, '2');
    assert.equal(matchCommitmentKeyword('WRITING SAMPLE This is an example.').definition.keyword, 'WRITING SAMPLE');
    assert.equal(matchCommitmentKeyword('TASK DEPENDS ON {Other}').definition.keyword, 'TASK DEPENDS ON');
    assert.equal(matchCommitmentKeyword('AGENT Frontend Developer UI').content, 'Frontend Developer UI', 'later uppercase words stay content');
    for (const prose of ['A plan follows.', 'I think so.', 'AI agents help.', 'task agent is prose', ' RULE indented']) assert.equal(matchCommitmentKeyword(prose), undefined, prose);
    const unknown = matchCommitmentKeyword('RULE API keys must rotate.');
    assert.equal(unknown.definition.unknown, true, 'an unknown complete keyword is never shortened to a known prefix');
    assert.equal(unknown.written, 'RULE API');
    const document = parseBook('TASK Title\nTASK AGENT @Developer\ntask agent is prose\nRULE first\n  continues\nRULES second\nCUSTOM THING kept');
    assert.deepEqual(document.commitments.map((commitment) => commitment.keyword), ['TASK AGENT', 'RULE', 'RULE', 'CUSTOM THING']);
    assert.equal(document.commitments[0].body, '@Developer\ntask agent is prose');
    assert.equal(document.commitments[1].body, 'first\n  continues');
    assert.ok(document.diagnostics.some((diagnostic) => /Unknown commitment `CUSTOM THING`/.test(diagnostic.message)), 'unknown commitments are preserved and diagnosed');
});

test('literal content: fenced blocks and backslash-escaped lines never become commitments', () => {
    const document = parseBook('AGENT Writer\nSAMPLE Example:\n```book\nTASK Not a task\nRULE not a rule\n```\n\\RULE escaped\nRULE real rule');
    assert.deepEqual(document.commitments.map((commitment) => commitment.keyword), ['SAMPLE', 'RULE']);
    assert.match(document.commitments[0].body, /RULE not a rule/);
    assert.match(document.commitments[0].body, /^RULE escaped$/m, 'one escaping backslash is removed');
    const text = 'API keys rotate.\nTASK AGENT @Nobody\n\\already escaped\n```\nAGENT Inside\n\nend   ';
    const rendered = ['TASK Lossless', ...renderCommitment('GOAL', text)].join('\n');
    const reread = parseBook(rendered);
    assert.equal(reread.kind, 'task');
    assert.deepEqual(reread.commitments.map((commitment) => commitment.keyword), ['GOAL']);
    assert.equal(reread.commitments[0].body, text.trim(), 'arbitrary text survives under GOAL');
    assert.deepEqual(renderCommitment('GOAL', 'Keep it short.'), ['GOAL Keep it short.']);
    assert.deepEqual(renderCommitment('GOAL', 'AI agents help.'), ['GOAL', 'AI agents help.'], '`GOAL AI` would be one keyword, so the text starts on the next line');
    assert.deepEqual(renderCommitment('GOAL', 'API keys rotate.'), ['GOAL', '\\API keys rotate.'], 'content that would extend the keyword moves to the next line');
});

test('single-value controls report conflicts', () => {
    const document = parseBook('TASK Tee\nTASK AGENT @A\nTASK AGENT @B');
    assert.ok(singleValue(document, 'TASK AGENT').conflict);
});

test('edits preserve content and append completion stamps', () => {
    const source = 'TASK Title\nGOAL Keep this text.\n\nRULE Stay.\n';
    const routed = setControlCommitment(source, 'TASK AGENT', '@Developer');
    assert.match(routed, /GOAL Keep this text\./);
    assert.match(routed, /RULE Stay\.\nTASK AGENT @Developer\n$/);
    const replaced = setControlCommitment(routed, 'TASK AGENT', '@Planner');
    assert.equal((replaced.match(/TASK AGENT/g) ?? []).length, 1);
    assert.match(appendCommitment(replaced, 'TASK DONE', '2026-10-14T10:00:00+02:00'), /TASK DONE 2026-10-14T10:00:00\+02:00\n$/);
    assert.match(appendCommitment('TASK Only\n', 'TASK DONE', 'unknown'), /^TASK Only\n(\n)?TASK DONE unknown\n$/);
});

test('every documented Frontend Developer spelling normalizes identically; @ and single braces agree, double braces are not a reference', () => {
    const spellings = ['{Frontend Developer}', '{FrontendDeveloper}', '{frontend     Developer}', '{Frontend_Developer}', '{-Fronténd Developer}', '@FrontendDeveloper'];
    const keys = spellings.map((spelling) => parseReferenceValue(spelling).normalized);
    assert.deepEqual(new Set(keys), new Set(['frontenddeveloper']));
    assert.equal(parseReferenceValue('@Adam').normalized, parseReferenceValue('{Adam}').normalized);
    assert.equal(parseReferenceValue('{Čeněk}').normalized, parseReferenceValue('@Cenek').normalized);
    assert.equal(formatAgentReference('Developer'), '@Developer');
    assert.equal(formatAgentReference('Frontend Developer'), '{Frontend Developer}', 'generated multiword references use single braces');
    assert.equal(toReference('Frontend Developer'), '{Frontend Developer}');
    assert.equal(toReference('{Frontend Developer}'), '{Frontend Developer}');
    assert.equal(parseReferenceValue('{Improve CSV export — 2026-10-18 01:25:00}').name, 'Improve CSV export — 2026-10-18 01:25:00');
    for (const doubled of ['{{Adam}}', '{{Frontend Developer}}', '{{Frontend Developer}', '{Frontend Developer}}']) assert.equal(parseReferenceValue(doubled), undefined, doubled);
    assert.match(invalidReferenceMessage('{{Frontend Developer}}'), /single braces: \{Frontend Developer\}/);
});

test('references in content: single braces and @tokens, but not double braces, e-mails or code', () => {
    const found = findAgentReferences('Ask @Lawyer, {Frontend Developer}, {Copy Writer} or @User. Not {{Template Value}} nor ${{ env.API_KEY }}. Mail me@example.com. `@NotInCode`\n```\n@NotInFence\n```');
    assert.deepEqual(found.map((reference) => reference.normalized), ['lawyer', 'frontenddeveloper', 'copywriter', 'user']);
});

test('TASK DEPENDS ON keeps a braced multiword name together', () => {
    assert.deepEqual(splitTaskReferences('{Discuss CSV export}, @Deploy #legacy tasks/c.book {{Not A Reference}}'), ['{Discuss CSV export}', '@Deploy', '#legacy', 'tasks/c.book', '{{Not A Reference}}']);
});

test('non-agents: Void/Null/0, User and Expert are reserved', () => {
    assert.equal(nonAgentOf('void'), 'Void');
    assert.equal(nonAgentOf('null'), 'Void');
    assert.equal(nonAgentOf('0'), 'Void');
    assert.equal(nonAgentOf('user'), 'User');
    assert.equal(nonAgentOf('expert'), 'Expert');
    assert.equal(nonAgentOf('adam'), undefined);
});

test('task Books: TASK declares the name, GOAL the work; malformed controls block; done stamps complete one-time tasks', () => {
    const read = (source) => readTaskBook({ source, path: '/p/tasks/t.book', relativePath: 'tasks/t.book', order: 1, timeZone: 'UTC' });
    const task = read('TASK Export\nGOAL Do it.\nTASK ID export-1\nTASK AGENT @Developer\nTASK PRIORITY high\nTASK AFTER 2026-10-30T09:00:00+01:00\nTASK DEPENDS ON #a, #b\nRULE Keep API stable.');
    assert.equal(task.title, 'Export');
    assert.equal(task.ref, '@Export', 'a single-word name is referenced as @Name');
    assert.equal(task.description, 'Do it.');
    assert.equal(task.legacyId, 'export-1', 'a legacy TASK ID is historical metadata only');
    assert.deepEqual(task.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'), []);
    assert.equal(task.priority.value, 5);
    assert.equal(task.after, Date.parse('2026-10-30T08:00:00Z'));
    assert.deepEqual(task.dependsOn, ['#a', '#b']);
    assert.deepEqual(task.rules, ['Keep API stable.']);
    assert.equal(task.status, 'todo');
    assert.equal(read('TASK Export the CSV — 2026-10-18 01:25:00\nGOAL Go.').key, normalizeAgentName('Export the CSV — 2026-10-18 01:25:00'), 'the full name, including its date, is the key');
    assert.equal(read('TASK Item\nTASK DONE 2026-10-14T10:00:00+02:00').status, 'done');
    assert.equal(read('TASK Item\nTASK REPEAT 7d\nTASK DONE 2026-10-14T10:00:00+02:00').status, 'todo');
    for (const broken of ['TASK Item\nTASK FLAVOR spicy', 'TASK Item\nTASK STATUS maybe', 'TASK Item\nTASK AFTER someday', 'TASK Item\nTASK REPEAT 1 month', 'TASK Item\n\nUnowned description.']) {
        assert.ok(read(broken).diagnostics.some((diagnostic) => diagnostic.severity === 'error'), broken);
    }
    assert.equal(read('TASK @@@ placeholder').placeholder, true);
    assert.equal(read('AGENT Developer\nPERSONA A developer.'), undefined, 'an agent is not a task, even in tasks/');
    assert.equal(read('CHAT Notes\nCHAT MEMBER @User'), undefined);
    const legacy = read('Plain name in the tasks folder\n\nThe folder once supplied the kind.');
    assert.equal(legacy.title, 'Plain name in the tasks folder', 'former syntax is listed, never dispatched');
    assert.ok(legacy.diagnostics.some((diagnostic) => diagnostic.severity === 'error' && /ptbk migrate/.test(diagnostic.message)));
});

test('generated names: readable title plus creation date/time, distinct after normalization, representable after the keyword', () => {
    const now = Date.parse('2026-10-18T01:25:00Z');
    const first = generatedName('Improve CSV export', { taken: new Set(), timeZone: 'UTC', now });
    assert.equal(first, 'Improve CSV export — 2026-10-18 01:25:00');
    const taken = new Set([normalizeAgentName(first)]);
    const second = generatedName('improve csv-export', { taken, timeZone: 'UTC', now });
    assert.notEqual(normalizeAgentName(second), normalizeAgentName(first), 'a fixed clock and an equivalent spelling still yield a distinct name');
    assert.match(second, /2026-10-18 01:25:00 \(2\)$/);
    assert.equal(generatedName('API cleanup', { taken: new Set(), timeZone: 'UTC', now }), 'Api cleanup — 2026-10-18 01:25:00', 'an all-uppercase first word is recased (same normalized identity)');
    assert.equal(declarationName('A plan'), 'a plan');
    assert.equal(parseBook(renderDeclaration('task', 'API cleanup')).kind, 'task');
    assert.notEqual(normalizeAgentName(generatedName('Expert', { taken: new Set(), timeZone: 'UTC', now })), 'expert');
});

test('legacy conversion: plain names, ENTITY and introductions become canonical Books with the same name and content', () => {
    const agent = convertLegacyBook('Adam\n\nFROM @Void\n\nThe shared foundation.\n\nPERSONA Careful.\nRULE API keys stay secret.\nCLOSED\n', 'agents');
    assert.equal(agent.kind, 'converted');
    assert.equal(agent.entity, 'agent');
    const reread = parseBook(agent.content);
    assert.equal(reread.kind, 'agent');
    assert.equal(reread.name, 'Adam', 'the name is kept, with no new date');
    assert.deepEqual(reread.commitments.map((commitment) => commitment.keyword), ['PERSONA', 'FROM', 'PERSONA', 'RULE', 'CLOSED']);
    assert.equal(reread.commitments[0].body, 'The shared foundation.');
    assert.equal(reread.commitments.find((commitment) => commitment.keyword === 'RULE').body, 'API keys stay secret.', 'former content is not swallowed by the new boundary rule');
    const task = convertLegacyBook('Export the CSV\nENTITY TASK\n\nKeep columns.\nAI helps.\n\nTASK AGENT @Developer\nTASK DONE unknown\n', 'tasks');
    const taskBook = parseBook(task.content);
    assert.equal(taskBook.kind, 'task');
    assert.equal(taskBook.name, 'Export the CSV');
    assert.equal(taskBook.commitments[0].keyword, 'GOAL');
    assert.equal(taskBook.commitments[0].body, 'Keep columns.\nAI helps.');
    assert.ok(!/ENTITY/.test(task.content), 'the redundant ENTITY line is removed');
    const header = convertLegacyBook('TASK Old style\n\nDo it.\n\nTASK AGENT @Developer\n', 'tasks');
    assert.match(header.content, /^TASK Old style\nGOAL Do it\.\n/);
    assert.equal(convertLegacyBook(header.content, 'tasks').kind, 'unchanged', 'a second conversion is a no-op');
    const chat = convertLegacyBook('Old chat\nENTITY CHAT\nCHAT MEMBER @User\nCHAT MEMBER @Developer\nCHAT STATUS open\n\nCHAT MESSAGE @User 2026-10-17T10:00:00+02:00\nAPI keys?\n\\TASK AGENT @X\n\n', 'chats');
    assert.equal(parseBook(chat.content).kind, 'chat');
    assert.match(chat.content, /^\\API keys\?$/m, 'message text that now reads as a commitment is escaped');
    assert.equal(convertLegacyBook('Mystery\n\nNo kind anywhere.', undefined).kind, 'blocked', 'an unknown kind is never guessed');
    assert.equal(convertLegacyBook('CEO\nENTITY AGENT\nPERSONA Leads.', 'agents').kind, 'blocked', 'an all-uppercase name needs an explicit spelling decision');
    assert.equal(convertLegacyBook('Twisted\nENTITY TASK', 'agents').kind, 'blocked');
    assert.equal(convertLegacyBook('AGENT Fine\nPERSONA Already canonical.', 'agents').kind, 'unchanged');
});
