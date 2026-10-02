import assert from 'assert/strict';
import { createHash } from 'crypto';
import { execFile, spawn, type ChildProcess } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { createServer } from 'net';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { parse } from 'dotenv';

/** Shell-free fixture commands; no real model credentials or executables are used. */
const EXECUTE_FILE = promisify(execFile);
/** Production source root only supplies the package to pack, never the launched application's runtime files. */
const REPOSITORY_ROOT = resolve(__dirname, '../../../..');
/** Deterministic executable implementing the existing Codex JSON/message-book protocol. */
const FAKE_CODEX_SOURCE = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
if (process.argv.includes('--version')) { console.log('codex-cli 0.116.0'); process.exit(0); }
if (process.argv.includes('login')) { console.log('Logged in using ChatGPT'); process.exit(0); }
const prompt = fs.readFileSync(0, 'utf8');
const teamDiscovery = prompt.match(/Discover the same schemas with: node '([^']+)' list/);
if (teamDiscovery) require('child_process').execFileSync(process.execPath, [teamDiscovery[1], 'list'], { stdio: 'pipe' });
const projectArgument = process.argv.indexOf('-C');
const project = projectArgument < 0 ? process.cwd() : process.argv[projectArgument + 1];
const isChat = project.includes(path.join('.promptbook', 'agent', 'sessions'));
const agent = prompt.includes('Smoke Designer task') ? 'designer' : prompt.includes('Smoke Newcomer task') ? 'newcomer' : 'developer';
if (!isChat && agent === 'newcomer') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 6000);
if (isChat) {
    fs.appendFileSync(path.join(project, 'messages', 'queued', 'thread.book'), '\\nMESSAGE @Agent\\nDeterministic installed chat response.\\n');
} else {
    fs.writeFileSync(path.join(project, agent + '.txt'), 'Implemented ' + agent + '\\n');
}
fs.appendFileSync(process.env.PTBK_SMOKE_TRACE, JSON.stringify({ kind: isChat ? 'chat' : 'implementation', agent }) + '\\n');
console.log(JSON.stringify({ type: 'thread.started', thread_id: 'fixture' }));
console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Fixture completed.' } }));
console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 } }));
`;

/** Finds an unused loopback port without stopping any process. */
async function findPort(): Promise<number> {
    const server = createServer();
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const port = (server.address() as { port: number }).port;
    await new Promise<void>((done) => server.close(() => done()));
    return port;
}

/** Bounded condition polling keeps an idle fixture free of model calls. */
async function waitFor(condition: () => Promise<boolean>, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await condition()) return;
        await new Promise<void>((done) => setTimeout(done, 500));
    }
    throw new Error('Installed workspace fixture did not reach the expected state; inspect its owned server log.');
}

/** Packs and installs the actual CLI, starts both aliases, and verifies real web/chat/state plus autonomous jobs. */
async function main(): Promise<void> {
    const fixtureRoot = await mkdtemp(join(tmpdir(), 'ptbk-installed-workspace-'));
    const installationPath = process.env.PTBK_WORKSPACE_SMOKE_INSTALLATION ?? join(fixtureRoot, 'installation');
    const repositoryPath = join(fixtureRoot, 'repository');
    const projectPath = join(repositoryPath, 'project');
    const binaryPath = join(fixtureRoot, 'bin');
    let child: ChildProcess | undefined;
    let cookie = '';
    let origin = '';
    /** Stops only the fixture child and waits for SQLite/lease cleanup. */
    const stop = async (): Promise<void> => {
        if (!child || child.exitCode !== null || child.signalCode !== null) return;
        const owned = child;
        const exited = new Promise<void>((done) => owned.once('exit', () => done()));
        owned.kill('SIGTERM');
        const timeout = setTimeout(() => owned.kill('SIGINT'), 30_000);
        await exited;
        clearTimeout(timeout);
        assert.equal(owned.exitCode, 0, 'Graceful CLI stop must exit successfully.');
        child = undefined;
    };
    /** Uses the real authenticated app HTTP routes; failures never print credentials. */
    const request = async (path: string, method = 'GET', body?: unknown): Promise<Response> => {
        const response = await fetch(origin + path, {
            method,
            headers: { Cookie: cookie, 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        assert.ok(
            response.ok,
            `${method} ${path} returned ${response.status}: ${response.ok ? '' : await response.text()}`,
        );
        return response;
    };
    try {
        console.info(`Installed fixture: ${fixtureRoot}`);
        await mkdir(installationPath, { recursive: true });
        const { stdout } = await EXECUTE_FILE('npm', ['pack', '--json', '--pack-destination', fixtureRoot], {
            cwd: join(REPOSITORY_ROOT, 'packages/cli'),
            maxBuffer: 16 * 1024 * 1024,
        });
        const packed = JSON.parse(stdout)[0] as { filename: string; files: Array<{ path: string }> };
        const files = packed.files.map((file) => file.path);
        assert.ok(files.includes('apps/agents-server/src/app/workspace/page.tsx'));
        assert.ok(files.includes('scripts/run-codex-prompts/main/runPromptRound.ts'));
        assert.ok(files.includes('book/scripts/import-markdown/increaseHeadings.ts'));
        assert.ok(
            !files.some((path) =>
                /(?:\.sqlite(?:-wal|-shm|-journal)?$|(?:^|\/)\.env|\.promptbook\/(?:secrets|logs)|workspace\/testing\/)/u.test(
                    path,
                ),
            ),
        );
        console.info('Packed runtime assets and private-state exclusions verified. Installing package dependencies.');
        await EXECUTE_FILE(
            'npm',
            ['install', join(fixtureRoot, packed.filename), '--legacy-peer-deps', '--no-audit', '--no-fund'],
            {
                cwd: installationPath,
                maxBuffer: 16 * 1024 * 1024,
                timeout: 600_000,
            },
        );
        await mkdir(join(projectPath, 'agents'), { recursive: true });
        await mkdir(join(projectPath, 'prompts/templates'), { recursive: true });
        await mkdir(join(projectPath, '.promptbook'), { recursive: true });
        await mkdir(binaryPath);
        await writeFile(join(binaryPath, 'codex'), FAKE_CODEX_SOURCE, { mode: 0o755 });
        for (const name of ['copilot', 'cline', 'claude', 'opencode', 'gemini', 'qwen'])
            await writeFile(join(binaryPath, name), '#!/usr/bin/env node\nprocess.exit(1);\n', { mode: 0o755 });
        await writeFile(join(projectPath, 'agents/developer.book'), 'Developer\nFROM VOID\nGOAL Implement.\n');
        await writeFile(join(projectPath, 'agents/designer.book'), 'Designer\nFROM VOID\nGOAL Design.\n');
        await writeFile(
            join(projectPath, '.promptbook/config.json'),
            JSON.stringify({ coder: { harness: 'openai-codex' } }),
        );
        await writeFile(join(projectPath, 'prompts/design.md'), '[ ] `Designer` !!\n\nSmoke Designer task.\n');
        await writeFile(join(projectPath, 'prompts/develop.md'), '[ ] `Developer` !\n\nSmoke Developer task.\n');
        await writeFile(join(projectPath, 'prompts/README.md'), 'Documentation, never execute.\n');
        await writeFile(join(projectPath, 'prompts/not-ready.md'), '[-]\nNot ready.\n');
        await writeFile(join(projectPath, 'prompts/templates/draft.md'), '[ ]\nTemplate, never execute.\n');
        await EXECUTE_FILE('git', ['init', '-b', 'main'], { cwd: repositoryPath });
        await EXECUTE_FILE('git', ['config', 'user.name', 'Workspace fixture'], { cwd: repositoryPath });
        await EXECUTE_FILE('git', ['config', 'user.email', 'fixture@example.com'], { cwd: repositoryPath });
        await EXECUTE_FILE('git', ['config', 'commit.gpgSign', 'false'], { cwd: repositoryPath });
        await EXECUTE_FILE('git', ['add', '--', 'project'], { cwd: repositoryPath });
        await EXECUTE_FILE('git', ['commit', '-m', 'Fixture project'], { cwd: repositoryPath });
        await writeFile(join(repositoryPath, 'unrelated.txt'), 'Unrelated staged work');
        await EXECUTE_FILE('git', ['add', '--', 'unrelated.txt'], { cwd: repositoryPath });
        const tracePath = join(fixtureRoot, 'harness-calls.jsonl');
        const cliPath = join(installationPath, 'node_modules/@promptbook/cli/bin/promptbook-cli.js');
        /** Starts an installed spelling with no mandatory agent, priority or harness argument. */
        const start = async (alias: boolean): Promise<void> => {
            const port = await findPort();
            origin = `http://127.0.0.1:${port}`;
            const environment = {
                ...process.env,
                PATH: binaryPath + ':' + process.env.PATH,
                PTBK_SERVER_PORT: String(port),
                PTBK_AGENTS_SERVER_SQLITE_PATH: '',
                PTBK_SMOKE_TRACE: tracePath,
                PTBK_HARNESS: '',
                PTBK_MODEL: '',
                PTBK_THINKING_LEVEL: '',
                ADMIN_PASSWORD: '',
                SESSION_SECRET: '',
                OPENAI_API_KEY: '',
                PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
                PTBK_AGENTS_SERVER_BUILD_WORKER_COUNT: '2',
            };
            for (const key of ['PTBK_HARNESS', 'PTBK_MODEL', 'PTBK_THINKING_LEVEL'])
                delete environment[key as keyof typeof environment];
            const log = createWriteStream(join(fixtureRoot, alias ? 'alias.log' : 'canonical.log'));
            child = spawn(
                process.execPath,
                [
                    cliPath,
                    ...(alias ? ['coder'] : []),
                    'server',
                    '--no-ui',
                    '--no-questions',
                    '--wait-after-error',
                    '0s',
                ],
                {
                    cwd: projectPath,
                    env: environment,
                    stdio: ['ignore', 'pipe', 'pipe'],
                },
            );
            child.stdout!.pipe(log, { end: false });
            child.stderr!.pipe(log, { end: false });
            child.once('exit', () => log.end());
            await waitFor(async () => {
                assert.equal(child!.exitCode, null, 'Installed CLI exited during startup.');
                return fetch(origin + '/api/workspace')
                    .then((response) => response.status === 403)
                    .catch(() => false);
            }, 600_000);
            console.info(`${alias ? 'Alias' : 'Canonical'} full Agent Server started at ${origin}.`);
        };
        await start(false);
        const secrets = parse(await readFile(join(projectPath, '.promptbook/secrets/agents-server.env'), 'utf-8'));
        const login = await request('/api/auth/login', 'POST', { username: 'admin', password: secrets.ADMIN_PASSWORD });
        cookie = login.headers
            .getSetCookie()
            .map((value) => value.split(';')[0])
            .join('; ');
        assert.ok(cookie);
        await waitFor(async () => {
            const state = await (await request('/api/workspace')).json();
            return state.jobs.filter((job: { status: string }) => job.status === 'completed').length === 2;
        }, 60_000);
        const firstState = await (await request('/api/workspace')).json();
        assert.deepEqual(firstState.jobs.map((job: { priority: number }) => job.priority).sort(), [1, 2]);
        const designer = firstState.agents.find((agent: { name: string }) => agent.name === 'designer');
        assert.ok(designer);
        await request('/api/users', 'POST', {
            username: 'fixture-user',
            password: 'Fixture-secret-only-123456',
            isAdmin: true,
        });
        await request('/api/metadata', 'POST', { key: 'WORKSPACE_SMOKE', value: 'persisted', note: 'Fixture only' });
        const createdChat = await (await request(`/agents/${designer.id}/api/user-chats`, 'POST', {})).json();
        const chatId = createdChat.chat.id;
        await request(`/agents/${designer.id}/api/user-chats/${chatId}/messages`, 'POST', {
            clientMessageId: 'fixture-message',
            message: 'Hello Designer',
        });
        await waitFor(async () => {
            const detail = await (await request(`/agents/${designer.id}/api/user-chats/${chatId}`)).json();
            return detail.messages.some((message: { content: string }) =>
                message.content.includes('Deterministic installed chat response'),
            );
        }, 60_000);
        assert.equal((await request('/workspace')).status, 200);
        const originalSource = await readFile(join(projectPath, 'agents/designer.book'), 'utf-8');
        const editedSource = originalSource + '\nMETA DESCRIPTION Edited through the installed Agent Server.\n';
        const saved = await fetch(origin + `/agents/${designer.id}/api/book`, {
            method: 'PUT',
            headers: {
                Cookie: cookie,
                'Content-Type': 'text/plain',
                'x-promptbook-source-revision': createHash('sha256').update(originalSource).digest('hex'),
            },
            body: editedSource,
        });
        assert.ok(saved.ok, `Installed Book save failed: ${saved.status} ${await saved.text()}`);
        assert.ok((await readFile(join(projectPath, 'agents/designer.book'), 'utf-8')).includes('Edited through'));
        const committedPaths = (
            await EXECUTE_FILE('git', ['show', '--format=', '--name-only', 'HEAD'], { cwd: repositoryPath })
        ).stdout
            .trim()
            .split('\n');
        assert.deepEqual(committedPaths.sort(), ['project/agents/.promptbook.json', 'project/agents/designer.book']);
        await stop();
        await start(true);
        const secondState = await (await request('/api/workspace')).json();
        assert.equal(secondState.agents.find((agent: { name: string }) => agent.name === 'designer').id, designer.id);
        assert.equal(secondState.jobs.filter((job: { status: string }) => job.status === 'completed').length, 2);
        assert.ok(
            (await (await request('/api/users')).json()).some(
                (user: { username: string }) => user.username === 'fixture-user',
            ),
        );
        assert.ok(
            (await (await request('/api/metadata')).json()).some(
                (value: { key: string; value: string }) =>
                    value.key === 'WORKSPACE_SMOKE' && value.value === 'persisted',
            ),
        );
        assert.ok(
            (await (await request(`/agents/${designer.id}/api/user-chats/${chatId}`)).json()).messages.some(
                (message: { content: string }) => message.content.includes('Hello Designer'),
            ),
        );
        await writeFile(join(projectPath, 'agents/newcomer.book'), 'Newcomer\nFROM VOID\nGOAL Work.\n');
        await writeFile(join(projectPath, 'prompts/newcomer.md'), '[ ] `Newcomer`\n\nSmoke Newcomer task.\n');
        await waitFor(
            async () =>
                (
                    await (await request('/api/workspace')).json()
                ).jobs.some(
                    (job: { path: string; status: string }) =>
                        job.path === 'prompts/newcomer.md' && job.status === 'running',
                ),
            30_000,
        );
        await request(`/agents/${designer.id}/api/user-chats/${chatId}/messages`, 'POST', {
            clientMessageId: 'fixture-concurrent-message',
            message: 'Chat while Newcomer implements.',
        });
        await waitFor(async () => {
            const detail = await (await request(`/agents/${designer.id}/api/user-chats/${chatId}`)).json();
            return (
                detail.messages.filter((message: { content: string }) =>
                    message.content.includes('Deterministic installed chat response'),
                ).length === 2
            );
        }, 30_000);
        assert.ok(
            (await (await request('/api/workspace')).json()).jobs.some(
                (job: { path: string; status: string }) =>
                    job.path === 'prompts/newcomer.md' && job.status === 'running',
            ),
            'Independent chat must complete while the implementation job is running.',
        );
        await waitFor(
            async () =>
                (
                    await (await request('/api/workspace')).json()
                ).jobs.some(
                    (job: { path: string; status: string }) =>
                        job.path === 'prompts/newcomer.md' && job.status === 'completed',
                ),
            60_000,
        );
        await stop();
        const calls = (await readFile(tracePath, 'utf-8'))
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));
        assert.equal(calls.filter((call) => call.kind === 'implementation').length, 3);
        assert.ok(calls.some((call) => call.kind === 'chat'));
        assert.equal(
            (await EXECUTE_FILE('git', ['diff', '--cached', '--name-only'], { cwd: repositoryPath })).stdout.trim(),
            'unrelated.txt',
        );
        const log = await readFile(join(fixtureRoot, 'canonical.log'), 'utf-8');
        assert.ok(
            !log.includes('\u001b[2J') && !log.includes('\u001b[?25l'),
            'Plain output must not redraw the terminal.',
        );
        console.info(
            'PASS: installed runtime, both aliases, real authenticated chat, SQLite persistence, scoped Git and idle discovery; three implementation calls, no paid models.',
        );
    } finally {
        await stop();
        // Keep diagnostics unless explicitly requested; the fixture is outside the user's project.
        if (process.env.PTBK_WORKSPACE_SMOKE_REMOVE === 'true') await rm(fixtureRoot, { recursive: true, force: true });
    }
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// Note: [⚫] Installed-package verification script is never published.
