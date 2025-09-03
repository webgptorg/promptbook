import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for Remote provider to maintain consistency across the application
 * This profile represents Remote Server as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const REMOTE_PROFILE = {
    name: 'REMOTE' as string_name,
    fullname: 'Remote Server',
    color: '#6b7280', // Gray for remote/proxy connections
} satisfies ChatParticipant;
