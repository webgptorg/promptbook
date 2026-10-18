import { writeFile } from 'node:fs/promises';
import { PtbkError } from '../common/errors.js';
import { hashFileIfExists, toProjectRelative } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { formatAgentReference } from '../book/references.js';
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
import { appendUserMessage, chatAgentChoices, chatDetail, createUserChat } from './service.js';
import { ChatStore } from './store.js';

/**
 * Chats of a project whose service is not running: every write takes the project lock briefly and is committed as
 * its own scoped operation; agent replies run in this process through the same read-only conversation turn.
 *
 * @private chats
 */
export class LocalChats {
    public readonly store: ChatStore;
    private readonly state: StateStore;
    private pool?: HarnessPool;
    private inFlight = 0;

    private constructor(
        private readonly project: Project,
        private readonly settings: EffectiveSettings,
        private readonly env: NodeJS.ProcessEnv,
        private readonly repositoryRoot: string | undefined,
        private catalog: AgentCatalog,
    ) {
        const commit = setting<boolean>(settings, 'execution.commit') && Boolean(repositoryRoot);
        this.state = new StateStore(project.runtime.state);
        this.store = new ChatStore(project, {
            timeZone: setting<string>(settings, 'timezone'),
            persistence: commit
                ? { commit: async (paths, subject, trailers) => await this.commit(paths, subject, trailers) }
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
        if (setting<boolean>(settings, 'execution.commit') && git.state !== 'repository') {
            throw new PtbkError('The project is not in a Git working tree, so chat messages cannot be committed.', { kind: 'setup', next: ['Run `ptbk init`, or use --no-commit.'] });
        }
        const catalog = await AgentCatalog.load(project.root, setting<string>(settings, 'paths.agents'), setting<string>(settings, 'paths.tasks'));
        return new LocalChats(project, settings, env, git.state === 'repository' ? git.root : undefined, catalog);
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
    public async reply(name: string, onActivity?: (text: string) => void): Promise<string | undefined> {
        await this.reload();
        if (!this.pool) {
            this.pool = new HarnessPool(this.project.root, this.settings, this.env);
            await this.pool.refresh(this.pool.enabled(), true);
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
                createTask: async (input) =>
                    await this.locked(async () => {
                        await this.reload();
                        const title = generatedName(input.title, { taken: this.catalog.index.names(), timeZone: setting<string>(this.settings, 'timezone') });
                        const commitments: string[] = [];
                        if (input.agent) commitments.push(`TASK AGENT ${input.agent.startsWith('@') || input.agent.startsWith('{') ? input.agent : formatAgentReference(input.agent)}`);
                        if (input.priority !== undefined) commitments.push(`TASK PRIORITY ${input.priority}`);
                        commitments.push(`TASK ORIGIN chat {{${input.chat}}}`, `LINK {{${input.chat}}}`);
                        const path = await newTaskPath(this.catalog.index.rootPath('tasks'), input.title, Date.now(), setting<string>(this.settings, 'timezone'));
                        await writeFile(path, renderTaskBook({ title, description: input.description || undefined, commitments }), { flag: 'wx' });
                        if (this.repositoryRoot && setting<boolean>(this.settings, 'execution.commit')) await this.commit([path], `Add task - ${title}`, { 'Task-Name': title, 'Chat-Name': input.chat });
                        else await this.state.addOwnedUncommitted({ [toProjectRelative(this.project.root, path)]: (await hashFileIfExists(path)) ?? null });
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
                        if (this.repositoryRoot && setting<boolean>(this.settings, 'execution.commit')) await this.commit([created.path], `Add task - ${created.name}`, { 'Task-Name': created.name, 'Chat-Name': input.chat });
                        else await this.state.addOwnedUncommitted({ [toProjectRelative(this.project.root, created.path)]: (await hashFileIfExists(created.path)) ?? null });
                        return created.name;
                    }),
            },
            name,
        );
        return turn.error;
    }

    /** Agent replies still being produced in this process. */
    public get pendingReplies(): number {
        return this.inFlight;
    }

    /**
     * A chat source for terminal clients; agent replies run here after each user message that needs one.
     */
    public source(options: { readonly replies: boolean; readonly onActivity?: (text: string) => void; readonly onReplyError?: (error: string) => void }): ChatSource {
        const respond = (name: string): void => {
            if (!options.replies) return;
            // The harness turn runs unlocked (it can take minutes); its writes are scoped commits of their own paths.
            this.inFlight++;
            void this.reply(name, options.onActivity)
                .then(
                    (error) => error && options.onReplyError?.(error),
                    (error: unknown) => options.onReplyError?.(String(error)),
                )
                .finally(() => this.inFlight--);
        };
        return {
            list: async () => await this.store.summaries(),
            agents: async () => {
                await this.reload();
                return chatAgentChoices(this.catalog);
            },
            get: async (name) => await chatDetail(this.store, name),
            create: async (agent, text, title) => {
                const written = await this.locked(async () => {
                    await this.reload();
                    return await createUserChat(this.store, this.catalog, agent, text, { name: title });
                });
                await this.store.markRead(written.chat.name);
                respond(written.chat.name);
                return { name: written.chat.name, commit: written.commit };
            },
            send: async (name, text, expected) => {
                const result = await this.locked(async () => await appendUserMessage(this.store, this.state, name, text, { expected }));
                if (result.needsReply) respond(result.written.chat.name);
                return { name: result.written.chat.name, commit: result.written.commit };
            },
            read: async (name) => await this.store.markRead(name),
            replies: options.replies,
        };
    }
}
