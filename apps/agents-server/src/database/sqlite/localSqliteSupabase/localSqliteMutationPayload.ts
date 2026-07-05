import type { TODO_any } from '@promptbook-local/types';

/**
 * Converts mutation payloads into a uniform array of records.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function normalizeMutationRows(values: TODO_any): Array<Record<string, unknown>> {
    if (Array.isArray(values)) {
        return values.map((row) => stripUndefinedValues(row || {}));
    }

    return [stripUndefinedValues(values || {})];
}

/**
 * Removes undefined values because Supabase omits them from mutation payloads.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function stripUndefinedValues(values: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Adds SQLite-side defaults that are normally supplied by PostgreSQL migrations.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function withInsertDefaults(tableBaseName: string, row: Record<string, unknown>): Record<string, unknown> {
    const nowIso = new Date().toISOString();
    const result = { ...row };

    if (result.createdAt === undefined) {
        result.createdAt = nowIso;
    }
    if (result.updatedAt === undefined && tableBaseName !== 'AgentHistory' && tableBaseName !== 'ChatHistory') {
        result.updatedAt = nowIso;
    }

    switch (tableBaseName) {
        case 'Agent':
            result.visibility ??= 'PRIVATE';
            result.folderId ??= null;
            result.sortOrder ??= Date.now();
            result.deletedAt ??= null;
            result.preparedModelRequirements ??= null;
            break;
        case 'AgentFolder':
            result.parentId ??= null;
            result.sortOrder ??= Date.now();
            result.deletedAt ??= null;
            result.icon ??= null;
            result.color ??= null;
            break;
        case 'User':
            result.isAdmin ??= false;
            result.profileImageUrl ??= null;
            result.email ??= null;
            result.displayName ??= null;
            result.authenticationProvider ??= 'LOCAL';
            break;
        case 'ShibbolethUserIdentity':
            result.displayName ??= null;
            result.nameId ??= null;
            result.nameIdFormat ??= null;
            result.unstructuredName ??= null;
            result.eduPersonPrincipalName ??= null;
            result.rawAttributes ??= null;
            result.lastLoggedInAt ??= null;
            result.loginCount ??= 0;
            break;
        case 'ShibbolethAuthenticationAttempt':
            result.userId ??= null;
            result.email ??= null;
            result.displayName ??= null;
            result.nameId ??= null;
            result.relayState ??= null;
            result.ip ??= null;
            result.userAgent ??= null;
            result.errorMessage ??= null;
            result.rawAttributes ??= null;
            break;
        case 'UserChat':
            result.messages ??= [];
            result.source ??= 'WEB_UI';
            result.title ??= null;
            result.draftMessage ??= null;
            break;
        case 'UserChatJob':
            result.parameters ??= {};
            result.queuedAt ??= nowIso;
            result.attemptCount ??= 0;
            break;
        case 'UserChatTimeout':
            result.parameters ??= {};
            result.queuedAt ??= nowIso;
            result.attemptCount ??= 0;
            result.runCount ??= 0;
            break;
        case 'ApiTokens':
            result.isRevoked ??= false;
            break;
        case 'Wallet':
            result.isUserScoped ??= true;
            result.isGlobal ??= false;
            result.deletedAt ??= null;
            break;
        case 'UserMemory':
            result.isGlobal ??= false;
            result.deletedAt ??= null;
            break;
        case 'ShareTargetPayload':
            result.attachments ??= [];
            result.consumedAt ??= null;
            break;
        case 'UserPushSubscription':
            result.isChatFocused ??= false;
            break;
    }

    return result;
}
