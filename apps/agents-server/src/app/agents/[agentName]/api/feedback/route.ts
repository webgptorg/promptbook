import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { NextRequest, NextResponse } from 'next/server';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../../../../../src/version';
import { $getTableName } from '../../../../../database/$getTableName';

type FeedbackRequest = {
    agentHash: string;
    rating?: string;
    textRating?: string;
    chatThread?: string;
    userNote?: string;
    expectedAnswer?: string;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        const { agentName } = await params;
        const body = (await request.json()) as FeedbackRequest;
        const { agentHash, rating, textRating, chatThread, userNote, expectedAnswer } = body;

        if (!agentHash) {
            return NextResponse.json({ message: 'Missing agentHash' }, { status: 400 });
        }

        const supabase = $provideSupabaseForServer();

        const { error } = await supabase.from(await $getTableName('ChatFeedback')).insert({
            createdAt: new Date().toISOString(),
            agentName,
            agentHash,
            rating,
            textRating,
            chatThread,
            userNote,
            expectedAnswer,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            // Telemetry fields can be populated here if available in headers
            // For now we leave them null or let Supabase handle default if any (though schema has them nullable)
            url: request.headers.get('referer') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            ip: request.headers.get('x-forwarded-for') || undefined,
        });

        if (error) {
            console.error('Error inserting feedback:', error);
            return NextResponse.json({ message: 'Failed to save feedback' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Feedback saved' }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error in feedback route:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
