'use server';

import logoImage from '@/public/logo-blue-white-256.png';
import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import moment from 'moment';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { AvatarProfile } from '../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfile';
import { AboutPromptbookInformation } from '../../../../src/utils/misc/xAboutPromptbookInformation';
import { $sideEffect } from '../../../../src/utils/organization/$sideEffect';
import { getLongRunningTask } from '../deamons/longRunningTask';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '../tools/$provideExecutionToolsForServer';
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
    $sideEffect(/* TODO: !!!!!! Explain */ headers());

    const collection = await $provideAgentCollectionForServer();
    const agents = await collection.listAgents();

    const longRunningTask = getLongRunningTask();

    const executionTools = await $provideExecutionToolsForServer();
    const models = await getSingleLlmExecutionTools(executionTools.llm).listModels();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <Image src={logoImage} alt="Promptbook Logo" height={50} className="inline-block mr-4" />
                    Promptbook Agents Server
                </h1>

                <>
                    <h2 className="text-3xl text-gray-900 mt-16 mb-4">Agents ({agents.length})</h2>
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
                        <AddAgentButton />
                    </div>
                </>

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

                <>
                    <h2 className="text-3xl text-gray-900 mt-16 mb-4">About</h2>
                    <AboutPromptbookInformation />
                </>

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
                                Created At: {moment(longRunningTask.createdAt).calendar(undefined, calendarWithSeconds)}
                            </p>
                            <p className="text-gray-600">
                                Updated At: {moment(longRunningTask.updatedAt).calendar(undefined, calendarWithSeconds)}
                            </p>
                        </Link>
                    </div>
                </>
            </div>
        </div>
    );
}

/**
 * TODO: [🕋] Use here `AboutPromptbookInformation`
 */
