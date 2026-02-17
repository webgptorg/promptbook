import { NextResponse } from 'next/server';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { getCurrentUser } from '@/src/utils/getCurrentUser';

const MAX_PROFILE_IMAGE_URL_LENGTH = 2048;

function normalizeProfileImageUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed === '') {
        return null;
    }

    if (trimmed.length > MAX_PROFILE_IMAGE_URL_LENGTH) {
        throw new Error('Profile image URL is too long.');
    }

    try {
        new URL(trimmed, 'https://promptbook.local');
    } catch {
        throw new Error('Provide a valid URL or relative path.');
    }

    return trimmed;
}

export async function GET() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        username: currentUser.username,
        isAdmin: currentUser.isAdmin,
        profileImageUrl: currentUser.profileImageUrl,
    });
}

export async function PATCH(request: Request) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let normalizedUrl: string | null = null;
    try {
        const body = await request.json();
        normalizedUrl = normalizeProfileImageUrl(body?.profileImageUrl);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid payload';
        return NextResponse.json({ error: message }, { status: 400 });
    }

    try {
        const supabase = $provideSupabaseForServer();
        const { data, error } = await supabase
            .from(await $getTableName('User'))
            .update({
                profileImageUrl: normalizedUrl,
                updatedAt: new Date().toISOString(),
            })
            .eq('username', currentUser.username)
            .select('username, isAdmin, profileImageUrl')
            .single();

        if (error) {
            console.error('Updating profile image failed:', error);
            return NextResponse.json({ error: 'Failed to save profile image.' }, { status: 500 });
        }

        return NextResponse.json({
            username: data?.username,
            isAdmin: data?.isAdmin,
            profileImageUrl: data?.profileImageUrl ?? null,
        });
    } catch (error) {
        console.error('Profile image update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
