import {
    buildAgentProjectVscodeHref,
    buildAgentProjectVscodeLaunchUrl,
    buildAgentProjectVscodeProxyPath,
    parseAgentProjectVscodeRuntimeIdFromProxyUri,
} from './agentProjectVscodeHrefs';
import type { AgentProjectVscodeRuntimeInfo } from './AgentProjectVscodeRuntimeInfo';

describe('agentProjectVscodeHrefs', () => {
    it('builds the project VS Code launcher href', () => {
        expect(buildAgentProjectVscodeHref('agent-abc', 'my project')).toBe(
            '/agents/agent-abc/projects/my%20project/vscode',
        );
    });

    it('builds and parses proxied browser VS Code runtime paths', () => {
        const proxyPath = buildAgentProjectVscodeProxyPath('runtime-id');

        expect(proxyPath).toBe('/agent-project-vscode/runtime-id/');
        expect(parseAgentProjectVscodeRuntimeIdFromProxyUri(proxyPath)).toBe('runtime-id');
        expect(parseAgentProjectVscodeRuntimeIdFromProxyUri(`${proxyPath}?folder=/tmp/project`)).toBe('runtime-id');
        expect(parseAgentProjectVscodeRuntimeIdFromProxyUri('/something-else/runtime-id/')).toBe(null);
    });

    it('builds launch URLs for direct and proxied code-server access', () => {
        const runtime: AgentProjectVscodeRuntimeInfo = {
            id: 'runtime-id',
            agentPermanentId: 'agent-abc',
            projectName: 'my-project',
            projectPath: '/srv/project',
            port: 1234,
            localUrl: 'http://127.0.0.1:1234',
            proxyPath: '/agent-project-vscode/runtime-id/',
            processId: 42,
            status: 'running',
            isRunning: true,
            startedAt: '2026-07-18T00:00:00.000Z',
            updatedAt: '2026-07-18T00:00:00.000Z',
        };

        expect(buildAgentProjectVscodeLaunchUrl({ runtime, theme: 'DARK', isProxyPreferred: true })).toBe(
            '/agent-project-vscode/runtime-id/?folder=%2Fsrv%2Fproject&theme=DARK',
        );
        expect(buildAgentProjectVscodeLaunchUrl({ runtime, theme: 'LIGHT', isProxyPreferred: false })).toBe(
            'http://127.0.0.1:1234/?folder=%2Fsrv%2Fproject&theme=LIGHT',
        );
    });
});
