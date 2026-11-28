'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showAlert, showConfirm } from '../AsyncDialogs/asyncDialogs';

/**
 * Reinstatement scopes supported by the button.
 *
 * @private type of <ReinstateBundledAgentsButton/>
 */
export type ReinstateScope = 'core' | 'default';

/**
 * Endpoint that recreates the missing bundled agents on the current server.
 *
 * @private constant of <ReinstateBundledAgentsButton/>
 */
const REINSTATE_ENDPOINT = '/api/admin/default-agents/reinstate';

/**
 * Props for the shared reinstate-bundled-agents button.
 *
 * @private props of <ReinstateBundledAgentsButton/>
 */
type ReinstateBundledAgentsButtonProps = {
    /**
     * Which bundled agents (core or normal default) should be reinstated.
     */
    readonly scope: ReinstateScope;

    /**
     * Button label shown when idle.
     */
    readonly label: string;

    /**
     * Button label shown while the request is in flight.
     */
    readonly pendingLabel: string;

    /**
     * Confirmation message shown before the reinstatement runs.
     */
    readonly confirmMessage: string;

    /**
     * Tailwind classes controlling the button appearance.
     */
    readonly className: string;

    /**
     * Invoked after a successful reinstatement, for client state that a server re-render does not refresh.
     */
    readonly onReinstated?: () => void;
};

/**
 * Single-click button that reinstates the missing bundled core or normal default agents.
 *
 * The same button is reused by the home page notice and the Core Agents admin page so the reinstatement flow lives in
 * exactly one place.
 *
 * @param props - Reinstatement scope, labels, and styling.
 * @returns Button that confirms, calls the reinstate endpoint, and refreshes on success.
 *
 * @private internal component shared by the home page and the Core Agents admin page
 */
export function ReinstateBundledAgentsButton({
    scope,
    label,
    pendingLabel,
    confirmMessage,
    className,
    onReinstated,
}: ReinstateBundledAgentsButtonProps) {
    const router = useRouter();
    const [isReinstating, setIsReinstating] = useState(false);

    /**
     * Confirms, calls the reinstate endpoint, and refreshes the page on success.
     */
    async function handleClick(): Promise<void> {
        const isConfirmed = await showConfirm({
            title: 'Reinstate agents',
            message: confirmMessage,
        }).catch(() => false);
        if (!isConfirmed) {
            return;
        }

        try {
            setIsReinstating(true);
            const response = await fetch(REINSTATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope }),
            });
            const payload = (await response.json()) as { error?: string; createdAgentNames?: ReadonlyArray<string> };

            if (!response.ok) {
                await showAlert({
                    title: 'Reinstate agents',
                    message: payload.error || 'Failed to reinstate the agents.',
                }).catch(() => undefined);
                return;
            }

            router.refresh();
            onReinstated?.();
        } catch (reinstateError) {
            await showAlert({
                title: 'Reinstate agents',
                message: reinstateError instanceof Error ? reinstateError.message : 'Failed to reinstate the agents.',
            }).catch(() => undefined);
        } finally {
            setIsReinstating(false);
        }
    }

    return (
        <button type="button" onClick={handleClick} disabled={isReinstating} className={className}>
            {isReinstating ? pendingLabel : label}
        </button>
    );
}
