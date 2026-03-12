import { describe, expect, it } from '@jest/globals';
import { TOOL_RUNTIME_CONTEXT_PARAMETER } from '../../../../src/commitments/_common/toolRuntimeContext';
import { PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER } from './githubTokenPromptParameter';
import { composePromptParametersWithMemoryContext } from './memoryRuntimeContext';
import { USER_LOCATION_PROMPT_PARAMETER } from './userLocationPromptParameter';

describe('composePromptParametersWithMemoryContext', () => {
    it('embeds user location into hidden runtime context and strips internal prompt parameter', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                plain: 'value',
                [USER_LOCATION_PROMPT_PARAMETER]: JSON.stringify({
                    permission: 'granted',
                    latitude: 48.15,
                    longitude: 17.11,
                }),
            },
            currentUserIdentity: null,
            agentName: 'Test Agent',
        });

        expect(parameters.plain).toBe('value');
        expect(parameters[USER_LOCATION_PROMPT_PARAMETER]).toBeUndefined();

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.userLocation).toMatchObject({
            permission: 'granted',
            latitude: 48.15,
            longitude: 17.11,
        });
    });

    it('embeds project runtime context and strips GitHub token prompt parameter', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                plain: 'value',
                [PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER]: '  ghp_test_token  ',
            },
            currentUserIdentity: null,
            agentName: 'Test Agent',
            projectRepositories: [
                'https://github.com/example/project',
                'https://github.com/example/project',
                'example/another-project',
            ],
        });

        expect(parameters.plain).toBe('value');
        expect(parameters[PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER]).toBeUndefined();

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.projects).toEqual({
            githubToken: 'ghp_test_token',
            repositories: ['https://github.com/example/project', 'example/another-project'],
        });
    });

    it('prefers explicitly provided projectGithubToken over prompt parameter', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                [PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER]: 'ghp_old_token',
            },
            currentUserIdentity: null,
            agentName: 'Test Agent',
            projectGithubToken: 'ghp_wallet_token',
        });

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.projects).toEqual({
            githubToken: 'ghp_wallet_token',
        });
    });

    it('embeds email runtime context when SMTP credential and sender are provided', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                plain: 'value',
            },
            currentUserIdentity: null,
            agentName: 'Test Agent',
            emailSmtpCredential:
                '{"host":"smtp.example.com","port":587,"secure":false,"username":"agent@example.com","password":"secret"}',
            emailFromAddress: 'agent@example.com',
        });

        expect(parameters.plain).toBe('value');

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.email).toEqual({
            smtpCredential:
                '{"host":"smtp.example.com","port":587,"secure":false,"username":"agent@example.com","password":"secret"}',
            fromAddress: 'agent@example.com',
        });
        expect(runtimeContext.spawn).toMatchObject({
            depth: 0,
        });
    });

    it('embeds scoped chat runtime context for thread-bound tools', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                plain: 'value',
            },
            currentUserIdentity: {
                userId: 42,
                user: {
                    username: 'tester',
                    isAdmin: false,
                    profileImageUrl: null,
                },
            },
            agentPermanentId: 'agent-timeout',
            agentName: 'Timeout Agent',
            chatId: 'chat-123',
        });

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.chat).toEqual({
            chatId: 'chat-123',
            userId: 42,
            agentId: 'agent-timeout',
            agentName: 'Timeout Agent',
            parameters: {
                plain: 'value',
            },
        });
    });
});
