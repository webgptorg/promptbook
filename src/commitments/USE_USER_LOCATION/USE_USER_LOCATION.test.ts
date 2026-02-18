import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';
import { UseUserLocationCommitmentDefinition } from './USE_USER_LOCATION';

describe('createAgentModelRequirementsWithCommitments with USE USER LOCATION', () => {
    it('should add user location tool when USE USER LOCATION is present', async () => {
        const agentSource = spaceTrim(`
            Location Agent
            USE USER LOCATION
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'get_user_location',
            }),
        );
        expect(requirements.systemMessage).toContain('"get_user_location"');
    });

    it('should include extra instructions in the system message when provided', async () => {
        const agentSource = spaceTrim(`
            Location Agent
            USE USER LOCATION Use location only for city-level recommendations.
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.systemMessage).toContain('User location instructions');
        expect(requirements.systemMessage).toContain('Use location only for city-level recommendations.');
    });
});

describe('UseUserLocationCommitmentDefinition tool function', () => {
    it('returns unavailable result without runtime context', async () => {
        const definition = new UseUserLocationCommitmentDefinition();
        const tools = definition.getToolFunctions();
        const getUserLocation = tools.get_user_location!;

        const result = await getUserLocation({});
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toMatchObject({
            status: 'unavailable',
        });
    });

    it('returns permission denied when browser denied geolocation', async () => {
        const definition = new UseUserLocationCommitmentDefinition();
        const tools = definition.getToolFunctions();
        const getUserLocation = tools.get_user_location!;

        const result = await getUserLocation({
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                userLocation: {
                    permission: 'denied',
                },
            }),
        });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toMatchObject({
            status: 'permission-denied',
        });
    });

    it('returns normalized location when provided in runtime context', async () => {
        const definition = new UseUserLocationCommitmentDefinition();
        const tools = definition.getToolFunctions();
        const getUserLocation = tools.get_user_location!;

        const result = await getUserLocation({
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                userLocation: {
                    permission: 'granted',
                    latitude: 50.087451,
                    longitude: 14.420671,
                    accuracyMeters: 10,
                    altitudeMeters: null,
                    headingDegrees: null,
                    speedMetersPerSecond: null,
                    timestamp: '2026-02-18T12:00:00.000Z',
                },
            }),
        });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toMatchObject({
            status: 'ok',
            location: {
                permission: 'granted',
                latitude: 50.087451,
                longitude: 14.420671,
                accuracyMeters: 10,
                timestamp: '2026-02-18T12:00:00.000Z',
            },
        });
    });
});
