import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabase } from '../../../database/$provideSupabase';
import { isUserAdmin } from '../../../utils/isUserAdmin';

export async function GET(request: NextRequest) {
    keepUnused(request);

    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = $provideSupabase();
    const table = await $getTableName('ApiTokens');

    const { data, error } = await supabase.from(table).select('*').order('createdAt', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { note } = body;

        const token = `ptbk_${randomUUID().replace(/-/g, '')}`;

        const supabase = $provideSupabase();
        const table = await $getTableName('ApiTokens');

        const { data, error } = await supabase.from(table).insert({ token, note }).select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = $provideSupabase();
    const table = await $getTableName('ApiTokens');

    const { error } = await supabase.from(table).delete().eq('id', parseInt(id, 10));

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
