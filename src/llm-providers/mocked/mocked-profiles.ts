import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import type { string_name } from '../../types/typeAliases';

/**
 * Profiles for mocked providers to maintain consistency across the application
 * These profiles represent mocked providers as virtual personas in chat interfaces
 *
 * @private !!!!
 */
export const MOCKED_ECHO_PROFILE = {
    name: 'MOCKED_ECHO' as string_name,
    fullname: 'Echo (Test)',
    color: '#8b5cf6', // Purple for test/mock tools
} satisfies ChatParticipant;

export const MOCKED_FAKE_PROFILE = {
    name: 'MOCKED_FAKE' as string_name,
    fullname: 'Fake LLM (Test)',
    color: '#ec4899', // Pink for fake/test tools
} satisfies ChatParticipant;
