#!/usr/bin/env node
/*
 * Deterministic substitute of the OpenAI Codex CLI for ptbk fixtures (no account, no inference).
 *
 * It answers metadata probes like the real CLI and, for `codex exec --json`, emits the real JSONL event format.
 * Behavior is driven by markers in the task text:
 *   ASK_USER        → asks the user in a chat through the ptbk MCP bridge, then waits for the answer
 *   FAIL_CHECK_ONCE → first attempt writes a file that fails the fixture check
 *   BLOCKED         → reports blocked
 *   NEEDS_FIXER     → reports blocked unless the acting agent is Fixer (which then completes the work)
 *   NO_REPORT       → omits the completion line
 *   CREATE_FOLLOW_UP → also writes two follow-up task Books; on the first attempt the second copies this task's
 *                      name (Promptbook must reject it), on a repair attempt it gets its own dated name
 *   SLOW_WORK       → works for $FAKE_CODEX_SLOW_MS (default 6 s) before finishing (lifecycle draining)
 *   QUOTA_NATIVE    → a native (ChatGPT) run fails with a usage limit; an API-key run (CODEX_API_KEY) succeeds
 *   QUOTA_RESET     → a native run fails with a usage limit that states its reset ("try again in 2 days 3 hours")
 *   LIST_BROWSERS   → after the work (and any SLOW_WORK wait) lists the browser tools through the bridge into
 *                     output/browsers.txt (a tool added meanwhile must be visible to this same task)
 *   CLAIM_SHARED    → claims output/shared.txt through the `claim_files` tool, appends the task name to it and then
 *                     keeps working for $FAKE_CODEX_SLOW_MS (concurrent same-file work waits for the claim)
 *   WALLET_LOGIN    → opens $FAKE_LOGIN_URL in the project browser and calls `wallet_login`: a waiting Wallet request
 *                     ends the turn waiting-for-user, a sign-in writes the page heading to output/wallet.txt
 *   EXTERNAL_ACTIONS → attempt 1 records a confirmed email, an uncertain (lost acknowledgement) post and an intent
 *                     without an outcome through the action tools, then writes BROKEN output (the check fails); a
 *                     repair attempt reconciles the post from the prompt's action records by its id, without resending
 * Project brief turns (`# Project brief`) reply with one fixture paragraph counting the digest's completed results; the
 * first $FAKE_CODEX_FAIL_BRIEFS of them (per $FAKE_CODEX_LOG) fail like a provider outage instead.
 * Router turns (`## Assignment work`, tasks and chat routing) choose the first listed agent's example combination
 * (ROUTE_IMPOSSIBLE in the target reports no compatible combination). Chat turns (`# Conversation`) reply read-only; a user message containing CREATE_TASK makes the agent create a task
 * through the `create_task` tool, one containing CONSULT_TEAM consults @Developer through the `consult` tool and one
 * containing CORRECTION adds a `PTBK_LEARN` note and one containing SLOW_REPLY reports a command and a reasoning summary,
 * then works for $FAKE_CODEX_SLOW_MS before its reply. The first turn answering FAIL_REPLY_ONCE (per $FAKE_CODEX_LOG)
 * reports a reasoning summary and then fails like a provider outage. Consultation turns (`# Consultation`) answer
 * read-only.
 * Every executed turn is appended to $FAKE_CODEX_LOG (one JSON line) when set.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const print = (value) => process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);

if (args[0] === '--version') {
    print('codex-cli 9.9.9');
    process.exit(0);
}
// Native sign-in: with $FAKE_CODEX_AUTH_FILE, the login state is that file's existence; a separate $CODEX_HOME (a
// native account context) keeps its own file of that name, signed in independently. `login --device-auth` follows
// $FAKE_CODEX_LOGIN_RESULT (success, expired, disabled or denied) and records its BROWSER/API-key environment and
// account home in $FAKE_CODEX_LOGIN_LOG; $FAKE_CODEX_NO_DEVICE_AUTH hides the flag like an older Codex.
const authFile = process.env.FAKE_CODEX_AUTH_FILE && process.env.CODEX_HOME ? join(process.env.CODEX_HOME, basename(process.env.FAKE_CODEX_AUTH_FILE)) : process.env.FAKE_CODEX_AUTH_FILE;
if (args[0] === 'login' && args.includes('--help')) {
    print(`Manage login\n\nUsage: codex login [OPTIONS] [COMMAND]\n\nOptions:\n      --with-api-key\n${process.env.FAKE_CODEX_NO_DEVICE_AUTH ? '' : '      --device-auth\n'}  -h, --help`);
    process.exit(0);
}
if (args[0] === 'login' && args[1] !== 'status') {
    if (process.env.FAKE_CODEX_LOGIN_LOG) appendFileSync(process.env.FAKE_CODEX_LOGIN_LOG, `${JSON.stringify({ args, browser: process.env.BROWSER ?? null, apiKey: Boolean(process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY), home: process.env.CODEX_HOME ?? null })}\n`);
    print('Follow these steps to sign in with ChatGPT using device code authorization:\n\n1. Open this link in your browser and sign in to your account\n   https://auth.example.test/codex/device\n\n2. Enter this one-time code (expires in 15 minutes)\n   FAKE-C0DE');
    const result = process.env.FAKE_CODEX_LOGIN_RESULT ?? 'success';
    if (result === 'success') {
        if (authFile) {
            if (process.env.CODEX_HOME) mkdirSync(process.env.CODEX_HOME, { recursive: true });
            writeFileSync(authFile, 'signed in\n');
        }
        print('Successfully logged in');
        process.exit(0);
    }
    process.stderr.write(`Error logging in with device code: ${{ expired: 'device auth timed out after 15 minutes', disabled: 'device code login is not enabled for this Codex server. Use the browser login or verify the server URL.', denied: 'device authorization was denied' }[result] ?? result}\n`);
    process.exit(1);
}
if (args[0] === 'login' && args[1] === 'status') {
    if (process.env.FAKE_CODEX_SIGNED_OUT || (authFile && !existsSync(authFile))) {
        process.stderr.write('Not logged in\n');
        process.exit(1);
    }
    process.stderr.write('Logged in using ChatGPT\n');
    process.exit(0);
}
if (args[0] === 'exec' && args.includes('--help')) {
    print('Usage: codex exec [OPTIONS] [PROMPT]\n  --json\n  --sandbox <MODE>\n  --add-dir <DIR>\n  --skip-git-repo-check');
    process.exit(0);
}
if (args[0] === 'app-server') {
    process.stdin.setEncoding('utf8');
    let buffer = '';
    process.stdin.on('data', (chunk) => {
        buffer += chunk;
        for (;;) {
            const index = buffer.indexOf('\n');
            if (index < 0) break;
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            const message = JSON.parse(line);
            if (message.id === 1) print({ id: 1, result: {} });
            if (message.id === 2) print({ id: 2, result: { data: [{ model: 'fake-model-1' }, { model: 'fake-model-2' }] } });
        }
    });
    process.stdin.on('end', () => process.exit(0));
} else if (args[0] === 'exec') {
    main().catch((error) => {
        process.stderr.write(`${error.stack ?? error}\n`);
        process.exit(1);
    });
} else {
    process.stderr.write(`fake codex: unsupported arguments ${args.join(' ')}\n`);
    process.exit(2);
}

/** Parses `-c key=value` overrides (TOML values). */
function configOverrides() {
    const result = {};
    for (let index = 0; index < args.length; index++) {
        if (args[index] !== '-c') continue;
        const [key, ...rest] = args[index + 1].split('=');
        result[key] = rest.join('=');
    }
    return result;
}

/** Minimal TOML value parser for strings, arrays of strings and inline tables of strings. */
function tomlValue(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('[')) return JSON.parse(trimmed);
    if (trimmed.startsWith('{')) {
        const body = trimmed.slice(1, -1).trim();
        const result = {};
        for (const match of body.matchAll(/([A-Za-z0-9_]+)\s*=\s*("(?:[^"\\]|\\.)*")/g)) result[match[1]] = JSON.parse(match[2]);
        return result;
    }
    if (trimmed.startsWith('"')) return JSON.parse(trimmed);
    return trimmed;
}

/** Calls a tool of the ptbk MCP server configured for this turn. */
async function callTool(name, toolArguments) {
    const overrides = configOverrides();
    const command = tomlValue(overrides['mcp_servers.ptbk.command']);
    const commandArgs = tomlValue(overrides['mcp_servers.ptbk.args']);
    const env = tomlValue(overrides['mcp_servers.ptbk.env']);
    const child = spawn(command, commandArgs, { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'inherit'] });
    let buffer = '';
    const pending = new Map();
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
        buffer += chunk;
        for (;;) {
            const index = buffer.indexOf('\n');
            if (index < 0) break;
            const message = JSON.parse(buffer.slice(0, index));
            buffer = buffer.slice(index + 1);
            pending.get(message.id)?.(message);
        }
    });
    const request = (id, method, params) =>
        new Promise((resolve) => {
            pending.set(id, resolve);
            child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
        });
    await request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fake-codex', version: '1' } });
    const list = await request(2, 'tools/list', {});
    const names = list.result.tools.map((tool) => tool.name);
    if (!names.includes(name)) throw new Error(`Tool ${name} missing (have ${names.join(', ')})`);
    const response = await request(3, 'tools/call', { name, arguments: toolArguments });
    child.stdin.end();
    return response.result.content[0].text;
}

async function main() {
    const prompt = readFileSync(0, 'utf8');
    const reference = /- Reference: (\{[^{}]+\}|\S+)/.exec(prompt)?.[1]?.trim() ?? 'unknown';
    const stamp = /TASK <readable title> — ([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9:]{8})/.exec(prompt)?.[1] ?? '2026-01-01 00:00:00';
    const title = /- Name: (.+)/.exec(prompt)?.[1]?.trim() ?? 'unknown';
    const agent = /You are \*\*([^*]+)\*\*/.exec(prompt)?.[1] ?? 'unknown';
    const chat = prompt.startsWith('# Conversation');
    const attempt = /## Feedback from attempt (\d+)/.exec(prompt) ? Number(/## Feedback from attempt (\d+)/.exec(prompt)[1]) + 1 : 1;
    // ptbk removes API keys from a native run's environment, so a present key means an explicit API_KEY instance.
    const api = Boolean(process.env.CODEX_API_KEY);
    const brief = prompt.startsWith('# Project brief');
    if (process.env.FAKE_CODEX_LOG) appendFileSync(process.env.FAKE_CODEX_LOG, `${JSON.stringify({ reference, title, agent, attempt, assignment: prompt.includes('## Assignment work'), learning: prompt.includes('## Learning work'), discovery: prompt.includes('## Goal enquiry'), chat, brief, api, apiKey: api ? process.env.CODEX_API_KEY : undefined })}\n`);
    print({ type: 'thread.started', thread_id: `fake-${Date.now()}` });
    print({ type: 'turn.started' });
    // Routing work only names the target: its markers apply to the target's own execution.
    // Quota markers apply to the task's own turns, not to other prompts that merely list its title (e.g. a brief).
    const taskTurn = !prompt.includes('## Assignment work') && !brief && !chat && !prompt.startsWith('# Consultation');
    if (prompt.includes('QUOTA_RESET') && !api && taskTurn) {
        print({ type: 'turn.failed', error: { message: "You've hit your usage limit. Upgrade to Pro, or try again in 2 days 3 hours." } });
        process.exit(1);
    }
    if (prompt.includes('QUOTA_NATIVE') && !api && taskTurn) {
        print({ type: 'turn.failed', error: { message: "You've hit your usage limit. Try again later." } });
        process.exit(1);
    }
    const message = (text) => print({ type: 'item.completed', item: { id: 'item_1', type: 'agent_message', text } });
    const done = (summary, extra = {}) => message(`${summary}\n\nPTBK_RESULT ${JSON.stringify({ status: 'done', summary, evidence: 'fixture', ...extra })}`);
    if (prompt.startsWith('# Consultation')) {
        message('Fixture advice: keep it simple.');
    } else if (brief) {
        const outages = process.env.FAKE_CODEX_LOG ? `${process.env.FAKE_CODEX_LOG}.brief-outages` : undefined;
        const failed = outages && existsSync(outages) ? readFileSync(outages, 'utf8').split('\n').filter(Boolean).length : 0;
        if (outages && failed < Number(process.env.FAKE_CODEX_FAIL_BRIEFS ?? 0)) {
            appendFileSync(outages, 'outage\n');
            print({ type: 'turn.failed', error: { message: 'Fixture outage: the provider is unavailable.' } });
            process.exit(1);
        }
        // A brief is one paragraph from the engine's digest (the number of recent results proves it read the situation).
        const results = (prompt.match(/^- \S+ completed: /gm) ?? []).length;
        message(`Fixture brief number ${(prompt.match(/## Previous brief/) ? 2 : 1)}: ${results} recent result(s) are done and nothing needs your attention.`);
    } else if (chat) {
        const conversation = prompt.slice(prompt.indexOf('## Conversation so far'), prompt.indexOf('## How to answer'));
        const last = [...conversation.matchAll(/\*\*@User\*\* \([^)]*\):\n([^\n]*)/g)].pop()?.[1] ?? '';
        // One provider outage per fixture log: the first turn shows progress, then fails (the reply is owed).
        const outage = process.env.FAKE_CODEX_LOG ? `${process.env.FAKE_CODEX_LOG}.reply-outage` : undefined;
        if (last.includes('FAIL_REPLY_ONCE') && outage && !existsSync(outage)) {
            writeFileSync(outage, `${last}\n`);
            print({ type: 'item.completed', item: { id: 'item_reason', type: 'reasoning', text: 'Looking it up.' } });
            print({ type: 'turn.failed', error: { message: 'Fixture outage: the provider is unavailable.' } });
            process.exit(1);
        }
        let text = `Fixture reply to: ${last}`;
        if (last.includes('CREATE_TASK')) {
            const created = await callTool('create_task', { title: 'Task from chat', description: `Requested in a chat: ${last}`, agent: '@Developer', priority: 4 });
            text += `\n${created}`;
        }
        if (last.includes('CONSULT_TEAM')) {
            const advice = await callTool('consult', { agent: '@Developer', question: `How should we approach: ${last}` });
            text += `\nDeveloper advises: ${advice}`;
        }
        if (last.includes('CORRECTION')) text += '\nPTBK_LEARN Prefer short answers in this project.';
        if (last.includes('SLOW_REPLY')) {
            // Progress the CLI exposes while it works: a command and a reasoning summary.
            print({ type: 'item.started', item: { id: 'item_cmd', type: 'command_execution', command: 'ls docs' } });
            print({ type: 'item.completed', item: { id: 'item_reason', type: 'reasoning', text: 'Checking the documentation first.' } });
            await new Promise((resolve) => setTimeout(resolve, Number(process.env.FAKE_CODEX_SLOW_MS ?? 6000)));
        }
        message(text);
    } else if (prompt.includes('## Assignment work')) {
        // Router: the first listed agent with an example combination (plugin defaults within its MODEL), or impossible.
        const choice = /^- (@\S+|\{[^}]+\})[^\n]*?for example `([^`]+)`/m.exec(prompt);
        if (!choice || prompt.includes('ROUTE_IMPOSSIBLE')) done('No compatible combination.', { routing: { impossible: 'fixture: no agent and combination fit' } });
        else {
            const fields = Object.fromEntries(choice[2].split(/\s+/).map((token) => token.split('=')));
            done(`${choice[1]} fits this task.`, { routing: { agent: choice[1], harness: fields.harness, model: fields.model, thinking: fields.thinking ?? null, runtime: fields.runtime }, priority: 3 });
        }
    } else if (prompt.includes('## Learning work') || prompt.includes('## Goal enquiry')) {
        done('Nothing to change.');
    } else if (prompt.includes('NEEDS_FIXER') && agent !== 'Fixer') {
        message(`Cannot do it within my role.\nPTBK_RESULT ${JSON.stringify({ status: 'blocked', summary: 'blocked', reason: 'fixture problem outside my role' })}`);
    } else if (prompt.includes('BLOCKED')) {
        message(`Cannot do it.\nPTBK_RESULT ${JSON.stringify({ status: 'blocked', summary: 'blocked', reason: 'fixture blocker' })}`);
    } else if (prompt.includes('NO_REPORT') && attempt === 1) {
        message('I did something but forgot the report.');
    } else if (prompt.includes('ASK_USER') && !prompt.includes('## Conversation with the user')) {
        const text = await callTool('ask_user', { question: 'Which color should the fixture use?', choices: ['red', 'blue'], reason: 'The task does not say which color to use.', attempted: 'Checked the task and project instructions.' });
        message(`${text}\nPTBK_RESULT ${JSON.stringify({ status: 'waiting-for-user', summary: 'asked the user' })}`);
    } else if (prompt.includes('WALLET_LOGIN')) {
        await callTool('browser_open', { url: process.env.FAKE_LOGIN_URL });
        const result = await callTool('wallet_login', { reason: 'The fixture site needs its account.' });
        if (/protected Wallet request/.test(result)) {
            message(`${result}\nPTBK_RESULT ${JSON.stringify({ status: 'waiting-for-user', summary: 'waiting for a Wallet login' })}`);
        } else {
            mkdirSync(join(process.cwd(), 'output'), { recursive: true });
            const file = join(process.cwd(), 'output', 'wallet.txt');
            writeFileSync(file, `${result.split('\n')[0]}\n${/Welcome[^\n]*/.exec(result)?.[0] ?? 'no welcome'}\n`);
            print({ type: 'item.completed', item: { id: 'item_2', type: 'file_change', changes: [{ path: file, kind: 'update' }] } });
            done('Signed in through the Wallet');
        }
    } else if (prompt.includes('EXTERNAL_ACTIONS')) {
        mkdirSync(join(process.cwd(), 'output'), { recursive: true });
        const file = join(process.cwd(), 'output', 'external-actions.txt');
        if (attempt === 1) {
            const idOf = (text) => /intent (act-[a-z0-9]+)/.exec(text)?.[1];
            const email = idOf(await callTool('begin_external_action', { operation: 'Send email', service: 'Gmail', account: 'fixture@example.test', target: 'reader@example.test', content: 'Weekly news.\nUnsubscribe: https://example.test/unsubscribe?token=SECRETTOKEN123456' }));
            await callTool('record_external_action', { id: email, outcome: 'confirmed', observed: 'Shown in the Sent folder.', reference: '<msg-1@example.test>' });
            const post = idOf(await callTool('begin_external_action', { operation: 'Publish post', service: 'LinkedIn', target: 'company page', content: 'This week in AI.' }));
            await callTool('record_external_action', { id: post, outcome: 'uncertain', observed: 'The request timed out before an acknowledgement.' });
            await callTool('begin_external_action', { operation: 'Delete record', service: 'CRM', target: 'lead 42' });
            writeFileSync(file, 'BROKEN\n');
        } else {
            const section = prompt.slice(prompt.indexOf('## External actions of this task'));
            const post = /uncertain: Publish post[^\n]*id (act-[a-z0-9]+)/.exec(section)?.[1];
            await callTool('record_external_action', { id: post, outcome: 'confirmed', observed: 'Reconciled: the post is visible on the company page.', reference: 'https://example.test/posts/1' });
            writeFileSync(file, `reconciled ${post}\n`);
        }
        print({ type: 'item.completed', item: { id: 'item_2', type: 'file_change', changes: [{ path: file, kind: 'update' }] } });
        done('Performed the external actions');
    } else if (prompt.includes('CLAIM_SHARED')) {
        const claimed = await callTool('claim_files', { paths: ['output/shared.txt'] });
        if (!/^Claimed/.test(claimed)) {
            message(`Could not claim: ${claimed}\nPTBK_RESULT ${JSON.stringify({ status: 'blocked', summary: 'blocked', reason: claimed })}`);
        } else {
            mkdirSync(join(process.cwd(), 'output'), { recursive: true });
            appendFileSync(join(process.cwd(), 'output', 'shared.txt'), `${title}\n`);
            await new Promise((resolve) => setTimeout(resolve, Number(process.env.FAKE_CODEX_SLOW_MS ?? 6000)));
            done('Appended to output/shared.txt');
        }
    } else {
        if (prompt.includes('SLOW_WORK')) await new Promise((resolve) => setTimeout(resolve, Number(process.env.FAKE_CODEX_SLOW_MS ?? 6000)));
        const answer = [...prompt.slice(prompt.indexOf('## Conversation with the user')).matchAll(/^- @User: (.+)$/gm)].pop()?.[1];
        mkdirSync(join(process.cwd(), 'output'), { recursive: true });
        const file = join(process.cwd(), 'output', `${reference.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.txt`);
        const content = prompt.includes('FAIL_CHECK_ONCE') && attempt === 1 ? 'BROKEN\n' : `${title}${answer ? ` (${answer})` : ''}\n`;
        writeFileSync(file, content);
        // Like the real CLI, every file this turn writes is reported as a file change.
        const written = [file];
        if (existsSync(join(process.cwd(), 'docs')) || prompt.includes('docs/promptbook-readiness.md')) {
            mkdirSync(join(process.cwd(), 'docs'), { recursive: true });
            writeFileSync(join(process.cwd(), 'docs', 'promptbook-readiness.md'), '# Readiness\n\nFixture project is ready.\n');
            written.push(join(process.cwd(), 'docs', 'promptbook-readiness.md'));
        }
        if (prompt.includes('CREATE_FOLLOW_UP')) {
            const tasksDirectory = /top level of `([^`]+)\/`/.exec(prompt)?.[1] ?? 'tasks';
            writeFileSync(join(process.cwd(), tasksDirectory, 'zz-follow-up-one.book'), `TASK Follow-up one — ${stamp}\nGOAL More work.\nTASK AGENT @Developer\n`);
            const second = attempt === 1 ? title : `Follow-up two — ${stamp}`;
            writeFileSync(join(process.cwd(), tasksDirectory, 'zz-follow-up-two.book'), `TASK ${second}\nGOAL Copied definition.\nTASK AGENT @Developer\n`);
            written.push(join(process.cwd(), tasksDirectory, 'zz-follow-up-one.book'), join(process.cwd(), tasksDirectory, 'zz-follow-up-two.book'));
        }
        if (prompt.includes('LIST_BROWSERS')) {
            writeFileSync(join(process.cwd(), 'output', 'browsers.txt'), `${await callTool('browser_list', {})}\n`);
            written.push(join(process.cwd(), 'output', 'browsers.txt'));
        }
        print({ type: 'item.completed', item: { id: 'item_2', type: 'file_change', changes: written.map((path) => ({ path, kind: 'update' })) } });
        done(`Wrote ${file}`);
    }
    print({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 5 } });
}
