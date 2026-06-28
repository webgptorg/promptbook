import { createUserChatHarnessProgressCard } from './createUserChatHarnessProgressCard';

describe('createUserChatHarnessProgressCard', () => {
    it('returns null before a visible harness action exists', () => {
        expect(createUserChatHarnessProgressCard(undefined)).toBeNull();
        expect(createUserChatHarnessProgressCard([{ name: 'agent_progress', state: 'COMPLETE' }])).toBeNull();
    });

    it('shows one running harness action from the latest visible tool call', () => {
        const progressCard = createUserChatHarnessProgressCard([{ name: 'web_search', state: 'PENDING' }]);

        expect(progressCard).toMatchObject({
            title: 'Working on your request',
            now: 'Running action: Searching the web.',
            items: [],
            isVisible: true,
        });
    });

    it('shows one completed harness action from the latest visible tool call', () => {
        const progressCard = createUserChatHarnessProgressCard([
            { name: 'web_search', state: 'PENDING' },
            { name: 'useBrowser', state: 'COMPLETE' },
        ]);

        expect(progressCard).toMatchObject({
            now: 'Action completed: Browsing the web.',
        });
    });
});
