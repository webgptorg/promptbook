import { removeMarkdownFormatting } from '@promptbook-local/markdown-utils';
import type { Message, really_any } from '@promptbook-local/types';
import { marked } from 'marked';
// @ts-expect-error: Zeptomail types are not resolving correctly
import { SendMailClient } from 'zeptomail';
import { MessageProvider } from '../../interfaces/MessageProvider';

export class ZeptomailMessageProvider implements MessageProvider {
    constructor(private readonly apiKey: string) {}

    public async send(message: Message<really_any>): Promise<really_any> {
        const client = new SendMailClient({ url: 'api.zeptomail.com/', token: this.apiKey });
        
        const sender = message.sender as really_any;
        const recipients = (Array.isArray(message.recipients) ? message.recipients : [message.recipients]).filter(Boolean) as really_any[];

        const textbody = removeMarkdownFormatting(message.content);
        const htmlbody = await marked.parse(message.content);

        const response = await client.sendMail({
            from: {
                address: sender.email || sender.baseEmail || sender,
                name: sender.name || sender.fullName || undefined,
            },
            to: recipients.map((r) => ({
                email_address: {
                    address: r.email || r.baseEmail || r,
                    name: r.name || r.fullName || undefined,
                },
            })),
            subject: message.metadata?.subject || 'No Subject',
            textbody,
            htmlbody,
            track_clicks: true,
            track_opens: true,
        });

        return response;
    }
}
