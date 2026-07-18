import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { buildActiveAgentViewItems } from './buildActiveAgentViewItems';

/**
 * Test translation function for header menu item labels.
 */
const translate = (key: ServerTranslationKey) => String(key);

describe('buildActiveAgentViewItems', () => {
    it('hides Projects when the active agent has no visible projects', () => {
        const items = buildActiveAgentViewItems({
            activeAgentNavigationId: 'agent-1',
            agentMoreViewItems: [],
            isAdmin: false,
            isProjectsViewVisible: false,
            translate,
        });

        expect(items.map((item) => item.href)).not.toContain('/agents/agent-1/projects');
    });

    it('shows Projects when the active agent has visible projects', () => {
        const items = buildActiveAgentViewItems({
            activeAgentNavigationId: 'agent-1',
            agentMoreViewItems: [],
            isAdmin: false,
            isProjectsViewVisible: true,
            translate,
        });

        expect(items.map((item) => item.href)).toContain('/agents/agent-1/projects');
    });
});
