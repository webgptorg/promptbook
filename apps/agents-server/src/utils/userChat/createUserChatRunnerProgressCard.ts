import type { ChatMessage } from '@promptbook-local/types';
import { spaceTrim } from '../../../../../src/_packages/utils.index';

/**
 * Runner types that can own durable chat work outside the browser request.
 */
export type UserChatRunnerKind = 'local' | 'external';

/**
 * Runner progress phases visible before a final answer is available.
 */
export type UserChatRunnerProgressPhase = 'queued_for_runner';

/**
 * Default title used while an out-of-process runner is working on a chat answer.
 */
const USER_CHAT_RUNNER_PROGRESS_TITLE = 'Working on your request';

/**
 * User-facing labels for durable chat runners.
 */
const USER_CHAT_RUNNER_LABELS: Record<UserChatRunnerKind, string> = {
    local: 'local agent runner',
    external: 'external agent runner',
};

/**
 * Creates a progress card for the observable state of an out-of-process chat runner.
 *
 * @param options - Runner kind and current progress phase.
 * @returns Progress card with one concise real runner state.
 */
export function createUserChatRunnerProgressCard(options: {
    readonly runnerKind: UserChatRunnerKind;
    readonly phase: UserChatRunnerProgressPhase;
}): NonNullable<ChatMessage['progressCard']> {
    return {
        title: USER_CHAT_RUNNER_PROGRESS_TITLE,
        now: createUserChatRunnerProgressNowText(options),
        items: [],
        updatedAt: new Date().toISOString() as NonNullable<ChatMessage['progressCard']>['updatedAt'],
        isVisible: true,
    };
}

/**
 * Creates the current runner-state text shown in the progress card.
 *
 * @private internal helper of `createUserChatRunnerProgressCard`
 */
function createUserChatRunnerProgressNowText(options: {
    readonly runnerKind: UserChatRunnerKind;
    readonly phase: UserChatRunnerProgressPhase;
}): string {
    const runnerLabel = USER_CHAT_RUNNER_LABELS[options.runnerKind];

    switch (options.phase) {
        case 'queued_for_runner':
            return spaceTrim(`
                The ${runnerLabel} has the request and is working on the answer.
            `);
    }
}
