import { HomeIcon } from 'lucide-react';
import Link from 'next/link';
import { ErrorPage } from '../ErrorPage/ErrorPage';
import { formatAgentNamingText } from '../../utils/agentNaming';
import { getAgentNaming } from '../../utils/getAgentNaming';

/**
 * Renders the not-found page with agent naming applied.
 *
 * @returns Not-found page content.
 */
export async function NotFoundPage() {
    const agentNaming = await getAgentNaming();
    return (
        <ErrorPage
            title={formatAgentNamingText('Agent Not Found :(', agentNaming)}
            message={formatAgentNamingText(
                'The agent you are looking for does not exist, but you can create your own!',
                agentNaming,
            )}
        >
            <div className="flex justify-center">
                <Link
                    href="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    <HomeIcon className="inline w-5 h-5 mr-2" />
                    Home
                </Link>
            </div>
        </ErrorPage>
    );
}
