'use server';

import { headers } from 'next/headers';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { AgentsList } from '../components/Homepage/AgentsList';
import { ExternalAgentsSectionClient } from '../components/Homepage/ExternalAgentsSectionClient';
import { HomepageMessage } from '../components/Homepage/HomepageMessage';
import { $provideServer } from '../tools/$provideServer';
import { isUserAdmin } from '../utils/isUserAdmin';
import { getHomePageAgents } from './_data/getHomePageAgents';

/**
 * Props for the agents home page.
 */
type HomePageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Renders the simplified agents home page with local and federated agents.
 */
export default async function HomePage(props: HomePageProps) {
    $sideEffect(/* Note: [??] This will ensure dynamic rendering of page and avoid Next.js pre-render */ headers());

    const { publicUrl } = await $provideServer();
    const isAdmin = await isUserAdmin(); /* <- TODO: [??] Here should be user permissions */
    const { agents, homepageMessage } = await getHomePageAgents();

    const searchParams = await props.searchParams;
    const isGraphView = searchParams?.view === 'graph';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <HomepageMessage message={homepageMessage} />
                <AgentsList agents={[...agents]} isAdmin={isAdmin} publicUrl={publicUrl.href /* <- [??] */} />

                {!isGraphView && <ExternalAgentsSectionClient publicUrl={publicUrl.href /* <- [??] */} />}
            </div>
        </div>
    );
}
