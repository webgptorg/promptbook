'use client';

import { showConfirm } from '../AsyncDialogs/asyncDialogs';
import { EnglishServerLanguagePack, type ServerTranslationKey } from '../../languages/EnglishServerLanguagePack';

/**
 * Translation helper used by private-mode confirmation dialogs.
 */
type PrivateModeTranslationResolver = (key: ServerTranslationKey) => string;

/**
 * Default English translation resolver used outside of language context.
 */
const resolvePrivateModeTranslationInEnglish: PrivateModeTranslationResolver = (key) =>
    EnglishServerLanguagePack.translations[key];

/**
 * Shows confirmation dialog before enabling private mode.
 *
 * @param resolveTranslation - Translation resolver for dialog text.
 * @returns True when user confirms enabling private mode.
 * @private shared helper for Agents Server private mode UX
 */
export async function confirmPrivateModeEnable(
    resolveTranslation: PrivateModeTranslationResolver = resolvePrivateModeTranslationInEnglish,
): Promise<boolean> {
    return showConfirm({
        title: resolveTranslation('privateMode.confirmTitle'),
        message: resolveTranslation('privateMode.confirmMessage'),
        confirmLabel: resolveTranslation('privateMode.confirmEnableLabel'),
        cancelLabel: resolveTranslation('privateMode.confirmCancelLabel'),
    }).catch(() => false);
}
