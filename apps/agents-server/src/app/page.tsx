'use server';

import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import moment from 'moment';
import { headers } from 'next/headers';
import { AboutPromptbookInformation } from '../../../../src/utils/misc/xAboutPromptbookInformation';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { AgentsList } from '../components/Homepage/AgentsList';
import { ExternalAgentsSectionClient } from '../components/Homepage/ExternalAgentsSectionClient';
import { ModelsSection } from '../components/Homepage/ModelsSection';
import { Section } from '../components/Homepage/Section';
import { TechInfoCard } from '../components/Homepage/TechInfoCard';
import { UsersList } from '../components/UsersList/UsersList';
import VercelDeploymentCard from '../components/VercelDeploymentCard/VercelDeploymentCard';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { getLongRunningTask } from '../deamons/longRunningTask';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '../tools/$provideExecutionToolsForServer';
import { $provideServer } from '../tools/$provideServer';
import { getCurrentUser } from '../utils/getCurrentUser';
import { isUserAdmin } from '../utils/isUserAdmin';

// Add calendar formats that include seconds
const calendarWithSeconds = {
    sameDay: '[Today at] LTS',
    nextDay: '[Tomorrow at] LTS',
    nextWeek: 'dddd [at] LTS',
    lastDay: '[Yesterday at] LTS',
    lastWeek: '[Last] dddd [at] LTS',
    sameElse: 'L [at] LTS',
};

export default async function HomePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    $sideEffect(/* Note: [🐶] This will ensure dynamic rendering of page and avoid Next.js pre-render */ headers());

    const { publicUrl } = await $provideServer();

    const currentUser = await getCurrentUser();
    const isAdmin = await isUserAdmin(); /* <- TODO: [👹] Here should be user permissions */

    const collection = await $provideAgentCollectionForServer();
    const allAgents = await collection.listAgents();

    // Filter agents based on visibility and user authentication
    const supabase = $provideSupabaseForServer();
    // const { tablePrefix } = await $provideServer();

    // Get visibility for all agents
    const visibilityResult = await supabase
        .from(await $getTableName(`Agent`))
        .select('agentName, visibility')
        .is('deletedAt', null);

    let agents: typeof allAgents;
    if (visibilityResult.error) {
        console.error('Error fetching agent visibility:', visibilityResult.error);
        // Fallback to showing all agents if visibility fetch fails
        agents = allAgents;
    } else {
        const visibilityMap = new Map(
            visibilityResult.data.map((item: { agentName: string; visibility: 'PUBLIC' | 'PRIVATE' }) => [
                item.agentName,
                item.visibility,
            ]),
        );

        // Filter agents based on user authentication and visibility
        agents = allAgents
            .filter((agent) => {
                const visibility = visibilityMap.get(agent.agentName);
                if (!visibility) return false; // If no visibility info, hide the agent

                // Admins can see all agents
                if (currentUser?.isAdmin) return true;

                // Authenticated users can see PUBLIC and PRIVATE agents
                if (currentUser) return true;

                // Unauthenticated users can only see PUBLIC agents
                return visibility === 'PUBLIC';
            })
            .map((agent) => ({
                ...agent,
                visibility: visibilityMap.get(agent.agentName) as 'PUBLIC' | 'PRIVATE',
            }));
    }

    const longRunningTask = getLongRunningTask();

    const executionTools = await $provideExecutionToolsForServer();
    const models = await getSingleLlmExecutionTools(executionTools.llm).listModels();

    const host = (await headers()).get('host') || 'unknown';

    const searchParams = await props.searchParams;
    const isGraphView = searchParams?.view === 'graph';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
            <div className="container mx-auto px-4 py-20 lg:py-24">
                <AgentsList agents={[...agents]} isAdmin={isAdmin} publicUrl={publicUrl.href /* <- [👭] */} />

                {!isGraphView && <ExternalAgentsSectionClient publicUrl={publicUrl.href /* <- [👭] */} />}

                {isAdmin && <UsersList allowCreate={false} />}

                {isAdmin && <ModelsSection models={models} maxVisible={11} showViewAllLink />}

                {isAdmin && (
                    <>
                        {/* Note: Shown in <AboutPromptbookInformation />: <h2 className="text-3xl text-gray-900 mt-16 mb-4">About Promptbook</h2> */}
                        <AboutPromptbookInformation />
                    </>
                )}

                {isAdmin && (
                    <Section title="Technical Information">
                        <TechInfoCard title={`Long running task ${longRunningTask.taskId}`}>
                            <p className="text-gray-600">Tick: {longRunningTask.tick}</p>
                            <p className="text-gray-600">
                                Created At: {moment(longRunningTask.createdAt).calendar(undefined, calendarWithSeconds)}
                            </p>
                            <p className="text-gray-600">
                                Updated At: {moment(longRunningTask.updatedAt).calendar(undefined, calendarWithSeconds)}
                            </p>
                        </TechInfoCard>

                        <VercelDeploymentCard />

                        <TechInfoCard title="HTTP Information">
                            <p className="text-gray-600">Host: {host}</p>
                        </TechInfoCard>

                        <TechInfoCard title="Server">
                            <pre>{JSON.stringify(await $provideServer(), null, 2)}</pre>
                        </TechInfoCard>
                    </Section>
                )}
            </div>
        </div>
    );
}

/**
 * TODO: [🕋] Use here `AboutPromptbookInformation`
 */
