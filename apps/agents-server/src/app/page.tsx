'use client';

import logoImage from '@/public/logo-blue-white-256.png';
import { $isRunningInBrowser } from '@promptbook-local/utils';
import moment from 'moment';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect } from 'react';
import { AvatarProfile } from '../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfile';
import { AboutPromptbookInformation } from '../../../../src/utils/misc/xAboutPromptbookInformation';
import { getLongRunningTask } from '../deamons/longRunningTask';
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
    console.log($isRunningInBrowser());

    const longRunningTask = getLongRunningTask();

    // Dynamic client-side loading for agents and models
    // Use React hooks to fetch data after initial render
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [agents, setAgents] = React.useState<Array<{ agentName: string }>>([]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [models, setModels] = React.useState<
        Array<{ modelName: string; modelTitle: string; modelDescription: string }>
    >([]);

    useEffect(() => {
        (async () => {
            try {
                const agentsRes = await fetch('/api/agents');
                const agentsData = await agentsRes.json();
                setAgents(agentsData);
            } catch (e) {
                setAgents([]);
            }
            try {
                const modelsRes = await fetch('/api/models');
                const modelsData = await modelsRes.json();
                setModels(modelsData);
            } catch (e) {
                setModels([]);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <Image src={logoImage} alt="Promptbook Logo" height={50} className="inline-block mr-4" />
                    Promptbook Agents Server
                </h1>
                <p className="text-xl text-gray-600 mb-12">agents server</p>

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

                <h2 className="text-3xl font-bold text-gray-900 mt-16 mb-4">Agents ({agents.length})</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {agents.map((agent) => (
                        <Link key={agent.agentName} href={`/agents/${agent.agentName}`}>
                            <AvatarProfile
                                {...{ agent }}
                                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                            />
                        </Link>
                    ))}
                    <AddAgentButton />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mt-16 mb-4">Models ({models.length})</h2>
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

                <h2 className="text-3xl font-bold text-gray-900 mt-16 mb-4">About</h2>
                <AboutPromptbookInformation />
            </div>
        </div>
    );
}

/**
 * TODO: [🕋] Use here `AboutPromptbookInformation`
 */
