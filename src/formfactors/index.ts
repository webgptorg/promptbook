import { ChatbotFormfactorDefinition } from './chatbot/ChatbotFormfactorDefinition';
import { GenericFormfactorDefinition } from './generic/GenericFormfactorDefinition';
import { MatcherFormfactorDefinition } from './matcher/MatcherFormfactorDefinition';
import { SheetsFormfactorDefinition } from './sheets/SheetsFormfactorDefinition';
import { TranslatorFormfactorDefinition } from './translator/TranslatorFormfactorDefinition';

/**
 * All available formfactor definitions
 *
 * @public exported from `@promptbook/core`
 */
export const FORMFACTOR_DEFINITIONS = [
    GenericFormfactorDefinition,
    ChatbotFormfactorDefinition,
    TranslatorFormfactorDefinition,
    SheetsFormfactorDefinition,
    MatcherFormfactorDefinition,
] as const;
