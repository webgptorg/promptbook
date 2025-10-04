// Predefined delay configurations for MockedChat
// @public exported from @promptbook/components
import type { MockedChatDelayConfig } from './MockedChat';

export const MOCKED_CHAT_DELAY_CONFIGS: Record<string, MockedChatDelayConfig> = {
    NORMAL_FLOW: {
        beforeFirstMessage: 1000,
        thinkingBetweenMessages: 2000,
        waitAfterWord: 100,
        extraWordDelay: 50,
        longPauseChance: 0.2,
        longPauseDuration: [1200, 3500],
    },
    FAST_FLOW: {
        beforeFirstMessage: 300,
        thinkingBetweenMessages: 500,
        waitAfterWord: 20,
        extraWordDelay: 10,
        longPauseChance: 0.1,
        longPauseDuration: [400, 800],
    },
    SLOW_FLOW: {
        beforeFirstMessage: 2000,
        thinkingBetweenMessages: 4000,
        waitAfterWord: 300,
        extraWordDelay: 150,
        longPauseChance: 0.3,
        longPauseDuration: [2500, 5000],
    },
    BLOCKY_FLOW: {
        beforeFirstMessage: 1000,
        thinkingBetweenMessages: 2000,
        waitAfterWord: 0,
        extraWordDelay: 0,
        longPauseChance: 0.2,
        longPauseDuration: [1200, 3500],
        blocky: true,
    },
    RANDOM_FLOW: {
        beforeFirstMessage: [500, 2000],
        thinkingBetweenMessages: [500, 3500],
        waitAfterWord: [10, 200],
        extraWordDelay: [0, 100],
        longPauseChance: 0.25,
        longPauseDuration: [1200, 5000],
    },
};
