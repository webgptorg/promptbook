import { describe, expect, it } from '@jest/globals';
import {
    buildAgentRoutePath,
    buildAgentRouteUrl,
    buildDefaultAgentRoutePath,
    buildDefaultAgentRouteUrl,
} from './buildAgentRouteHref';

describe('buildAgentRouteHref', () => {
    it('builds relative routes for explicit agent pages', () => {
        expect(buildAgentRoutePath('Agent One')).toBe('/agents/Agent%20One');
        expect(buildAgentRoutePath('Agent One', 'chat')).toBe('/agents/Agent%20One/chat');
        expect(buildAgentRoutePath('Agent One', 'book')).toBe('/agents/Agent%20One/book');
        expect(buildAgentRoutePath('Agent One', 'integration')).toBe('/agents/Agent%20One/integration');
        expect(buildAgentRoutePath('Agent One', 'website-integration')).toBe(
            '/agents/Agent%20One/website-integration',
        );
    });

    it('builds chat as the default destination for list and graph navigation', () => {
        expect(buildDefaultAgentRoutePath('Agent One')).toBe('/agents/Agent%20One/chat');
        expect(buildDefaultAgentRouteUrl('https://agents.example.com/base/', 'Agent One')).toBe(
            'https://agents.example.com/agents/Agent%20One/chat',
        );
    });

    it('builds absolute URLs from the shared relative route helper', () => {
        expect(buildAgentRouteUrl('https://agents.example.com/', 'Agent One')).toBe(
            'https://agents.example.com/agents/Agent%20One',
        );
        expect(buildAgentRouteUrl('https://agents.example.com/', 'Agent One', 'chat')).toBe(
            'https://agents.example.com/agents/Agent%20One/chat',
        );
    });
});
