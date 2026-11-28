import { ForbiddenPage } from '../../../../components/ForbiddenPage/ForbiddenPage';
import { listAgentEmailIdentities } from '../../../../utils/email/listAgentEmailIdentities';
import { SendEmailClient } from './SendEmailClient';
import { getEmailTestingAccessContext } from './emailTestingAccess';

/**
 * Renders the current server's email testing tool.
 */
export default async function AdminSendEmailPage() {
    const accessContext = await getEmailTestingAccessContext();

    if (!accessContext) {
        return <ForbiddenPage />;
    }

    const agentEmailOptions = (await listAgentEmailIdentities(accessContext.currentServerDomain)).map((agent) => ({
        id: agent.permanentId,
        label: agent.displayName,
        address: agent.preferredEmail,
    }));

    return (
        <SendEmailClient
            currentServerDomain={accessContext.currentServerDomain}
            isGlobalAdmin={accessContext.isGlobalAdmin}
            agentEmailOptions={agentEmailOptions}
        />
    );
}
