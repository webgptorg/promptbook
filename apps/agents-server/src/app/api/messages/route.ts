import { NextRequest, NextResponse } from 'next/server';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabase } from '../../../database/$provideSupabase';
import { isUserAdmin } from '../../../utils/isUserAdmin';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number): number {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return fallback;
    return parsed;
}

/**
 * List messages with filters, search and pagination.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;

        const page = parsePositiveInt(searchParams.get('page'), 1);
        const pageSize = Math.min(
            MAX_PAGE_SIZE,
            parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
        );
        const search = searchParams.get('search')?.trim() || '';
        const channel = searchParams.get('channel');
        const direction = searchParams.get('direction');

        const supabase = $provideSupabase();
        // @ts-expect-error: Tables are not yet in types
        const messageTable = await $getTableName('Message');
        // @ts-expect-error: Tables are not yet in types
        const attemptTable = await $getTableName('MessageSendAttempt');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = supabase.from(messageTable as any).select('*', { count: 'exact' });

        if (channel) {
            query = query.eq('channel', channel);
        }

        if (direction) {
            query = query.eq('direction', direction);
        }

        if (search) {
            // Search in content, subject (if in metadata?), sender/recipient emails
            // Note: sender and recipients are JSONB, so ilike might not work directly on them unless cast to text
            // Content is TEXT.
            const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
            // Assuming simple search on content for now to avoid complexity with JSONB search in generic supabase client
            query = query.ilike('content', `%${escaped}%`);
        }

        // Default sort by createdAt desc
        query = query.order('createdAt', { ascending: false });

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        query = query.range(from, to);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: messages, error, count } = (await query) as { data: any[]; error: any; count: number };

        if (error) {
            console.error('List messages error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        // Fetch attempts for these messages
        if (messages && messages.length > 0) {
            const messageIds = messages.map((m) => m.id);
            const { data: attempts, error: attemptsError } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from(attemptTable as any)
                .select('*')
                .in('messageId', messageIds);

            if (attemptsError) {
                console.error('Fetch message attempts error:', attemptsError);
                // We don't fail the whole request, just log it.
            } else {
                // Attach attempts to messages
                for (const message of messages) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (message as any).sendAttempts = attempts?.filter((a: any) => a.messageId === message.id) || [];
                }
            }
        }

        return NextResponse.json({
            items: messages ?? [],
            total: count ?? 0,
            page,
            pageSize,
        });
    } catch (error) {
        console.error('List messages error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
