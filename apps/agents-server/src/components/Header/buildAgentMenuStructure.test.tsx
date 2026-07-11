import { describe, expect, it, jest } from '@jest/globals';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { AgentMenuTreeNode } from './AgentMenuStructure';
import { buildAgentMenuStructure } from './buildAgentMenuStructure';

jest.mock('../FolderAppearance/FolderAppearanceIcon', () => ({
    FolderAppearanceIcon: () => null,
}));

/**
 * Creates a minimal header folder fixture.
 *
 * @private test helper
 */
function createFolder(id: number, name: string, parentId: number | null = null): AgentOrganizationFolder {
    return {
        id,
        name,
        parentId,
        sortOrder: id,
        icon: null,
        color: null,
    };
}

/**
 * Creates a minimal header agent fixture.
 *
 * @private test helper
 */
function createAgent(agentName: string, folderId: number | null): AgentOrganizationAgent {
    return {
        agentName,
        agentHash: `${agentName}-hash`,
        permanentId: `${agentName}-id`,
        personaDescription: `${agentName} summary`,
        initialMessage: null,
        meta: {
            fullname: agentName,
        },
        links: [],
        parameters: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        folderId,
        sortOrder: 0,
    };
}

/**
 * Collects plain labels from a header menu tree.
 *
 * @private test helper
 */
function collectMenuLabels(nodes: ReadonlyArray<AgentMenuTreeNode>): string[] {
    const labels: string[] = [];

    for (const node of nodes) {
        labels.push(node.label);

        if (node.type === 'folder') {
            labels.push(...collectMenuLabels(node.children));
        }
    }

    return labels;
}

describe('buildAgentMenuStructure', () => {
    it('hides dot-prefixed folders and their agents from the header menu', () => {
        const folders = [
            createFolder(1, '.core'),
            createFolder(2, 'Core Nested', 1),
            createFolder(3, 'Visible'),
        ];
        const agents = [
            createAgent('Adam', 1),
            createAgent('Teacher', 2),
            createAgent('Visible Agent', 3),
            createAgent('Root Agent', null),
        ];

        const menu = buildAgentMenuStructure(agents, folders);
        const labels = collectMenuLabels(menu.tree);

        expect(labels).toContain('Visible');
        expect(labels).toContain('Visible Agent');
        expect(labels).toContain('Root Agent');
        expect(labels).not.toContain('.core');
        expect(labels).not.toContain('Core Nested');
        expect(labels).not.toContain('Adam');
        expect(labels).not.toContain('Teacher');
    });
});
