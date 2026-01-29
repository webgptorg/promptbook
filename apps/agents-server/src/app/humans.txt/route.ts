// Dynamic humans.txt for Agents Server

import { generateHumansTxt } from '@/src/components/_utils/generateMetaTxt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const txt = await generateHumansTxt();
    return new NextResponse(txt, {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}
