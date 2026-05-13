import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { string_javascript_name } from '../../types/string_person_fullname';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { appendAggregatedUseCommitmentPlaceholder } from '../USE/aggregateUseCommitmentSystemMessages';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { createSerpSearchToolFunction } from '../_common/createSerpSearchToolFunction';

/**
 * USE DEEPSEARCH commitment definition
 *
 * The `USE DEEPSEARCH` commitment indicates that the agent should use a deeper research-oriented
 * search workflow instead of lightweight web search when it needs fresh information from the internet.
 *
 * The content following `USE DEEPSEARCH` is an arbitrary text that the agent should know
 * (e.g. search scope or research instructions).
 *
 * Example usage in agent source:
 *
 * ```book
 * USE DEEPSEARCH
 * USE DEEPSEARCH Compare official vendor documentation with independent benchmarks.
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseDeepSearchCommitmentDefinition extends BaseCommitmentDefinition<'USE DEEPSEARCH'> {
    public constructor() {
        super('USE DEEPSEARCH');
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE DEEPSEARCH.
     */
    get description(): string {
        return 'Enable the agent to use DeepSearch for more thorough internet research.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔬';
    }

    /**
     * Markdown documentation for USE DEEPSEARCH commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE DEEPSEARCH

            Enables the agent to use DeepSearch for broader, more thorough internet research than lightweight web search.

            ## Key aspects

            - The content following \`USE DEEPSEARCH\` is arbitrary guidance for the research workflow.
            - In Agents Server, the OpenAI Agents SDK runtime uses a nested deep-research agent for this tool.
            - Use this for investigations, comparisons, market scans, or other tasks that benefit from deeper synthesis.
            - Prefer regular \`USE SEARCH ENGINE\` when a quick factual lookup is enough.

            ## Examples

            \`\`\`book
            Due Diligence Researcher

            GOAL Investigate vendors thoroughly before making recommendations.
            USE DEEPSEARCH Compare official sources with credible third-party analysis.
            RULE Cite the strongest supporting sources in the final answer.
            \`\`\`

            \`\`\`book
            Market Analyst

            GOAL Build concise but well-grounded research briefs.
            USE DEEPSEARCH Focus on recent public information and competing viewpoints.
            CLOSED
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const existingTools = requirements.tools || [];

        const updatedTools = existingTools.some((tool) => tool.name === 'deep_search')
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: 'deep_search',
                      description: spaceTrim(`
                          Research the internet deeply and synthesize a grounded answer.
                          Use this tool for broader investigations, comparisons, and requests that need more than a quick search.
                      `),
                      parameters: {
                          type: 'object',
                          properties: {
                              query: {
                                  type: 'string',
                                  description: 'The research question or investigation request.',
                              },
                          },
                          required: ['query'],
                          additionalProperties: false,
                      },
                  } as TODO_any,
              ];

        return appendAggregatedUseCommitmentPlaceholder(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    useDeepSearch: content || true,
                },
            },
            this.type,
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            deep_search: 'DeepSearch',
        };
    }

    /**
     * Gets the local fallback implementation for the `deep_search` tool.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            deep_search: createSerpSearchToolFunction('deep_search', 'DeepSearch'),
        };
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
