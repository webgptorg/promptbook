'use client';

import { Plus } from 'lucide-react';
import { useCallback } from 'react';
import { Card } from '../../../components/Homepage/Card';
import { Section } from '../../../components/Homepage/Section';
import { useUnsavedChangesGuard } from '../../../components/utils/useUnsavedChangesGuard';
import { CreateServerDialog } from './CreateServerDialog';
import { DeleteCurrentServerSection } from './DeleteCurrentServerSection';
import { ServersRegistryTable } from './ServersRegistryTable';
import { UNSAVED_CHANGES_MESSAGE, useCreateServerWizard } from './useCreateServerWizard';
import { type ManagedServerRow, useServersRegistryState } from './useServersRegistryState';

/**
 * Shared primary button styling used by the servers admin page.
 *
 * @private function of <ServersClient/>
 */
const PRIMARY_BUTTON_CLASS_NAME =
    'inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Global-admin UI for managing same-instance registered servers.
 *
 * @private route component of AdminServersPage
 */
export function ServersClient() {
    const {
        currentServer,
        currentServerId,
        deleteCurrentServer,
        deletingServerId,
        error,
        hasDirtyServerDrafts,
        isServerDraftDirty,
        loading,
        migrateServer,
        migratingServerId,
        navigatingServerId,
        reloadServers,
        saveServer,
        savingServerId,
        serverDrafts,
        servers,
        switchToServer,
        updateServerDraft,
    } = useServersRegistryState();
    const createServerWizard = useCreateServerWizard({
        onServerCreated: reloadServers,
    });
    const hasUnsavedChanges = hasDirtyServerDrafts || (createServerWizard.isDialogOpen && createServerWizard.isDirty);
    const { confirmBeforeNavigation, allowNextNavigation } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        preventInAppNavigation: true,
        message: UNSAVED_CHANGES_MESSAGE,
    });

    const handleSwitchServer = useCallback(
        async (server: ManagedServerRow) => {
            if (!confirmBeforeNavigation()) {
                return;
            }

            await switchToServer(server);
        },
        [confirmBeforeNavigation, switchToServer],
    );

    const handleDeleteCurrentServer = useCallback(async () => {
        await deleteCurrentServer({
            onRedirect: (redirectUrl) => {
                allowNextNavigation();
                window.location.assign(redirectUrl);
            },
        });
    }, [allowNextNavigation, deleteCurrentServer]);

    return (
        <div className="container mx-auto space-y-8 px-4 py-8">
            <div className="mt-20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-light text-gray-900">Servers</h1>
                <button type="button" onClick={createServerWizard.openDialog} className={PRIMARY_BUTTON_CLASS_NAME}>
                    <Plus className="h-4 w-4" />
                    Create new server
                </button>
            </div>

            {error ? (
                <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                    <p className="text-sm text-red-700">{error}</p>
                </Card>
            ) : null}

            <Section title="Registered servers" gridClassName="grid gap-6">
                <Card className="hover:border-gray-200 hover:shadow-md">
                    <ServersRegistryTable
                        currentServerId={currentServerId}
                        loading={loading}
                        migratingServerId={migratingServerId}
                        navigatingServerId={navigatingServerId}
                        onMigrateServer={migrateServer}
                        onSaveServer={saveServer}
                        onSwitchServer={handleSwitchServer}
                        onUpdateServerDraft={updateServerDraft}
                        savingServerId={savingServerId}
                        serverDrafts={serverDrafts}
                        servers={servers}
                        isServerDraftDirty={isServerDraftDirty}
                    />
                </Card>
            </Section>

            <CreateServerDialog
                addAdditionalUser={createServerWizard.addAdditionalUser}
                derivedWizardTablePrefix={createServerWizard.derivedWizardTablePrefix}
                handleCreateServer={createServerWizard.handleCreateServer}
                handleIconUpload={createServerWizard.handleIconUpload}
                handleWizardBack={createServerWizard.handleWizardBack}
                handleWizardNext={createServerWizard.handleWizardNext}
                handleWizardStepSelection={createServerWizard.handleWizardStepSelection}
                iconInputRef={createServerWizard.iconInputRef}
                isCreatingServer={createServerWizard.isCreatingServer}
                isOpen={createServerWizard.isDialogOpen}
                isUploadingIcon={createServerWizard.isUploadingIcon}
                removeAdditionalUser={createServerWizard.removeAdditionalUser}
                requestClose={createServerWizard.requestClose}
                resetWizard={createServerWizard.resetWizard}
                updateAdditionalUser={createServerWizard.updateAdditionalUser}
                updateAdminUser={createServerWizard.updateAdminUser}
                updateInitialSetting={createServerWizard.updateInitialSetting}
                updateWizardField={createServerWizard.updateWizardField}
                wizardError={createServerWizard.wizardError}
                wizardState={createServerWizard.wizardState}
                wizardStep={createServerWizard.wizardStep}
            />

            <DeleteCurrentServerSection
                currentServer={currentServer}
                deletingServerId={deletingServerId}
                onDeleteCurrentServer={handleDeleteCurrentServer}
            />
        </div>
    );
}
