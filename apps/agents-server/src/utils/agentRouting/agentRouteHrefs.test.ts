import {
    appendFreshChatQuery,
    buildAgentChatHref,
    buildAgentProfileHref,
    buildFreshAgentChatHref,
    buildFreshAgentChatHrefFromAgentUrl,
} from './agentRouteHrefs';

describe('agentRouteHrefs', () => {
    it('builds local profile and chat hrefs from raw agent identifiers', () => {
        expect(buildAgentProfileHref('Demo Agent')).toBe('/agents/Demo%20Agent');
        expect(buildAgentChatHref('Demo Agent')).toBe('/agents/Demo%20Agent/chat');
        expect(buildFreshAgentChatHref('Demo Agent')).toBe('/agents/Demo%20Agent/chat?chat=new');
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
