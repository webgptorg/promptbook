import {
    appendFreshChatQuery,
    buildAgentChatHref,
    buildAgentProfileHref,
    buildExistingAgentChatHref,
    buildFreshAgentChatHref,
    buildFreshAgentChatHrefFromAgentUrl,
} from './agentRouteHrefs';

describe('agentRouteHrefs', () => {
    it('builds local profile and chat hrefs from canonical agent IDs', () => {
        expect(buildAgentProfileHref('agent-123')).toBe('/agents/agent-123');
        expect(buildAgentChatHref('agent-123')).toBe('/agents/agent-123/chat');
        expect(buildFreshAgentChatHref('agent-123')).toBe('/agents/agent-123/chat?chat=new');
    });

    it('builds hrefs that reopen one existing conversation', () => {
        expect(buildExistingAgentChatHref('agent-123', 'chat-abc')).toBe('/agents/agent-123/chat?chat=chat-abc');
    });

    it('adds the fresh-chat query to existing chat hrefs', () => {
        expect(appendFreshChatQuery('/agents/demo/chat')).toBe('/agents/demo/chat?chat=new');
    });

    it('converts local profile hrefs into fresh-chat hrefs', () => {
        expect(buildFreshAgentChatHrefFromAgentUrl('/agents/demo')).toBe('/agents/demo/chat?chat=new');
    });

    it('converts absolute agent URLs into absolute fresh-chat URLs', () => {
        expect(buildFreshAgentChatHrefFromAgentUrl('https://remote.example/agents/demo')).toBe(
            'https://remote.example/agents/demo/chat?chat=new',
        );
    });

    it('preserves existing query params while forcing a fresh chat', () => {
        expect(buildFreshAgentChatHrefFromAgentUrl('/agents/demo/chat?headless=')).toBe(
            '/agents/demo/chat?headless=&chat=new',
        );
    });
});
