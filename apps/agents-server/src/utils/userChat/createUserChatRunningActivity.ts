import type { ChatMessage } from '../../../../../src/_packages/types.index';
import type { UserChatRecord, UserChatRunningActivity } from './UserChatRecord';

/**
 * Maximum age of one external in-flight marker before the sidebar stops treating it as live.
 *
 * @private function of `createUserChatRunningActivity`
 */
const EXTERNAL_RUNNING_ACTIVITY_MAX_AGE_MS = 6 * 60 * 1_000;

/**
 * Recent chat fragment needed to infer lightweight running activity.
 */
type RunningActivityChatLike = Pick<UserChatRecord, 'messages' | 'updatedAt'>;

/**
 * Returns lightweight running-activity metadata for one chat from active durable jobs and
 * recent pending assistant placeholders used by frozen external chats.
 */
export function createUserChatRunningActivity(
    chat: RunningActivityChatLike,
    activeJobCount = 0,
    now = new Date(),
): UserChatRunningActivity {
    if (activeJobCount > 0) {
        return {
            count: activeJobCount,
        };
    }

    if (!isRecentRunningActivity(chat.updatedAt, now)) {
        return {
            count: 0,
        };
    }

    return {
        count: countPendingAssistantMessages(chat.messages),
    };
}

/**
 * Returns true when the latest chat update is recent enough to represent one live external response.
 *
 * @private function of `createUserChatRunningActivity`
 */
function isRecentRunningActivity(updatedAt: string, now: Date): boolean {
    const updatedAtTimestamp = Date.parse(updatedAt);
    if (Number.isNaN(updatedAtTimestamp)) {
        return false;
    }

    return now.getTime() - updatedAtTimestamp <= EXTERNAL_RUNNING_ACTIVITY_MAX_AGE_MS;
}

/**
 * Counts assistant-like messages that still represent in-progress work.
 *
 * @private function of `createUserChatRunningActivity`
 */
function countPendingAssistantMessages(messages: ReadonlyArray<ChatMessage>): number {
    return messages.filter((message) => isPendingAssistantMessage(message)).length;
}

/**
 * Returns true when one message still represents unfinished assistant output.
 *
 * @private function of `createUserChatRunningActivity`
 */
function isPendingAssistantMessage(message: Pick<ChatMessage, 'sender' | 'isComplete' | 'lifecycleState'>): boolean {
    if (!isAssistantLikeSender(message.sender)) {
        return false;
    }

    return (
        message.isComplete === false ||
        message.lifecycleState === 'queued' ||
        message.lifecycleState === 'running'
    );
}

/**
 * Returns true for assistant senders persisted by Promptbook chat surfaces.
 *
 * @private function of `createUserChatRunningActivity`
 */
function isAssistantLikeSender(sender: unknown): boolean {
    if (typeof sender !== 'string') {
        return false;
    }

    const normalizedSender = sender.toUpperCase();
    return normalizedSender === 'AGENT' || normalizedSender === 'MODEL';
}
