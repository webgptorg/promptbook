import { ImplicitFormfactorHla } from './implicit-formfactor/ImplicitFormfactorHla';
import { QuickChatbotHla } from './quick-chatbot/QuickChatbotHla';

/**
 * All high-level abstractions
 *
 * @private internal index of `precompilePipeline` (= used for sync) and `preparePipeline` (= used for async)
 */
export const HIGH_LEVEL_ABSTRACTIONS = [
    ImplicitFormfactorHla,
    QuickChatbotHla,
    // <- Note: [♓️][💩] This is the order of the application of high-level abstractions application on pipeline JSON
] as const;

/**
 * TODO: Test that all sync high-level abstractions are before async high-level abstractions
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
