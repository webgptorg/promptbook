import { describe, expect, it } from '@jest/globals';
import { parseEmailAddresses } from './parseEmailAddresses';

describe('how parseEmailAddresses works', () => {
    it('should work with single email', () => {
        expect(parseEmailAddresses('pavol@webgpt.cz')).toEqual([
            {
                fullName: null,
                baseEmail: 'pavol@webgpt.cz',
                fullEmail: 'pavol@webgpt.cz',
                plus: [],
            },
        ]);
    });

    it('should work with simple emails', () => {
        expect(parseEmailAddresses('pavol@webgpt.cz, jirka@webgpt.cz, tomas@webgpt.cz')).toEqual([
            {
                fullName: null,
                baseEmail: 'pavol@webgpt.cz',
                fullEmail: 'pavol@webgpt.cz',
                plus: [],
            },
            {
                fullName: null,
                baseEmail: 'jirka@webgpt.cz',
                fullEmail: 'jirka@webgpt.cz',
                plus: [],
            },
            {
                fullName: null,
                baseEmail: 'tomas@webgpt.cz',
                fullEmail: 'tomas@webgpt.cz',
                plus: [],
            },
        ]);
    });

    it('should work with fullname', () => {
        expect(
            parseEmailAddresses(
                'Pavol Hejný <pavol@webgpt.cz>, Jirka <jirka@webgpt.cz>, "Tomáš Studeník" <tomas@webgpt.cz>',
            ),
        ).toEqual([
            {
                fullName: 'Pavol Hejný',
                baseEmail: 'pavol@webgpt.cz',
                fullEmail: 'pavol@webgpt.cz',
                plus: [],
            },
            {
                fullName: 'Jirka',
                baseEmail: 'jirka@webgpt.cz',
                fullEmail: 'jirka@webgpt.cz',
                plus: [],
            },
            {
                fullName: 'Tomáš Studeník',
                baseEmail: 'tomas@webgpt.cz',
                fullEmail: 'tomas@webgpt.cz',
                plus: [],
            },
        ]);
    });

    it('not confused by comma', () => {
        expect(parseEmailAddresses(', pavol@webgpt.cz, ')).toEqual([
            {
                fullName: null,
                fullEmail: 'pavol@webgpt.cz',
                baseEmail: 'pavol@webgpt.cz',
                plus: [],
            },
        ]);
    });

    it('works on real-life example', () => {
        expect(
            parseEmailAddresses(
                '"bob" <bob@bot.webgpt.cz>, "pavolto" <pavol+to@ptbk.io>, "Pavol" <pavol@collboard.com>',
            ),
        ).toEqual([
            {
                fullName: 'bob',
                fullEmail: 'bob@bot.webgpt.cz',
                baseEmail: 'bob@bot.webgpt.cz',
                plus: [],
            },
            {
                fullName: 'pavolto',
                fullEmail: 'pavol+to@ptbk.io',
                baseEmail: 'pavol@ptbk.io',
                plus: ['to'],
            },
            {
                fullName: 'Pavol',
                fullEmail: 'pavol@collboard.com',
                baseEmail: 'pavol@collboard.com',
                plus: [],
            },
        ]);
    });

    it('throws on invalid email adresses', () => {
        expect(() => parseEmailAddresses('Pavol, Hejný')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddresses('Pavol Hejný <>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddresses('Pavol Hejný, <@webgpt.cz>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddresses('Pavol Hejný <webgpt.cz>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddresses('Pavol Hejný <pavol@>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddresses('Pavol Hejný <a@b>,')).toThrowError(/Invalid email address/);
    });
});
