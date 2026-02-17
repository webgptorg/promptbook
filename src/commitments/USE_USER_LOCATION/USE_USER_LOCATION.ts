import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { waitForUserLocation } from './userLocationRequests';

/**
 * Argument shape that the `get_user_location` tool receives from the model.
 *
 * @private internal helper of USE USER LOCATION commitment
 */
type LocationToolArgs = Record<string, unknown> & {
    readonly reason?: string;
    readonly accuracy?: 'country' | 'region' | 'city' | 'exact';
    readonly __promptbookToolCallId?: string;
};

/**
 * USE USER LOCATION commitment definition that grants the agent access to browser location requests.
 *
 * @private internal helper of USE commitment suite
 */
export class UseUserLocationCommitmentDefinition extends BaseCommitmentDefinition<'USE USER LOCATION'> {
    public constructor() {
        super('USE USER LOCATION', ['USER LOCATION', 'LOCATION']);
    }

    override get requiresContent(): boolean {
        return false;
    }

    get description(): string {
        return 'Ask the user for their current location when the task explicitly relies on it.';
    }

    get icon(): string {
        return '📍';
    }

    get documentation(): string {
        return spaceTrim(`
            # USE USER LOCATION

            Grants the agent permission to ask the browser for the user\'s location and use those coordinates when the task depends on them.

            ## Key aspects

            - Call the tool \`get_user_location\` only when you truly cannot complete the request without knowing where the user is.
            - Pass a clear reason so the user understands why the location is needed.
            - Respect rejections: if the user declines or location is unavailable, continue without assuming their position.
            - The browser prompts for permission and reports the result back; do not try to guess or store location data for future turns.

            ## Example

            ```book
            Weather Agent

            PERSONA You give local forecasts.
            USE USER LOCATION You need the user\'s city to format the weather report.
            ```
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Location instructions', content);
        const existingTools = requirements.tools || [];
        const hasLocationTool = existingTools.some((tool) => tool.name === 'get_user_location');

        const updatedTools = hasLocationTool
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: 'get_user_location',
                      description: spaceTrim(`
                        Requests the user\'s current latitude and longitude via the browser.
                        Use it only when the task depends on the user\'s place and provide a short reason.
                    `),
                      parameters: {
                          type: 'object',
                          properties: {
                              reason: {
                                  type: 'string',
                                  description: 'Explain why the location matters for this turn.',
                              },
                              accuracy: {
                                  type: 'string',
                                  enum: ['country', 'region', 'city', 'exact'],
                                  description: 'Preferred location precision.',
                              },
                          },
                          required: [],
                      },
                  } as TODO_any,
              ];

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    useUserLocation: content || true,
                },
            },
            spaceTrim((block) => `
                Location context:
                - Request the user\'s coordinates through the tool "get_user_location" once the task truly needs them.
                - Explain the reason in the tool arguments so the user understands what you\'re doing.
                - If the user cannot or will not share their location, continue without assuming a default place.
                - The browser handles the permission dialog and the tool returns JSON with latitude/longitude.
                ${block(extraInstructions)}
            `),
        );
    }

    getToolTitles(): Record<string_javascript_name, string> {
        return {
            get_user_location: 'Get user location',
        };
    }

    /**
     * Provides the browser-backed `get_user_location` tool implementation.
     *
     * @private internal helper of USE USER LOCATION commitment
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async get_user_location(args: LocationToolArgs): Promise<string> {
                console.log('!!!! [Tool] get_user_location called', { args });
                const callId = typeof args.__promptbookToolCallId === 'string' ? args.__promptbookToolCallId : null;
                if (!callId) {
                    throw new Error('get_user_location was called without a tool call identifier.');
                }

                const location = await waitForUserLocation(callId);
                return JSON.stringify(location);
            },
        };
    }
}
