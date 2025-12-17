import { ZeptomailMessageProvider } from './email/zeptomail/ZeptomailMessageProvider';
import { SendgridMessageProvider } from './email/sendgrid/SendgridMessageProvider';
import { MessageProvider } from './interfaces/MessageProvider';

export const MESSAGE_PROVIDERS: Record<string, MessageProvider> = {};

if (process.env.ZEPTOMAIL_API_KEY) {
    MESSAGE_PROVIDERS['ZEPTOMAIL'] = new ZeptomailMessageProvider(process.env.ZEPTOMAIL_API_KEY);
}

if (process.env.SENDGRID_API_KEY) {
    MESSAGE_PROVIDERS['SENDGRID'] = new SendgridMessageProvider(process.env.SENDGRID_API_KEY);
}

// Default provider can be one of them
export const DEFAULT_EMAIL_PROVIDER = process.env.DEFAULT_EMAIL_PROVIDER || (MESSAGE_PROVIDERS['ZEPTOMAIL'] ? 'ZEPTOMAIL' : 'SENDGRID');

export * from './interfaces/MessageProvider';
export * from './email/zeptomail/ZeptomailMessageProvider';
export * from './email/sendgrid/SendgridMessageProvider';
