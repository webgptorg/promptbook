import { createUserChatRunnerProgressCard } from './createUserChatRunnerProgressCard';

describe('createUserChatRunnerProgressCard', () => {
    it('shows the real local runner state as one concise progress update', () => {
        expect(
            createUserChatRunnerProgressCard({
                runnerKind: 'local',
                phase: 'queued_for_runner',
            }),
        ).toMatchObject({
            title: 'Working on your request',
            now: 'The local agent runner has the request and is working on the answer.',
            items: [],
            isVisible: true,
        });
    });

    it('shows the real external runner state as one concise progress update', () => {
        expect(
            createUserChatRunnerProgressCard({
                runnerKind: 'external',
                phase: 'queued_for_runner',
            }),
        ).toMatchObject({
            now: 'The external agent runner has the request and is working on the answer.',
        });
    });
});
