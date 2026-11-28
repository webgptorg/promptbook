import { HomeIcon } from 'lucide-react';
import { ErrorPage, ErrorPageLinkAction } from '../ErrorPage/ErrorPage';
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
                <ErrorPageLinkAction href="/">
                    <HomeIcon className="inline w-5 h-5 mr-2" />
                    Home
                </ErrorPageLinkAction>
            </div>
        </ErrorPage>
    );
}
