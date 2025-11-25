'use server';

import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import moment from 'moment';
import { headers } from 'next/headers';
import Link from 'next/link';
import { AvatarProfile } from '../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfile';
import { AboutPromptbookInformation } from '../../../../src/utils/misc/xAboutPromptbookInformation';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import VercelDeploymentCard from '../components/VercelDeploymentCard/VercelDeploymentCard';
import { getLongRunningTask } from '../deamons/longRunningTask';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '../tools/$provideExecutionToolsForServer';
import { $provideServer } from '../tools/$provideServer';
import { isUserAdmin } from '../utils/isUserAdmin';
import { getCurrentUser } from '../utils/getCurrentUser';
import { AuthControls } from '../components/Auth/AuthControls';
import { UsersList } from '../components/UsersList/UsersList';
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
    const currentUser = await getCurrentUser();

    const collection = await $provideAgentCollectionForServer();
    const agents = await collection.listAgents();

    const longRunningTask = getLongRunningTask();

    const executionTools = await $provideExecutionToolsForServer();
    const models = await getSingleLlmExecutionTools(executionTools.llm).listModels();

    const host = (await headers()).get('host');

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <div className="flex justify-end mb-4">
                    <AuthControls initialUser={currentUser} />
                </div>

                <>
                    <h2 className="text-3xl text-gray-900 mt-4 mb-4">Agents ({agents.length})</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {agents.map((agent) => (
                            <Link key={agent.agentName} href={`/agents/${agent.agentName}`}>
                                <AvatarProfile
                                    {...{ agent }}
                                    style={
                                        !agent.meta.color
                                            ? {}
                                            : {
                                                  backgroundColor: `${agent.meta.color}22`, // <- TODO: Use Color object here
                                              }
                                    }
                                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                                />
                            </Link>
                        ))}
                        {isAdmin && <AddAgentButton />}
                    </div>
                </>

                {isAdmin && (
                    <UsersList />
                )}

                {isAdmin && (
                    <>
                        <h2 className="text-3xl text-gray-900 mt-16 mb-4">Models ({models.length})</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {models.map(({ modelName, modelTitle, modelDescription }) => (
                                <Link key={modelName} href={`#!!!`}>
                                    <div className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400">
                                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{modelTitle}</h2>
                                        <code>{modelName}</code>
                                        <p className="text-gray-600">{modelDescription}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                {isAdmin && (
                    <>
                        {/* Note: Shown in <AboutPromptbookInformation />: <h2 className="text-3xl text-gray-900 mt-16 mb-4">About Promptbook</h2> */}
                        <AboutPromptbookInformation />
                    </>
                )}

                {isAdmin && (
                    <>
                        <h2 className="text-3xl text-gray-900 mt-16 mb-4">Technical Information</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Link
                                href={'#'}
                                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                            >
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                    Long running task {longRunningTask.taskId}
                                </h2>
                                <p className="text-gray-600">Tick: {longRunningTask.tick}</p>
                                <p className="text-gray-600">
                                    Created At:{' '}
                                    {moment(longRunningTask.createdAt).calendar(undefined, calendarWithSeconds)}
                                </p>
                                <p className="text-gray-600">
                                    Updated At:{' '}
                                    {moment(longRunningTask.updatedAt).calendar(undefined, calendarWithSeconds)}
                                </p>
                            </Link>

                            <VercelDeploymentCard />

                            <Link
                                href={'#'}
                                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                            >
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">HTTP Information</h2>

                                <p className="text-gray-600">Host: {host}</p>
                            </Link>

                            <Link
                                href={'#'}
                                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                            >
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Server</h2>

                                <pre>{JSON.stringify(await $provideServer(), null, 2)}</pre>
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * TODO: [🕋] Use here `AboutPromptbookInformation`
 */
