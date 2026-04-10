'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { Card } from '../../../components/Homepage/Card';
import { Section } from '../../../components/Homepage/Section';
import type { ManagedServerRow } from './useServersRegistryState';

/**
 * Shared destructive button styling used by the current-server delete section.
 *
 * @private function of <ServersClient/>
 */
const DANGER_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Props consumed by `DeleteCurrentServerSection`.
 *
 * @private function of <ServersClient/>
 */
type DeleteCurrentServerSectionProps = {
    /**
     * Server resolved from the current request domain.
     */
    readonly currentServer: ManagedServerRow | null;

    /**
     * Server id currently being deleted.
     */
    readonly deletingServerId: number | null;

    /**
     * Deletes the current server registration.
     */
    readonly onDeleteCurrentServer: () => Promise<void>;
};

/**
 * Renders the destructive section for deleting the currently active server registration.
 *
 * @param props - Section props.
 * @returns Delete section when a current server exists, otherwise `null`.
 *
 * @private helper component of <ServersClient/>
 */
export function DeleteCurrentServerSection(props: DeleteCurrentServerSectionProps) {
    const { currentServer, deletingServerId, onDeleteCurrentServer } = props;

    if (!currentServer) {
        return null;
    }

    return (
        <Section title="Delete current server" gridClassName="grid gap-6">
            <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-medium text-red-900">Delete current server</h2>
                        <p className="mt-1 text-sm text-red-800">
                            This removes the server registration for <strong>{currentServer.name}</strong>. Existing
                            server data stays untouched. You must type the server name to confirm.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void onDeleteCurrentServer()}
                            disabled={deletingServerId === currentServer.id}
                            className={DANGER_BUTTON_CLASS_NAME}
                        >
                            {deletingServerId === currentServer.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Delete current server
                        </button>
                    </div>
                </div>
            </Card>
        </Section>
    );
}
