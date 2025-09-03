import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for Vercel provider to maintain consistency across the application
 * This profile represents Vercel AI as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const VERCEL_PROFILE = {
    name: 'VERCEL' as string_name,
    fullname: 'Vercel AI',
    color: '#000000', // Vercel's black
} satisfies ChatParticipant;
