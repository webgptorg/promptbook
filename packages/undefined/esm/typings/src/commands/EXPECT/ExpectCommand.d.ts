import type { ExpectAmountCommand } from "./ExpectAmountCommand";
import type { ExpectFormatCommand } from "./ExpectFormatCommand";
/**
 * Parsed EXPECT command
 *
 * @see ./expectCommandParser.ts for more details
 * @private within the commands folder
 */
export type ExpectCommand = ExpectAmountCommand | ExpectFormatCommand;
