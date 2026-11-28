// Dynamic robots.txt for Agents Server

import { generateRobotsTxt } from '@/src/components/_utils/generateMetaTxt';
import { getServerVisibility } from '@/src/utils/getServerVisibility';
import { isPublicServerVisibility } from '@/src/utils/serverVisibility';
import { NextResponse } from 'next/server';

/**
 * Constant for dynamic.
 */
export const dynamic = 'force-dynamic';

/**
 * Handles get.
 */
export async function GET() {
    const [txt, serverVisibility] = await Promise.all([generateRobotsTxt(), getServerVisibility()]);
    const isPublicServer = isPublicServerVisibility(serverVisibility);

    return new NextResponse(txt, {
        headers: {
            'Content-Type': 'text/plain',
            'X-Robots-Tag': isPublicServer ? 'index, follow' : 'noindex, nofollow',
        },
    });
}
