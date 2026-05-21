import { Command } from 'commander';
import { runAgentsServer } from '../../../../scripts/run-agents-server/main/runAgentsServer';
import { $initializeAgentsServerStartCommand } from './run';

jest.mock('../../../../scripts/run-agents-server/main/runAgentsServer', () => ({
    runAgentsServer: jest.fn(),
}));

/**
 * Environment variables used by `ptbk agents-server start` tests.
 */
const TEST_ENVIRONMENT_KEYS = ['PORT', 'PTBK_AGENT', 'PTBK_MODEL', 'PTBK_THINKING_LEVEL'] as const;

/**
 * Original environment values restored after command tests.
 */
const ORIGINAL_ENVIRONMENT = Object.fromEntries(
    TEST_ENVIRONMENT_KEYS.map((environmentKey) => [environmentKey, process.env[environmentKey]]),
);

/**
 * Typed Jest mock for the Agents Server foreground runtime.
 */
function getRunAgentsServerMock(): jest.MockedFunction<typeof runAgentsServer> {
    return runAgentsServer as jest.MockedFunction<typeof runAgentsServer>;
}

describe('agents-server start command', () => {
    beforeEach(() => {
        getRunAgentsServerMock().mockResolvedValue(undefined);
    });

    afterEach(() => {
        for (const environmentKey of TEST_ENVIRONMENT_KEYS) {
            const originalValue = ORIGINAL_ENVIRONMENT[environmentKey];

            if (originalValue === undefined) {
                delete process.env[environmentKey];
                continue;
            }

            process.env[environmentKey] = originalValue;
        }

        jest.clearAllMocks();
    });

    it('uses prompt runner and port environment values when flags are omitted', async () => {
        process.env.PORT = '4555';
        process.env.PTBK_AGENT = 'github-copilot';
        process.env.PTBK_MODEL = 'gpt-5.4';
        process.env.PTBK_THINKING_LEVEL = 'xhigh';

        const program = new Command();
        $initializeAgentsServerStartCommand(program);

        await program.parseAsync(['node', 'test', 'start'], { from: 'node' });

        expect(getRunAgentsServerMock()).toHaveBeenCalledWith({
            port: 4555,
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'xhigh',
            noUi: false,
        });
    });

    it('lets explicit flags override environment values', async () => {
        process.env.PORT = '4555';
        process.env.PTBK_AGENT = 'openai-codex';
        process.env.PTBK_MODEL = 'gpt-5.5';
        process.env.PTBK_THINKING_LEVEL = 'low';

        const program = new Command();
        $initializeAgentsServerStartCommand(program);

        await program.parseAsync(
            [
                'node',
                'test',
                'start',
                '--port',
                '4666',
                '--agent',
                'github-copilot',
                '--model',
                'gpt-5.4',
                '--thinking-level',
                'xhigh',
                '--no-ui',
            ],
            { from: 'node' },
        );

        expect(getRunAgentsServerMock()).toHaveBeenCalledWith({
            port: 4666,
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'xhigh',
            noUi: true,
        });
    });
});
