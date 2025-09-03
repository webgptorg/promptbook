import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for Anthropic Claude provider to maintain consistency across the application
 * This profile represents Anthropic Claude as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const ANTHROPIC_CLAUDE_PROFILE = {
    name: 'ANTHROPIC' as string_name,
    fullname: 'Anthropic Claude',
    color: '#d97706', // Anthropic's orange/amber color
} satisfies ChatParticipant;
