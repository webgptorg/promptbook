import { NextResponse } from 'next/server';
import { getMetadata } from '../../../database/getMetadata';
import { getCurrentUser } from '../../../utils/getCurrentUser';
import { getFederatedServers } from '../../../utils/getFederatedServers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        const showFederatedServersPublicly =
            ((await getMetadata('SHOW_FEDERATED_SERVERS_PUBLICLY')) || 'false') === 'true';

        // Only show federated servers if user is authenticated or if SHOW_FEDERATED_SERVERS_PUBLICLY is true
        if (!currentUser && !showFederatedServersPublicly) {
            return NextResponse.json({
                federatedServers: [],
            });
        }

        const federatedServers = await getFederatedServers();

        return NextResponse.json({
            federatedServers,
        });
    } catch (error) {
        console.error('Error fetching federated servers:', error);
        return NextResponse.json({ error: 'Failed to fetch federated servers' }, { status: 500 });
    }
}
