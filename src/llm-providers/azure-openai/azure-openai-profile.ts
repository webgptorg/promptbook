import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for Azure OpenAI provider to maintain consistency across the application
 * This profile represents Azure OpenAI as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const AZURE_OPENAI_PROFILE = {
    name: 'AZURE_OPENAI' as string_name,
    fullname: 'Azure OpenAI',
    color: '#0078d4', // Microsoft Azure blue
} satisfies ChatParticipant;
