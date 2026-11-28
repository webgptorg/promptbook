import { $provideAgentCollectionForServer } from '../../tools/$provideAgentCollectionForServer';
import type {
    BakedBookLanguageDocumentationAgent,
    BookLanguageDocumentationAgentOption,
} from './BookLanguageDocumentationAgent';

/**
 * Lists current server agents that can be selected in a Book language manual.
 *
 * @returns Agent identifiers and labels suitable for the export controls.
 */
export async function getBookLanguageDocumentationAgentOptions(): Promise<
    ReadonlyArray<BookLanguageDocumentationAgentOption>
> {
    const collection = await $provideAgentCollectionForServer();
    const agents = await collection.listAgents();

    return agents.flatMap((agent) => {
        if (!agent.permanentId) {
            return [];
        }

        return [
            {
                id: agent.permanentId,
                name: agent.agentName,
            },
        ];
    });
}

/**
 * Loads source text for the requested manual agents.
 *
 * Unknown identifiers are ignored. This keeps URLs created before an agent was
 * deleted usable and prevents selected-agent controls from failing an export.
 *
 * @param selectedAgentIds - Agent identifiers selected by the export controls.
 * @returns Current source snapshots ready for the core documentation generator.
 */
export async function getBakedBookLanguageDocumentationAgents(
    selectedAgentIds: ReadonlyArray<string> | null,
): Promise<ReadonlyArray<BakedBookLanguageDocumentationAgent>> {
    const agentOptions = await getBookLanguageDocumentationAgentOptions();
    const agentOptionById = new Map(agentOptions.map((agent) => [agent.id, agent]));
    const selectedAgents =
        selectedAgentIds === null
            ? agentOptions
            : selectedAgentIds
                  .map((agentId) => agentOptionById.get(agentId))
                  .filter((agent): agent is BookLanguageDocumentationAgentOption => agent !== undefined);
    const collection = await $provideAgentCollectionForServer();

    return Promise.all(
        selectedAgents.map(async (agent) => ({
            ...agent,
            source: await collection.getAgentSource(agent.id),
        })),
    );
}
