import { describe, expect, it } from '@jest/globals';
import { parseCommand } from './parseCommand';

describe('how parseCommand works', () => {
    it('should parse PTBK_URL command', () => {
        expect(parseCommand('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.0')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.0'),
        });
        expect(parseCommand('   https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.1        ')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.1'),
        });
        expect(parseCommand('url https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.2')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.2'),
        });
        expect(parseCommand('URL https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.3')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.3'),
        });
        expect(parseCommand('ptbkurl https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.4')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.4'),
        });
        expect(parseCommand('ptbkUrl https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.5')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.5'),
        });
        expect(parseCommand('PTBK_URL https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.6')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.6'),
        });
        expect(parseCommand('PTBK URL https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.7')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.7'),
        });
        expect(parseCommand('url *https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.8*')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.8'),
        });
        expect(parseCommand('`https://ptbk.webgpt.com/cs/write-website-content.ptbk.md`')).toEqual({
            type: 'PTBK_URL',
            ptbkUrl: new URL('https://ptbk.webgpt.com/cs/write-website-content.ptbk.md'),
        });
    });

    it('should fail parsing PTBK_URL command', () => {
        expect(() => parseCommand('PTBK_URL')).toThrowError(/Invalid PTBK_URL command/i);
        expect(() =>
            parseCommand(
                'URL https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.0 https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.0',
            ),
        ).toThrowError(/Invalid PTBK_URL command/i);

        expect(() => parseCommand('url http:^404')).toThrowError(/Invalid URL/i);

        expect(() => parseCommand('url http://ptbk.webgpt.com/cs/write-website-content@v1.0.0')).toThrowError(
            /Protocol must be HTTPS/i,
        );

        expect(() =>
            parseCommand('url https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v1.0.0#keywords'),
        ).toThrowError(/URL must not contain hash/i);
    });

    it('should parse PTBK_VERSION command', () => {
        expect(parseCommand('ptbk version 1.0.0')).toEqual({
            type: 'PTBK_VERSION',
            ptbkVersion: '1.0.0',
        });
        expect(parseCommand('PTBK version 1.0.0')).toEqual({
            type: 'PTBK_VERSION',
            ptbkVersion: '1.0.0',
        });
    });

    it('should fail parsing PTBK_VERSION command', () => {
        expect(() => parseCommand('PTBK version')).toThrowError(/Invalid PTBK_VERSION command/i);
        expect(() => parseCommand('PTBK version   ')).toThrowError(/Invalid PTBK_VERSION command/i);
        // TODO: Also test invalid version in PTBK_VERSION command
    });

    it('should parse EXECUTE command', () => {
        expect(parseCommand('execute prompt template')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute simple template')).toEqual({
            type: 'EXECUTE',
            executionType: 'SIMPLE_TEMPLATE',
        });
        expect(parseCommand('execute script')).toEqual({
            type: 'EXECUTE',
            executionType: 'SCRIPT',
        });
        expect(parseCommand('execute prompt dialog')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_DIALOG',
        });
        expect(parseCommand('  execute    prompt         template')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute PROMPT_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute `prompt template`')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
    });

    it('should fail parsing EXECUTE command', () => {
        expect(() => parseCommand('execute fooo')).toThrowError(/Unknown execution type/i);
        expect(() => parseCommand('execute script prompt template')).toThrowError(/Unknown execution type/i);
    });

    it('should parse MODEL VARIANT command', () => {
        expect(parseCommand('MODEL VARIANT Chat')).toEqual({
            type: 'USE',
            key: 'modelVariant',
            value: 'CHAT',
        });
        expect(parseCommand('MODEL VARIANT Completion')).toEqual({
            type: 'USE',
            key: 'modelVariant',
            value: 'COMPLETION',
        });
        expect(parseCommand('MODEL VARIANT ChatRIANT Chat')).toEqual({
            type: 'USE',
            key: 'modelVariant',
            value: 'CHAT',
        });
        expect(parseCommand('use `CHAT`')).toEqual({
            type: 'USE',
            key: 'modelVariant',
            value: 'CHAT',
        });

        /*
        TODO: [🌚]
        expect(parseCommand('use GPT-3.5')).toEqual({
            type: 'USE',
            key: 'modelVariant',
            value: 'CHAT',
        });
        */
    });

    it('should fail parsing MODEL VARIANT command', () => {
        expect(() => parseCommand('use wet')).toThrowError(/Unknown variant/i);
        expect(() => parseCommand('use {script}')).toThrowError(/Unknown variant/i);
    });

    it('should parse PARAMETER command', () => {
        expect(parseCommand('parameter {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('{name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('> {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('{name} Input for the hero')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: 'Input for the hero',
        });
        expect(parseCommand('input parameter {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInputParameter: true,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('input parameter {name}')).toEqual({
            type: 'PARAMETER',
            isInputParameter: true,
            parameterName: 'name',
            parameterDescription: null,
        });
        expect(parseCommand('input   parameter {name}          ')).toEqual({
            type: 'PARAMETER',
            isInputParameter: true,
            parameterName: 'name',
            parameterDescription: null,
        });

        expect(parseCommand('OUTPUT parameter {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('   parameter    {name}        Name for the hero         ')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('parameter {name} **Name** for the hero')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: '**Name** for the hero',
        });
        expect(parseCommand('parameter {name} **Name** for `the` {')).toEqual({
            type: 'PARAMETER',
            isInputParameter: false,
            parameterName: 'name',
            parameterDescription: '**Name** for `the` {',
        });
    });

    it('should parse POSTPROCESS command', () => {
        expect(parseCommand('Postprocess spaceTrim')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Postprocess `spaceTrim`')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Postprocess **spaceTrim**')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Post-process spaceTrim')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Postprocessing unwrapResult')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'unwrapResult',
        });
    });

    it('should fail parsing POSTPROCESS command', () => {
        expect(() => parseCommand('Postprocess spaceTrim unwrapResult')).toThrowError(
            /Invalid POSTPROCESSING command/i,
        );
        expect(() => parseCommand('Process spaceTrim')).toThrowError(/Unknown command/i);
        expect(() => parseCommand('Postprocess')).toThrowError(/Invalid POSTPROCESSING command/i);
    });

    it('should fail parsing PARAMETER command', () => {
        expect(() => parseCommand('parameter {}')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter { name }')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter name')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter {name} {name}')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} {name} Name for the hero')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} Name for the hero {name}')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} Name for the hero {name} Name for the hero')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parmeter {name} Name for the hero')).toThrowError(/Unknown command/i);
    });

    it('should fail parsing multiline command', () => {
        expect(() => parseCommand('execute\nprompt template')).toThrowError(/Can not contain new line/i);
        expect(() => parseCommand('execute prompt template\n')).toThrowError(/Can not contain new line/i);
    });

    it('should fail parsing unknown command', () => {
        expect(() => parseCommand('afasf ddd')).toThrowError(/Unknown command/i);
        expect(() => parseCommand('nothing to get')).toThrowError(/Unknown command/i);
        expect(() => parseCommand('prameter {name}')).toThrowError(/Unknown command/i);
    });
});

/**
 * TODO: [🧠] Probbably change syntax MODEL VARIANT -> MODEL
 * TODO: !!!! Allow to use other models
 * TODO: !!!! Allow to skip segments SKIP IF {foo} NOT DEFINED
 * TODO: !!! Allow to EXPECT 3 words
 */
