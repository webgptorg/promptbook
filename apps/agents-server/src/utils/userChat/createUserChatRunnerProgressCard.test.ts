import { createUserChatRunnerProgressCard } from './createUserChatRunnerProgressCard';

describe('createUserChatRunnerProgressCard', () => {
    it('shows the real local runner state as one concise progress update', () => {
        const progressCard = createUserChatRunnerProgressCard({
            runnerKind: 'local',
            phase: 'queued_for_runner',
        });

        expect(progressCard).toMatchObject({
            now: 'The local agent runner has the request and is working on the answer.',
            items: [],
            isVisible: true,
        });
        expect(progressCard).not.toHaveProperty('title');
    });

    it('shows the real external runner state as one concise progress update', () => {
        const progressCard = createUserChatRunnerProgressCard({
            runnerKind: 'external',
            phase: 'queued_for_runner',
        });

        expect(progressCard).toMatchObject({
            now: 'The external agent runner has the request and is working on the answer.',
        });
        expect(progressCard).not.toHaveProperty('title');
    });
});
