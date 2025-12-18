import { $getTableName } from '../../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../../database/$provideSupabaseForServer';
import { parseInboundSendgridEmail } from '../../../../../message-providers/email/sendgrid/parseInboundSendgridEmail';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const rawEmail = formData.get('email');

        if (typeof rawEmail !== 'string') {
            return NextResponse.json({ error: 'Missing email field' }, { status: 400 });
        }

        const email = await parseInboundSendgridEmail(rawEmail);

        const supabase = await $provideSupabaseForServer();
        const { error } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from(await $getTableName('Message'))
            .insert({
                channel: 'EMAIL',
                direction: 'INBOUND',
                sender: email.sender,
                recipients: email.recipients,
                content: email.content,
                metadata: {
                    subject: email.subject,
                    cc: email.cc,
                    ...email.metadata,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

        if (error) {
            console.error('Failed to insert message', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing inbound email', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
