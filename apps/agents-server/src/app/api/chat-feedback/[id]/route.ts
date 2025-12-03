import { NextRequest, NextResponse } from 'next/server';
import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabase } from '../../../../database/$provideSupabase';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * Delete a single chat feedback entry by ID.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    const rawId = (await context.params).id;
    const id = Number.parseInt(rawId, 10);

    if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    try {
        const supabase = $provideSupabase();
        const table = await $getTableName('ChatFeedback');

        const { error } = await supabase.from(table).delete().eq('id', id);

        if (error) {
            console.error('Delete chat feedback row error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete chat feedback row error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
