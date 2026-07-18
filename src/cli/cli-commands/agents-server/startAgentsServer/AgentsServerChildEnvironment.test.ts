import {
    PTBK_AGENTS_SERVER_URL_ENV,
    PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
} from '../../../../../apps/agents-server/src/utils/agentProjects/agentProjectRuntimeConstants';
import { createAgentsServerChildEnvironment } from './AgentsServerChildEnvironment';

/**
 * Original process environment restored after each test.
 */
const ORIGINAL_ENVIRONMENT = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    [PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV]:
        process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV],
};

describe('createAgentsServerChildEnvironment', () => {
    afterEach(() => {
        restoreEnvironmentVariable('NEXT_PUBLIC_SITE_URL', ORIGINAL_ENVIRONMENT.NEXT_PUBLIC_SITE_URL);
        restoreEnvironmentVariable(
            PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
            ORIGINAL_ENVIRONMENT[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV],
        );
    });

    it('keeps local runner API calls on the loopback server URL', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://agents.example.com';
        process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV] = 'test-worker-token';

        const environment = createAgentsServerChildEnvironment(4440, 'C:\\agents');

        expect(environment.NEXT_PUBLIC_SITE_URL).toBe('https://agents.example.com');
        expect(environment[PTBK_AGENTS_SERVER_URL_ENV]).toBe('http://localhost:4440');
        expect(environment[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV]).toBe('test-worker-token');
    });
});

/**
 * Restores or removes one environment variable.
 */
function restoreEnvironmentVariable(environmentVariableName: string, previousValue: string | undefined): void {
    if (previousValue === undefined) {
        delete process.env[environmentVariableName];
        return;
    }

    process.env[environmentVariableName] = previousValue;
}
