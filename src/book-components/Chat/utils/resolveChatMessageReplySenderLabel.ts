import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';

/**
 * Resolves the human-readable sender label shown in reply previews.
 *
 * @private helper for chat reply previews
 */
export function resolveChatMessageReplySenderLabel(options: {
    sender: ChatMessage['sender'];
    participants?: ReadonlyArray<ChatParticipant>;
    fallbackLabel?: string;
}): string {
    const { sender, participants = [], fallbackLabel = 'Unknown sender' } = options;
    const participant = participants.find((entry) => entry.name === sender);
    const normalizedSender = typeof sender === 'string' ? sender : String(sender);
    const participantFullName =
        typeof participant?.fullname === 'string'
            ? participant.fullname
            : participant?.fullname
            ? String(participant.fullname)
            : '';
    const participantName =
        typeof participant?.name === 'string' ? participant.name : participant?.name ? String(participant.name) : '';

    return participantFullName || participantName || normalizedSender || fallbackLabel;
}
