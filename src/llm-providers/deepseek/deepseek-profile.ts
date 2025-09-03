import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for DeepSeek provider to maintain consistency across the application
 * This profile represents DeepSeek as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const DEEPSEEK_PROFILE = {
    name: 'DEEPSEEK' as string_name,
    fullname: 'DeepSeek',
    color: '#7c3aed', // Purple color for DeepSeek
} satisfies ChatParticipant;
