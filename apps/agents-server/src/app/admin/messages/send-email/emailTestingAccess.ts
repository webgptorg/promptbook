import { $provideServer } from '../../../../tools/$provideServer';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import { normalizeEmailDomain } from '../../../../utils/email/agentEmailAddress';

/**
 * Authorization and server scope available to the administration email testing tool.
 */
export type EmailTestingAccessContext = {
    readonly currentServerDomain: string;
    readonly isGlobalAdmin: boolean;
};

/**
 * Resolves access to the email testing tool for either a current-server admin or the VPS superadmin.
 */
export async function getEmailTestingAccessContext(): Promise<EmailTestingAccessContext | null> {
    const [isAdmin, isGlobalAdmin] = await Promise.all([isUserAdmin(), isUserGlobalAdmin()]);

    if (!isAdmin && !isGlobalAdmin) {
        return null;
    }

    const server = await $provideServer();

    return {
        currentServerDomain: normalizeEmailDomain(server.publicUrl.hostname),
        isGlobalAdmin,
    };
}
