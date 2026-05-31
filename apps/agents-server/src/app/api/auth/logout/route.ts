import { clearSession } from '../../../../utils/session';
import { NextResponse } from 'next/server';

/**
 * Handles post.
 */
export async function POST() {
    await clearSession();
    return NextResponse.json({ success: true });
}
