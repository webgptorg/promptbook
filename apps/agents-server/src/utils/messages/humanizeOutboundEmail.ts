import { humanizeAiText } from '../../../../../src/utils/markdown/humanizeAiText';
import type { OutboundEmail } from '../../message-providers/email/_common/Email';

/**
 * Humanizes AI-generated text in outbound emails before sending.
 */
export function humanizeOutboundEmail(email: OutboundEmail): OutboundEmail {
    const humanizedSubject = humanizeAiText(email.subject);
    const humanizedContent = humanizeAiText(email.content);

    return {
        ...email,
        subject: humanizedSubject,
        content: humanizedContent,
        metadata: {
            ...(email.metadata || {}),
            subject: humanizedSubject,
        },
    };
}
