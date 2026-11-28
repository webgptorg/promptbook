import { join } from 'path';
import {
    PTBK_AGENTS_SERVER_URL_ENV,
    PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
} from '../../../apps/agents-server/src/utils/agentProjects/agentProjectRuntimeConstants';
import { resolveAgentProjectRuntimePromptApi } from './resolveAgentProjectRuntimePromptApi';

/**
 * Original environment values restored after each test.
 */
const ORIGINAL_ENVIRONMENT = {
    [PTBK_AGENTS_SERVER_URL_ENV]: process.env[PTBK_AGENTS_SERVER_URL_ENV],
    [PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV]: process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV],
};

describe('resolveAgentProjectRuntimePromptApi', () => {
    afterEach(() => {
        restoreEnvironmentVariable(PTBK_AGENTS_SERVER_URL_ENV, ORIGINAL_ENVIRONMENT[PTBK_AGENTS_SERVER_URL_ENV]);
        restoreEnvironmentVariable(
            PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
            ORIGINAL_ENVIRONMENT[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV],
        );
    });

    it('resolves runtime API details for Agents Server-managed agent folders', () => {
        process.env[PTBK_AGENTS_SERVER_URL_ENV] = 'http://localhost:4440';
        process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV] = 'test-worker-token';

        expect(resolveAgentProjectRuntimePromptApi(join('/', 'srv', 'agents', 'agent-abc123'))).toEqual({
            agentPermanentId: 'abc123',
            serverUrlEnvironmentVariableName: PTBK_AGENTS_SERVER_URL_ENV,
            tokenEnvironmentVariableName: PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
        });
    });

    it('resolves nothing outside Agents Server-managed runs', () => {
        delete process.env[PTBK_AGENTS_SERVER_URL_ENV];
        delete process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV];

        expect(resolveAgentProjectRuntimePromptApi(join('/', 'srv', 'agents', 'agent-abc123'))).toBe(undefined);
        expect(resolveAgentProjectRuntimePromptApi(join('/', 'tmp', 'session'))).toBe(undefined);
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

