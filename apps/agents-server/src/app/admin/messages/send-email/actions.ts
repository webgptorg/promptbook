'use server';

import type { string_email, string_emails, string_html } from '@promptbook-local/types';
import { parseEmailAddress } from '../../../../message-providers/email/_common/utils/parseEmailAddress';
import { parseEmailAddresses } from '../../../../message-providers/email/_common/utils/parseEmailAddresses';
import { stringifyEmailAddress } from '../../../../message-providers/email/_common/utils/stringifyEmailAddress';
import { sendMessage } from '../../../../utils/messages/sendMessage';

export async function sendEmailAction(formData: FormData) {
    const from = formData.get('from') as string;
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;

    if (!from || !to || !subject || !body) {
        throw new Error('All fields are required');
    }

    const sender = stringifyEmailAddress(parseEmailAddress(from as string_email));
    const recipients = parseEmailAddresses(to as string_emails).map(stringifyEmailAddress);

    await sendMessage({
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        sender,
        recipients,
        subject,
        content: body as string_html,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threadId: crypto.randomUUID() as any,
        cc: [],
        attachments: [],
        metadata: {},
    });
}
