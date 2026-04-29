import { NextRequest, NextResponse } from 'next/server';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { getUsageAnalyticsResponse } from '../../../utils/usageAnalytics/getUsageAnalyticsResponse';

/**
 * Lists aggregated usage analytics for admins.
 */
export async function GET(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await getUsageAnalyticsResponse(request.nextUrl.searchParams);

        if (result.status !== 200) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.response);
    } catch (error) {
        console.error('Usage analytics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
