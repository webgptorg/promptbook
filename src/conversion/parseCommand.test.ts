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

    it('should parse MODEL command', () => {
        expect(parseCommand('MODEL VARIANT Completion')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'COMPLETION',
        });
        expect(parseCommand('MODEL VARIANT COMPLETION   ')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'COMPLETION',
        });
        expect(parseCommand('MODEL VARIANT Chat')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'CHAT',
        });
        expect(parseCommand('MODEL VARIANT `CHAT`')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'CHAT',
        });

        expect(parseCommand('MODEL NAME gpt-4-1106-preview')).toEqual({
            type: 'MODEL',
            key: 'modelName',
            value: 'gpt-4-1106-preview',
        });

        expect(parseCommand('MODEL NAME gpt-3.5-turbo-instruct')).toEqual({
            type: 'MODEL',
            key: 'modelName',
            value: 'gpt-3.5-turbo-instruct',
        });
    });

    it('should fail parsing MODEL VARIANT command', () => {
        expect(() => parseCommand('MODEL wet')).toThrowError(/Unknown model key/i);
        expect(() => parseCommand('MODEL {script}')).toThrowError(/Unknown model key/i);
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

    it('should parse EXPECT command', () => {
        expect(parseCommand('Expect exactly 1 character')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 1 char')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect mininimum 1 character')).toEqual({
            type: 'EXPECT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect minimally 1 character')).toEqual({
            type: 'EXPECT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect min 1 char')).toEqual({
            type: 'EXPECT',
            sign: 'MINIMUM',
            unit: 'CHARACTERS',
            amount: 1,
        });

        expect(parseCommand('Expect maximum 5 character')).toEqual({
            type: 'EXPECT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect maximally 5 characters')).toEqual({
            type: 'EXPECT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect max 5 CHARs')).toEqual({
            type: 'EXPECT',
            sign: 'MAXIMUM',
            unit: 'CHARACTERS',
            amount: 5,
        });

        expect(parseCommand('Expect exact 1 word')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 1 word')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect eXactly 1 word')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('EXPECT EXACTLY 1 WORD')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 words')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'WORDS',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 1 sentence')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 sentences')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 0 sentences')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'SENTENCES',
            amount: 0,
        });

        expect(parseCommand('Expect exactly 1 paragraph')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'PARAGRAPHS',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 paragraphs')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'PARAGRAPHS',
            amount: 2,
        });

        expect(parseCommand('Expect exactly 1 line')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'LINES',
            amount: 1,
        });

        expect(parseCommand('Expect exactly 2 lines')).toEqual({
            type: 'EXPECT',
            sign: 'EXACTLY',
            unit: 'LINES',
            amount: 2,
        });

        // TODO: Add page test
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

    it('should fail parsing expect command', () => {
        expect(() => parseCommand('Expect foo 1 char')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('Expect min 1 vars')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('Expect min chars')).toThrowError(/Invalid EXPECT command/i);
        expect(() => parseCommand('Expect min xx chars')).toThrowError(/Invalid EXPECT command/i);
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
 * TODO: !!!! Allow to skip segments SKIP IF {foo} NOT DEFINED
 * TODO: !!! Allow to EXPECT 3 words
 */
