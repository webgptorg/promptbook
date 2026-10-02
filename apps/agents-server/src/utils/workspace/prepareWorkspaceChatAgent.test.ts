import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Book } from '../../../../../src/book-3.0/Book';
import { AGENT_QUEUED_MESSAGES_DIRECTORY_PATH } from '../../../../../src/book-3.0/agentFolderPaths';
import { ZERO_USAGE } from '../../../../../src/execution/utils/usage-constants';
import { resolvePromptRunner } from '../../../../../scripts/run-codex-prompts/main/resolvePromptRunner';
import { discoverWorkspaceHarnesses } from '../../../../../scripts/run-codex-prompts/workspace/workspaceExecutionSelection';
import { createWorkspaceFixture } from '../../../../../scripts/run-codex-prompts/workspace/testing/workspaceFixture';
import { provideWorkspaceAgentCollection } from './workspaceAgentStorage';
import { prepareWorkspaceChatAgent } from './prepareWorkspaceChatAgent';
import type { ChatPrompt } from '../../../../../src/types/Prompt';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

jest.mock('./workspaceAgentStorage', () => ({ provideWorkspaceAgentCollection: jest.fn() }));
jest.mock('../../../../../scripts/run-codex-prompts/main/resolvePromptRunner', () => ({
    ...jest.requireActual('../../../../../scripts/run-codex-prompts/main/resolvePromptRunner'),
    resolvePromptRunner: jest.fn(),
}));
jest.mock('../../../../../scripts/run-codex-prompts/workspace/workspaceExecutionSelection', () => ({
    ...jest.requireActual('../../../../../scripts/run-codex-prompts/workspace/workspaceExecutionSelection'),
    discoverWorkspaceHarnesses: jest.fn(),
}));

describe('workspace chat shared execution', () => {
    let fixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
    let previousWorkspace: string | undefined;
    let previousRepository: string | undefined;
    beforeEach(async () => {
        fixture = await createWorkspaceFixture({
            'developer.book': 'Developer\nGOAL Original instructions.\n',
            'design/designer.book': 'Designer\nGOAL Design instructions.\n',
        });
        previousWorkspace = process.env.PTBK_AGENTS_SERVER_WORKSPACE;
        previousRepository = process.env.PTBK_AGENTS_SERVER_REPOSITORY_ROOT;
        process.env.PTBK_AGENTS_SERVER_WORKSPACE = fixture.root;
        process.env.PTBK_AGENTS_SERVER_REPOSITORY_ROOT = fixture.root;
        jest.mocked(provideWorkspaceAgentCollection).mockResolvedValue(fixture.collection);
        jest.mocked(discoverWorkspaceHarnesses).mockResolvedValue(['qwen-code']);
    });
    afterEach(async () => {
        if (previousWorkspace === undefined) delete process.env.PTBK_AGENTS_SERVER_WORKSPACE;
        else process.env.PTBK_AGENTS_SERVER_WORKSPACE = previousWorkspace;
        if (previousRepository === undefined) delete process.env.PTBK_AGENTS_SERVER_REPOSITORY_ROOT;
        else process.env.PTBK_AGENTS_SERVER_REPOSITORY_ROOT = previousRepository;
        await fixture.dispose();
        jest.clearAllMocks();
    });

    it('chats with any Book through the real message executor using independent sessions and an immutable source snapshot', async () => {
        const runPrompt = jest.fn(async (options: { projectPath: string; prompt: string }) => {
            const path = join(options.projectPath, AGENT_QUEUED_MESSAGES_DIRECTORY_PATH, 'thread.book');
            const thread = Book.parse((await readFile(path, 'utf-8')) as string_book).getMessages();
            await writeFile(
                path,
                Book.fromMessages([
                    ...thread.map((message) => ({ ...message, sender: String(message.sender) })),
                    { sender: 'AGENT', content: 'Deterministic actual response' },
                ]).stringify(),
            );
            return { usage: ZERO_USAGE };
        });
        jest.mocked(resolvePromptRunner).mockImplementation(() => ({
            runner: { name: 'qwen-code', runPrompt },
            runnerMetadata: { runnerName: 'Qwen Code', modelName: 'fixture' },
        }));
        const definition = (await fixture.collection.listWorkspaceAgents()).find((agent) => agent.name === 'designer')!;
        const runtime = await prepareWorkspaceChatAgent(definition.id);
        await writeFile(join(fixture.root, definition.path), 'Designer\nGOAL New local instructions.\n');
        const prompt = {
            title: 'Chat',
            content: 'Please explain.',
            parameters: {},
            modelRequirements: { modelVariant: 'CHAT' },
        } as ChatPrompt;
        const progress = jest.fn();
        const [first, second] = await Promise.all([
            runtime.agent.callChatModelStream!(prompt, progress),
            runtime.agent.callChatModel(prompt),
        ]);
        expect(first.content).toBe('Deterministic actual response');
        expect(second.content).toBe(first.content);
        expect(first.usage).toEqual(ZERO_USAGE);
        expect(progress).toHaveBeenCalledWith(expect.objectContaining({ content: first.content }));
        expect(runPrompt.mock.calls[0]![0].projectPath).not.toBe(runPrompt.mock.calls[1]![0].projectPath);
        expect(
            runPrompt.mock.calls.every(([options]) =>
                options.projectPath.startsWith(join(fixture.root, '.promptbook/agent/sessions')),
            ),
        ).toBe(true);
        expect(runPrompt.mock.calls[0]![0].prompt).toContain('Design instructions');
        expect(runPrompt.mock.calls[0]![0].prompt).not.toContain('New local instructions');
        expect((await prepareWorkspaceChatAgent(definition.id)).agentSource).toContain('New local instructions');
        expect(fixture.state.listJobs()).toEqual([]);
    });

    it('does not silently change an unavailable configured provider or make a harness call', async () => {
        await writeFile(
            join(fixture.root, '.promptbook/config.json'),
            JSON.stringify({ coder: { harness: 'claude-code' } }),
        );
        await expect(prepareWorkspaceChatAgent('designer')).rejects.toThrow('unavailable');
        expect(resolvePromptRunner).not.toHaveBeenCalled();
    });
});
