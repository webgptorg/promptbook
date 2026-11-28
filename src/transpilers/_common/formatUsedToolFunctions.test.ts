import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { formatUsedToolFunctions } from './formatUsedToolFunctions';

describe('formatUsedToolFunctions', () => {
    it('normalizes method, function declaration, and arrow implementations into valid object members', () => {
        const formatted = formatUsedToolFunctions({
            get_current_time: spaceTrim(`
                async get_current_time(args) {
                    return "time";
                }
            `),
            web_search: spaceTrim(`
                async (rawArgs) => {
                    return rawArgs.query;
                }
            `),
            send_email: spaceTrim(`
                async function send_email(args) {
                    return "sent";
                }
            `),
            spawn_agent: spaceTrim(`
                function spawn_agent(args) {
                    return "spawned";
                }
            `),
        });

        expect(formatted).toContain('async get_current_time(args) {');
        expect(formatted).toContain('async web_search(rawArgs) {');
        expect(formatted).toContain('async send_email(args) {');
        expect(formatted).toContain('spawn_agent(args) {');

        const toolImplementations = new Function(`return ({\n${formatted}\n});`)() as Record<string, unknown>;

        expect(typeof toolImplementations.get_current_time).toBe('function');
        expect(typeof toolImplementations.web_search).toBe('function');
        expect(typeof toolImplementations.send_email).toBe('function');
        expect(typeof toolImplementations.spawn_agent).toBe('function');
    });
});
