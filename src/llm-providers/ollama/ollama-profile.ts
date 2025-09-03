import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profile for Ollama provider to maintain consistency across the application
 * This profile represents Ollama as a virtual persona in chat interfaces
 *
 * @private !!!!
 */
export const OLLAMA_PROFILE = {
    name: 'OLLAMA' as string_name,
    fullname: 'Ollama',
    color: '#059669', // Emerald green for local models
} satisfies ChatParticipant;
