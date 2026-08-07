import {
    buildAgentProjectFileHrefForServer,
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

    it('uses the same server-aware behavior for project files such as the project icon', () => {
        expect(
            buildAgentProjectFileHrefForServer({
                agentPermanentId: 'AgentABC',
                projectName: 'my-project',
                fileRelativePath: 'public/favicon.ico',
                serverDomain: 'foreign.example.com',
                currentServerDomain: 'current.example.com',
            }),
        ).toBe('https://foreign.example.com/agents/AgentABC/projects/my-project/files/public/favicon.ico');
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
});
