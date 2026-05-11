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

    it('embeds calendar runtime context when token and configured calendars are provided', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                plain: 'value',
            },
            currentUserIdentity: null,
            agentName: 'Calendar Agent',
            calendarGoogleAccessToken: 'google_access_token',
            calendarConnections: [
                {
                    provider: 'google',
                    url: 'https://calendar.google.com/calendar/u/0/r',
                    calendarId: 'primary',
                    scopes: ['https://www.googleapis.com/auth/calendar'],
                },
            ],
        });

        expect(parameters.plain).toBe('value');

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.calendars).toEqual({
            googleAccessToken: 'google_access_token',
            connections: [
                {
                    provider: 'google',
                    url: 'https://calendar.google.com/calendar/u/0/r',
                    calendarId: 'primary',
                    scopes: ['https://www.googleapis.com/auth/calendar'],
                },
            ],
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

    it('embeds assistant message id for scoped durable progress updates', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {},
            currentUserIdentity: {
                userId: 7,
                user: {
                    username: 'progress-user',
                    isAdmin: false,
                    profileImageUrl: null,
                },
            },
            agentPermanentId: 'agent-progress',
            agentName: 'Progress Agent',
            chatId: 'chat-progress',
            assistantMessageId: 'assistant-message-1',
        });

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.chat).toEqual({
            chatId: 'chat-progress',
            userId: 7,
            agentId: 'agent-progress',
            agentName: 'Progress Agent',
            assistantMessageId: 'assistant-message-1',
            parameters: {},
        });
    });

    it('embeds current chat attachments into hidden runtime context without requiring chat id', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {},
            currentUserIdentity: null,
            agentPermanentId: 'agent-files',
            agentName: 'Files Agent',
            chatAttachments: [
                {
                    name: 'captions.sbv',
                    type: 'text/plain',
                    url: 'https://cdn.example.com/files/captions.sbv',
                },
            ],
        });

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.chat).toEqual({
            agentId: 'agent-files',
            agentName: 'Files Agent',
            parameters: {},
            attachments: [
                {
                    name: 'captions.sbv',
                    type: 'text/plain',
                    url: 'https://cdn.example.com/files/captions.sbv',
                },
            ],
        });
    });

    it('reuses existing serialized project and calendar runtime context when explicit overrides are omitted', () => {
        const parameters = composePromptParametersWithMemoryContext({
            baseParameters: {
                [TOOL_RUNTIME_CONTEXT_PARAMETER]: JSON.stringify({
                    projects: {
                        githubToken: 'ghp_existing_token',
                        repositories: ['example/project'],
                    },
                    calendars: {
                        googleAccessToken: 'existing_google_token',
                        connections: [
                            {
                                provider: 'google',
                                url: 'https://calendar.google.com/calendar/u/0/r',
                                calendarId: 'primary',
                            },
                        ],
                    },
                    spawn: {
                        depth: 2,
                        parentAgentId: 'agent-parent',
                    },
                }),
            },
            currentUserIdentity: null,
            agentName: 'Test Agent',
        });

        const runtimeContext = JSON.parse(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]!);
        expect(runtimeContext.projects).toEqual({
            githubToken: 'ghp_existing_token',
            repositories: ['example/project'],
        });
        expect(runtimeContext.calendars).toEqual({
            googleAccessToken: 'existing_google_token',
            connections: [
                {
                    provider: 'google',
                    url: 'https://calendar.google.com/calendar/u/0/r',
                    calendarId: 'primary',
                },
            ],
        });
        expect(runtimeContext.spawn).toEqual({
            depth: 2,
            parentAgentId: 'agent-parent',
        });
    });
});
