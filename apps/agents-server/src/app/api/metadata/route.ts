import { NextRequest, NextResponse } from 'next/server';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabase } from '../../../database/$provideSupabase';
import { validateMetadataValue } from '../../../database/metadataDefaults';
import { isUserAdmin } from '../../../utils/isUserAdmin';

/**
 * Parsed metadata mutation payload accepted by the write endpoints.
 */
type MetadataWritePayload = {
    key: string;
    value: string;
    note: string | null;
};

/**
 * Parses and validates one metadata write payload.
 *
 * @param request - Incoming HTTP request.
 * @returns Parsed payload or a ready-made error response.
 */
async function parseMetadataWritePayload(
    request: NextRequest,
): Promise<{ payload: MetadataWritePayload } | { response: NextResponse }> {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return {
            response: NextResponse.json({ error: 'Invalid request body' }, { status: 400 }),
        };
    }

    if (!body || typeof body !== 'object') {
        return {
            response: NextResponse.json({ error: 'Invalid request body' }, { status: 400 }),
        };
    }

    const { key, value, note } = body as Record<string, unknown>;

    if (typeof key !== 'string' || key.trim() === '') {
        return {
            response: NextResponse.json({ error: 'Key is required' }, { status: 400 }),
        };
    }

    if (typeof value !== 'string') {
        return {
            response: NextResponse.json({ error: 'Value must be a string' }, { status: 400 }),
        };
    }

    if (typeof note !== 'undefined' && typeof note !== 'string' && note !== null) {
        return {
            response: NextResponse.json({ error: 'Note must be a string or null' }, { status: 400 }),
        };
    }

    const normalizedKey = key.trim();
    const validationError = validateMetadataValue(normalizedKey, value);
    if (validationError) {
        return {
            response: NextResponse.json({ error: validationError }, { status: 400 }),
        };
    }

    return {
        payload: {
            key: normalizedKey,
            value,
            note: typeof note === 'string' ? note : null,
        },
    };
}

/**
 * Handles get.
 */
export async function GET(request: NextRequest) {
    keepUnused(request);

    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = $provideSupabase();
    const table = await $getTableName('Metadata');

    const { data, error } = await supabase.from(table).select('*').order('key');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

/**
 * Handles post.
 */
export async function POST(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedPayload = await parseMetadataWritePayload(request);
    if ('response' in parsedPayload) {
        return parsedPayload.response;
    }

    const { key, value, note } = parsedPayload.payload;
    const supabase = $provideSupabase();
    const table = await $getTableName('Metadata');

    const { data, error } = await supabase.from(table).insert({ key, value, note }).select().single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

/**
 * Handles put.
 */
export async function PUT(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedPayload = await parseMetadataWritePayload(request);
    if ('response' in parsedPayload) {
        return parsedPayload.response;
    }

    const { key, value, note } = parsedPayload.payload;
    const supabase = $provideSupabase();
    const table = await $getTableName('Metadata');

    const { data, error } = await supabase
        .from(table)
        .update({ value, note, updatedAt: new Date().toISOString() })
        .eq('key', key)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

/**
 * Handles delete.
 */
export async function DELETE(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
        return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const supabase = $provideSupabase();
    const table = await $getTableName('Metadata');

    const { error } = await supabase.from(table).delete().eq('key', key);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
