import { boilerplateCommandParser } from './_BOILERPLATE/boilerplateCommandParser';
import { executeCommandParser } from './EXECUTE/executeCommandParser';

export const COMMANDS = [boilerplateCommandParser, executeCommandParser] as const;
