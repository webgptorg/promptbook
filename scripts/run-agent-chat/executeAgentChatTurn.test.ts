import { appendFile, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { UNCERTAIN_USAGE } from '../../src/execution/utils/usage-constants';
import { resolvePromptRunner } from '../run-codex-prompts/main/resolvePromptRunner';
import { executeAgentChatTurn } from './executeAgentChatTurn';

jest.mock('../run-codex-prompts/main/resolvePromptRunner', () => ({
    resolvePromptRunner: jest.fn(),
}));

/**
 * Typed Jest mock for shared harness resolution.
 */
function getResolvePromptRunnerMock(): jest.MockedFunction<typeof resolvePromptRunner> {
    return resolvePromptRunner as jest.MockedFunction<typeof resolvePromptRunner>;
}

/**
 * Creates one temporary project directory for local agent chat tests.
 */
async function createTemporaryProject(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'ptbk-agent-chat-'));
}

describe('executeAgentChatTurn', () => {
    let temporaryProjectPath: string | undefined;

    beforeEach(() => {
        getResolvePromptRunnerMock().mockReturnValue({
            runner: {
                name: 'mock-runner',
                runPrompt: jest.fn(async ({ projectPath }) => {
                    await appendFile(
                        join(projectPath, 'messages', 'queued', 'thread.book'),
                        '\nMESSAGE @Agent\nThere are 5 events in your calendar.\n',
                        'utf-8',
                    );
                    return { usage: UNCERTAIN_USAGE };
                }),
            },
            actualRunnerModel: 'gpt-5.4',
            runnerMetadata: {
                runnerName: 'mock-runner',
                modelName: 'gpt-5.4',
            },
        });
    });

    afterEach(async () => {
        jest.clearAllMocks();

        if (temporaryProjectPath) {
            await rm(temporaryProjectPath, { recursive: true, force: true });
            temporaryProjectPath = undefined;
        }
    });

    it('runs one turn through the shared harness and parses the appended agent answer', async () => {
        temporaryProjectPath = await createTemporaryProject();
        await writeFile(
            join(temporaryProjectPath, 'calendar.book'),
            'Calendar Agent\n\nPERSONA You answer calendar questions with exact counts.\n',
            'utf-8',
        );

        const result = await executeAgentChatTurn({
            currentWorkingDirectory: temporaryProjectPath,
            agentPath: './calendar.book',
            context: 'Calendar snapshot: five events.',
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            isVerbose: false,
            noUi: true,
            thinkingLevel: 'xhigh',
            allowCredits: false,
            messages: [
                {
                    sender: 'USER',
                    content: 'How many events are in my calendar?',
                },
            ],
        });

        expect(result.answer).toBe('There are 5 events in your calendar.');
        expect(result.workspacePath.replace(/\\/gu, '/')).toContain(
            join(temporaryProjectPath, '.promptbook', 'agent', 'sessions').replace(/\\/gu, '/'),
        );
        expect(await readFile(result.messageFilePath, 'utf-8')).toContain('MESSAGE @Agent');
        const runner = getResolvePromptRunnerMock().mock.results[0]!.value.runner;
        const prompt = (runner.runPrompt as jest.Mock).mock.calls[0]![0].prompt as string;

        expect(prompt).toContain('Read `messages/queued/thread.book`');
        expect(prompt).toContain('You are Calendar Agent');
        expect(prompt).toContain('You answer calendar questions with exact counts.');
        expect(prompt).toContain('## Additional context');
        expect(prompt).toContain('Calendar snapshot: five events.');
        expect(getResolvePromptRunnerMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                agentName: 'github-copilot',
                model: 'gpt-5.4',
                noUi: true,
                thinkingLevel: 'xhigh',
                noCommit: true,
                ignoreGitChanges: true,
            }),
        );
        expect(runner.runPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                shouldPrintLiveOutput: false,
            }),
        );
    });

    it('keeps previous conversation messages in the temporary thread book', async () => {
        temporaryProjectPath = await createTemporaryProject();
        await writeFile(join(temporaryProjectPath, 'support.book'), 'Support Agent\n\nRULE Be concise.\n', 'utf-8');

        await executeAgentChatTurn({
            currentWorkingDirectory: temporaryProjectPath,
            agentPath: './support.book',
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            isVerbose: false,
            noUi: true,
            allowCredits: false,
            messages: [
                {
                    sender: 'USER',
                    content: 'First question',
                },
                {
                    sender: 'AGENT',
                    content: 'First answer',
                },
                {
                    sender: 'USER',
                    content: 'Second question',
                },
            ],
        });

        const runner = getResolvePromptRunnerMock().mock.results[0]!.value.runner;
        expect(runner.runPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                projectPath: expect.any(String),
            }),
        );
        const projectPath = (runner.runPrompt as jest.Mock).mock.calls[0]![0].projectPath as string;
        const threadBook = await readFile(join(projectPath, 'messages', 'queued', 'thread.book'), 'utf-8');

        expect(threadBook).toContain('MESSAGE @User\nFirst question');
        expect(threadBook).toContain('MESSAGE @Agent\nFirst answer');
        expect(threadBook).toContain('MESSAGE @User\nSecond question');
    });
});
