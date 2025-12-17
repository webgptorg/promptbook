import { removeMarkdownFormatting } from '@promptbook-local/markdown-utils';
import type { really_any } from '@promptbook-local/types';
import sendgridEmailClient from '@sendgrid/mail';
import { marked } from 'marked';
import { MessageProvider } from '../../interfaces/MessageProvider';
import { OutboundEmail } from '../_common/Email';
import { parseEmailAddress } from '../_common/utils/parseEmailAddress';

export class SendgridMessageProvider implements MessageProvider {
    constructor(private readonly apiKey: string) {
        sendgridEmailClient.setApiKey(this.apiKey);
    }

    public async send(message: OutboundEmail): Promise<really_any> {
        const sender = message.sender;
        const recipients = (Array.isArray(message.recipients) ? message.recipients : [message.recipients]).filter(
            Boolean,
        ) as really_any[];

        const text = removeMarkdownFormatting(message.content);
        const html = await marked.parse(message.content);

        const { fullEmail, fullName } = parseEmailAddress(sender);

        const response = await sendgridEmailClient.send({
            from: {
                email: fullEmail,
                name: fullName || undefined,
            },
            to: recipients.map((r) => {
                const { fullEmail, fullName } = parseEmailAddress(r.email || r.baseEmail || r);
                return {
                    email: fullEmail,
                    name: r.name || fullName || undefined,
                };
            }),
            subject: message.metadata?.subject || 'No Subject',
            text,
            html,
        });

        return response;
    }
}
