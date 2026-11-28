import type { PlannedMessageManagerRecord } from '../plannedMessagesAdmin';

/**
 * One agent offered by the planned-message agent filter.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageAgentOption = {
    readonly agentPermanentId: string;
    readonly agentName: string | null;
    readonly plannedMessageCount: number;
};

/**
 * Collects the agents that really have planned messages, for the agent filter.
 *
 * Only agents present in the listing are offered, so the filter can never select an empty result.
 *
 * @param plannedMessages - All planned messages of the server.
 * @returns Agents sorted by their displayed name.
 *
 * @private internal admin utility of Agents Server
 */
export function collectPlannedMessageAgentOptions(
    plannedMessages: ReadonlyArray<PlannedMessageManagerRecord>,
): Array<PlannedMessageAgentOption> {
    const optionsByAgentPermanentId = new Map<string, PlannedMessageAgentOption>();

    for (const plannedMessage of plannedMessages) {
        const existingOption = optionsByAgentPermanentId.get(plannedMessage.agentPermanentId);

        optionsByAgentPermanentId.set(plannedMessage.agentPermanentId, {
            agentPermanentId: plannedMessage.agentPermanentId,
            agentName: existingOption?.agentName ?? plannedMessage.agentName,
            plannedMessageCount: (existingOption?.plannedMessageCount ?? 0) + 1,
        });
    }

    return [...optionsByAgentPermanentId.values()].sort((leftOption, rightOption) =>
        resolvePlannedMessageAgentOptionLabel(leftOption).localeCompare(
            resolvePlannedMessageAgentOptionLabel(rightOption),
        ),
    );
}

/**
 * Resolves the label of one agent filter option.
 *
 * @param option - Agent offered by the filter.
 * @returns Agent name, falling back to its permanent id.
 *
 * @private internal admin utility of Agents Server
 */
export function resolvePlannedMessageAgentOptionLabel(option: PlannedMessageAgentOption): string {
    return option.agentName || option.agentPermanentId;
}
