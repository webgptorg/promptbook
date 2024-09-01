import { describe, expect, it } from '@jest/globals';
import { just } from '../../utils/organization/just';
import { keepUnused } from '../../utils/organization/keepUnused';
import { COMMANDS } from '../index';
import { parseCommand } from './parseCommand';
import { CommandUsagePlaces } from './types/CommandUsagePlaces';

describe('parsing the commands', () => {
    // Note: Other working cases and better tests for each command is in the corresponding command test file

    for (const { name, isUsedInPipelineHead, isUsedInPipelineTemplate, examples } of COMMANDS) {
        for (const usagePlace of CommandUsagePlaces) {
            if (just(false)) {
                keepUnused(/* for better indentation */);
            } else if (usagePlace === 'PIPELINE_HEAD' && !isUsedInPipelineHead) {
                continue;
            } else if (usagePlace === 'PIPELINE_TEMPLATE' && !isUsedInPipelineTemplate) {
                continue;
            }

            it(`should parse command ${name} in ${usagePlace} without errors`, () => {
                for (const example of examples) {
                    expect(() => parseCommand(example, usagePlace)).not.toThrowError();
                }
            });

            it(`should parse command ${name} in ${usagePlace} and return parsed command \`{"type": "${name}"}\``, () => {
                for (const example of examples) {
                    expect(parseCommand(example, usagePlace).type).toBe(name);
                }
            });
        }
    }

    it('should fail parsing multi-line command', () => {
        expect(() => parseCommand('execute\nprompt template', 'PIPELINE_HEAD')).toThrowError(
            /Can not contain new line/i,
        );
        expect(() => parseCommand('execute prompt template\n', 'PIPELINE_HEAD')).toThrowError(
            /Can not contain new line/i,
        );
    });

    it('should fail parsing unknown command', () => {
        expect(() => parseCommand('', 'PIPELINE_HEAD')).toThrowError(/Malformed command/i);
        expect(() => parseCommand('afasf ddd', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
        expect(() => parseCommand('nothing to get', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
        expect(() => parseCommand('prameter {name}', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
    });
});
