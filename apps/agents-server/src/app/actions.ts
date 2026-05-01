'use server';

import { $generateBookBoilerplate } from '@promptbook-local/core';
import { string_agent_name, string_book } from '@promptbook-local/types';
import { revalidatePath } from 'next/cache';
import { string_agent_permanent_id } from '../../../../src/types/typeAliases';
import { DEFAULT_NAME_POOL, NAME_POOL_METADATA_KEY, parseNamePool } from '../constants/namePool';
import { NEW_AGENT_WIZZARD_METADATA_KEY, parseNewAgentWizardMode } from '../constants/newAgentWizard';
import { getMetadata } from '../database/getMetadata';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { type AgentVisibility, parseAgentVisibility } from '../utils/agentVisibility';
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
    const namePool = parseNamePool((await getMetadata(NAME_POOL_METADATA_KEY)) || DEFAULT_NAME_POOL);
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
    const namePool = parseNamePool((await getMetadata(NAME_POOL_METADATA_KEY)) || DEFAULT_NAME_POOL);
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
}> {
    return {
        mode: parseNewAgentWizardMode(await getMetadata(NEW_AGENT_WIZZARD_METADATA_KEY)),
        defaultVisibility: parseAgentVisibility(await getMetadata('DEFAULT_VISIBILITY')),
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
