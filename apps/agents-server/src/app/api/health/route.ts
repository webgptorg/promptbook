import { NextResponse } from 'next/server';

/**
 * Ensures the readiness route runs in the same runtime as the standalone server.
 */
export const runtime = 'nodejs';

/**
 * Prevents a cached response from hiding readiness failures during deployment handoff.
 */
export const dynamic = 'force-dynamic';

/**
 * Lightweight readiness endpoint used by standalone VPS pm2/nginx handoffs.
 */
export async function GET() {
    return NextResponse.json({ status: 'ok' });
}
