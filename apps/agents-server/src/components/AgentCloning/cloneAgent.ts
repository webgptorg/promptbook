import { showAlert, showPrompt } from '../AsyncDialogs/asyncDialogs';
import type { AgentBasicInformation } from '@promptbook-local/types';

/**
 * Options that describe how to prompt for and perform an agent clone.
 */
export type CloneAgentOptions = {
    /**
     * Identifier (name or permanent id) of the source agent.
     */
    readonly agentIdentifier: string;
    /**
     * Display name of the source agent, used for the default clone name.
     */
    readonly agentName: string;
    /**
     * Localization helper for user-facing strings.
     */
    readonly formatText: (text: string) => string;
};

/**
 * Shows the clone dialog, performs the clone request, and returns the new agent metadata.
 *
 * @param options - Clone dialog configuration.
 * @returns Cloned agent information, or null if the user cancelled or an error occurred.
 */
export async function promptCloneAgent(options: CloneAgentOptions): Promise<AgentBasicInformation | null> {
    const { agentIdentifier, agentName, formatText } = options;
    const defaultCloneName = `Copy of ${agentName}`;

    const name = await showPrompt({
        title: formatText('Clone agent'),
        message: formatText('Enter a name for the cloned agent.'),
        defaultValue: defaultCloneName,
        confirmLabel: 'Clone',
        cancelLabel: 'Cancel',
        placeholder: formatText('Agent name'),
        inputLabel: formatText('Agent name'),
    }).catch(() => null);

    if (!name) {
        return null;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
        await showAlert({
            title: formatText('Invalid name'),
            message: formatText('Agent name cannot be empty.'),
        }).catch(() => undefined);
        return null;
    }

    try {
        const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmedName }),
        });
        const data = (await response.json()) as AgentBasicInformation & { error?: string };
        if (!response.ok) {
            throw new Error(data.error || formatText('Failed to clone agent.'));
        }

        return data;
    } catch (error) {
        await showAlert({
            title: 'Clone failed',
            message: error instanceof Error ? error.message : formatText('Failed to clone agent.'),
        }).catch(() => undefined);
        console.error('Failed to clone agent:', error);
        return null;
    }
}
