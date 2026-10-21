import { errorMessage } from '../common/errors.js';
import type { ChatAgentChoice, ChatDetail } from '../chats/service.js';
import type { ChatSummary } from '../chats/store.js';
import { fit, truncate, wrap } from './ansi.js';
import { TextEditor } from './composer.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { renderPanel } from './panels.js';
import { FullScreen } from './screen.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Where a chat client reads and writes chats: a running service (control channel) or the project directly.
 *
 * Every write is the same durable, committed chat operation regardless of the source.
 *
 * @private chat client
 */
export type ChatSource = {
    /** Every chat (waiting for the user first). */
    readonly list: () => Promise<ChatSummary[]>;
    /** Agents the user may start a chat with. */
    readonly agents: () => Promise<ChatAgentChoice[]>;
    /** One chat with its messages. */
    readonly get: (name: string) => Promise<ChatDetail>;
    /** Starts a new chat with one agent; returns its name. */
    readonly create: (agent: string, text: string, title?: string) => Promise<{ readonly name: string; readonly commit?: string }>;
    /** Appends the user's message; `expected` is the message count the user saw (stale clients are rejected). */
    readonly send: (name: string, text: string, expected?: number) => Promise<{ readonly name: string; readonly commit?: string }>;
    /** Marks a chat as read by this viewer (never an answer). */
    readonly read: (name: string) => Promise<void>;
    /** Whether agent replies are produced (a running service or this client); otherwise they wait for the service. */
    readonly replies: boolean;
};

/**
 * Builds a chat source over a control-style request function (running service or in-process host).
 *
 * @private chat client
 */
export function controlChatSource(request: (method: string, params?: Readonly<Record<string, unknown>>) => Promise<unknown>, via: string): ChatSource {
    return {
        list: async () => (await request('chat-list')) as ChatSummary[],
        agents: async () => (await request('chat-agents')) as ChatAgentChoice[],
        get: async (name) => (await request('chat-get', { name })) as ChatDetail,
        create: async (agent, text, title) => (await request('chat-create', { agent, text, title, via })) as { name: string; commit?: string },
        send: async (name, text, expected) => (await request('chat-send', { name, text, expected, via })) as { name: string; commit?: string },
        read: async (name) => {
            await request('chat-read', { name });
        },
        replies: true,
    };
}

/**
 * Interval of refreshing the open chat (new agent messages arrive without stealing focus or drafts).
 */
const REFRESH_MS = 1500;

/**
 * What the chat client opens.
 *
 * @private chat client
 */
export type ChatTarget = { readonly kind: 'existing'; readonly name: string } | { readonly kind: 'new'; readonly agent: ChatAgentChoice; readonly title?: string };

/**
 * Runs a full-screen terminal chat until the user closes it (Ctrl+C, or Esc when embedded in the dashboard).
 *
 * Closing never stops a service and never deletes the conversation; reading marks it read but answers nothing.
 * Returns the name of the chat (when one exists).
 *
 * @private chat client
 */
export async function runChatClient(terminal: TerminalProfile, source: ChatSource, target: ChatTarget, options: { readonly embedded?: boolean; readonly screen?: FullScreen } = {}): Promise<string | undefined> {
    const screen = options.screen ?? new FullScreen();
    const ownsScreen = !options.screen;
    const marks = symbols(terminal.unicode);
    const { style } = terminal;
    const editor = new TextEditor();
    let name = target.kind === 'existing' ? target.name : undefined;
    let detail: ChatDetail | undefined;
    let scroll = 0;
    let busy = '';
    let notice = '';
    let closed = false;
    let finish: (() => void) | undefined;
    const done = new Promise<void>((resolve) => {
        finish = resolve;
    });

    const awaited = (): { sender: string; text: string; choices?: readonly string[] } | undefined => (detail?.summary.status === 'waiting-for-user' ? detail.summary.awaiting : undefined);

    const draw = (): void => {
        if (closed) return;
        // The chat's saved name once it exists (written only when it changes, not per redraw).
        terminal.title.update({ mode: 'Chat', detail: detail?.summary.name ?? (target.kind === 'new' ? `New with ${target.agent.name}` : name) });
        const width = Math.min(terminal.columns(), 140);
        const height = terminal.rows();
        const header = detail
            ? [
                  // The full saved name stays visible (wrapped, never cut) for identification and copying.
                  ...wrap(detail.summary.name, width - 4).map((line) => style.bold(line)),
                  style.muted(detail.summary.members.join(', ')),
                  `${detail.summary.status === 'waiting-for-user' ? style.warning(`${marks.warn} ${detail.summary.awaiting?.sender ?? 'The agent'} waits for you`) : detail.summary.status === 'resolved' ? style.muted('resolved') : style.success('open')}${detail.summary.links.length ? style.muted(` · links ${detail.summary.links.join(', ')}`) : ''}${style.muted(` · ${detail.summary.path}`)}`,
              ]
            : [`${style.bold(`New chat with ${target.kind === 'new' ? target.agent.reference : name}`)}`, style.muted('Write the first message; the chat is saved (and committed) when you send it.')];
        const top = renderPanel({ title: `${marks.bullet} Chat`, titleRight: options.embedded ? 'Esc back to dashboard' : 'Ctrl+C close', lines: header, width, tone: detail?.summary.status === 'waiting-for-user' ? 'attention' : 'accent', unicode: terminal.unicode, style });
        const question = awaited();
        const choiceLines = question?.choices?.length ? [style.muted('Offered answers (press the number with an empty composer):'), ...question.choices.map((choice, index) => `  ${style.accent(`[${index + 1}]`)} ${choice}`)] : [];
        const layout = editor.layout(width - 6, 5);
        const composer = renderPanel({
            title: busy || (question ? 'Your answer or question' : 'Message'),
            lines: [...choiceLines, ...(editor.empty ? [style.muted('Type a message… (Enter sends, Ctrl+J newline)')] : layout.lines)],
            width,
            tone: 'default',
            unicode: terminal.unicode,
            style,
        });
        const legend = style.muted(
            fit(`  Enter send · Ctrl+J newline · PgUp/PgDn scroll${question?.choices?.length ? ' · 1-9 answer' : ''} · ${options.embedded ? 'Esc back' : 'Ctrl+C close (the service keeps running)'}${notice ? `   ${marks.arrow} ${notice}` : ''}`, width),
        );
        const available = Math.max(3, height - top.length - composer.length - 1);
        const body: string[] = [];
        for (const message of detail?.messages ?? []) {
            const user = message.sender.replace(/^@/, '').toLowerCase() === 'user';
            body.push(`${user ? style.accent(style.bold('You')) : style.bold(message.sender)} ${style.muted(message.at)}`);
            for (const line of wrap(message.text, width - 4)) body.push(`  ${line}`);
            if (message.choices?.length) body.push(`  ${style.muted(`offered: ${message.choices.join(' | ')}`)}`);
            body.push('');
        }
        if (detail && detail.messages[detail.messages.length - 1]?.sender.replace(/^@/, '').toLowerCase() === 'user' && detail.summary.status === 'open') {
            body.push(style.muted(source.replies ? `${marks.wait} Waiting for ${detail.summary.agent ?? 'the agent'}'s reply…` : `${marks.wait} The reply is written when the project's service runs (\`ptbk start\`).`));
        }
        scroll = Math.max(0, Math.min(scroll, Math.max(0, body.length - available)));
        const end = body.length - scroll;
        const visible = body.slice(Math.max(0, end - available), end);
        while (visible.length < available) visible.unshift('');
        if (scroll > 0) visible[visible.length - 1] = style.muted(`  ↓ ${scroll} more line(s) below (PgDn)`);
        screen.draw([...top, ...visible.map((line) => truncate(line, width)), ...composer, legend]);
    };

    const refresh = async (): Promise<void> => {
        if (!name) return;
        try {
            const next = await source.get(name);
            const changed = !detail || next.messages.length !== detail.messages.length || next.summary.status !== detail.summary.status;
            detail = next;
            if (changed) await source.read(name).catch(() => undefined);
        } catch (error) {
            notice = errorMessage(error);
        }
        draw();
    };

    const submit = async (text: string): Promise<void> => {
        if (!text.trim() || busy) return;
        busy = 'Saving…';
        draw();
        try {
            if (!name && target.kind === 'new') {
                const created = await source.create(target.agent.reference, text, target.title);
                name = created.name;
                notice = created.commit ? `Saved (${created.commit.slice(0, 8)}).` : 'Saved.';
            } else if (name) {
                const sent = await source.send(name, text, detail?.messages.length);
                notice = sent.commit ? `Saved (${sent.commit.slice(0, 8)}).` : 'Saved.';
            }
            editor.value = '';
            scroll = 0;
        } catch (error) {
            // The draft stays in the composer; nothing is lost on a rejected or failed write.
            notice = `Not sent: ${errorMessage(error)}`;
        } finally {
            busy = '';
        }
        await refresh();
    };

    const close = (): void => {
        if (closed) return;
        closed = true;
        keyboard.stop();
        clearInterval(timer);
        process.stdout.off('resize', onResize);
        if (ownsScreen) screen.leave();
        finish?.();
    };

    const onKey = (event: KeyEvent): void => {
        if (event.type === 'key' && event.name === 'c' && event.ctrl) return close();
        if (event.type === 'key' && event.name === 'escape' && options.embedded) return close();
        if (event.type === 'key' && event.name === 'pageup') {
            scroll += Math.max(1, terminal.rows() - 12);
            return draw();
        }
        if (event.type === 'key' && event.name === 'pagedown') {
            scroll = Math.max(0, scroll - Math.max(1, terminal.rows() - 12));
            return draw();
        }
        const question = awaited();
        if (event.type === 'text' && editor.empty && question?.choices?.length && /^[1-9]$/.test(event.text) && Number(event.text) <= question.choices.length) {
            void submit(question.choices[Number(event.text) - 1]!);
            return;
        }
        const action = editor.handle(event);
        if (action === 'submit') void submit(editor.value);
        draw();
    };

    const keyboard = new KeyboardSession(onKey);
    const onResize = (): void => {
        screen.invalidate();
        draw();
    };
    if (ownsScreen) screen.enter();
    else screen.invalidate();
    keyboard.start();
    process.stdout.on('resize', onResize);
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    await refresh();
    draw();
    await done;
    return name;
}

/**
 * Plain chat listing (noninteractive output and `ptbk chat --list`).
 *
 * @private chat client
 */
export function renderChatList(chats: readonly ChatSummary[]): string {
    if (!chats.length) return 'No chats yet. Start one with `ptbk chat`.\n';
    return `${chats
        .map(
            (chat) =>
                `${chat.status === 'waiting-for-user' ? '[waiting for you] ' : chat.status === 'resolved' ? '[resolved] ' : ''}${chat.name}${chat.unread ? ` (${chat.unread} unread)` : ''}\n  ${chat.members.join(', ')} · ${chat.messages} message(s)${chat.links.length ? ` · ${chat.links.join(', ')}` : ''} · ${chat.path}${chat.last ? `\n  ${chat.last.sender}: ${chat.last.preview}` : ''}`,
        )
        .join('\n')}\n`;
}
