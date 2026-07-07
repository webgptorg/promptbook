import { describe, expect, it } from '@jest/globals';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from './types';
import { collectHiddenFolderIds, filterHiddenFolderTree, isHiddenFolderName } from './hiddenFolders';

/**
 * Creates a minimal folder fixture for hidden-folder tests.
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
 * Creates a minimal agent fixture for hidden-folder tests.
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

describe('hiddenFolders', () => {
    it('detects dot-prefixed folder names', () => {
        expect(isHiddenFolderName('.core')).toBe(true);
        expect(isHiddenFolderName('Visible')).toBe(false);
    });

    it('collects hidden folder descendants', () => {
        const folders = [
            createFolder(1, '.core'),
            createFolder(2, 'Nested', 1),
            createFolder(3, 'Visible'),
        ];

        expect(collectHiddenFolderIds(folders)).toEqual(new Set([1, 2]));
    });

    it('filters hidden folders and their agents unless explicitly visible', () => {
        const folders = [
            createFolder(1, '.core'),
            createFolder(2, 'Nested', 1),
            createFolder(3, 'Visible'),
        ];
        const agents = [
            createAgent('Core Agent', 1),
            createAgent('Nested Agent', 2),
            createAgent('Visible Agent', 3),
            createAgent('Root Agent', null),
        ];

        expect(filterHiddenFolderTree(folders, agents, false)).toMatchObject({
            folders: [folders[2]],
            agents: [agents[2], agents[3]],
            hasHiddenFolders: true,
        });

        expect(filterHiddenFolderTree(folders, agents, true)).toMatchObject({
            folders,
            agents,
            hasHiddenFolders: true,
        });
    });
});
