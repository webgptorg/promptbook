/**
 * Creates one new stable mocked-chat id.
 */
export function createMockedChatId(): string {
    return createMockedChatEntityId('mocked-chat');
}

/**
 * Creates one new stable participant id.
 */
export function createMockedChatParticipantId(): string {
    return createMockedChatEntityId('participant');
}

/**
 * Creates one new stable scripted message id.
 */
export function createMockedChatMessageId(): string {
    return createMockedChatEntityId('message');
}

/**
 * Creates one deterministic id string for mocked-chat entities.
 *
 * @private function of `createMockedChatId`
 */
function createMockedChatEntityId(prefix: string): string {
    const randomPart = Math.floor(Math.random() * 1_000_000)
        .toString(36)
        .padStart(4, '0');

    return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}
