import type { ServerTranslationKey } from '@/src/languages/ServerTranslationKeys';
import type { AgentsServerChatEnterBehavior } from '@/src/utils/chatEnterBehaviorSettings';

/**
 * Translation helper signature used by shared chat Enter behavior copy resolvers.
 */
type Translate = (key: ServerTranslationKey) => string;

/**
 * Resolved copy for one concrete Enter-key behavior option.
 */
type ChatEnterBehaviorPresentation = {
    readonly title: string;
    readonly description: string;
    readonly primaryActionLabel: string;
    readonly secondaryActionLabel: string;
};

/**
 * Translation keys for both concrete Enter-key behavior options.
 */
const CHAT_ENTER_BEHAVIOR_TRANSLATION_KEY_MAP: Record<
    AgentsServerChatEnterBehavior,
    {
        readonly title: ServerTranslationKey;
        readonly description: ServerTranslationKey;
        readonly primaryActionLabel: ServerTranslationKey;
        readonly secondaryActionLabel: ServerTranslationKey;
    }
> = {
    SEND: {
        title: 'chatEnterBehavior.sendTitle',
        description: 'chatEnterBehavior.sendDescription',
        primaryActionLabel: 'chatEnterBehavior.sendPrimaryActionLabel',
        secondaryActionLabel: 'chatEnterBehavior.sendSecondaryActionLabel',
    },
    NEWLINE: {
        title: 'chatEnterBehavior.newlineTitle',
        description: 'chatEnterBehavior.newlineDescription',
        primaryActionLabel: 'chatEnterBehavior.newlinePrimaryActionLabel',
        secondaryActionLabel: 'chatEnterBehavior.newlineSecondaryActionLabel',
    },
};

/**
 * Resolves translated copy for one concrete Enter-key behavior option.
 */
export function getChatEnterBehaviorPresentation(
    t: Translate,
    enterBehavior: AgentsServerChatEnterBehavior,
): ChatEnterBehaviorPresentation {
    const translationKeys = CHAT_ENTER_BEHAVIOR_TRANSLATION_KEY_MAP[enterBehavior];

    return {
        title: t(translationKeys.title),
        description: t(translationKeys.description),
        primaryActionLabel: t(translationKeys.primaryActionLabel),
        secondaryActionLabel: t(translationKeys.secondaryActionLabel),
    };
}

/**
 * Resolves helper copy shown below the shared Enter-key preference picker.
 */
export function getChatEnterBehaviorSettingsHelperText(
    t: Translate,
    options: {
        readonly isLoading: boolean;
        readonly isPersisting: boolean;
        readonly storedEnterBehavior: AgentsServerChatEnterBehavior | null;
    },
): string {
    const { isLoading, isPersisting, storedEnterBehavior } = options;

    if (isLoading) {
        return t('chatEnterBehavior.helperLoading');
    }

    if (isPersisting) {
        return t('chatEnterBehavior.helperSaving');
    }

    if (storedEnterBehavior !== null) {
        return t('chatEnterBehavior.helperSaved');
    }

    return t('chatEnterBehavior.helperUndecided');
}

/**
 * Resolves one compact label for the current stored Enter-key preference state.
 */
export function getChatEnterBehaviorStateLabel(
    t: Translate,
    storedEnterBehavior: AgentsServerChatEnterBehavior | null,
): string {
    if (storedEnterBehavior === null) {
        return t('chatEnterBehavior.stateUndecided');
    }

    return getChatEnterBehaviorPresentation(t, storedEnterBehavior).title;
}

/**
 * Resolves the inline textarea hint for the current effective Enter-key behavior.
 */
export function getChatEnterBehaviorTextareaHint(
    t: Translate,
    enterBehavior: AgentsServerChatEnterBehavior | undefined,
): string {
    if (enterBehavior === 'NEWLINE') {
        return t('chatEnterBehavior.textareaHintNewline');
    }

    if (enterBehavior === 'SEND') {
        return t('chatEnterBehavior.textareaHintSend');
    }

    return t('chatEnterBehavior.textareaHintUndecided');
}
