import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { AgentWithVisibility } from './useFederatedAgents';
import type { OfficeRoomGroup } from './buildOfficeLayoutTypes';
import {
    getAgentIdentifier,
    isHeadOfficeServer,
    normalizeBaseUrl,
    pickPaletteColor,
    resolveServerLabel,
} from './buildOfficeLayoutShared';

/**
 * Creates room groups for local folders/root agents.
 *
 * @param agents - Local agents in the current homepage scope.
 * @param folders - Folder metadata used for room labels/colors.
 * @returns Ordered room groups for local agents.
 *
 * @private function of buildOfficeLayout
 */
export function createLocalRoomGroups(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    folders: ReadonlyArray<AgentOrganizationFolder>,
): Array<OfficeRoomGroup> {
    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const grouped = new Map<string, OfficeRoomGroup>();
    const orderedAgents = [...agents].sort((left, right) => left.sortOrder - right.sortOrder || left.agentName.localeCompare(right.agentName));

    orderedAgents.forEach((agent, index) => {
        const folder = agent.folderId === null ? null : folderById.get(agent.folderId) || null;
        const groupId = folder ? `folder:${folder.id}` : 'root';
        const currentGroup = grouped.get(groupId);

        if (currentGroup) {
            currentGroup.agents.push(agent);
            return;
        }

        grouped.set(groupId, {
            id: groupId,
            label: folder?.name || 'Core Floor',
            subtitle: folder ? 'Project room' : 'Shared desks',
            kind: folder ? 'folder' : 'root',
            color: folder?.color || pickPaletteColor(index),
            agents: [agent],
        });
    });

    return [...grouped.values()];
}

/**
 * Creates room groups for federated servers.
 *
 * @param federatedAgents - Federated agents loaded for the office scene.
 * @returns Ordered room groups for remote servers.
 *
 * @private function of buildOfficeLayout
 */
export function createRemoteRoomGroups(federatedAgents: ReadonlyArray<AgentWithVisibility>): Array<OfficeRoomGroup> {
    const grouped = new Map<string, OfficeRoomGroup>();

    [...federatedAgents]
        .sort((left, right) => getAgentIdentifier(left).localeCompare(getAgentIdentifier(right)))
        .forEach((agent, index) => {
            const serverUrl = normalizeBaseUrl(agent.serverUrl || '');
            const serverLabel = resolveServerLabel(serverUrl) || 'Remote server';
            const currentGroup = grouped.get(serverUrl);

            if (currentGroup) {
                currentGroup.agents.push(agent);
                if (currentGroup.kind !== 'head-office' && isHeadOfficeServer(serverLabel, currentGroup.agents)) {
                    currentGroup.label = 'Head Office';
                    currentGroup.subtitle = 'Core federation';
                    currentGroup.kind = 'head-office';
                    currentGroup.color = '#2563eb';
                }
                return;
            }

            const headOffice = isHeadOfficeServer(serverLabel, [agent]);
            grouped.set(serverUrl, {
                id: `remote:${serverLabel}`,
                label: headOffice ? 'Head Office' : serverLabel,
                subtitle: headOffice ? 'Core federation' : 'Remote colleagues',
                kind: headOffice ? 'head-office' : 'remote',
                color: headOffice ? '#2563eb' : pickPaletteColor(index + 2),
                agents: [agent],
            });
        });

    return [...grouped.values()];
}

