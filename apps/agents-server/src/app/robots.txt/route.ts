// Dynamic robots.txt for Agents Server

import { generateRobotsTxt } from '@/src/components/_utils/generateMetaTxt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const txt = generateRobotsTxt();
    return new NextResponse(txt, {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}
