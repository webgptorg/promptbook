import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseChatBook } from '../dist/chats/chat-book.js';
import { chatOrigin, chatOriginOf, routeUserMessage } from '../dist/chats/chat-tasks.js';
import { committed, drive, generated, initializedProject, ptbk } from './helpers.mjs';

/**
 * Fixture check accepting every output.
 */
const CHECK = 'process.exit(0);\n';

/**
 * Every chat Book of a project with its file.
 */
async function chats(project) {
    const names = (await readdir(join(project, 'chats')).catch(() => [])).filter((name) => name.endsWith('.book'));
    return await Promise.all(names.map(async (name) => ({ file: join(project, 'chats', name), source: await readFile(join(project, 'chats', name), 'utf8') })).map(async (entry) => ({ ...(await entry), chat: parseChatBook((await entry).source) })));
}

/**
 * A waiting run (its pending question) as the engine records it.
 */
function waiting(agent, runId) {
    return { runId, taskTitle: `Task ${runId}`, routing: { agent }, waitingChat: 'Chat', awaitedMessages: 2, phase: 'awaiting-user' };
}

test('chat routing: a reply goes to its question, a mention to that participant, otherwise to the main agent', () => {
    const chat = { members: ['@User', '@Chatter', '@Developer', '@Lawyer'] };
    assert.equal(routeUserMessage(chat, 'Yes, keep the order.', [waiting('Developer', 'a')]).answers.runId, 'a', 'the single pending question gets the reply');
    assert.equal(routeUserMessage(chat, '@Lawyer is this allowed?', [waiting('Developer', 'a')]).agent, '@Lawyer', 'a mention of another participant is not an answer');
    assert.equal(routeUserMessage(chat, '@Developer yes', [waiting('Developer', 'a'), waiting('Lawyer', 'b')]).answers.runId, 'a', 'a mention picks one of several questions');
    const ambiguous = routeUserMessage(chat, 'Yes', [waiting('Developer', 'a'), waiting('Lawyer', 'b')]);
    assert.equal(ambiguous.answers, undefined, 'one reply is never applied to every wait');
    assert.equal(ambiguous.agent, '@Chatter');
    assert.equal(routeUserMessage(chat, 'How is it going?', []).agent, '@Chatter', 'unaddressed input goes to the main agent');
    assert.equal(routeUserMessage(chat, 'Mail {Task one} to me', []).agent, '@Chatter', 'a task mention is not an agent switch');
    assert.equal(chatOrigin('Discuss CSV export — 2026-10-25 23:40:00'), 'Chat {Discuss CSV export — 2026-10-25 23:40:00}');
    assert.equal(chatOriginOf('Chat {Discuss CSV export — 2026-10-25 23:40:00}'), 'Discuss CSV export — 2026-10-25 23:40:00');
    assert.equal(chatOriginOf('learning from chat {X}'), undefined);
});

test('chat-created work: linked both ways, its agent joins and asks in the source chat, the reply clears attention at once and the result is reported there once', async (t) => {
    const { project, env } = await initializedProject(t, { check: CHECK });
    const asked = await ptbk(['chat', 'Please export the report. CREATE_TASK ASK_USER', '--raw'], { cwd: project, env });
    assert.equal(asked.code, 0, asked.output);
    let [conversation] = await chats(project);
    const chatName = conversation.chat.name;
    assert.deepEqual(conversation.chat.members, ['@User', '@Chatter']);
    const taskFile = (await readdir(join(project, 'tasks'))).find((file) => file.includes('task-from-chat') && !file.includes('-assign-'));
    const task = await readFile(join(project, 'tasks', taskFile), 'utf8');
    const taskName = task.split('\n')[0].replace(/^TASK /, '');
    assert.ok(task.includes(`TASK ORIGIN Chat {${chatName}}`), task);
    assert.ok(task.includes(`LINK {${chatName}}`), task);
    assert.ok(conversation.chat.links.includes(`{${taskName}}`), `the chat links the task's final name: ${conversation.chat.links}`);

    // The task's agent asks in the source chat, under its own name, after joining it.
    await drive(project, env, async () => (await chats(project)).some((item) => item.chat.name === chatName && item.chat.status === 'waiting-for-user'), { message: 'the question in the source chat' });
    [conversation] = (await chats(project)).filter((item) => item.chat.name === chatName);
    assert.equal((await chats(project)).filter((item) => item.chat.members.includes('@User')).length, 1, 'no second chat was created for the question');
    assert.deepEqual(conversation.chat.members, ['@User', '@Chatter', '@Developer'], 'the executing agent joined; Chatter stays the main agent');
    assert.ok(conversation.source.indexOf('CHAT MEMBER @Developer') < conversation.source.indexOf('CHAT MESSAGE @Developer'), 'the member is declared before its first message');
    assert.match(conversation.chat.messages.at(-1).text, /Which color should the fixture use\?/);

    // Answering clears the question's attention immediately (before the task resumes or anything is committed later).
    const answered = await ptbk(['answer', chatName, 'blue', '--raw'], { cwd: project, env });
    assert.equal(answered.code, 0, answered.output);
    [conversation] = (await chats(project)).filter((item) => item.chat.name === chatName);
    assert.equal(conversation.chat.status, 'open', 'the saved answer cleared the question');

    const run = await drive(project, env, async () => Boolean(await committed(project, 'Task from chat')) && (await chats(project)).some((item) => item.chat.name === chatName && item.chat.messages.some((message) => message.text.startsWith(`Completed {${taskName}}`))), { message: 'the result reported in the chat' });
    assert.equal(run.code, 0, run.output);
    const output = await readdir(join(project, 'output'));
    assert.match(await readFile(join(project, 'output', output.find((name) => name.includes('task-from-chat'))), 'utf8'), /\(blue\)/, 'the routed answer reached the asking agent');
    [conversation] = (await chats(project)).filter((item) => item.chat.name === chatName);
    const outcomes = conversation.chat.messages.filter((message) => message.text.startsWith(`Completed {${taskName}}`));
    assert.equal(outcomes.length, 1, 'the result is reported once');
    assert.equal(outcomes[0].sender, '@Developer', 'by the agent that did the work');
    assert.match(outcomes[0].text, /Result commit [0-9a-f]{8}/);

    // A restart does not report it again.
    await drive(project, env, async () => JSON.parse((await ptbk(['status', '--json'], { cwd: project, env })).stdout || '{}').service?.state === 'running', { message: 'a restart' });
    [conversation] = (await chats(project)).filter((item) => item.chat.name === chatName);
    assert.equal(conversation.chat.messages.filter((message) => message.text.startsWith(`Completed {${taskName}}`)).length, 1);
    assert.match(taskName, generated('Task from chat'));
});
