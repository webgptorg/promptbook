import {
    buildAgentProjectFilesHrefPrefix,
    buildAgentProjectProfileHrefForServer,
    buildAgentProjectsDashboardHrefForServer,
} from './agentProjectHrefs';

describe('agentProjectHrefs', () => {
    it('keeps current-server project links relative', () => {
        expect(
            buildAgentProjectProfileHrefForServer({
                agentPermanentId: 'AgentABC',
                projectName: 'My Project',
                serverDomain: 'CURRENT.example.com',
                currentServerDomain: 'current.example.com',
            }),
        ).toBe('/agents/AgentABC/projects/My%20Project');
    });

    it('makes foreign project links point at the owning server', () => {
        expect(
            buildAgentProjectProfileHrefForServer({
                agentPermanentId: 'AgentABC',
                projectName: 'my-project',
                serverDomain: 'foreign.example.com',
                currentServerDomain: 'current.example.com',
            }),
        ).toBe('https://foreign.example.com/agents/AgentABC/projects/my-project');
    });

    it('uses the same server-aware behavior for agent project dashboards', () => {
        expect(
            buildAgentProjectsDashboardHrefForServer({
                agentPermanentId: 'AgentABC',
                serverDomain: 'foreign.example.com',
                currentServerDomain: 'current.example.com',
            }),
        ).toBe('https://foreign.example.com/agents/AgentABC/projects');
    });

    it('builds a reusable href prefix for project files', () => {
        expect(buildAgentProjectFilesHrefPrefix('AgentABC', 'My Project')).toBe(
            '/agents/AgentABC/projects/My%20Project/files/',
        );
    });
});
