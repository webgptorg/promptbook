import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for OpenAI provider to maintain consistency across the application
 * This profile represents OpenAI as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const OPENAI_PROFILE = {
    name: 'OPENAI' as string_name,
    fullname: 'OpenAI GPT',
    color: '#10a37f', // OpenAI's signature green
    // Note: avatarSrc could be added when we have provider logos available
} satisfies ChatParticipant;
