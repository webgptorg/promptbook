import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { keepUnused } from '../../utils/organization/keepUnused';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE TIME commitment definition
 *
 * The `USE TIME` commitment indicates that the agent should be able to determine the current date and time.
 *
 * Example usage in agent source:
 *
 * ```book
 * USE TIME
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseTimeCommitmentDefinition extends BaseCommitmentDefinition<'USE TIME'> {
    constructor() {
        super('USE TIME', ['CURRENT TIME', 'TIME', 'DATE']);
    }

    /**
     * Short one-line description of USE TIME.
     */
    public get description(): string {
        return 'Enable the agent to determine the current date and time.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🕒';
    }

    /**
     * Markdown documentation for USE TIME commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE TIME

            Enables the agent to determine the current date and time.

            ## Key aspects

            - This tool won't receive any input.
            - It outputs the current date and time as an ISO 8601 string.
            - Allows the agent to answer questions about the current time or date.

            ## Examples

            \`\`\`book
            Time-aware Assistant

            PERSONA You are a helpful assistant who knows the current time.
            USE TIME
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        keepUnused(content); // <- Note: `USE TIME` does not require content

        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add 'get_current_time' to tools if not already present
        const updatedTools = existingTools.some((tool) => tool.name === 'get_current_time')
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: 'get_current_time',
                      description: 'Get the current date and time in ISO 8601 format.',
                      parameters: {
                          type: 'object',
                          properties: {
                              timezone: {
                                  type: 'string',
                                  description: 'Optional timezone name (e.g. "Europe/Prague", "UTC", "America/New_York").',
                              },
                          },
                          required: [],
                      },
                  } as TODO_any, // <- TODO: !!!! Remove any
                  // <- TODO: !!!! define the function in LLM tools
              ];

        // Return requirements with updated tools and metadata
        return {
            ...requirements,
            tools: updatedTools,
            metadata: {
                ...requirements.metadata,
            },
        };
    }

    /**
     * Gets the `get_current_time` tool function implementation.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async get_current_time(args: { timezone?: string }): Promise<string> {
                console.log('!!!! [Tool] get_current_time called', { args });

                const { timezone } = args;

                if (!timezone) {
                    return new Date().toISOString();
                }

                try {
                    // Note: Returning ISO 8601 string but in the requested timezone
                    const formatter = new Intl.DateTimeFormat('en-CA', {
                        timeZone: timezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                        timeZoneName: 'shortOffset',
                    });

                    const parts = formatter.formatToParts(new Date());
                    const part = (type: string) => parts.find((p) => p.type === type)?.value;

                    // en-CA format is YYYY-MM-DD
                    const isoString = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part(
                        'minute',
                    )}:${part('second')}${part('timeZoneName')?.replace('GMT', '')}`;

                    return isoString;
                } catch (error) {
                    // Fallback to UTC if timezone is invalid
                    return new Date().toISOString();
                }
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
