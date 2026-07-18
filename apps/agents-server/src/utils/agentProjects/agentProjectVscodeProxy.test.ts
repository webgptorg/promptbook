import {
    AGENT_PROJECT_VSCODE_COOKIE_NAME,
    buildAgentProjectVscodeProxyBasePath,
    isAgentProjectVscodeProxyRequestAuthorized,
    parseAgentProjectVscodeProxyRequestTarget,
    readAgentProjectVscodeCookieToken,
} from './agentProjectVscodeProxy';

describe('agentProjectVscodeProxy', () => {
    it('builds and parses the proxy path for a session', () => {
        const proxyBasePath = buildAgentProjectVscodeProxyBasePath('session-1');
        const target = parseAgentProjectVscodeProxyRequestTarget(`${proxyBasePath}/stable/hash/workbench?x=1`);

        expect(proxyBasePath).toBe('/api/agent-project-vscode/session-1');
        expect(target).toEqual({
            sessionId: 'session-1',
            proxyBasePath,
            upstreamPath: '/stable/hash/workbench?x=1',
        });
    });

    it('maps the proxy root to the upstream root', () => {
        expect(parseAgentProjectVscodeProxyRequestTarget('/api/agent-project-vscode/session-1/')?.upstreamPath).toBe(
            '/',
        );
    });

    it('ignores requests outside the proxy prefix', () => {
        expect(parseAgentProjectVscodeProxyRequestTarget('/api/metadata')).toBe(null);
    });

    it('reads and validates the session cookie token', () => {
        const cookieHeader = `foo=bar; ${AGENT_PROJECT_VSCODE_COOKIE_NAME}=secret%20token`;

        expect(readAgentProjectVscodeCookieToken(cookieHeader)).toBe('secret token');
        expect(
            isAgentProjectVscodeProxyRequestAuthorized(
                {
                    id: 'session-1',
                    accessToken: 'secret token',
                    port: 1234,
                },
                cookieHeader,
            ),
        ).toBe(true);
        expect(
            isAgentProjectVscodeProxyRequestAuthorized(
                {
                    id: 'session-1',
                    accessToken: 'secret token',
                    port: 1234,
                },
                `${AGENT_PROJECT_VSCODE_COOKIE_NAME}=wrong`,
            ),
        ).toBe(false);
    });
});
