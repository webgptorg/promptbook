import { describe, expect, it } from '@jest/globals';
import { parseEmailAddress } from './parseEmailAddress';

describe('how parseEmailAddress works', () => {
    it('should work with simple email', () => {
        expect(parseEmailAddress('pavol@webgpt.cz')).toEqual({
            fullName: null,
            baseEmail: 'pavol@webgpt.cz',
            fullEmail: 'pavol@webgpt.cz',
            plus: [],
        });
        expect(parseEmailAddress('jirka@webgpt.cz')).toEqual({
            fullName: null,
            baseEmail: 'jirka@webgpt.cz',
            fullEmail: 'jirka@webgpt.cz',
            plus: [],
        });
        expect(parseEmailAddress('tomas@webgpt.cz')).toEqual({
            fullName: null,
            baseEmail: 'tomas@webgpt.cz',
            fullEmail: 'tomas@webgpt.cz',
            plus: [],
        });
    });

    it('should work with fullname', () => {
        expect(parseEmailAddress('Pavol Hejný <pavol@webgpt.cz>')).toEqual({
            fullName: 'Pavol Hejný',
            baseEmail: 'pavol@webgpt.cz',
            fullEmail: 'pavol@webgpt.cz',
            plus: [],
        });
        expect(parseEmailAddress('Jirka <jirka@webgpt.cz>')).toEqual({
            fullName: 'Jirka',
            baseEmail: 'jirka@webgpt.cz',
            fullEmail: 'jirka@webgpt.cz',
            plus: [],
        });
        expect(parseEmailAddress('"Tomáš Studeník" <tomas@webgpt.cz>')).toEqual({
            fullName: 'Tomáš Studeník',
            baseEmail: 'tomas@webgpt.cz',
            fullEmail: 'tomas@webgpt.cz',
            plus: [],
        });
    });

    it('should work with plus', () => {
        expect(parseEmailAddress('pavol+test@webgpt.cz')).toEqual({
            fullName: null,
            baseEmail: 'pavol@webgpt.cz',
            fullEmail: 'pavol+test@webgpt.cz',
            plus: ['test'],
        });
        expect(parseEmailAddress('jirka+test@webgpt.cz')).toEqual({
            fullName: null,
            baseEmail: 'jirka@webgpt.cz',
            fullEmail: 'jirka+test@webgpt.cz',
            plus: ['test'],
        });
        expect(parseEmailAddress('tomas+test+ainautes@webgpt.cz')).toEqual({
            fullName: null,
            baseEmail: 'tomas@webgpt.cz',
            fullEmail: 'tomas+test+ainautes@webgpt.cz',
            plus: ['test', 'ainautes'],
        });
    });

    it('should work with both fullname and plus', () => {
        expect(parseEmailAddress('Pavol Hejný <pavol+foo@webgpt.cz>')).toEqual({
            fullName: 'Pavol Hejný',
            baseEmail: 'pavol@webgpt.cz',
            fullEmail: 'pavol+foo@webgpt.cz',
            plus: ['foo'],
        });
        expect(parseEmailAddress('Jirka <jirka+test@webgpt.cz>')).toEqual({
            fullName: 'Jirka',
            baseEmail: 'jirka@webgpt.cz',
            fullEmail: 'jirka+test@webgpt.cz',
            plus: ['test'],
        });
        expect(parseEmailAddress('"Tomáš Studeník" <tomas+test+ainautes@webgpt.cz>')).toEqual({
            fullName: 'Tomáš Studeník',
            baseEmail: 'tomas@webgpt.cz',
            fullEmail: 'tomas+test+ainautes@webgpt.cz',
            plus: ['test', 'ainautes'],
        });
    });

    it('throws on multiple adresses', () => {
        expect(() => parseEmailAddress('Pavol <pavol@webgpt.cz>, Jirka <jirka@webgpt.cz>')).toThrowError(
            /Seems like you are trying to parse multiple email addresses/,
        );
    });

    it('throws on invalid email adresses', () => {
        expect(() => parseEmailAddress('')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddress('Pavol Hejný')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddress('Pavol Hejný <>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddress('Pavol Hejný <@webgpt.cz>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddress('Pavol Hejný <webgpt.cz>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddress('Pavol Hejný <pavol@>')).toThrowError(/Invalid email address/);
        expect(() => parseEmailAddress('Pavol Hejný <a@b>')).toThrowError(/Invalid email address/);
    });
});
