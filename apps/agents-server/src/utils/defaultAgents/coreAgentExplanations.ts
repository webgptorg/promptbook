import { spaceTrim } from 'spacetrim';

/**
 * Curated explanation of why each bundled core agent exists.
 *
 * The authoritative set of core agents is defined by the `*.book` files in `agents/default/.core`; this map only adds a
 * human-readable rationale keyed by the normalized agent name so the Core Agents admin page can explain the purpose of
 * each one. Core agents that are not listed here fall back to `GENERIC_CORE_AGENT_EXPLANATION`.
 *
 * @private utility of Agents Server core-agent tracking
 */
export const CORE_AGENT_EXPLANATION_BY_AGENT_NAME: Readonly<Record<string, string>> = {
    adam: spaceTrim(`
        **Adam** is the root ancestor agent. Every agent that does not use an explicit \`FROM\` commitment inherits from
        Adam, so its persona, rules, and base capabilities form the shared foundation of all agents on this server.
        Removing Adam breaks the default inheritance chain for new and existing agents.
    `),
    expert: spaceTrim(`
        **Expert** is the Book-language specialist that other core agents build on. It carries the knowledge about the
        Book language used whenever an agent needs to reason about or generate Book sources, and it is the ancestor of
        the Creator agent.
    `),
    creator: spaceTrim(`
        **Creator** turns any input into a Book-language agent. It powers the "create an agent from a description"
        flows and inherits from Expert, so it depends on the other core agents being present.
    `),
    teacher: spaceTrim(`
        **Teacher** explains and consults on the Book language and guides users while they write or modify agents. It is
        used by the self-learning features and inherits from Adam.
    `),
};

/**
 * Fallback explanation shown for a core agent that has no curated rationale.
 *
 * @private utility of Agents Server core-agent tracking
 */
export const GENERIC_CORE_AGENT_EXPLANATION = spaceTrim(`
    This is a core agent bundled in the \`.core\` folder. Core agents are used as a shared base building block for the
    other agents on this server.
`);

/**
 * Resolves the human-readable explanation of why one core agent exists.
 *
 * @param agentName - Normalized agent name (for example \`adam\`).
 * @returns Curated explanation, or a generic fallback for unknown core agents.
 *
 * @private utility of Agents Server core-agent tracking
 */
export function resolveCoreAgentExplanation(agentName: string): string {
    return CORE_AGENT_EXPLANATION_BY_AGENT_NAME[agentName.toLowerCase()] ?? GENERIC_CORE_AGENT_EXPLANATION;
}
