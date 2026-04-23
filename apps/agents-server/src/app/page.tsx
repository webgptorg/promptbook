import { headers } from 'next/headers';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { HomepagePrimarySections } from '../components/Homepage/HomepagePrimarySections';
import { $provideServer } from '../tools/$provideServer';
import { isUserAdmin } from '../utils/isUserAdmin';
import { getHomePageAgents } from './_data/getHomePageAgents';

/**
 * Renders the simplified agents home page with local and federated agents.
 */
export default async function HomePage() {
    $sideEffect(/* Note: [??] This will ensure dynamic rendering of page and avoid Next.js pre-render */ headers());

    const [{ publicUrl }, isAdmin, { agents, folders, homepageMessage, currentUser }] = await Promise.all([
        $provideServer(),
        isUserAdmin(), /* <- TODO: [??] Here should be user permissions */
        getHomePageAgents(),
    ]);

    return (
        <div className="agents-server-route-shell min-h-screen">
            <div className="container mx-auto px-4 py-16">
                <HomepagePrimarySections
                    agents={agents}
                    folders={folders}
                    isAdmin={isAdmin}
                    canOrganize={Boolean(currentUser)}
                    publicUrl={publicUrl.href}
                    homepageMessage={homepageMessage}
                />
            </div>
        </div>
    );
}
