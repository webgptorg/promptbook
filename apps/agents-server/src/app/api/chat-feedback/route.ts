import { NextRequest, NextResponse } from 'next/server';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabase } from '../../../database/$provideSupabase';
import { isUserAdmin } from '../../../utils/isUserAdmin';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type SortField = 'createdAt' | 'agentName' | 'id';
type SortOrder = 'asc' | 'desc';

function parsePositiveInt(value: string | null, fallback: number): number {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return fallback;
    return parsed;
}

function parseSortField(value: string | null): SortField {
    if (value === 'agentName' || value === 'id') return value;
    return 'createdAt';
}

function parseSortOrder(value: string | null): SortOrder {
    return value === 'asc' ? 'asc' : 'desc';
}

/**
 * List chat feedback with filters, search and pagination.
 *
 * Query params:
 * - page: number (1-based)
 * - pageSize: number (items per page)
 * - agentName: filter by agent name
 * - search: free-text search across agentName, url, ip, textRating, userNote and expectedAnswer
 * - sortBy: createdAt | agentName | id (default: createdAt)
 * - sortOrder: asc | desc (default: desc)
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
        const agentName = searchParams.get('agentName');
        const search = searchParams.get('search')?.trim() || '';
        const sortBy = parseSortField(searchParams.get('sortBy'));
        const sortOrder = parseSortOrder(searchParams.get('sortOrder'));

        const supabase = $provideSupabase();
        const table = await $getTableName('ChatFeedback');

        let query = supabase
            .from(table)
            .select('*', { count: 'exact' });

        if (agentName) {
            query = query.eq('agentName', agentName);
        }

        if (search) {
            // Note: We intentionally limit search to simple text columns
            // to keep the query portable and efficient.
            //
            // This searches across:
            // - agentName
            // - url
            // - ip
            // - textRating
            // - userNote
            // - expectedAnswer
            const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
            query = query.or(
                [
                    `agentName.ilike.%${escaped}%`,
                    `url.ilike.%${escaped}%`,
                    `ip.ilike.%${escaped}%`,
                    `textRating.ilike.%${escaped}%`,
                    `userNote.ilike.%${escaped}%`,
                    `expectedAnswer.ilike.%${escaped}%`,
                ].join(','),
            );
        }

        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('List chat feedback error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({
            items: data ?? [],
            total: count ?? 0,
            page,
            pageSize,
            sortBy,
            sortOrder,
        });
    } catch (error) {
        console.error('List chat feedback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Delete chat feedback for a specific agent.
 *
 * Query params:
 * - agentName: name of the agent whose feedback should be removed
 */
export async function DELETE(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const agentName = searchParams.get('agentName');

    if (!agentName) {
        return NextResponse.json({ error: 'agentName is required' }, { status: 400 });
    }

    try {
        const supabase = $provideSupabase();
        const table = await $getTableName('ChatFeedback');

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('agentName', agentName);

        if (error) {
            console.error('Clear chat feedback error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Clear chat feedback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
