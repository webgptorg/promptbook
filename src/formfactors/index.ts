import { ChatFormfactorDefinition } from './chat/ChatFormfactorDefinition';
import { GenericFormfactorDefinition } from './generic/GenericFormfactorDefinition';
import { SheetsFormfactorDefinition } from './sheets/SheetsFormfactorDefinition';
import { TranslatorFormfactorDefinition } from './translator/TranslatorFormfactorDefinition';

/**
 * All available formfactor definitions
 *
 * @public exported from `@promptbook/core`
 */
export const FORMFACTOR_DEFINITIONS = [
    GenericFormfactorDefinition,
    ChatFormfactorDefinition,
    TranslatorFormfactorDefinition,
    SheetsFormfactorDefinition,
] as const;
