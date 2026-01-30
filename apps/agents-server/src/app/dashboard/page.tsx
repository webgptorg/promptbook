'use server';

import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import moment from 'moment';
import { headers } from 'next/headers';
import { AboutPromptbookInformation } from '../../../../../src/utils/misc/xAboutPromptbookInformation';
import { $sideEffect } from '../../../../../src/utils/organization/$sideEffect';
import { AgentsList } from '../../components/Homepage/AgentsList';
import { ExternalAgentsSectionClient } from '../../components/Homepage/ExternalAgentsSectionClient';
import { ModelsSection } from '../../components/Homepage/ModelsSection';
import { Section } from '../../components/Homepage/Section';
import { TechInfoCard } from '../../components/Homepage/TechInfoCard';
import { UsersList } from '../../components/UsersList/UsersList';
import VercelDeploymentCard from '../../components/VercelDeploymentCard/VercelDeploymentCard';
import { getLongRunningTask } from '../../deamons/longRunningTask';
import { $provideExecutionToolsForServer } from '../../tools/$provideExecutionToolsForServer';
import { $provideServer } from '../../tools/$provideServer';
import { isUserAdmin } from '../../utils/isUserAdmin';
import { getHomePageAgents } from '../_data/getHomePageAgents';

// Add calendar formats that include seconds
const calendarWithSeconds = {
    sameDay: '[Today at] LTS',
    nextDay: '[Tomorrow at] LTS',
    nextWeek: 'dddd [at] LTS',
    lastDay: '[Yesterday at] LTS',
    lastWeek: '[Last] dddd [at] LTS',
    sameElse: 'L [at] LTS',
};

/**
 * Props for the system dashboard page.
 */
type DashboardPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Renders the legacy dashboard with system and admin details.
 */
export default async function DashboardPage(props: DashboardPageProps) {
    $sideEffect(/* Note: [??] This will ensure dynamic rendering of page and avoid Next.js pre-render */ headers());

    const server = await $provideServer();
    const { publicUrl } = server;
    const isAdmin = await isUserAdmin(); /* <- TODO: [??] Here should be user permissions */
    const { agents } = await getHomePageAgents();

    const longRunningTask = getLongRunningTask();

    const executionTools = await $provideExecutionToolsForServer();
    let models;
    let modelsError: string | null = null;
    try {
        models = await getSingleLlmExecutionTools(executionTools.llm).listModels();
    } catch (error) {
        console.error('Error fetching models:', error);
        modelsError = error instanceof Error ? error.message : 'Failed to load models';
    }

    const host = (await headers()).get('host') || 'unknown';

    const searchParams = await props.searchParams;
    const isGraphView = searchParams?.view === 'graph';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <AgentsList agents={[...agents]} isAdmin={isAdmin} publicUrl={publicUrl.href /* <- [??] */} />

                {!isGraphView && <ExternalAgentsSectionClient publicUrl={publicUrl.href /* <- [??] */} />}

                {isAdmin && <UsersList allowCreate={false} />}

                {isAdmin &&
                    (modelsError ? (
                        <Section title="Models">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800">Error loading models: {modelsError}</p>
                            </div>
                        </Section>
                    ) : models ? (
                        <ModelsSection models={models} maxVisible={11} showViewAllLink />
                    ) : null)}

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
                            <pre>{JSON.stringify(server, null, 2)}</pre>
                        </TechInfoCard>
                    </Section>
                )}
            </div>
        </div>
    );
}
