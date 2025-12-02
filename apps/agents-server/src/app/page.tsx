'use server';

import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import moment from 'moment';
import { headers } from 'next/headers';
import { AboutPromptbookInformation } from '../../../../src/utils/misc/xAboutPromptbookInformation';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { AgentsList } from '../components/Homepage/AgentsList';
import { ExternalAgentsSection } from '../components/Homepage/ExternalAgentsSection';
import { ModelCard } from '../components/Homepage/ModelCard';
import { Section } from '../components/Homepage/Section';
import { TechInfoCard } from '../components/Homepage/TechInfoCard';
import { UsersList } from '../components/UsersList/UsersList';
import VercelDeploymentCard from '../components/VercelDeploymentCard/VercelDeploymentCard';
import { getMetadata } from '../database/getMetadata';
import { getLongRunningTask } from '../deamons/longRunningTask';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '../tools/$provideExecutionToolsForServer';
import { $provideServer } from '../tools/$provideServer';
import { getFederatedAgents } from '../utils/getFederatedAgents';
import { isUserAdmin } from '../utils/isUserAdmin';
import { AddAgentButton } from './AddAgentButton';

// Add calendar formats that include seconds
const calendarWithSeconds = {
    sameDay: '[Today at] LTS',
    nextDay: '[Tomorrow at] LTS',
    nextWeek: 'dddd [at] LTS',
    lastDay: '[Yesterday at] LTS',
    lastWeek: '[Last] dddd [at] LTS',
    sameElse: 'L [at] LTS',
};

export default async function HomePage() {
    $sideEffect(/* Note: [🐶] This will ensure dynamic rendering of page and avoid Next.js pre-render */ headers());

    const isAdmin = await isUserAdmin(); /* <- TODO: [👹] Here should be user permissions */

    const collection = await $provideAgentCollectionForServer();
    const agents = await collection.listAgents();

    const federatedServersString = (await getMetadata('FEDERATED_SERVERS')) || '';
    const federatedServers = federatedServersString
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');

    const agentsByServer = await getFederatedAgents(federatedServers);

    const longRunningTask = getLongRunningTask();

    const executionTools = await $provideExecutionToolsForServer();
    const models = await getSingleLlmExecutionTools(executionTools.llm).listModels();

    const host = (await headers()).get('host') || 'unknown';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <AgentsList agents={[...agents]} isAdmin={isAdmin} />

                <ExternalAgentsSection agentsByServer={agentsByServer} />

                {isAdmin && <UsersList />}

                {isAdmin && (
                    <Section title={`Models (${models.length})`}>
                        {models.map(({ modelName, modelTitle, modelDescription }) => (
                            <ModelCard
                                key={modelName}
                                modelName={modelName}
                                modelTitle={modelTitle || modelName}
                                modelDescription={modelDescription}
                            />
                        ))}
                    </Section>
                )}

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
