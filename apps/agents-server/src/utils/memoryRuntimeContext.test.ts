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
});
