import {
    buildAgentProjectFileHref,
    buildAgentProjectFolderHref,
    buildAgentProjectProfileHref,
    buildAgentProjectsDashboardHref,
    buildAgentProjectVscodeHref,
} from './agentProjectHrefs';

describe('agentProjectHrefs', () => {
    it('builds project dashboard, profile, file, folder, and VS Code hrefs', () => {
        expect(buildAgentProjectsDashboardHref('agent 1')).toBe('/agents/agent%201/projects');
        expect(buildAgentProjectProfileHref('agent 1', 'site one')).toBe('/agents/agent%201/projects/site%20one');
        expect(buildAgentProjectFolderHref('agent 1', 'site one', 'src/pages')).toBe(
            '/agents/agent%201/projects/site%20one?folder=src%2Fpages',
        );
        expect(buildAgentProjectFileHref('agent 1', 'site one', 'src/index.ts')).toBe(
            '/agents/agent%201/projects/site%20one/files/src/index.ts',
        );
        expect(buildAgentProjectVscodeHref('agent 1', 'site one')).toBe('/agents/agent%201/projects/site%20one/vscode');
    });
});
