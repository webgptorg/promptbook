/** @jest-environment jsdom */

import { createOnboardingSession } from './createOnboardingSession';
import { createOnboardingActions } from './createOnboardingActions';

describe('manGo session ownership', () => {
    it('allocates independent state, collections and operation revisions even for identical host scopes', () => {
        const first = createOnboardingSession('same-server:same-user');
        const second = createOnboardingSession('same-server:same-user');
        expect(first.id).not.toBe(second.id);
        expect(first.getState()).not.toBe(second.getState());
        expect(first.getState().knowledge).not.toBe(second.getState().knowledge);
        expect(first.getState().testMessages).not.toBe(second.getState().testMessages);
        const firstOperation = first.beginOperation('book')!;
        const secondOperation = second.beginOperation('book')!;
        const unsubscribeFirst = first.subscribe(jest.fn());
        first.end();
        firstOperation.finish();
        unsubscribeFirst();
        first.end(); // delayed/repeated cleanup is limited to the original store
        expect(firstOperation.signal.aborted).toBe(true);
        expect(secondOperation.signal.aborted).toBe(false);
        expect(secondOperation.isCurrent()).toBe(true);
        first.update({ agentName: 'Late first edit' });
        expect(second.getState().agentName).toBe('');
        second.end();
    });

    it('associates a late server creation with the ended original operation, never a new session', async () => {
        const first = createOnboardingSession();
        const second = createOnboardingSession();
        first.update({ agentName: 'A', agentBrief: 'A-only', bookSource: 'A\nGOAL A-only\nCLOSED' });
        let resolveCreation!: (agent: { permanentId: string; targetPath: string }) => void;
        const create = jest.fn(
            () =>
                new Promise<{ permanentId: string; targetPath: string }>((resolve) => {
                    resolveCreation = resolve;
                }),
        );
        const actions = createOnboardingActions(first);
        const pending = actions.createAgent(create, 'PRIVATE');
        first.end();
        resolveCreation({ permanentId: 'saved-a', targetPath: '/agents/saved-a/chat?chat=new' });
        await pending;
        expect(first.getState().savedAgentId).toBe('saved-a');
        expect(second.getState().savedAgentId).toBeNull();
        await actions.createAgent(create, 'PRIVATE', true);
        expect(create).toHaveBeenCalledTimes(1);
        second.end();
    });
});
