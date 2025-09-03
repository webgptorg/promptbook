import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for Google provider to maintain consistency across the application
 * This profile represents Google Gemini as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const GOOGLE_PROFILE = {
    name: 'GOOGLE' as string_name,
    fullname: 'Google Gemini',
    color: '#4285f4', // Google blue
} satisfies ChatParticipant;
