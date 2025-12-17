import { removeMarkdownFormatting } from '@promptbook-local/markdown-utils';
import type { Message, really_any } from '@promptbook-local/types';
import sendgridEmailClient from '@sendgrid/mail';
import { marked } from 'marked';
import { MessageProvider } from '../../interfaces/MessageProvider';

export class SendgridMessageProvider implements MessageProvider {
    constructor(private readonly apiKey: string) {
        sendgridEmailClient.setApiKey(this.apiKey);
    }

    public async send(message: Message<really_any>): Promise<really_any> {
        const sender = message.sender as really_any;
        const recipients = (Array.isArray(message.recipients) ? message.recipients : [message.recipients]).filter(Boolean) as really_any[];

        const text = removeMarkdownFormatting(message.content);
        const html = await marked.parse(message.content);

        const response = await sendgridEmailClient.send({
            from: {
                email: sender.email || sender.baseEmail || sender,
                name: sender.name || sender.fullName || undefined,
            },
            to: recipients.map((r) => ({
                email: r.email || r.baseEmail || r,
                name: r.name || r.fullName || undefined,
            })),
            subject: message.metadata?.subject || 'No Subject',
            text,
            html,
        });

        return response;
    }
}
