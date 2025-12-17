import { SendgridMessageProvider } from './email/sendgrid/SendgridMessageProvider';
import { ZeptomailMessageProvider } from './email/zeptomail/ZeptomailMessageProvider';
import { MessageProvider } from './interfaces/MessageProvider';

export const EMAIL_PROVIDERS: Record<string, MessageProvider> = {};

if (process.env.ZEPTOMAIL_API_KEY) {
    EMAIL_PROVIDERS['ZEPTOMAIL'] = new ZeptomailMessageProvider(process.env.ZEPTOMAIL_API_KEY);
}

if (process.env.SENDGRID_API_KEY) {
    EMAIL_PROVIDERS['SENDGRID'] = new SendgridMessageProvider(process.env.SENDGRID_API_KEY);
}
