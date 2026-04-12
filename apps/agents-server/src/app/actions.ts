'use server';

import { $generateBookBoilerplate } from '@promptbook-local/core';
import { string_agent_name, string_book, string_url } from '@promptbook-local/types';
import { revalidatePath } from 'next/cache';
import { string_agent_permanent_id } from '../../../../src/types/typeAliases';
import { NEW_AGENT_WIZZARD_METADATA_KEY, parseNewAgentWizardMode } from '../constants/newAgentWizard';
import { getMetadata } from '../database/getMetadata';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { $provideServer } from '../tools/$provideServer';
import { type AgentVisibility, parseAgentVisibility } from '../utils/agentVisibility';
import { loadAgentOrganizationState } from '../utils/agentOrganization/loadAgentOrganizationState';
import type { AgentOrganizationAgent } from '../utils/agentOrganization/types';
import { authenticateUser } from '../utils/authenticateUser';
import { createAgentWithDefaultVisibility } from '../utils/createAgentWithDefaultVisibility';
import { resolveCurrentUserIdentity } from '../utils/currentUserIdentity';
import { isUserAdmin } from '../utils/isUserAdmin';
import { clearSession, setSession } from '../utils/session';

/**
 * Creates a new agent from the generated boilerplate template.
 *
 * @returns Agent name and permanent identifier.
 */
export async function $createAgentAction(): Promise<{ agentName: string_agent_name; permanentId: string_agent_permanent_id }> {
    // TODO: [👹] Check permissions here
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to create agents');
    }

    const collection = await $provideAgentCollectionForServer();
    const namePool = (await getMetadata('NAME_POOL')) || 'ENGLISH';
    const agentSource = $generateBookBoilerplate({ namePool });
    const currentUserIdentity = await resolveCurrentUserIdentity();

    const { agentName, permanentId } = await createAgentWithDefaultVisibility(collection, agentSource, {
        userId: currentUserIdentity?.userId,
    });

    return { agentName, permanentId };
}

/**
 * Generates boilerplate book content for a new agent.
 *
 * @returns Generated boilerplate agent source.
 */
export async function $generateAgentBoilerplateAction(): Promise<string_book> {
    const namePool = (await getMetadata('NAME_POOL')) || 'ENGLISH';
    return $generateBookBoilerplate({ namePool });
}

/**
 * Resolves the current new-agent creation flow configuration.
 *
 * @returns Metadata-backed flow mode and default visibility.
 */
export async function $getNewAgentCreationSettingsAction(): Promise<{
    mode: ReturnType<typeof parseNewAgentWizardMode>;
    defaultVisibility: AgentVisibility;
    publicUrl: string_url;
    localTeammateAgents: ReadonlyArray<AgentOrganizationAgent>;
}> {
    const [mode, defaultVisibility, { publicUrl }] = await Promise.all([
        getMetadata(NEW_AGENT_WIZZARD_METADATA_KEY).then(parseNewAgentWizardMode),
        getMetadata('DEFAULT_VISIBILITY').then(parseAgentVisibility),
        $provideServer(),
    ]);

    if (mode !== 'WIZARD') {
        return {
            mode,
            defaultVisibility,
            publicUrl: publicUrl.href,
            localTeammateAgents: [],
        };
    }

    const { agents } = await loadAgentOrganizationState({ status: 'ACTIVE' });

    return {
        mode,
        defaultVisibility,
        publicUrl: publicUrl.href,
        localTeammateAgents: agents,
    };
}

/**
 * Creates a new agent using provided book content.
 *
 * @param bookContent - Agent source content to store.
 * @param folderId - Optional folder to place the newly created agent into.
 * @param visibility - Optional explicit visibility override.
 * @returns Agent name and permanent identifier.
 */
export async function $createAgentFromBookAction(
    bookContent: string_book,
    folderId?: number | null,
    visibility?: AgentVisibility | null,
): Promise<{ agentName: string_agent_name; permanentId: string_agent_permanent_id }> {
    // TODO: [👹] Check permissions here
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to create agents');
    }

    const collection = await $provideAgentCollectionForServer();
    const currentUserIdentity = await resolveCurrentUserIdentity();
    const createOptions = folderId === undefined ? undefined : { folderId };
    const { agentName, permanentId } = await createAgentWithDefaultVisibility(collection, bookContent, {
        ...createOptions,
        visibility: visibility ?? undefined,
        userId: currentUserIdentity?.userId,
    });

    return { agentName, permanentId };
}

/**
 * Authenticates a user session from the login form.
 *
 * @param formData - Login form submission payload.
 * @returns Success state for the login attempt.
 */
export async function loginAction(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    console.info(`Login attempt for user: ${username}`);

    const user = await authenticateUser(username, password);

    if (user) {
        await setSession(user);
        revalidatePath('/', 'layout');
        return { success: true };
    } else {
        return { success: false, message: 'Invalid credentials' };
    }
}

/**
 * Clears the active session and refreshes cached layout data.
 */
export async function logoutAction() {
    await clearSession();
    revalidatePath('/', 'layout');
}

// TODO: [🐱‍🚀] Reorganize actions.ts files
// TODO: [🐱‍🚀] [🧠] Study how Next.js actions work
