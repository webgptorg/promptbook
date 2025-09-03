import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for Multiple provider to maintain consistency across the application
 * This profile represents Multiple Providers as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const MULTIPLE_PROFILE = {
    name: 'MULTIPLE' as string_name,
    fullname: 'Multiple Providers',
    color: '#6366f1', // Indigo for combined/multiple providers
} satisfies ChatParticipant;
