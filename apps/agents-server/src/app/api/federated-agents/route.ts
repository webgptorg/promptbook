import { NextResponse } from 'next/server';
import { getFederatedServersFromMetadata } from '../../../utils/getFederatedServersFromMetadata';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const federatedServers = await getFederatedServersFromMetadata();

        return NextResponse.json({
            federatedServers,
        });
    } catch (error) {
        console.error('Error fetching federated servers:', error);
        return NextResponse.json({ error: 'Failed to fetch federated servers' }, { status: 500 });
    }
}
