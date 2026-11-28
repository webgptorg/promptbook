import { mkdir } from 'fs/promises';
import { createUserWalletRecord } from '../userWallet/createUserWalletRecord';
import { resolveWalletAgentPermanentId } from '../userWallet/resolveWalletAgentPermanentId';
import {
    AGENT_BROWSER_PROFILE_WALLET_KEY,
    AGENT_BROWSER_PROFILE_WALLET_SERVICE,
} from './agentBrowserProfileWalletConstants';
import { findAgentBrowserProfileWalletRecord } from './findAgentBrowserProfileWalletRecord';
import { resolveDefaultAgentBrowserProfileDirectory } from './resolveAgentBrowserProfileDirectory';

/**
 * Persistent browser profile of one agent.
 */
export type AgentBrowserProfile = {
    /**
     * Canonical `Agent.permanentId` owning the profile.
     */
    readonly agentPermanentId: string;

    /**
     * Filesystem directory holding the Playwright user data (cookies, sessions, local storage,...).
     */
    readonly directory: string;
};

/**
 * Options for `$provideAgentBrowserProfile`.
 */
export type ProvideAgentBrowserProfileOptions = {
    /**
     * Agent identifier - either `Agent.permanentId` or agent name.
     */
    readonly agentIdentifier: string;

    /**
     * Optional user id used when the wallet record has to be created.
     *
     * The wallet table requires an owning user, so without a known user the profile directory is
     * still provided but the wallet record creation is deferred to the next identified usage.
     */
    readonly userId?: number;
};

/**
 * Provides the persistent browser profile of one agent.
 *
 * - Resolves the profile directory from the agent-scoped `BROWSER_PROFILE` wallet record when it exists.
 * - Falls back to the deterministic default directory otherwise.
 * - Ensures the directory exists on the filesystem.
 * - Registers the wallet record linking the agent to the directory when it is missing and a user is known.
 *
 * @param options - Agent identifier and optional owning user.
 * @returns Agent browser profile or `null` when the agent cannot be resolved.
 */
export async function $provideAgentBrowserProfile(
    options: ProvideAgentBrowserProfileOptions,
): Promise<AgentBrowserProfile | null> {
    const agentPermanentId = await resolveWalletAgentPermanentId(options.agentIdentifier);
    if (!agentPermanentId) {
        return null;
    }

    const existingWalletRecord = await findAgentBrowserProfileWalletRecord(agentPermanentId);
    const directoryFromWallet = existingWalletRecord?.secret?.trim() || null;
    const directory = directoryFromWallet || resolveDefaultAgentBrowserProfileDirectory(agentPermanentId);

    await mkdir(directory, { recursive: true });

    if (!existingWalletRecord && typeof options.userId === 'number') {
        try {
            await createUserWalletRecord({
                userId: options.userId,
                agentPermanentId,
                isUserScoped: false,
                isGlobal: false,
                recordType: 'BROWSER_PROFILE',
                service: AGENT_BROWSER_PROFILE_WALLET_SERVICE,
                key: AGENT_BROWSER_PROFILE_WALLET_KEY,
                secret: directory,
            });
        } catch (error) {
            // The profile keeps working from the deterministic directory even when the wallet
            // registration fails, so browsing must not be interrupted here
            console.warn('[agent-browser-profile] Failed to register browser profile in wallet', {
                agentPermanentId,
                error,
            });
        }
    }

    return { agentPermanentId, directory };
}
