import { errorMessage } from '../common/errors.js';
import { formatDuration } from '../common/duration.js';
import { formatShortTime } from '../common/time.js';
import { awaitsReply, collapseThinking, type ChatMessage } from '../chats/chat-book.js';
import { messageAudioLabel } from '../chats/message-audio.js';
import type { ChatAgentChoice, ChatDetail } from '../chats/service.js';
import type { ChatSummary } from '../chats/store.js';
import { fit, stringWidth, truncate, wrap } from './ansi.js';
import type { ComposedSegment } from './composer.js';
import { POINTER_PICK_HINT, windowAround } from './prompts.js';
import { RichInput, type PointerField } from './rich-input.js';
import { KeyboardSession, type KeyEvent, type PointerInput } from './keys.js';
import { renderPanel } from './panels.js';
import { FullScreen } from './screen.js';
import type { EffectsReply, EffectsRequest } from '../engine/effects.js';
import { ProjectClient } from './project-client.js';
import { terminalHasFocus } from './keys.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * Outcome of sending a chat message.
 *
 * @private chat client
 */
export type ChatSent = {
    readonly name: string;
    /** The commit, when the message was committed by this operation. */
    readonly commit?: string;
    /** Saved in every case; `pending` while its batched commit has not happened yet. */
    readonly persistence?: 'committed' | 'pending' | 'uncommitted';
};

/**
 * Where a chat client reads and writes chats: a running service (control channel) or the project directly.
 *
 * Every write is the same durable chat operation regardless of the source: saved at once, committed in a batch.
 *
 * @private chat client
 */
export type ChatSource = {
    /** Shared temporary project effects, absent on older engines. */
    readonly effects?: (request: EffectsRequest) => Promise<EffectsReply>;
    /** Every chat (waiting for the user first). */
    readonly list: () => Promise<ChatSummary[]>;
    /** Agents the user may start a chat with. */
    readonly agents: () => Promise<ChatAgentChoice[]>;
    /** One chat with its messages. */
    readonly get: (name: string) => Promise<ChatDetail>;
    /** Starts a new chat with one agent; returns its name. `segments` carries attachments (become project assets). */
    readonly create: (agent: string, text: string, title?: string, segments?: readonly ComposedSegment[]) => Promise<ChatSent>;
    /** Appends the user's message; `expected` is the message count the user saw (stale clients are rejected). */
    readonly send: (name: string, text: string, expected?: number, segments?: readonly ComposedSegment[]) => Promise<ChatSent>;
    /** Marks a chat as read by this viewer (never an answer). */
    readonly read: (name: string) => Promise<void>;
    /**
     * Marks the explicit User pings among these displayed messages (1-based positions) seen for every client; it never
     * answers or resolves the question. Absent where the engine predates shared seen state.
     */
    readonly seen?: (name: string, messages: readonly number[]) => Promise<void>;
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
        effects: async (input) => await request('project-effects', { ...input }) as EffectsReply,
        list: async () => (await request('chat-list')) as ChatSummary[],
        agents: async () => (await request('chat-agents')) as ChatAgentChoice[],
        get: async (name) => (await request('chat-get', { name })) as ChatDetail,
        create: async (agent, text, title, segments) => (await request('chat-create', { agent, text, title, via, ...(segments ? { segments } : {}) })) as ChatSent,
        send: async (name, text, expected, segments) => (await request('chat-send', { name, text, expected, via, ...(segments ? { segments } : {}) })) as ChatSent,
        read: async (name) => {
            await request('chat-read', { name });
        },
        seen: async (name, messages) => {
            await request('chat-seen', { name, messages });
        },
        replies: true,
    };
}

/**
 * Interval of refreshing the open chat (new agent messages arrive without stealing focus or drafts).
 */
const REFRESH_MS = 1500;

/**
 * Conversation lines one wheel step scrolls.
 */
const WHEEL_LINES = 3;

/**
 * Offered answers shown at once; a longer list scrolls around the focused one.
 */
const CHOICE_ROWS = 6;

/**
 * How long after the operator's last meaningful input in this chat (or its opening) the chat counts as actively viewed:
 * only then does displaying a calling message mark its ping seen. A chat left open unattended sees nothing.
 */
const ACTIVE_VIEWING_MS = 10_000;

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
export async function runChatClient(terminal: TerminalProfile, source: ChatSource, target: ChatTarget, options: { readonly embedded?: boolean; readonly screen?: FullScreen; readonly projectClient?: ProjectClient } = {}): Promise<string | undefined> {
    const screen = options.screen ?? new FullScreen();
    const ownsScreen = !options.screen;
    const marks = symbols(terminal.unicode);
    const { style } = terminal;
    // The shared rich input in its forward policy: Enter sends, Shift+Enter/Ctrl+J newline, Ctrl+V rich paste.
    const input = new RichInput({ mode: 'flow', attachments: true, refresh: () => draw() });
    const editor = input.editor;
    let name = target.kind === 'existing' ? target.name : undefined;
    let detail: ChatDetail | undefined;
    let scroll = 0;
    let busy = '';
    let notice = '';
    /** Whether collapsed Thinking (a reply's interim progress) is shown in full. */
    let showThinking = false;
    let closed = false;
    let finish: (() => void) | undefined;
    const done = new Promise<void>((resolve) => {
        finish = resolve;
    });

    /** Where the input was last drawn, for the pointer. */
    let field: PointerField | undefined;
    let attachField: PointerField | undefined;
    /** The focused offered answer; otherwise the composer has focus. */
    let choiceFocus: number | undefined;
    /** The question the focus belongs to: another question never inherits it, so Enter cannot answer what was not read. */
    let choiceQuestion: string | undefined;
    /** Where the offered answers were last drawn: the frame row of the first drawn one and its index. */
    let choiceRows = { row: 0, first: 0, count: 0 };
    /** The operator's last meaningful input here (opening the chat counts): active viewing, never a background repaint. */
    let lastInput = Date.now();
    /** Calling messages already reported as displayed (each is sent once). */
    const reportedSeen = new Set<string>();
    const projectClient = options.projectClient ?? new ProjectClient(terminal, source.effects, { title: true, changed: () => draw(), activate: (effect) => {
        notice = effect.chat === name ? `Notification for this chat, message ${effect.message ?? ''}. Your draft is kept.` : effect.chat ? `Attention in {${effect.chat}}. Open that chat after saving your draft.` : `Attention in ${effect.domain}. Open this project's dashboard to respond.`;
        draw();
    } });

    const awaited = (): { sender: string; text: string; choices?: readonly string[] } | undefined => (detail?.summary.status === 'waiting-for-user' ? detail.summary.awaiting : undefined);

    const draw = (): void => {
        if (closed) return;
        // The chat's saved name once it exists (written only when it changes, not per redraw); inside the dashboard its
        // ptbk title stays.
        const width = Math.min(terminal.columns(), 140);
        const height = terminal.rows();
        const header = detail
            ? [
                  // The evolving title leads; the full saved name (its identity) stays visible, wrapped, never cut, for
                  // identification and copying.
                  ...wrap(detail.summary.title ?? detail.summary.name, width - 4).map((line) => style.bold(line)),
                  ...(detail.summary.title && detail.summary.title !== detail.summary.name ? wrap(`{${detail.summary.name}}`, width - 4).map((line) => style.muted(line)) : []),
                  style.muted(detail.summary.members.join(', ')),
                  `${detail.summary.status === 'waiting-for-user' ? style.warning(`${marks.warn} ${detail.summary.awaiting?.sender ?? 'The agent'} waits for you`) : detail.summary.status === 'resolved' ? style.muted('resolved') : style.success('open')}${detail.summary.links.length ? style.muted(` · links ${detail.summary.links.join(', ')}`) : ''}${style.muted(` · ${detail.summary.path}`)}${detail.summary.persistence ? (detail.summary.persistence.state === 'failed' ? style.warning(` · saved, commit failing: ${detail.summary.persistence.failure ?? 'retrying'}`) : style.muted(' · saved, commit pending')) : ''}`,
              ]
            : [`${style.bold(`New chat with ${target.kind === 'new' ? target.agent.reference : name}`)}`, style.muted('Write the first message; the chat is saved when you send it (and committed shortly after).')];
        // Live task cards: work this chat created or links, with its actual state (details on the Tasks page).
        const cards = (detail?.tasks ?? []).slice(-4).flatMap((card) => {
            const tone = card.state === 'completed' ? style.success : card.state === 'failed' || card.state === 'blocked' ? style.error : card.state === 'waiting' ? style.warning : style.accent;
            return [`${tone(`${card.state === 'completed' ? marks.ok : card.state === 'failed' ? marks.fail : card.state === 'waiting' ? marks.warn : marks.bullet} ${card.state}`)} ${truncate(`{${card.name}}`, Math.max(20, width - 30))}${card.detail ? style.muted(` · ${truncate(card.detail.split('\n')[0]!, 60)}`) : ''}`, ...(card.receipts ?? []).map((receipt) => style.muted(`  ${truncate(receipt, Math.max(20, width - 8))}`))];
        });
        if ((detail?.tasks?.length ?? 0) > cards.length) cards.unshift(style.muted(`${detail!.tasks!.length - cards.length} earlier task(s) on the Tasks page`));
        const top = renderPanel({ title: `${marks.bullet} Chat`, titleRight: options.embedded ? 'Esc back to dashboard' : 'Ctrl+C close', lines: [...header, ...cards], width, tone: detail?.summary.status === 'waiting-for-user' ? 'attention' : 'accent', unicode: terminal.unicode, style });
        const question = awaited();
        const choices = question?.choices ?? [];
        if (question?.text !== choiceQuestion || !editor.empty || input.attaching) choiceFocus = undefined;
        choiceQuestion = question?.text;
        const shownChoices = windowAround(choices.length, choiceFocus ?? 0, CHOICE_ROWS);
        const choiceLines = choices.length
            ? [
                  style.muted(editor.empty ? 'Offered answers (↑↓ choose, Enter sends, or write your own):' : 'Offered answers (empty your message to choose one):'),
                  ...(shownChoices.start > 0 ? [style.muted(`    ↑ ${shownChoices.start} more`)] : []),
                  ...choices.slice(shownChoices.start, shownChoices.end).map((choice, offset) => {
                      const index = shownChoices.start + offset;
                      const focused = index === choiceFocus;
                      return `${focused ? style.accent(marks.pointer) : ' '} ${style.accent(index < 9 ? `[${index + 1}]` : '   ')} ${focused ? style.bold(choice) : choice}`;
                  }),
                  ...(shownChoices.end < choices.length ? [style.muted(`    ↓ ${choices.length - shownChoices.end} more`)] : []),
              ]
            : [];
        const layout = editor.layout(width - 6, 5);
        const attaching = input.attaching;
        const status = input.status(width - 6);
        const composer = renderPanel({
            title: busy || (question ? 'Your answer or question' : 'Message'),
            lines: [
                ...choiceLines,
                ...(attaching ? [`${style.bold('Attach file:')} ${attaching.layout(width - 22, 1).lines[0] ?? ''}`] : editor.empty ? [style.muted('Type a message… (Enter sends, Shift+Enter/Ctrl+J newline, Ctrl+V pastes text/images/files)')] : layout.lines),
                ...(status ? [status.tone === 'warning' ? style.warning(status.text) : style.muted(status.text)] : []),
            ],
            width,
            tone: 'default',
            unicode: terminal.unicode,
            style,
        });
        const keys = input.keys().map((key) => key.replace(/^Enter submit$/, 'Enter send').replace(/^Esc cancel$/, options.embedded ? 'Esc back' : 'Ctrl+C close (the service keeps running)'));
        const legend = style.muted(fit(`  ${[...keys, 'PgUp/PgDn scroll', ...(choiceFocus !== undefined ? ['Esc back to your message'] : choices.length && editor.empty ? ['↑↓ choose an answer', ...(terminal.pointer ? [POINTER_PICK_HINT] : [])] : []), ...(detail?.messages.some((message) => message.phase === 'progress') ? [`Ctrl+R ${showThinking ? 'hide' : 'show'} thinking`] : [])].join(' · ')}`, width));
        // On its own line: behind the long legend a failed send would be cut off.
        const noticeLines = notice ? wrap(`${marks.arrow} ${notice}`, width - 4).map((line) => `  ${line}`) : [];
        const available = Math.max(3, height - top.length - composer.length - noticeLines.length - 1);
        const body: string[] = [];
        /** The 1-based message each body line belongs to (for what the viewport actually displays). */
        const lineMessages: Array<number | undefined> = [];
        const positions = new Map((detail?.messages ?? []).map((message, index) => [message as object, index + 1]));
        const unseen = new Set((detail?.summary.pings ?? []).map((ping) => ping.message));
        for (const item of collapseThinking(detail?.messages ?? [])) {
            while (lineMessages.length < body.length) lineMessages.push(undefined);
            // A final reply's interim progress is one Thinking line (Ctrl+R expands it); the Book keeps it all.
            if (item.kind === 'thinking') {
                body.push(style.muted(`${item.sender} · Thinking${item.elapsedMs !== undefined ? ` · ${formatDuration(item.elapsedMs)}` : ''}${showThinking ? '' : '  (Ctrl+R shows it)'}`));
                if (showThinking) for (const message of item.messages) for (const line of wrap(message.text, width - 6)) body.push(style.muted(`    ${line}`));
                continue;
            }
            const message = item.message;
            const position = positions.get(message);
            const user = message.sender.replace(/^@/, '').toLowerCase() === 'user';
            // An unseen explicit User ping is marked until an active viewer has actually displayed it.
            const pinged = position !== undefined && unseen.has(position) ? ` ${style.warning(`${marks.warn} asks you (new)`)}` : '';
            body.push(`${user ? style.accent(style.bold('You')) : style.bold(message.sender)} ${style.muted(`${message.at}${message.phase === 'progress' ? ' · working…' : ''}`)}${pinged}`);
            for (const line of wrap(message.text, width - 4)) body.push(`  ${message.phase === 'progress' ? style.muted(line) : line}`);
            if (message.choices?.length) body.push(`  ${style.muted(`offered: ${message.choices.join(' | ')}`)}`);
            // Recorded speech of this same message (not an attachment); replaying it never resends anything.
            const audio = messageAudioLabel((message as Pick<ChatMessage, 'audio'>).audio);
            if (audio) body.push(`  ${style.muted(`♪ ${audio}`)}`);
            while (lineMessages.length < body.length) lineMessages.push(position);
            body.push('');
        }
        while (lineMessages.length < body.length) lineMessages.push(undefined);
        // The reply being written now: available progress and streamed text, the same in every client.
        const live = detail?.live;
        if (live) {
            body.push(`${style.bold(live.sender)} ${style.muted(`is replying · ${formatDuration(Date.now() - Date.parse(live.startedAt))}`)}`);
            for (const line of live.activity.slice(-4)) body.push(style.muted(`  ${truncate(line, width - 6)}`));
            if (live.text) for (const line of wrap(live.text, width - 4)) body.push(`  ${line}`);
            body.push('');
        }
        // A failed reply is rechecked automatically: its cause and next attempt, never a Retry question.
        const recheck = detail?.recheck;
        if (!live && recheck) {
            body.push(style.muted(`${marks.wait} The reply failed (${truncate(recheck.cause, width - 40)}). Automatic recheck ${formatShortTime(Date.parse(recheck.nextAt), Date.now())}; writing again retries now.`));
        } else if (!live && detail && awaitsReply(detail) && detail.summary.status === 'open') {
            body.push(style.muted(source.replies ? `${marks.wait} Waiting for ${detail.summary.agent ?? 'the agent'}'s reply…` : `${marks.wait} The reply is written when the project's service runs (\`ptbk start\`).`));
        }
        // Outstanding requests: who is responsible and when it is rechecked (inspection never triggers a check).
        for (const request of detail?.requests ?? []) body.push(style.muted(truncate(`${marks.wait} ${requestSupervisionLine(request)}`, width - 2)));
        scroll = Math.max(0, Math.min(scroll, Math.max(0, body.length - available)));
        const end = body.length - scroll;
        const visible = body.slice(Math.max(0, end - available), end);
        // The scroll indicator replaces the last visible line, so that line is not displayed.
        const displayed = new Set(lineMessages.slice(Math.max(0, end - available), scroll > 0 ? end - 1 : end).filter((position): position is number => position !== undefined));
        while (visible.length < available) visible.unshift('');
        if (scroll > 0) visible[visible.length - 1] = style.muted(`  ↓ ${scroll} more line(s) below (PgDn)`);
        // The composer's text stands below its title border and the offered answers, inside its side border.
        const textRow = top.length + visible.length + 1 + choiceLines.length;
        const attachColumn = 2 + stringWidth('Attach file: ');
        const pathLayout = attaching?.layout(width - 22, 1);
        field = attaching ? undefined : { row: textRow, column: 2, rows: Math.max(1, layout.lines.length), offsetAt: layout.offsetAt };
        attachField = pathLayout && { row: textRow, column: attachColumn, rows: 1, offsetAt: pathLayout.offsetAt };
        choiceRows = { row: top.length + visible.length + 2 + (shownChoices.start > 0 ? 1 : 0), first: shownChoices.start, count: shownChoices.end - shownChoices.start };
        // A focused answer is the focus: the composer's cursor returns with it.
        const cursor = choiceFocus !== undefined ? undefined : pathLayout ? { row: textRow, column: attachColumn + pathLayout.cursor.column } : { row: textRow + (editor.empty ? 0 : layout.cursor.row), column: 2 + (editor.empty ? 0 : layout.cursor.column) };
        screen.draw([...top, ...visible.map((line) => truncate(line, width)), ...composer, ...noticeLines, legend], cursor, undefined, () => markDisplayed(displayed));
    };

    /**
     * Reports the unseen calling messages the viewport displays now as seen, only while the operator actively uses this
     * chat (shared with every client; the question keeps waiting).
     */
    const markDisplayed = (displayed: ReadonlySet<number>): void => {
        if (closed || !terminalHasFocus() || !name || !detail || !source.seen || Date.now() - lastInput > ACTIVE_VIEWING_MS) return;
        const chat = name;
        const fresh = (detail.summary.pings ?? []).filter((ping) => displayed.has(ping.message) && !reportedSeen.has(ping.id));
        if (!fresh.length) return;
        for (const ping of fresh) reportedSeen.add(ping.id);
        void source.seen(chat, fresh.map((ping) => ping.message)).then(
            () => refresh(),
            () => {
                // Not recorded: a later display tries again.
                for (const ping of fresh) reportedSeen.delete(ping.id);
            },
        );
    };

    const refresh = async (): Promise<void> => {
        if (!name) return;
        try {
            const next = await source.get(name);
            const changed = !detail || next.messages.length !== detail.messages.length || next.summary.status !== detail.summary.status;
            // Live progress redraws every refresh (it changes without new messages).
            detail = next;
            if (changed) await source.read(name).catch(() => undefined);
        } catch (error) {
            notice = errorMessage(error);
        }
        draw();
    };

    const submit = async (text: string, segments?: readonly ComposedSegment[]): Promise<void> => {
        const attached = segments?.some((segment) => segment.type === 'attachment') ? segments : undefined;
        if ((!text.trim() && !attached) || busy) return;
        busy = 'Saving…';
        draw();
        try {
            if (!name && target.kind === 'new') {
                const created = await source.create(target.agent.reference, text, target.title, attached);
                name = created.name;
                notice = savedNotice(created);
            } else if (name) {
                const sent = await source.send(name, text, detail?.messages.length, attached);
                notice = savedNotice(sent);
            }
            input.clear();
            projectClient.cue('send');
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
        if (!options.projectClient) projectClient.close();
        process.stdout.off('resize', onResize);
        if (ownsScreen) screen.leave();
        finish?.();
    };

    /** A press places the cursor, or focuses an offered answer and sends the focused one (with an empty composer); the wheel scrolls the conversation. */
    const onPointer = (event: PointerInput): void => {
        if (event.action !== 'press') {
            scroll = Math.max(0, scroll + (event.action === 'wheel-up' ? WHEEL_LINES : -WHEEL_LINES));
            return draw();
        }
        const offset = event.row - choiceRows.row;
        if (offset >= 0 && offset < choiceRows.count) {
            const index = choiceRows.first + offset;
            const choice = awaited()?.choices?.[index];
            if (choice === undefined) return;
            if (!editor.empty || input.attaching) {
                notice = 'Your message stays: empty it to choose an offered answer.';
            } else if (index === choiceFocus) {
                return void submit(choice);
            } else choiceFocus = index;
            return draw();
        }
        choiceFocus = undefined;
        input.point(event, field, attachField);
        draw();
    };

    const onKey = (event: KeyEvent): void => {
        lastInput = Date.now();
        if (event.type === 'pointer') return onPointer(event);
        if (event.type === 'key' && event.name === 'c' && event.ctrl) return close();
        if (event.type === 'key' && event.name === 'r' && event.ctrl) {
            showThinking = !showThinking;
            return draw();
        }
        // With an empty composer the arrows reach the offered answers: selectable, however many there are.
        const offered = awaited()?.choices ?? [];
        if (event.type === 'key' && offered.length && editor.empty && !input.attaching) {
            if (event.name === 'up' || event.name === 'down') {
                const step = event.name === 'down' ? 1 : -1;
                choiceFocus = choiceFocus === undefined ? (step > 0 ? 0 : offered.length - 1) : (choiceFocus + step + offered.length) % offered.length;
                return draw();
            }
            if (choiceFocus !== undefined && event.name === 'enter') {
                void submit(offered[choiceFocus]!);
                return;
            }
            if (choiceFocus !== undefined && event.name === 'escape') {
                choiceFocus = undefined;
                return draw();
            }
        }
        if (event.type === 'key' && event.name === 'escape' && options.embedded && !input.attaching) return close();
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
        const action = input.handle(event);
        if (action === 'submit') void submit(editor.value, input.segments());
        draw();
    };

    const keyboard = new KeyboardSession(onKey);
    const onResize = (): void => {
        screen.invalidate();
        draw();
    };
    if (ownsScreen) screen.enter();
    else screen.invalidate();
    if (terminal.pointer) keyboard.trackPointer(true);
    keyboard.start();
    if (!options.projectClient) projectClient.start();
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
                `${chat.status === 'waiting-for-user' ? '[waiting for you] ' : chat.status === 'resolved' ? '[resolved] ' : ''}${chat.name}${chat.unread ? ` (${chat.unread} unread)` : ''}${chat.title && chat.title !== chat.name ? `\n  title: ${chat.title}` : ''}\n  ${chat.members.join(', ')} · ${chat.messages} message(s)${chat.links.length ? ` · ${chat.links.join(', ')}` : ''} · ${chat.path}${chat.last ? `\n  ${chat.last.sender}: ${chat.last.preview}` : ''}`,
        )
        .join('\n')}\n`;
}

/**
 * The truthful outcome of a sent message: saved in every case, committed only when a commit exists.
 */
function savedNotice(sent: ChatSent): string {
    if (sent.commit) return `Saved and committed (${sent.commit.slice(0, 8)}).`;
    if (sent.persistence === 'pending') return 'Saved; its commit follows shortly.';
    return 'Saved.';
}

/**
 * One line describing an outstanding request's responsible agent and its actual relevance check state.
 *
 * @private chat client
 */
export function requestSupervisionLine(request: NonNullable<ChatDetail['requests']>[number], now: number = Date.now()): string {
    const check = request.check;
    const state = !check
        ? ''
        : check.state === 'paused'
          ? 'its automatic check waits while the engine is paused'
          : check.state === 'unavailable'
            ? `its check is pending${check.lastOutcome ? ` (${check.lastOutcome})` : ''}`
            : check.state === 'checking'
              ? 'checking whether it is still needed now'
              : `checks whether it is still needed ${formatShortTime(Date.parse(check.nextAt), now)}`;
    return `Message ${request.message} waits for you · ${request.owner} is responsible${state ? ` and ${state}` : ''}.`;
}
