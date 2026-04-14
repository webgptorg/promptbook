import {
    USE_EMAIL_SMTP_WALLET_KEY,
    USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE,
    USE_EMAIL_SMTP_WALLET_SECRET_JSON_SCHEMA,
    USE_EMAIL_SMTP_WALLET_SERVICE,
} from '@/src/utils/useEmailSmtpWalletConstants';
import type {
    CreateUserWalletRecordOptions,
    UserWalletRecord,
    UserWalletRecordType,
} from '@/src/utils/userWallet';

/**
 * Editable wallet draft shared by create and edit forms.
 *
 * @private function of UserWalletClient
 */
export type UserWalletDraft = {
    recordType: UserWalletRecordType;
    service: string;
    key: string;
    username: string;
    password: string;
    secret: string;
    cookies: string;
    jsonSchemaText: string;
    isUserScoped: boolean;
    isGlobal: boolean;
    agentPermanentId: string;
};

/**
 * Editable wallet draft for an existing persisted record.
 *
 * @private function of UserWalletClient
 */
export type EditingUserWalletDraft = UserWalletDraft & {
    id: number;
};

/**
 * Field updater used by user-wallet forms.
 *
 * @private function of UserWalletClient
 */
export type UpdateUserWalletDraft = <Field extends keyof UserWalletDraft>(
    field: Field,
    value: UserWalletDraft[Field],
) => void;

type UserWalletRecordRequestPayload = Omit<CreateUserWalletRecordOptions, 'userId'>;

/**
 * Pre-formatted SMTP schema text for wallet forms.
 */
const USE_EMAIL_SMTP_WALLET_SCHEMA_TEXT = formatWalletJsonSchemaForTextarea(USE_EMAIL_SMTP_WALLET_SECRET_JSON_SCHEMA);

/**
 * Returns true when record identity matches USE EMAIL SMTP credentials.
 *
 * @private function of UserWalletClient
 */
export function isUseEmailSmtpAccessTokenRecord(
    recordType: UserWalletRecordType,
    service: string,
    key: string,
): boolean {
    return (
        recordType === 'ACCESS_TOKEN' &&
        service.trim().toLowerCase() === USE_EMAIL_SMTP_WALLET_SERVICE &&
        key.trim() === USE_EMAIL_SMTP_WALLET_KEY
    );
}

/**
 * Converts one wallet JSON schema object into pretty-printed text.
 *
 * @private function of UserWalletClient
 */
export function formatWalletJsonSchemaForTextarea(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return '';
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '';
    }
}

/**
 * Creates the initial draft for a new wallet record.
 *
 * @private function of UserWalletClient
 */
export function createNewUserWalletDraft(defaultAgentPermanentId: string): UserWalletDraft {
    return {
        recordType: 'ACCESS_TOKEN',
        service: 'github',
        key: 'default',
        username: '',
        password: '',
        secret: '',
        cookies: '',
        jsonSchemaText: '',
        isUserScoped: false,
        isGlobal: false,
        agentPermanentId: defaultAgentPermanentId,
    };
}

/**
 * Creates editable draft state from one stored wallet record.
 *
 * @private function of UserWalletClient
 */
export function createEditingUserWalletDraft(
    record: UserWalletRecord,
    defaultAgentPermanentId: string,
): EditingUserWalletDraft {
    return {
        id: record.id,
        recordType: record.recordType,
        service: record.service,
        key: record.key,
        username: record.username || '',
        password: record.password || '',
        secret: record.secret || '',
        cookies: record.cookies || '',
        jsonSchemaText: formatWalletJsonSchemaForTextarea(record.jsonSchema),
        isUserScoped: record.isUserScoped,
        isGlobal: record.isGlobal,
        agentPermanentId: record.agentPermanentId || defaultAgentPermanentId,
    };
}

/**
 * Validates one wallet draft before submission.
 *
 * @private function of UserWalletClient
 */
export function validateUserWalletDraft(draft: UserWalletDraft): string | null {
    if (!draft.service.trim()) {
        return 'Service is required.';
    }

    if (!draft.isGlobal && !draft.agentPermanentId) {
        return 'Select an agent or switch to global scope.';
    }

    if (draft.recordType === 'USERNAME_PASSWORD' && (!draft.username.trim() || !draft.password.trim())) {
        return 'Username and password are required.';
    }

    if (draft.recordType === 'SESSION_COOKIE' && !draft.cookies.trim()) {
        return 'Cookies are required.';
    }

    if (draft.recordType === 'ACCESS_TOKEN' && !draft.secret.trim()) {
        return 'Secret is required.';
    }

    try {
        parseWalletJsonSchemaFromTextarea(draft.jsonSchemaText);
    } catch (validationError) {
        return validationError instanceof Error ? validationError.message : 'Invalid JSON schema.';
    }

    return null;
}

/**
 * Builds the API payload for one wallet draft.
 *
 * @private function of UserWalletClient
 */
export function createUserWalletRecordRequestPayload(
    draft: UserWalletDraft,
): UserWalletRecordRequestPayload {
    const jsonSchema = parseWalletJsonSchemaFromTextarea(draft.jsonSchemaText);

    return {
        recordType: draft.recordType,
        service: draft.service,
        key: draft.key || 'default',
        jsonSchema,
        username: draft.recordType === 'USERNAME_PASSWORD' ? draft.username : undefined,
        password: draft.recordType === 'USERNAME_PASSWORD' ? draft.password : undefined,
        secret: draft.recordType === 'ACCESS_TOKEN' ? draft.secret : undefined,
        cookies: draft.recordType === 'SESSION_COOKIE' ? draft.cookies : undefined,
        isUserScoped: draft.isUserScoped,
        isGlobal: draft.isGlobal,
        agentPermanentId: draft.isGlobal ? null : draft.agentPermanentId,
    };
}

/**
 * Clears sensitive draft fields after a successful create flow.
 *
 * @private function of UserWalletClient
 */
export function clearSensitiveUserWalletDraftFields(draft: UserWalletDraft): UserWalletDraft {
    return {
        ...draft,
        username: '',
        password: '',
        secret: '',
        cookies: '',
    };
}

/**
 * Applies SMTP defaults to simplify USE EMAIL setup.
 *
 * @private function of UserWalletClient
 */
export function applyUseEmailSmtpTemplateToUserWalletDraft(draft: UserWalletDraft): UserWalletDraft {
    return {
        ...draft,
        recordType: 'ACCESS_TOKEN',
        service: USE_EMAIL_SMTP_WALLET_SERVICE,
        key: USE_EMAIL_SMTP_WALLET_KEY,
        jsonSchemaText: USE_EMAIL_SMTP_WALLET_SCHEMA_TEXT,
        secret: draft.secret.trim() ? draft.secret : USE_EMAIL_SMTP_WALLET_SECRET_JSON_EXAMPLE,
    };
}

/**
 * Returns human-readable scope label for one wallet record.
 *
 * @private function of UserWalletClient
 */
export function resolveUserWalletScopeLabel(
    record: UserWalletRecord,
    agentLabelByPermanentId: ReadonlyMap<string, string>,
): string {
    if (record.isGlobal) {
        return record.isUserScoped ? 'User' : 'Global';
    }

    const agentLabel = record.agentPermanentId
        ? agentLabelByPermanentId.get(record.agentPermanentId) || record.agentPermanentId
        : 'Unknown agent';

    return record.isUserScoped ? `User + Agent (${agentLabel})` : `Agent (${agentLabel})`;
}

/**
 * Parses optional wallet JSON schema text into object payload.
 */
function parseWalletJsonSchemaFromTextarea(value: string): unknown | undefined {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return undefined;
    }

    let parsedValue: unknown;
    try {
        parsedValue = JSON.parse(trimmedValue);
    } catch {
        throw new Error('JSON schema must be valid JSON.');
    }

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        throw new Error('JSON schema must be a JSON object.');
    }

    return parsedValue;
}
