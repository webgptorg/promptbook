import { NextRequest, NextResponse } from 'next/server';
import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabase } from '../../../../database/$provideSupabase';
import { convertToCsv } from '../../../../utils/convertToCsv';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * Export chat feedback as CSV.
 *
 * Query params:
 * - agentName: filter by agent name (optional)
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const agentName = searchParams.get('agentName');

        const supabase = $provideSupabase();
        const table = await $getTableName('ChatFeedback');

        let query = supabase.from(table).select('*');

        if (agentName) {
            query = query.eq('agentName', agentName);
        }

        query = query.order('createdAt', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Export chat feedback error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        const csv = convertToCsv((data || []) as Record<string, unknown>[]);
        const filename = agentName
            ? `chat-feedback-${agentName}-${new Date().toISOString()}.csv`
            : `chat-feedback-${new Date().toISOString()}.csv`;

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Export chat feedback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
