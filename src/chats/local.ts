import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { hashFileIfExists, readJsonIfExists, toProjectRelative, writeJsonAtomic } from '../common/fs.js';
import { ProjectEffects, chatEffects, type EffectsState } from '../engine/effects.js';
import { shortId } from '../common/ids.js';
import { formatAgentReference, toReference } from '../book/references.js';
import { AgentCatalog, learningPolicyOf } from '../project/agents.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import { commitPaths, inspectGit } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { createChatLearningTask } from '../engine/generated.js';
import { HarnessPool } from '../engine/harnesses.js';
import { StateStore } from '../engine/state.js';
import { acquireProjectLock } from '../service/records.js';
import { newTaskPath, renderTaskBook } from '../tasks/authoring.js';
import { generatedName } from '../tasks/identity.js';
import type { ChatSource } from '../ui/chat-client.js';
import { replyInChat } from './conversation.js';
import { appendUserMessage, chatAgentChoices, chatDetail, createUserChat, resolveChatInvitations } from './service.js';
import { ChatStore } from './store.js';
import { ChatCommitBatcher } from './batcher.js';
import { chatTaskCommitments } from './chat-tasks.js';

/**
 * Chats of a project whose service is not running: every write takes the project lock briefly and is saved at once;
 * the saves of one operation (the user's message, the routing MODEL and the agent's reply) share one batched commit at
 * its end. Agent replies run in this process through the same read-only conversation turn.
 *
 * @private chats
 */
export class LocalChats {
    public readonly store: ChatStore;
    private readonly state: StateStore;
    /** Saved chat writes waiting for the commit at the end of the current operation. */
    private readonly batches: ChatCommitBatcher;
    private pool?: HarnessPool;
    private inFlight = 0;

    private constructor(
        private readonly project: Project,
        private readonly settings: EffectiveSettings,
        private readonly env: NodeJS.ProcessEnv,
        private readonly repositoryRoot: string | undefined,
        private catalog: AgentCatalog,
    ) {
        const commit = setting<boolean>(settings, 'execution.isCommitEnabled') && Boolean(repositoryRoot);
        this.state = new StateStore(project.runtime.state);
        this.batches = new ChatCommitBatcher(project, { repositoryRoot: () => this.repositoryRoot, commit: async (paths, subject, trailers) => await this.locked(async () => await this.commit(paths, subject, trailers)) });
        this.store = new ChatStore(project, {
            timeZone: setting<string>(settings, 'timezone'),
            persistence: commit
                ? { schedule: async (chat, paths, trailers) => await this.batches.schedule(chat, paths, trailers) }
                : { uncommitted: async (path) => await this.state.addOwnedUncommitted({ [toProjectRelative(project.root, path)]: (await hashFileIfExists(path)) ?? null }) },
            takenNames: async () => {
                await this.reload();
                return this.catalog.index.names();
            },
        });
    }

    /**
     * Opens the chats of a project (Git is required for committed chats unless commits are disabled).
     */
    public static async open(project: Project, settings: EffectiveSettings, env: NodeJS.ProcessEnv): Promise<LocalChats> {
        const git = await inspectGit(project.root);
        if (setting<boolean>(settings, 'execution.isCommitEnabled') && git.state !== 'repository') {
            throw new PtbkError('The project is not in a Git working tree, so chat messages cannot be committed.', { kind: 'setup', next: ['Run `ptbk init`, or use --no-commit.'] });
        }
        const catalog = await AgentCatalog.load(project.root, setting<string>(settings, 'paths.agents'), setting<string>(settings, 'paths.tasks'));
        const chats = new LocalChats(project, settings, env, git.state === 'repository' ? git.root : undefined, catalog);
        // Messages an interrupted earlier process saved but did not commit are committed first.
        if (setting<boolean>(settings, 'execution.isCommitEnabled') && git.state === 'repository') await chats.batches.recover();
        return chats;
    }

    /** Commits the saved writes of the finished operation (one batched commit per chat). */
    public async flush(): Promise<string | undefined> {
        return (await this.batches.flush()).at(-1);
    }

    /** Commits chat or authoring paths. */
    private async commit(paths: readonly string[], subject: string, trailers: Readonly<Record<string, string | readonly string[] | undefined>>): Promise<string | undefined> {
        const outcome = await commitPaths({ projectRoot: this.project.root, repositoryRoot: this.repositoryRoot!, paths, subject, trailers, temporaryDirectory: this.project.runtime.temporary, env: this.env });
        return outcome.committed ? outcome.sha : undefined;
    }

    /** Runs one write under the project lock (a service cannot start in the middle of it). */
    private async locked<T>(operation: () => Promise<T>): Promise<T> {
        const release = await acquireProjectLock(this.project, `chat-${shortId()}`, 'authoring');
        try {
            return await operation();
        } finally {
            await release();
        }
    }

    /** Reloads the agent catalog (new Books written meanwhile). */
    private async reload(): Promise<void> {
        this.catalog = await AgentCatalog.load(this.project.root, setting<string>(this.settings, 'paths.agents'), setting<string>(this.settings, 'paths.tasks'));
    }

    /**
     * Lets the chat's agent reply in this process (read-only; tasks only through ordinary committed authoring).
     */
    public async reply(name: string, onActivity?: (text: string) => void, options: { readonly agent?: string; readonly followUp?: boolean } = {}): Promise<string | undefined> {
        await this.reload();
        const invited: string[] = [];
        if (!this.pool) {
            this.pool = new HarnessPool(this.project.root, this.settings, this.env);
            await this.pool.refresh(undefined, true);
        }
        const turn = await replyInChat(
            {
                project: this.project,
                settings: this.settings,
                catalog: this.catalog,
                pool: this.pool,
                chats: this.store,
                env: this.env,
                onActivity,
                inviteAgent: async (input) =>
                    await this.locked(async () => {
                        await this.reload();
                        const stored = await this.store.find(input.chat);
                        if (!stored) throw new PtbkError(`No chat named "${input.chat}".`, { kind: 'not-found' });
                        const { addressed, joining } = await resolveChatInvitations(this.catalog, stored.chat, [toReference(input.agent)]);
                        if (joining.length) await this.store.annotate(stored.chat.name, { members: joining });
                        await this.state.addChatAddress(stored.chat.name, { upTo: stored.chat.messages.length, agents: addressed });
                        invited.push(addressed[0]!);
                        return { agent: addressed[0]!, joined: joining.length > 0 };
                    }),
                createTask: async (input) =>
                    await this.locked(async () => {
                        await this.reload();
                        const title = generatedName(input.title, { taken: this.catalog.index.names(), timeZone: setting<string>(this.settings, 'timezone') });
                        const commitments = chatTaskCommitments(input);
                        const path = await newTaskPath(this.catalog.index.rootPath('tasks'), input.title, Date.now(), setting<string>(this.settings, 'timezone'));
                        await writeFile(path, renderTaskBook({ title, description: input.description || undefined, commitments }), { flag: 'wx' });
                        if (this.repositoryRoot && setting<boolean>(this.settings, 'execution.isCommitEnabled')) await this.commit([path], `Add task - ${title}`, { 'Task-Name': title, 'Chat-Name': input.chat });
                        else await this.state.addOwnedUncommitted({ [toProjectRelative(this.project.root, path)]: (await hashFileIfExists(path)) ?? null });
                        // Both directions: the chat links the task's final name (saved with the chat's batch).
                        await this.store.annotate(input.chat, { links: [formatAgentReference(title)] }, { trailers: { 'Task-Name': title } });
                        return title;
                    }),
                scheduleLearning: async (input) =>
                    await this.locked(async () => {
                        await this.reload();
                        const learner = await this.catalog.resolve(formatAgentReference(input.agent));
                        if (learner.kind !== 'agent' || !learningPolicyOf(learner.definition.document).open) return undefined;
                        const created = await createChatLearningTask({
                            tasksDirectory: this.catalog.index.rootPath('tasks'),
                            chat: input.chat,
                            agent: learner.definition.name,
                            agentPath: learner.definition.relativePath,
                            note: input.note,
                            timeZone: setting<string>(this.settings, 'timezone'),
                            taken: this.catalog.index.names(),
                        });
                        if (this.repositoryRoot && setting<boolean>(this.settings, 'execution.isCommitEnabled')) await this.commit([created.path], `Add task - ${created.name}`, { 'Task-Name': created.name, 'Chat-Name': input.chat });
                        else await this.state.addOwnedUncommitted({ [toProjectRelative(this.project.root, created.path)]: (await hashFileIfExists(created.path)) ?? null });
                        return created.name;
                    }),
            },
            name,
            options,
        );
        if (turn.reply && options.agent) await this.state.settleChatAddress(turn.reply.chat.name, options.agent);
        let error = turn.error;
        for (const agent of invited) error = (await this.reply(name, onActivity, { agent, followUp: true })) ?? error;
        return error;
    }

    /** Agent replies still being produced in this process. */
    public get pendingReplies(): number {
        return this.inFlight;
    }

    /**
     * A chat source for terminal clients; agent replies run here after each user message that needs one.
     */
    public source(options: { readonly replies: boolean; readonly onActivity?: (text: string) => void; readonly onReplyError?: (error: string) => void }): ChatSource {
        let turns: Promise<unknown> = Promise.resolve();
        const respond = (name: string, turn: { readonly agent?: string; readonly followUp?: boolean } = {}): void => {
            if (!options.replies) return;
            // The harness turn runs unlocked (it can take minutes); its writes are scoped commits of their own paths.
            // Turns of this process run in order, so several addressed agents answer one after another.
            this.inFlight++;
            turns = turns
                .then(async () => await this.reply(name, options.onActivity, turn))
                .then(
                    (error) => error && options.onReplyError?.(error),
                    (error: unknown) => options.onReplyError?.(String(error)),
                )
                // The user's message, the routing and the reply share the operation's batched commit.
                .finally(async () => {
                    await this.flush().catch((error: unknown) => options.onReplyError?.(`Saved, but not committed yet: ${String(error)}`));
                    this.inFlight--;
                });
        };
        return {
            effects: async (request) => await this.locked(async () => {
                const path = join(this.project.runtime.state, 'client-effects.json');
                const saved = await readJsonIfExists<EffectsState>(path);
                const coordinator = new ProjectEffects(saved);
                const events = chatEffects(await this.store.summaries());
                const result = coordinator.exchange(request, events);
                await writeJsonAtomic(path, coordinator.state);
                return { ...result, active: events.map((event) => event.key), status: { project: this.project.name, state: 'stopped', attention: events.some((event) => event.kind === 'attention') } };
            }),
            list: async () => await this.store.summaries(),
            agents: async () => {
                await this.reload();
                return chatAgentChoices(this.catalog);
            },
            get: async (name) => await chatDetail(this.store, name),
            create: async (agent, text, title, segments) => {
                const written = await this.locked(async () => {
                    await this.reload();
                    return await createUserChat(this.store, this.catalog, agent, text, { name: title, segments });
                });
                await this.store.markRead(written.chat.name);
                if (options.replies) {
                    const addressed = 'addressed' in written ? (written.addressed as readonly string[]) : [];
                    if (addressed.length) await this.state.addChatAddress(written.chat.name, { upTo: written.chat.messages.length, agents: addressed });
                    if (addressed.length) for (const reference of addressed) respond(written.chat.name, { agent: reference, followUp: true });
                    else respond(written.chat.name);
                    return { name: written.chat.name, persistence: written.persistence };
                }
                return { name: written.chat.name, commit: await this.flush(), persistence: 'committed' as const };
            },
            send: async (name, text, expected, segments) => {
                const result = await this.locked(async () => await appendUserMessage(this.store, this.state, name, text, { expected, segments, catalog: this.catalog }));
                if (result.needsReply && options.replies) {
                    if (result.replyAgents.length) for (const agent of result.replyAgents) respond(result.written.chat.name, { agent, followUp: true });
                    else respond(result.written.chat.name);
                    return { name: result.written.chat.name, persistence: result.written.persistence };
                }
                return { name: result.written.chat.name, commit: await this.flush(), persistence: 'committed' as const };
            },
            read: async (name) => await this.store.markRead(name),
            seen: async (name, messages) => {
                await this.locked(async () => await this.store.markSeen(name, messages));
            },
            replies: options.replies,
        };
    }
}
