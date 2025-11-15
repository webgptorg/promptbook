import logoImage from '@/public/logo-blue-white-256.png';
import { DEFAULT_BOOK } from '@promptbook-local/core';
import moment from 'moment';
import Image from 'next/image';
import Link from 'next/link';
import { AvatarProfileFromSource } from '../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfileFromSource';
import { getLongRunningTask } from '../deamons/longRunningTask';

// Add calendar formats that include seconds
const calendarWithSeconds = {
    sameDay: '[Today at] LTS',
    nextDay: '[Tomorrow at] LTS',
    nextWeek: 'dddd [at] LTS',
    lastDay: '[Yesterday at] LTS',
    lastWeek: '[Last] dddd [at] LTS',
    sameElse: 'L [at] LTS',
};

export default function HomePage() {
    const longRunningTask = getLongRunningTask();

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

                <h2 className="text-3xl font-bold text-gray-900 mt-16 mb-4">Agents</h2>

                {/* TODO: !!!! List Agents here dynamically, use AgentCollection */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Link
                        href={'#'}
                        className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                    >
                        <AvatarProfileFromSource agentSource={DEFAULT_BOOK} />
                    </Link>
                    <Link
                        href={'#'}
                        className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                    >
                        <AvatarProfileFromSource agentSource={DEFAULT_BOOK} />
                    </Link>
                    <Link
                        href={'#'}
                        className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400"
                    >
                        <AvatarProfileFromSource agentSource={DEFAULT_BOOK} />
                    </Link>
                </div>
            </div>
        </div>
    );
}

/**
 * TODO: [🕋] Use here `AboutPromptbookInformation`
 */
