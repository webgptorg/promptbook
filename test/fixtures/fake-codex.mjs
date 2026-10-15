#!/usr/bin/env node
/*
 * Deterministic substitute of the OpenAI Codex CLI for ptbk fixtures (no account, no inference).
 *
 * It answers metadata probes like the real CLI and, for `codex exec --json`, emits the real JSONL event format.
 * Behavior is driven by markers in the task text:
 *   ASK_USER        → asks the user through the ptbk MCP bridge, then waits for the answer
 *   FAIL_CHECK_ONCE → first attempt writes a file that fails the fixture check
 *   BLOCKED         → reports blocked
 *   NO_REPORT       → omits the completion line
 *   CREATE_FOLLOW_UP → also writes two follow-up task Books: one without an ID, one copying this task's ID
 * Every executed turn is appended to $FAKE_CODEX_LOG (one JSON line) when set.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const print = (value) => process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);

if (args[0] === '--version') {
    print('codex-cli 9.9.9');
    process.exit(0);
}
if (args[0] === 'login' && args[1] === 'status') {
    if (process.env.FAKE_CODEX_SIGNED_OUT) {
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
    const reference = /- Reference: (.+)/.exec(prompt)?.[1]?.trim() ?? 'unknown';
    const title = /- Title: (.+)/.exec(prompt)?.[1]?.trim() ?? 'unknown';
    const attempt = /## Feedback from attempt (\d+)/.exec(prompt) ? Number(/## Feedback from attempt (\d+)/.exec(prompt)[1]) + 1 : 1;
    if (process.env.FAKE_CODEX_LOG) appendFileSync(process.env.FAKE_CODEX_LOG, `${JSON.stringify({ reference, title, attempt, assignment: prompt.includes('## Assignment work'), learning: prompt.includes('## Learning work'), discovery: prompt.includes('## Goal enquiry') })}\n`);
    print({ type: 'thread.started', thread_id: `fake-${Date.now()}` });
    print({ type: 'turn.started' });
    const message = (text) => print({ type: 'item.completed', item: { id: 'item_1', type: 'agent_message', text } });
    const done = (summary, extra = {}) => message(`${summary}\n\nPTBK_RESULT ${JSON.stringify({ status: 'done', summary, evidence: 'fixture', ...extra })}`);
    if (prompt.includes('## Assignment work')) {
        done('Developer fits this task.', { routing: { agent: '@Developer', harness: null, model: null, thinkingLevel: null }, priority: 3 });
    } else if (prompt.includes('## Learning work') || prompt.includes('## Goal enquiry')) {
        done('Nothing to change.');
    } else if (prompt.includes('BLOCKED')) {
        message(`Cannot do it.\nPTBK_RESULT ${JSON.stringify({ status: 'blocked', summary: 'blocked', reason: 'fixture blocker' })}`);
    } else if (prompt.includes('NO_REPORT') && attempt === 1) {
        message('I did something but forgot the report.');
    } else if (prompt.includes('ASK_USER') && !prompt.includes('## Answers from the user')) {
        const text = await callTool('ask_user', { question: 'Which color should the fixture use?', choices: ['red', 'blue'], reason: 'The task does not say which color to use.', attempted: 'Checked the task and project instructions.' });
        message(`${text}\nPTBK_RESULT ${JSON.stringify({ status: 'waiting-for-user', summary: 'asked the user' })}`);
    } else {
        const answer = /A: (.+)/.exec(prompt)?.[1];
        mkdirSync(join(process.cwd(), 'output'), { recursive: true });
        const file = join(process.cwd(), 'output', `${reference.replace(/[^A-Za-z0-9]+/g, '-')}.txt`);
        const content = prompt.includes('FAIL_CHECK_ONCE') && attempt === 1 ? 'BROKEN\n' : `${title}${answer ? ` (${answer})` : ''}\n`;
        writeFileSync(file, content);
        if (existsSync(join(process.cwd(), 'docs')) || prompt.includes('docs/promptbook-readiness.md')) {
            mkdirSync(join(process.cwd(), 'docs'), { recursive: true });
            writeFileSync(join(process.cwd(), 'docs', 'promptbook-readiness.md'), '# Readiness\n\nFixture project is ready.\n');
        }
        if (prompt.includes('CREATE_FOLLOW_UP')) {
            const tasksDirectory = /top level of `([^`]+)\/`/.exec(prompt)?.[1] ?? 'tasks';
            const id = /- Task ID: (\S+)/.exec(prompt)?.[1];
            writeFileSync(join(process.cwd(), tasksDirectory, 'zz-follow-up-one.book'), 'TASK Follow-up one\n\nMore work.\n\nTASK AGENT @Developer\n');
            writeFileSync(join(process.cwd(), tasksDirectory, 'zz-follow-up-two.book'), `TASK Follow-up two\n\nCopied definition.\n\nTASK ID ${id}\nTASK AGENT @Developer\n`);
        }
        print({ type: 'item.completed', item: { id: 'item_2', type: 'file_change', changes: [{ path: file, kind: 'add' }] } });
        done(`Wrote ${file}`);
    }
    print({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 5 } });
}
