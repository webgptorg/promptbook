import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabase } from '../../../database/$provideSupabase';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { key, value, note } = body;

        if (!key || !value) {
            return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
        }

        const supabase = $provideSupabase();
        const table = await $getTableName('Metadata');

        const { data, error } = await supabase
            .from(table)
            .insert({ key, value, note })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

export async function PUT(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { key, value, note } = body;

        if (!key || !value) {
            return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
        }

        const supabase = $provideSupabase();
        const table = await $getTableName('Metadata');

        // Using upsert if it exists or update if strict
        // Since key is unique, upsert works well, but usually PUT implies update.
        // Let's use update to be safe and explicit about editing existing.
        // Actually, for editing, we identify by ID or Key.
        // Let's use Key as identifier since it is unique.

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
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

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
