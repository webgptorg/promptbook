import { NextRequest, NextResponse } from 'next/server';
import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabase } from '../../../../database/$provideSupabase';
import { groupChatHistoryThreads, type ChatHistoryThreadSourceRow } from '../../../../utils/chatHistoryMessage';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * Maximum number of recent recorded messages scanned when building the chat thread list.
 *
 * The threads are grouped in memory (the local SQLite mirror has no `GROUP BY`),
 * so the scan is bounded to keep the query cheap. Threads older than this window
 * remain reachable through the flat table view.
 */
const CHAT_HISTORY_THREADS_SCAN_LIMIT = 1000;

/**
 * List recorded chat threads (grouped by canonical chat id).
 *
 * Query params:
 * - agentName: restrict the threads to a single agent (optional)
 *
 * The response separates the flat `ChatHistory` audit log into distinct chat
 * threads so the admin chat history can be browsed conversation by conversation.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const agentName = request.nextUrl.searchParams.get('agentName');

        const supabase = $provideSupabase();
        const table = await $getTableName('ChatHistory');

        let query = supabase
            .from(table)
            .select('id, createdAt, agentName, chatId, message')
            .not('chatId', 'is', null)
            .order('createdAt', { ascending: false })
            .limit(CHAT_HISTORY_THREADS_SCAN_LIMIT);

        if (agentName) {
            query = query.eq('agentName', agentName);
        }

        const { data, error } = await query;

        if (error) {
            console.error('List chat threads error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        const threads = groupChatHistoryThreads((data ?? []) as ChatHistoryThreadSourceRow[]);

        return NextResponse.json({ threads });
    } catch (error) {
        console.error('List chat threads error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
