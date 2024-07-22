import { executeCommandParser } from './BLOCK/executeCommandParser';
import { expectCommandParser } from './EXPECT/expectCommandParser';
import { jokerCommandParser } from './JOKER/jokerCommandParser';
import { knowledgeCommandParser } from './KNOWLEDGE/knowledgeCommandParser';
import { modelCommandParser } from './MODEL/modelCommandParser';
import { parameterCommandParser } from './PARAMETER/parameterCommandParser';
import { personaCommandParser } from './PERSONA/personaCommandParser';
import { postprocessCommandParser } from './POSTPROCESS/postprocessCommandParser';
import { promptbookVersionCommandParser } from './PROMPTBOOK_VERSION/promptbookVersionCommandParser';
import { urlCommandParser } from './URL/urlCommandParser';
import { actionCommandParser } from './X_ACTION/actionCommandParser';
import { instrumentCommandParser } from './X_INSTRUMENT/instrumentCommandParser';
import { boilerplateCommandParser } from './_BOILERPLATE/boilerplateCommandParser';

/**
 * All available command parsers
 */
export const COMMANDS = [
    executeCommandParser,
    expectCommandParser,
    jokerCommandParser,
    modelCommandParser,
    parameterCommandParser,
    postprocessCommandParser,
    promptbookVersionCommandParser,
    urlCommandParser,
    knowledgeCommandParser,
    actionCommandParser,
    instrumentCommandParser,
    personaCommandParser,
    boilerplateCommandParser, // <- TODO: !!!! Only in development, remove in production
] as const;
