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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
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
