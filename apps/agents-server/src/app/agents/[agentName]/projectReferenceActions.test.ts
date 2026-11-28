import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { resolveAgentProjectsAccess } from '../../../utils/agentProjects/agentProjectAccess';
import type { AgentProjectReferenceInfo } from '../../../utils/agentProjects/AgentProjectReferenceInfo';
import { listAgentProjectNames } from '../../../utils/agentProjects/listAgentProjectNames';
import { resolveAgentChatProjectReferences } from '../../../utils/agentProjects/resolveAgentChatProjectReferences';
import { $refreshAgentProjectChatReferencesAction } from './projectReferenceActions';

jest.mock('../../../utils/agentProjects/agentProjectAccess', () => ({
    resolveAgentProjectsAccess: jest.fn(),
}));

jest.mock('../../../utils/agentProjects/listAgentProjectNames', () => ({
    listAgentProjectNames: jest.fn(),
}));

jest.mock('../../../utils/agentProjects/resolveAgentChatProjectReferences', () => ({
    resolveAgentChatProjectReferences: jest.fn(),
}));

/**
 * Project reference returned by the mocked chat-reference resolver.
 */
const CREATED_PROJECT: AgentProjectReferenceInfo = {
    projectName: 'prague-news-map',
    displayName: 'Prague News Map',
    description: 'Created during the conversation',
    sizeBytes: 200,
    faviconRelativePath: null,
    isRunning: true,
    projectUrl: 'https://prague-news-map.example.com',
};

const resolveAgentProjectsAccessMock = jest.mocked(resolveAgentProjectsAccess);
const listAgentProjectNamesMock = jest.mocked(listAgentProjectNames);
const resolveAgentChatProjectReferencesMock = jest.mocked(resolveAgentChatProjectReferences);

/**
 * Builds a project access resolution with the given overview permission.
 */
function createProjectsAccess(isProjectOverviewVisible: boolean) {
    return {
        visibility: 'PUBLIC',
        currentUser: null,
        isAllowed: true,
        isAuthenticated: false,
        isProjectOverviewVisible,
        isProjectDetailsVisible: false,
    } as unknown as Awaited<ReturnType<typeof resolveAgentProjectsAccess>>;
}

describe('$refreshAgentProjectChatReferencesAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resolveAgentProjectsAccessMock.mockResolvedValue(createProjectsAccess(true));
        resolveAgentChatProjectReferencesMock.mockResolvedValue([CREATED_PROJECT]);
    });

    it('skips rebuilding the references while the chat already knows every project', async () => {
        listAgentProjectNamesMock.mockResolvedValue(['prague-news-map', 'website-studio']);

        await expect(
            $refreshAgentProjectChatReferencesAction('agent-1', ['Website-Studio', 'prague-news-map']),
        ).resolves.toBeNull();
        expect(resolveAgentChatProjectReferencesMock).not.toHaveBeenCalled();
    });

    it('rebuilds the references for a project created while the chat stayed open', async () => {
        listAgentProjectNamesMock.mockResolvedValue(['prague-news-map', 'website-studio']);

        await expect($refreshAgentProjectChatReferencesAction('agent-1', ['website-studio'])).resolves.toEqual([
            CREATED_PROJECT,
        ]);
        expect(resolveAgentChatProjectReferencesMock).toHaveBeenCalledWith({
            agentPermanentId: 'agent-1',
            projectsAccess: createProjectsAccess(true),
        });
    });

    it('reports no projects and never touches the filesystem without the projects overview permission', async () => {
        resolveAgentProjectsAccessMock.mockResolvedValue(createProjectsAccess(false));

        await expect($refreshAgentProjectChatReferencesAction('agent-1', ['website-studio'])).resolves.toEqual([]);
        expect(listAgentProjectNamesMock).not.toHaveBeenCalled();
        expect(resolveAgentChatProjectReferencesMock).not.toHaveBeenCalled();
    });
});
