import { getApiDocs } from '@/src/lib/swagger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const spec = await getApiDocs();
    return NextResponse.json(spec);
}
