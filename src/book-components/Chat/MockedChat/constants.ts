import { MockedChatDelayConfig } from './MockedChat';

/**
 * Normal flow of messages in the `MockedChat` component
 *
 * @public exported from `@promptbook/components`
 */
export const NORMAL_FLOW: MockedChatDelayConfig = {
    beforeFirstMessage: 1000,
    thinkingBetweenMessages: 2000,
    waitAfterWord: 100,
    extraWordDelay: 50,
    longPauseChance: 0.2,
    longPauseDuration: [1200, 3500],
};

/**
 * Fast flow of messages in the `MockedChat` component
 *
 * @public exported from `@promptbook/components`
 */
export const FAST_FLOW: MockedChatDelayConfig = {
    beforeFirstMessage: 300,
    thinkingBetweenMessages: 500,
    waitAfterWord: 20,
    extraWordDelay: 10,
    longPauseChance: 0.1,
    longPauseDuration: [400, 800],
};

/**
 * Slow flow of messages in the `MockedChat` component
 *
 * @public exported from `@promptbook/components`
 */
export const SLOW_FLOW: MockedChatDelayConfig = {
    beforeFirstMessage: 2000,
    thinkingBetweenMessages: 4000,
    waitAfterWord: 300,
    extraWordDelay: 150,
    longPauseChance: 0.3,
    longPauseDuration: [2500, 5000],
};

/**
 * Blocky flow of messages in the `MockedChat` component
 *
 * Messages appear in blocks rather than word-by-word
 *
 * @public exported from `@promptbook/components`
 */
export const BLOCKY_FLOW: MockedChatDelayConfig = {
    beforeFirstMessage: 1000,
    thinkingBetweenMessages: 2000,
    waitAfterWord: 0,
    extraWordDelay: 0,
    longPauseChance: 0.2,
    longPauseDuration: [1200, 3500],
    blocky: true,
};

/**
 * Random flow of messages in the `MockedChat` component
 *
 * @public exported from `@promptbook/components`
 */
export const RANDOM_FLOW: MockedChatDelayConfig = {
    beforeFirstMessage: [500, 2000],
    thinkingBetweenMessages: [500, 3500],
    waitAfterWord: [10, 200],
    extraWordDelay: [0, 100],
    longPauseChance: 0.25,
    longPauseDuration: [1200, 5000],
};

/**
 * All predefined delay configurations for the `MockedChat` component
 *
 * @public exported from `@promptbook/components`
 */
export const MOCKED_CHAT_DELAY_CONFIGS: Record<string, MockedChatDelayConfig> = {
    NORMAL_FLOW,
    FAST_FLOW,
    SLOW_FLOW,
    BLOCKY_FLOW,
    RANDOM_FLOW,
};

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
