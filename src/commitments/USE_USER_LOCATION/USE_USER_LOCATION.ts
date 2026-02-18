import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { readToolRuntimeContextFromToolArgs, type UserLocationRuntimeContext } from '../_common/toolRuntimeContext';

/**
 * Tool name used by the USE USER LOCATION commitment.
 *
 * @private internal USE USER LOCATION constant
 */
const GET_USER_LOCATION_TOOL_NAME = 'get_user_location' as string_javascript_name;

/**
 * Tool arguments for getting user location.
 *
 * @private internal USE USER LOCATION types
 */
type GetUserLocationToolArgs = {
    [key: string]: TODO_any;
};

/**
 * Result payload returned by the user location tool.
 *
 * @private internal USE USER LOCATION types
 */
type GetUserLocationToolResult = {
    status: 'ok' | 'unavailable' | 'permission-denied';
    location?: UserLocationRuntimeContext;
    message: string;
};

/**
 * Returns a finite number when valid.
 *
 * @private utility of USE USER LOCATION commitment
 */
function normalizeFiniteNumber(value: unknown): number | undefined {
    if (typeof value !== 'number') {
        return undefined;
    }

    return Number.isFinite(value) ? value : undefined;
}

/**
 * Returns a finite number or null when explicitly null.
 *
 * @private utility of USE USER LOCATION commitment
 */
function normalizeNullableFiniteNumber(value: unknown): number | null | undefined {
    if (value === null) {
        return null;
    }

    return normalizeFiniteNumber(value);
}

/**
 * Normalizes raw runtime location payload into a safe location object.
 *
 * @private utility of USE USER LOCATION commitment
 */
function normalizeUserLocation(location: UserLocationRuntimeContext): UserLocationRuntimeContext {
    return {
        permission: location.permission,
        latitude: normalizeFiniteNumber(location.latitude),
        longitude: normalizeFiniteNumber(location.longitude),
        accuracyMeters: normalizeFiniteNumber(location.accuracyMeters),
        altitudeMeters: normalizeNullableFiniteNumber(location.altitudeMeters),
        headingDegrees: normalizeNullableFiniteNumber(location.headingDegrees),
        speedMetersPerSecond: normalizeNullableFiniteNumber(location.speedMetersPerSecond),
        timestamp: typeof location.timestamp === 'string' ? location.timestamp : undefined,
    };
}

/**
 * Resolves the user location payload from hidden tool runtime context.
 *
 * @private utility of USE USER LOCATION commitment
 */
function resolveUserLocationFromRuntimeContext(args: GetUserLocationToolArgs): UserLocationRuntimeContext | null {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    const location = runtimeContext?.userLocation;
    if (!location || typeof location !== 'object') {
        return null;
    }

    return normalizeUserLocation(location);
}

/**
 * Creates a standard "unavailable location" tool result.
 *
 * @private utility of USE USER LOCATION commitment
 */
function createUnavailableLocationResult(): GetUserLocationToolResult {
    return {
        status: 'unavailable',
        message:
            'User location is not available in this runtime context. Ask the user to allow location sharing in browser, or ask for their city manually.',
    };
}

/**
 * Creates a standard "permission denied" tool result.
 *
 * @private utility of USE USER LOCATION commitment
 */
function createPermissionDeniedResult(): GetUserLocationToolResult {
    return {
        status: 'permission-denied',
        message:
            'Location access is denied by the user/browser. Ask the user to enable location access or provide their location manually.',
    };
}

/**
 * USE USER LOCATION commitment definition.
 *
 * The `USE USER LOCATION` commitment enables an agent to retrieve user location from runtime context.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseUserLocationCommitmentDefinition extends BaseCommitmentDefinition<'USE USER LOCATION'> {
    public constructor() {
        super('USE USER LOCATION', ['USER LOCATION']);
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE USER LOCATION.
     */
    public get description(): string {
        return 'Enable the agent to determine the user location when browser permission is granted.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📍';
    }

    /**
     * Markdown documentation for USE USER LOCATION commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE USER LOCATION

            Enables the agent to retrieve the user's location from runtime context.

            ## Key aspects

            - The location is requested by the browser runtime (with user permission).
            - Use the tool \`get_user_location\` when an answer depends on user's location.
            - If location is unavailable or denied, ask the user to enable location sharing or provide location manually.
            - The content following \`USE USER LOCATION\` can define additional location usage instructions.

            ## Examples

            \`\`\`book
            Local Assistant

            PERSONA You help with local recommendations.
            USE USER LOCATION
            \`\`\`

            \`\`\`book
            Travel Assistant

            PERSONA You help users with nearby transport and weather.
            USE USER LOCATION Use location only when strictly needed.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('User location instructions', content);
        const existingTools = requirements.tools || [];

        const tools: ReadonlyArray<LlmToolDefinition> = existingTools.some(
            (tool) => tool.name === GET_USER_LOCATION_TOOL_NAME,
        )
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: GET_USER_LOCATION_TOOL_NAME,
                      description: spaceTrim(`
                          Retrieves user location shared by browser runtime (if permission is granted).
                          Returns JSON status with coordinates and metadata when available.
                      `),
                      parameters: {
                          type: 'object',
                          properties: {},
                          required: [],
                      },
                  },
              ];

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools,
                _metadata: {
                    ...requirements._metadata,
                    useUserLocation: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    User location:
                    - Use "${GET_USER_LOCATION_TOOL_NAME}" only when location is needed for a better answer.
                    - If the tool returns "unavailable" or "permission-denied", ask user to share location or provide city manually.
                    - Do not invent coordinates or local facts when location is unavailable.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [GET_USER_LOCATION_TOOL_NAME]: 'Get user location',
        };
    }

    /**
     * Gets the `get_user_location` tool function implementation.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async [GET_USER_LOCATION_TOOL_NAME](args: GetUserLocationToolArgs): Promise<string> {
                const location = resolveUserLocationFromRuntimeContext(args);
                if (!location) {
                    return JSON.stringify(createUnavailableLocationResult());
                }

                if (location.permission === 'denied') {
                    return JSON.stringify(createPermissionDeniedResult());
                }

                if (location.latitude === undefined || location.longitude === undefined) {
                    return JSON.stringify(createUnavailableLocationResult());
                }

                const result: GetUserLocationToolResult = {
                    status: 'ok',
                    location: {
                        ...location,
                        permission: location.permission || 'granted',
                    },
                    message: 'User location is available.',
                };

                return JSON.stringify(result);
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
