import type { AgentAccessResolution } from '../agentAccess';
import { isAgentProjectDetailsVisible, isAgentProjectsOverviewVisible } from './agentProjectAccess';

/**
 * Creates a minimal access resolution for project-policy tests.
 */
function createAgentAccessResolution(
    partialAccessResolution: Partial<AgentAccessResolution>,
): AgentAccessResolution {
    return {
        visibility: 'PUBLIC',
        currentUser: null,
        isAllowed: true,
        ...partialAccessResolution,
    };
}

describe('agent project access policy', () => {
    it('allows anonymous users to see public project overviews but not details', () => {
        const access = createAgentAccessResolution({
            visibility: 'PUBLIC',
            currentUser: null,
            isAllowed: true,
        });

        expect(isAgentProjectsOverviewVisible(access)).toBe(true);
        expect(isAgentProjectDetailsVisible(access)).toBe(false);
    });

    it('allows logged-in users to see project details when the agent is accessible', () => {
        const access = createAgentAccessResolution({
            visibility: 'PRIVATE',
            currentUser: {
                username: 'alice',
                isAdmin: false,
                profileImageUrl: null,
            },
            isAllowed: true,
        });

        expect(isAgentProjectsOverviewVisible(access)).toBe(true);
        expect(isAgentProjectDetailsVisible(access)).toBe(true);
    });

    it('hides all project information when the agent is not accessible', () => {
        const access = createAgentAccessResolution({
            visibility: 'PRIVATE',
            currentUser: null,
            isAllowed: false,
        });

        expect(isAgentProjectsOverviewVisible(access)).toBe(false);
        expect(isAgentProjectDetailsVisible(access)).toBe(false);
    });
});
