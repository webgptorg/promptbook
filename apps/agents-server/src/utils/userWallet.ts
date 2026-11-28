import {
    USE_PROJECT_GITHUB_APP_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_KEY,
    USE_PROJECT_GITHUB_WALLET_SERVICE,
} from './useProjectGithubWalletConstants';
import {
    USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
    USE_CALENDAR_GOOGLE_OAUTH_TOKEN_REF,
    USE_CALENDAR_GOOGLE_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_SERVICE,
} from './useCalendarGoogleWalletConstants';

/**
 * Wallet service id used by USE PROJECT for GitHub credentials.
 */
export { USE_PROJECT_GITHUB_APP_WALLET_KEY, USE_PROJECT_GITHUB_WALLET_KEY, USE_PROJECT_GITHUB_WALLET_SERVICE };
export {
    USE_CALENDAR_GOOGLE_OAUTH_TOKEN_REF,
    USE_CALENDAR_GOOGLE_OAUTH_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_KEY,
    USE_CALENDAR_GOOGLE_WALLET_SERVICE,
};

export { createUserWalletRecord } from './userWallet/createUserWalletRecord';
export { deleteUserWalletRecord } from './userWallet/deleteUserWalletRecord';
export { findUserWalletRecordById } from './userWallet/findUserWalletRecordById';
export { listUserWalletRecords } from './userWallet/listUserWalletRecords';
export { resolveUseEmailSmtpCredentialFromWallet } from './userWallet/resolveUseEmailSmtpCredentialFromWallet';
export { resolveUseCalendarGoogleOAuthTokenPayloadFromWallet } from './userWallet/resolveUseCalendarGoogleOAuthTokenPayloadFromWallet';
export { resolveUseCalendarGoogleTokenFromWallet } from './userWallet/resolveUseCalendarGoogleTokenFromWallet';
export { resolveUseProjectGithubTokenFromWallet } from './userWallet/resolveUseProjectGithubTokenFromWallet';
export { storeUseCalendarGoogleOAuthTokenInWallet } from './userWallet/storeUseCalendarGoogleOAuthTokenInWallet';
export { storeUseProjectGithubAppTokenInWallet } from './userWallet/storeUseProjectGithubAppTokenInWallet';
export { updateUserWalletRecord } from './userWallet/updateUserWalletRecord';
export type {
    CreateUserWalletRecordOptions,
    DeleteUserWalletRecordOptions,
    FindUserWalletByIdOptions,
    ListUserWalletRecordsOptions,
    ResolveUseEmailSmtpCredentialOptions,
    ResolveUseCalendarGoogleTokenOptions,
    ResolveUseProjectGithubTokenOptions,
    UpdateUserWalletRecordOptions,
    UserWalletRecord,
    UserWalletRecordType,
} from './userWallet/UserWalletRecord';
