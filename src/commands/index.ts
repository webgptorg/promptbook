import { executeCommandParser } from './EXECUTE/executeCommandParser';
import { expectCommandParser } from './EXPECT/expectCommandParser';
import { jokerCommandParser } from './JOKER/jokerCommandParser';
import { modelCommandParser } from './MODEL/modelCommandParser';
import { parameterCommandParser } from './PARAMETER/parameterCommandParser';
import { postprocessingCommandParser } from './POSTPROCESSING/postprocessingCommandParser';
import { promptbookVersionCommandParser } from './PROMPTBOOK_VERSION/promptbookVersionCommandParser';
import { urlCommandParser } from './URL/urlCommandParser';
import { knowledgeCommandParser } from './KNOWLEDGE/knowledgeCommandParser';
import { sampleCommandParser } from './X_SAMPLE/sampleCommandParser';

/**
 * All available command parsers
 */
export const COMMANDS = [
    executeCommandParser,
    expectCommandParser,
    jokerCommandParser,
    modelCommandParser,
    parameterCommandParser,
    postprocessingCommandParser,
    promptbookVersionCommandParser,
    urlCommandParser,
    knowledgeCommandParser,
    sampleCommandParser,
] as const;
