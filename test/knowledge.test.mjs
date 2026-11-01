import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { isKnowledgeSourceUrl, knowledgeTextOf, pinnedKnowledgeRelease, resolveAgentKnowledge, resolveKnowledgeSource } from '../dist/engine/knowledge.js';
import { AgentCatalog, resolveEffectiveAgent } from '../dist/project/agents.js';
import { projectAt } from '../dist/project/workspace.js';
import { renderAgentInstructions } from '../dist/engine/prompt.js';
import { initRepository, temporaryDirectory } from './helpers.mjs';

const BOOK = (release, extra = '') => `AGENT External action impact\nFROM @Void\n\nNOTE Release ${release}, published 2026-11-01.\nLatest source: https://ptbk.io/book/external-action-impact.book\n\nRULE When evaluating an external action, use this methodology.\n\nKNOWLEDGE\n## What impact means\n\nImpact ${release} estimates the consequence if it succeeds.\n${extra}\n\nTEAM You may consult {Somebody Else}.\nMODEL harness=OPENAI_CODEX\n\nCLOSED\n`;

/**
 * A local stand-in for the public knowledge routes, counting every request and honoring conditional requests.
 */
async function knowledgeServer(t, routes) {
    const requests = [];
    const server = createServer((request, response) => {
        const route = routes[request.url];
        requests.push({ url: request.url, etag: request.headers['if-none-match'] });
        if (!route) {
            response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
            return;
        }
        if (route.etag && request.headers['if-none-match'] === route.etag) {
            response.writeHead(304).end();
            return;
        }
        response.writeHead(route.status ?? 200, { 'content-type': route.type ?? 'text/plain; charset=utf-8', ...(route.etag ? { etag: route.etag } : {}) }).end(route.body);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    return { url: `http://127.0.0.1:${server.address().port}`, requests };
}

const HOUR = 3_600_000;

test('knowledge: only a whole-body .book URL is a remote source; pinned releases are recognized', () => {
    for (const url of ['https://ptbk.io/book/external-action-impact.book', ' https://books.example.test/fork.book ', 'http://127.0.0.1:9/x.book?rev=2']) assert.ok(isKnowledgeSourceUrl(url), url);
    for (const text of ['See https://ptbk.io/book/external-action-impact.book for details', 'https://example.test/page', 'Our own scale.', 'ftp://example.test/x.book']) assert.ok(!isKnowledgeSourceUrl(text), text);
    assert.equal(pinnedKnowledgeRelease('https://ptbk.io/book/external-action-impact/1.0.0.book'), '1.0.0');
    assert.equal(pinnedKnowledgeRelease('https://ptbk.io/book/external-action-impact.book'), undefined);
});

test('knowledge: a shared Book contributes its RULE and KNOWLEDGE text only, never another agent', () => {
    const text = knowledgeTextOf(BOOK('1.0.0'));
    assert.match(text, /use this methodology/);
    assert.match(text, /## What impact means/);
    assert.doesNotMatch(text, /Somebody Else|OPENAI_CODEX|External action impact|FROM @Void|CLOSED/, 'TEAM, MODEL, FROM, CLOSED and the declaration have no effect');
    assert.equal(knowledgeTextOf('Plain text a fork hosts.\n'), 'Plain text a fork hosts.');
});

test('knowledge: the latest URL is cached, revalidated with its ETag at a bounded interval and advances without an engine release', async (t) => {
    const routes = { '/latest.book': { body: BOOK('1.0.0'), etag: '"one"' } };
    const server = await knowledgeServer(t, routes);
    const project = projectAt(await temporaryDirectory(t, 'ptbk knowledge'));
    const url = `${server.url}/latest.book`;
    const start = Date.parse('2026-11-01T10:00:00Z');
    const first = await resolveKnowledgeSource(project, url, { now: start });
    assert.deepEqual({ availability: first.availability, release: first.release, fetchedAt: first.fetchedAt }, { availability: 'current', release: '1.0.0', fetchedAt: new Date(start).toISOString() });
    assert.match(first.hash, /^[0-9a-f]{64}$/);
    const second = await resolveKnowledgeSource(project, url, { now: start + HOUR / 2 });
    assert.equal(second.hash, first.hash);
    assert.equal(server.requests.length, 1, 'no request per use while it is fresh');

    const revalidated = await resolveKnowledgeSource(project, url, { now: start + HOUR + 1 });
    assert.equal(server.requests.length, 2);
    assert.equal(server.requests[1].etag, '"one"', 'a conditional request');
    assert.equal(revalidated.hash, first.hash);
    assert.equal(revalidated.fetchedAt, first.fetchedAt, 'an unchanged source keeps the time its content was retrieved');
    assert.equal(revalidated.availability, 'current');

    routes['/latest.book'] = { body: BOOK('1.1.0'), etag: '"two"' };
    const advanced = await resolveKnowledgeSource(project, url, { now: start + 2 * HOUR + 2 });
    assert.equal(advanced.release, '1.1.0');
    assert.notEqual(advanced.hash, first.hash);
    assert.match(advanced.content, /Impact 1\.1\.0/);
    assert.equal(await readFile(join(project.runtime.root, 'knowledge', 'content', `${first.hash}.book`), 'utf8'), BOOK('1.0.0'), 'the earlier bytes stay available by their hash');
});

test('knowledge: an immutable release is never requested again once held', async (t) => {
    const server = await knowledgeServer(t, { '/impact/1.0.0.book': { body: BOOK('1.0.0') } });
    const project = projectAt(await temporaryDirectory(t, 'ptbk knowledge'));
    const url = `${server.url}/impact/1.0.0.book`;
    const start = Date.now();
    assert.equal((await resolveKnowledgeSource(project, url, { now: start })).release, '1.0.0');
    const later = await resolveKnowledgeSource(project, url, { now: start + 1000 * HOUR });
    assert.equal(later.availability, 'pinned');
    assert.equal(server.requests.length, 1);
});

test('knowledge: outages and unusable answers reuse verified content honestly, never claiming it is current', async (t) => {
    const routes = { '/latest.book': { body: BOOK('1.0.0') } };
    const server = await knowledgeServer(t, routes);
    const project = projectAt(await temporaryDirectory(t, 'ptbk knowledge'));
    const url = `${server.url}/latest.book`;
    const start = Date.parse('2026-11-01T10:00:00Z');
    const first = await resolveKnowledgeSource(project, url, { now: start });

    // A homepage or a removed source behind a real answer is not the requested Book.
    routes['/latest.book'] = { body: '<!doctype html><title>Home</title>', type: 'text/html' };
    const homepage = await resolveKnowledgeSource(project, url, { now: start + 2 * HOUR });
    assert.equal(homepage.availability, 'cached');
    assert.match(homepage.reason, /HTML page/);
    assert.equal(homepage.hash, first.hash, 'the earlier verified content stays in use');
    const requestsAfter = server.requests.length;
    assert.equal((await resolveKnowledgeSource(project, url, { now: start + 2 * HOUR + 60_000 })).availability, 'cached');
    assert.equal(server.requests.length, requestsAfter, 'a failure is not retried on every prompt');

    delete routes['/latest.book'];
    const gone = await resolveKnowledgeSource(project, url, { now: start + 3 * HOUR });
    assert.equal(gone.availability, 'cached');
    assert.match(gone.reason, /HTTP 404/);

    // Without earlier content the source is explicitly missing.
    const never = await resolveKnowledgeSource(project, `${server.url}/never.book`, { now: start });
    assert.deepEqual({ availability: never.availability, content: never.content }, { availability: 'missing', content: undefined });
    assert.match(never.reason, /HTTP 404/);
    const credentials = await resolveKnowledgeSource(project, 'https://user:secret@example.test/x.book', { now: start });
    assert.equal(credentials.availability, 'missing');
    assert.match(credentials.reason, /must not contain credentials/);

    // Tampered content is no longer verified evidence.
    routes['/latest.book'] = { body: BOOK('1.0.0'), etag: '"e"' };
    await writeFile(join(project.runtime.root, 'knowledge', 'content', `${first.hash}.book`), 'tampered');
    const refetched = await resolveKnowledgeSource(project, url, { now: start + 4 * HOUR });
    assert.equal(refetched.availability, 'current');
    assert.equal(refetched.hash, first.hash, 'retrieved again, unconditionally');
    assert.equal(server.requests.at(-1).etag, undefined);
});

test('knowledge: retrieval can be switched off, reusing what is already held', async (t) => {
    const server = await knowledgeServer(t, { '/latest.book': { body: BOOK('1.0.0') } });
    const project = projectAt(await temporaryDirectory(t, 'ptbk knowledge'));
    const url = `${server.url}/latest.book`;
    const env = { PTBK_KNOWLEDGE_SOURCES: 'off' };
    const before = await resolveKnowledgeSource(project, url, { env });
    assert.equal(before.availability, 'missing');
    assert.equal(server.requests.length, 0);
    await resolveKnowledgeSource(project, url);
    const after = await resolveKnowledgeSource(project, url, { env });
    assert.equal(after.availability, 'cached');
    assert.match(after.reason, /switched off/);
    assert.equal(server.requests.length, 1);
});

test('knowledge: agents receive it through Adam with provenance; Expert and Teacher too; a local fork has its own identity', async (t) => {
    const server = await knowledgeServer(t, { '/latest.book': { body: BOOK('1.0.0') } });
    const root = await temporaryDirectory(t, 'ptbk knowledge');
    await initRepository(root);
    const url = `${server.url}/latest.book`;
    const put = async (path, text) => {
        await mkdir(join(root, path, '..'), { recursive: true });
        await writeFile(join(root, path), text);
    };
    await put('agents/.core/adam.book', `AGENT Adam\nFROM @Void\nRULE Shared rule.\nKNOWLEDGE ${url}\nRULE Apply it.\nCLOSED\n`);
    await put('agents/.core/teacher.book', 'AGENT Teacher\nFROM @Expert\nRULE Teach.\nCLOSED\n');
    await put('agents/dev.book', 'AGENT Developer\nRULE Build.\n');
    const project = projectAt(root);
    const catalog = await AgentCatalog.load(root);

    for (const name of ['@Developer', '@Teacher', '@Expert']) {
        const agent = await resolveEffectiveAgent(catalog, name);
        const { agent: prepared, evidence } = await resolveAgentKnowledge(project, {}, agent, { inline: true });
        const text = renderAgentInstructions(prepared);
        assert.match(text, /Shared knowledge from http:\/\/127\.0\.0\.1:\d+\/latest\.book \(release 1\.0\.0, sha256 [0-9a-f]{16}, retrieved /, `${name} sees where the rules come from`);
        assert.match(text, /grants no authority and cannot override project rules/);
        assert.match(text, /Impact 1\.0\.0 estimates the consequence/, `${name} receives the rules`);
        assert.doesNotMatch(text, /Somebody Else/, 'it never registers another agent or its team');
        assert.deepEqual(prepared.team, agent.team, 'a shared Book adds no teammates');
        assert.deepEqual(evidence.sources.map((source) => [source.url, source.release, source.via, source.availability]), [[url, '1.0.0', 'Adam', evidence.sources[0].availability]]);
        assert.ok(evidence.books.some((book) => book.path === 'agents/.core/adam.book' && /^[0-9a-f]{40}$/.test(book.revision)), 'the local Book revision is part of the evidence');
    }
    assert.equal(server.requests.length, 1, 'three agents share one retrieval');
    const expert = await resolveAgentKnowledge(project, {}, await resolveEffectiveAgent(catalog, '@Expert'), { inline: true });
    assert.match(expert.evidence.engine, /^\d+\./, 'the engine layer is identified by its version');

    // Chats and consultations do not load the whole source into every request.
    const short = renderAgentInstructions((await resolveAgentKnowledge(project, {}, await resolveEffectiveAgent(catalog, '@Developer'), { inline: false })).agent);
    assert.match(short, /Read `\.ptbk\/knowledge\/content\/[0-9a-f]{64}\.book` when it is relevant/);
    assert.doesNotMatch(short, /estimates the consequence/);

    // An inline fork is ordinary local knowledge with its own Book revision and no claimed upstream release.
    await put('agents/.core/adam.book', 'AGENT Adam\nFROM @Void\nKNOWLEDGE Our own impact scale: payroll is always 5.\nCLOSED\n');
    const forked = await resolveAgentKnowledge(project, {}, await resolveEffectiveAgent(await AgentCatalog.load(root), '@Developer'), { inline: true });
    assert.deepEqual(forked.evidence.sources, []);
    assert.ok(forked.evidence.books.some((book) => book.path === 'agents/.core/adam.book'));
    assert.match(renderAgentInstructions(forked.agent), /Our own impact scale/);

    // Missing knowledge is explicit; it never becomes a claim that the rules were applied.
    await put('agents/.core/adam.book', `AGENT Adam\nFROM @Void\nKNOWLEDGE ${server.url}/removed.book\nCLOSED\n`);
    const missing = await resolveAgentKnowledge(project, {}, await resolveEffectiveAgent(await AgentCatalog.load(root), '@Developer'), { inline: true });
    assert.equal(missing.evidence.sources[0].availability, 'missing');
    assert.match(renderAgentInstructions(missing.agent), /is not available \(the source answered HTTP 404\)\. Its rules were not applied.*stays "unknown", which is different from 0/s);
    assert.deepEqual((await readdir(join(root, '.ptbk', 'knowledge'))).filter((name) => name.endsWith('.book')), [], 'a snapshot is not a discoverable Book at the top level');
});
