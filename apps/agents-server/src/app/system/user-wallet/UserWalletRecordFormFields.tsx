'use client';

import { SecretInput } from '@/src/components/SecretInput/SecretInput';
import { SecretTextarea } from '@/src/components/SecretTextarea/SecretTextarea';
import { USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE } from '@/src/utils/useEmailSmtpWalletConstants';
import type { UserWalletAgentOption } from './UserWalletAgentOption';
import type { UpdateUserWalletDraft, UserWalletDraft } from './UserWalletDraft';

/**
 * Props for `UserWalletRecordFormFields`.
 */
type UserWalletRecordFormFieldsProps = {
    agents: ReadonlyArray<UserWalletAgentOption>;
    draft: UserWalletDraft;
    isSmtpRecord: boolean;
    updateDraft: UpdateUserWalletDraft;
    variant: 'create' | 'edit';
};

/**
 * Shared editable fields for create and edit wallet-record forms.
 *
 * @private function of UserWalletClient
 */
export function UserWalletRecordFormFields({
    agents,
    draft,
    isSmtpRecord,
    updateDraft,
    variant,
}: UserWalletRecordFormFieldsProps) {
    const isEditVariant = variant === 'edit';
    const fieldClassName = isEditVariant
        ? 'rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
        : 'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
    const jsonSchemaClassName = isEditVariant
        ? 'w-full min-h-[100px] rounded-md border border-gray-300 px-2 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
        : 'w-full min-h-[120px] rounded-md border border-gray-300 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500';
    const scopeLabelClassName = isEditVariant
        ? 'inline-flex items-center gap-2 text-xs text-gray-600'
        : 'inline-flex items-center gap-2 text-sm text-gray-700';
    const agentSelectClassName = isEditVariant
        ? 'w-full sm:w-72 rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
        : 'w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100';

    return (
        <>
            <div className={isEditVariant ? 'grid gap-2 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-3'}>
                <select
                    value={draft.recordType}
                    onChange={(event) => updateDraft('recordType', event.target.value as UserWalletDraft['recordType'])}
                    className={fieldClassName}
                >
                    <option value="ACCESS_TOKEN">
                        {isEditVariant ? 'Access Token' : 'Access Token / API Key'}
                    </option>
                    <option value="USERNAME_PASSWORD">Username + Password</option>
                    <option value="SESSION_COOKIE">Session Cookie</option>
                </select>
                <input
                    value={draft.service}
                    onChange={(event) => updateDraft('service', event.target.value)}
                    placeholder={isEditVariant ? undefined : 'Service (github, smtp...)'}
                    className={fieldClassName}
                />
                <input
                    value={draft.key}
                    onChange={(event) => updateDraft('key', event.target.value)}
                    placeholder={isEditVariant ? undefined : 'Key (default)'}
                    className={fieldClassName}
                />
            </div>

            <UserWalletCredentialFields
                draft={draft}
                isSmtpRecord={isSmtpRecord}
                updateDraft={updateDraft}
            />

            {isEditVariant ? (
                <textarea
                    value={draft.jsonSchemaText}
                    onChange={(event) => updateDraft('jsonSchemaText', event.target.value)}
                    placeholder='{"type":"object"}'
                    className={jsonSchemaClassName}
                />
            ) : (
                <label className="block text-sm text-gray-700">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        JSON schema (optional)
                    </span>
                    <textarea
                        value={draft.jsonSchemaText}
                        onChange={(event) => updateDraft('jsonSchemaText', event.target.value)}
                        placeholder='{"type":"object","properties":{"token":{"type":"string"}}}'
                        className={jsonSchemaClassName}
                    />
                </label>
            )}

            <div className={isEditVariant ? 'flex flex-col gap-2' : 'flex flex-col gap-3'}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className={scopeLabelClassName}>
                        <input
                            type="checkbox"
                            checked={draft.isUserScoped}
                            onChange={(event) => updateDraft('isUserScoped', event.target.checked)}
                        />
                        {isEditVariant ? 'Scope to user' : 'Scope to current user'}
                    </label>
                    <label className={scopeLabelClassName}>
                        <input
                            type="checkbox"
                            checked={!draft.isGlobal}
                            onChange={(event) => updateDraft('isGlobal', !event.target.checked)}
                        />
                        {isEditVariant ? 'Scope to agent' : 'Scope to selected agent'}
                    </label>
                </div>

                <select
                    value={draft.agentPermanentId}
                    onChange={(event) => updateDraft('agentPermanentId', event.target.value)}
                    disabled={draft.isGlobal}
                    className={agentSelectClassName}
                >
                    {agents.map((agent) => (
                        <option key={agent.permanentId} value={agent.permanentId}>
                            {agent.label}
                        </option>
                    ))}
                </select>
            </div>
        </>
    );
}

/**
 * Renders record-type-specific credential inputs.
 */
function UserWalletCredentialFields(props: {
    draft: UserWalletDraft;
    isSmtpRecord: boolean;
    updateDraft: UpdateUserWalletDraft;
}) {
    if (props.draft.recordType === 'USERNAME_PASSWORD') {
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                <input
                    value={props.draft.username}
                    onChange={(event) => props.updateDraft('username', event.target.value)}
                    placeholder="Username"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <SecretInput
                    value={props.draft.password}
                    onChange={(event) => props.updateDraft('password', event.target.value)}
                    placeholder="Password"
                />
            </div>
        );
    }

    if (props.draft.recordType === 'SESSION_COOKIE') {
        return (
            <SecretTextarea
                value={props.draft.cookies}
                onChange={(event) => props.updateDraft('cookies', event.target.value)}
                placeholder="session=abc123; path=/; secure"
                textareaClassName="!min-h-[90px]"
            />
        );
    }

    return (
        <SecretTextarea
            value={props.draft.secret}
            onChange={(event) => props.updateDraft('secret', event.target.value)}
            placeholder={props.isSmtpRecord ? USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE : 'Token / API key'}
            helperText={props.isSmtpRecord ? 'Multiline JSON is supported.' : undefined}
            textareaClassName="!min-h-[110px]"
        />
    );
}
