/**
 * Chat effects system exports
 *
 * @packageDocumentation
 */

export { ChatEffectsSystem } from './ChatEffectsSystem';
export { ConfettiEffect } from './components/ConfettiEffect';
export { HeartsEffect } from './components/HeartsEffect';
export { defaultEffectConfigs } from './configs/defaultEffectConfigs';
export type { ChatEffect } from './types/ChatEffect';
export type { ChatEffectConfig } from './types/ChatEffectConfig';
export type { ChatEffectsSystemProps } from './types/ChatEffectsSystemProps';
export type { ChatEffectType } from './types/ChatEffectType';
export { detectEffects } from './utils/detectEffects';

/**
 * TODO: !!!!! To rules: Do not create index files that re-export from multiple files, import directly instead or use full register
 */