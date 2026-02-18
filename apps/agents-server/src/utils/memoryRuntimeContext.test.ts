import { describe, expect, it } from '@jest/globals';
import { TOOL_RUNTIME_CONTEXT_PARAMETER } from '../../../../src/commitments/_common/toolRuntimeContext';
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
});
