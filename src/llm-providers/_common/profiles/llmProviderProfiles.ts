import type { ChatParticipant } from '../../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../../types/typeAliases';

/**
 * Predefined profiles for LLM providers to maintain consistency across the application
 * These profiles represent each provider as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const LLM_PROVIDER_PROFILES = {
    OPENAI: {
        name: 'OPENAI' as string_name,
        fullname: 'OpenAI GPT',
        color: '#10a37f', // OpenAI's signature green
        // Note: avatarSrc could be added when we have provider logos available
    } satisfies ChatParticipant,

    ANTHROPIC: {
        name: 'ANTHROPIC' as string_name,
        fullname: 'Anthropic Claude',
        color: '#d97706', // Anthropic's orange/amber color
    } satisfies ChatParticipant,

    AZURE_OPENAI: {
        name: 'AZURE_OPENAI' as string_name,
        fullname: 'Azure OpenAI',
        color: '#0078d4', // Microsoft Azure blue
    } satisfies ChatParticipant,

    GOOGLE: {
        name: 'GOOGLE' as string_name,
        fullname: 'Google Gemini',
        color: '#4285f4', // Google blue
    } satisfies ChatParticipant,

    DEEPSEEK: {
        name: 'DEEPSEEK' as string_name,
        fullname: 'DeepSeek',
        color: '#7c3aed', // Purple color for DeepSeek
    } satisfies ChatParticipant,

    OLLAMA: {
        name: 'OLLAMA' as string_name,
        fullname: 'Ollama',
        color: '#059669', // Emerald green for local models
    } satisfies ChatParticipant,

    REMOTE: {
        name: 'REMOTE' as string_name,
        fullname: 'Remote Server',
        color: '#6b7280', // Gray for remote/proxy connections
    } satisfies ChatParticipant,

    MOCKED_ECHO: {
        name: 'MOCKED_ECHO' as string_name,
        fullname: 'Echo (Test)',
        color: '#8b5cf6', // Purple for test/mock tools
    } satisfies ChatParticipant,

    MOCKED_FAKE: {
        name: 'MOCKED_FAKE' as string_name,
        fullname: 'Fake LLM (Test)',
        color: '#ec4899', // Pink for fake/test tools
    } satisfies ChatParticipant,

    VERCEL: {
        name: 'VERCEL' as string_name,
        fullname: 'Vercel AI',
        color: '#000000', // Vercel's black
    } satisfies ChatParticipant,

    MULTIPLE: {
        name: 'MULTIPLE' as string_name,
        fullname: 'Multiple Providers',
        color: '#6366f1', // Indigo for combined/multiple providers
    } satisfies ChatParticipant,
} as const;

/**
 * Helper function to get a profile by provider name with fallback
 *
 * @private !!!!
 */
export function getLlmProviderProfile(providerKey: keyof typeof LLM_PROVIDER_PROFILES): ChatParticipant {
    return LLM_PROVIDER_PROFILES[providerKey];
}

/**
 * Creates a custom profile based on a provider profile but with custom properties
 *
 * @private !!!!
 */
export function createCustomLlmProfile(
    baseProfile: ChatParticipant,
    overrides: Partial<ChatParticipant>,
): ChatParticipant {
    return {
        ...baseProfile,
        ...overrides,
    };
}

/**
 * TODO: !!!! Refactor this
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
